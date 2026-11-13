import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// io() only matters inside a Next.js render; outside Next it is a no-op.
vi.mock("next/cache", () => ({ io: async () => undefined }));

const testUrl = process.env.TEST_DATABASE_URL;
const describeDb = testUrl ? describe : describe.skip;

describeDb("orders service (PostgreSQL)", () => {
  let db: typeof import("@/lib/db");
  let orders: typeof import("@/lib/orders");
  let books: typeof import("@/lib/books");
  let userA: string;
  let userB: string;
  let bookIds: string[];

  const good = { number: "4242424242424242", expMonth: 12, expYear: 2099, cvc: "123" };
  const declined = { ...good, number: "4000000000000002" };

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl;
    db = await import("@/lib/db");
    orders = await import("@/lib/orders");
    books = await import("@/lib/books");
  });

  beforeEach(async () => {
    await db.query("TRUNCATE users, sessions, orders, order_items, payments CASCADE");
    const [a] = await db.query<{ id: string }>(
      "INSERT INTO users (email, name, password_hash) VALUES ('a@test.dev', 'A', 'x') RETURNING id",
    );
    const [b] = await db.query<{ id: string }>(
      "INSERT INTO users (email, name, password_hash) VALUES ('b@test.dev', 'B', 'x') RETURNING id",
    );
    userA = a.id;
    userB = b.id;
    const page = await books.listBooks({ page: 1, pageSize: 3 });
    bookIds = page.items.map((i) => i.id);
  });

  afterAll(async () => {
    await db.closePool();
  });

  it("creates a pending order priced from the database", async () => {
    const order = await orders.createOrder(userA, bookIds.slice(0, 2));
    expect(order.status).toBe("pending");
    expect(order.confirmationCode).toBeNull();
    expect(order.items).toHaveLength(2);
    expect(order.totalCents).toBe(order.items.reduce((s, i) => s + i.unitPriceCents, 0));
  });

  it("rejects unknown books", async () => {
    await expect(
      orders.createOrder(userA, ["00000000-0000-4000-8000-000000000000"]),
    ).rejects.toMatchObject({ status: 422, code: "unknown_book" });
  });

  it("pays an order: sets confirmation code and stores only brand + last4", async () => {
    const pending = await orders.createOrder(userA, [bookIds[0]]);
    const paid = await orders.payOrder(userA, pending.id, good);
    expect(paid.status).toBe("paid");
    expect(paid.confirmationCode).toMatch(/^PL-/);
    expect(paid.payment).toMatchObject({ cardBrand: "Visa", cardLast4: "4242" });

    const rows = await db.query<Record<string, unknown>>("SELECT * FROM payments WHERE order_id = $1", [pending.id]);
    expect(JSON.stringify(rows)).not.toContain("4242424242424242");
    expect(JSON.stringify(rows)).not.toContain("123");
  });

  it("keeps the order pending on decline, records the attempt, and allows a retry", async () => {
    const pending = await orders.createOrder(userA, [bookIds[0]]);
    await expect(orders.payOrder(userA, pending.id, declined)).rejects.toMatchObject({
      status: 402,
      code: "payment_declined",
    });
    expect((await orders.getOrder(userA, pending.id))?.status).toBe("pending");

    const attempts = await db.query<{ status: string }>("SELECT status FROM payments WHERE order_id = $1", [pending.id]);
    expect(attempts.map((a) => a.status)).toEqual(["declined"]);

    const paid = await orders.payOrder(userA, pending.id, good);
    expect(paid.status).toBe("paid");
  });

  it("refuses to pay twice", async () => {
    const pending = await orders.createOrder(userA, [bookIds[0]]);
    await orders.payOrder(userA, pending.id, good);
    await expect(orders.payOrder(userA, pending.id, good)).rejects.toMatchObject({ status: 409, code: "already_paid" });
  });

  it("charges exactly once when two payments race", async () => {
    const pending = await orders.createOrder(userA, [bookIds[0]]);
    const results = await Promise.allSettled([
      orders.payOrder(userA, pending.id, good),
      orders.payOrder(userA, pending.id, good),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const ok = await db.query("SELECT 1 FROM payments WHERE order_id = $1 AND status = 'succeeded'", [pending.id]);
    expect(ok).toHaveLength(1);
  });

  it("blocks buying a book the user already owns, but not for another user", async () => {
    const first = await orders.createOrder(userA, [bookIds[0]]);
    await orders.payOrder(userA, first.id, good);
    await expect(orders.createOrder(userA, [bookIds[0], bookIds[1]])).rejects.toMatchObject({
      status: 409,
      code: "already_owned",
    });
    await expect(orders.createOrder(userB, [bookIds[0]])).resolves.toMatchObject({ status: "pending" });
  });

  it("never exposes another user's order", async () => {
    const mine = await orders.createOrder(userA, [bookIds[0]]);
    expect(await orders.getOrder(userB, mine.id)).toBeNull();
    await expect(orders.payOrder(userB, mine.id, good)).rejects.toMatchObject({ status: 404 });
    expect(await orders.listOrders(userB)).toEqual([]);
  });

  it("database rejects an inconsistent paid state", async () => {
    const pending = await orders.createOrder(userA, [bookIds[0]]);
    await expect(db.query("UPDATE orders SET status = 'paid' WHERE id = $1", [pending.id])).rejects.toMatchObject({
      code: "23514",
    });
  });
});

describeDb("books service (PostgreSQL)", () => {
  let books: typeof import("@/lib/books");
  let db: typeof import("@/lib/db");

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl;
    db = await import("@/lib/db");
    books = await import("@/lib/books");
  });
  afterAll(async () => {
    await db.closePool();
  });

  it("paginates and reports the total", async () => {
    const p1 = await books.listBooks({ page: 1, pageSize: 5 });
    const p3 = await books.listBooks({ page: 3, pageSize: 5 });
    expect(p1.items).toHaveLength(5);
    expect(p1.total).toBe(12);
    expect(p3.items).toHaveLength(2);
  });

  it("filters by category and searches title or author case-insensitively", async () => {
    const sf = await books.listBooks({ page: 1, pageSize: 50, category: "science-fiction" });
    expect(sf.items.every((b) => b.category.slug === "science-fiction")).toBe(true);
    const wells = await books.listBooks({ page: 1, pageSize: 50, q: "WELLS" });
    expect(wells.items.map((b) => b.author)).toEqual(["H. G. Wells", "H. G. Wells"]);
  });

  it("treats LIKE wildcards in the query literally", async () => {
    expect((await books.listBooks({ page: 1, pageSize: 50, q: "%" })).total).toBe(0);
    expect((await books.listBooks({ page: 1, pageSize: 50, q: "_" })).total).toBe(0);
  });

  it("is safe against SQL injection in search", async () => {
    const result = await books.listBooks({ page: 1, pageSize: 50, q: "'; DROP TABLE books; --" });
    expect(result.total).toBe(0);
    expect((await books.listBooks({ page: 1, pageSize: 1 })).total).toBe(12);
  });

  it("returns null for an unknown slug", async () => {
    expect(await books.getBookBySlug("nope")).toBeNull();
  });
});
