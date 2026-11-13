import "server-only";
import type { PoolClient } from "pg";
import { query, withTransaction, isUniqueViolation } from "./db";
import { ApiError } from "./errors";
import { generateConfirmationCode, processMockPayment } from "./payment";
import type { Order, OrderItem } from "./types";
import type { CardInput } from "./validation";

type OrderRow = {
  id: string;
  status: "pending" | "paid";
  total_cents: number;
  currency: string;
  confirmation_code: string | null;
  created_at: Date;
  paid_at: Date | null;
};

type ItemRow = {
  order_id: string;
  book_id: string;
  slug: string;
  title: string;
  author: string;
  unit_price_cents: number;
};

type PaymentRow = {
  order_id: string;
  card_brand: string;
  card_last4: string;
  transaction_ref: string;
};

async function hydrate(orders: OrderRow[]): Promise<Order[]> {
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const items = await query<ItemRow>(
    `SELECT oi.order_id, oi.book_id, b.slug, oi.title, oi.author, oi.unit_price_cents
       FROM order_items oi JOIN books b ON b.id = oi.book_id
      WHERE oi.order_id = ANY($1::uuid[]) ORDER BY oi.title`,
    [ids],
  );
  const payments = await query<PaymentRow>(
    `SELECT order_id, card_brand, card_last4, transaction_ref
       FROM payments WHERE order_id = ANY($1::uuid[]) AND status = 'succeeded'`,
    [ids],
  );
  return orders.map((o) => {
    const payment = payments.find((p) => p.order_id === o.id);
    return {
      id: o.id,
      status: o.status,
      totalCents: o.total_cents,
      currency: o.currency,
      confirmationCode: o.confirmation_code,
      createdAt: o.created_at.toISOString(),
      paidAt: o.paid_at?.toISOString() ?? null,
      items: items
        .filter((i) => i.order_id === o.id)
        .map<OrderItem>((i) => ({
          bookId: i.book_id,
          slug: i.slug,
          title: i.title,
          author: i.author,
          unitPriceCents: i.unit_price_cents,
        })),
      payment: payment
        ? {
            cardBrand: payment.card_brand,
            cardLast4: payment.card_last4,
            transactionRef: payment.transaction_ref,
          }
        : null,
    };
  });
}

const ORDER_COLUMNS =
  "id, status, total_cents, currency, confirmation_code, created_at, paid_at";

export async function listOrders(userId: string): Promise<Order[]> {
  const rows = await query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return hydrate(rows);
}

/** Scoped by user id, so one user can never read another user's order. */
export async function getOrder(userId: string, orderId: string): Promise<Order | null> {
  const rows = await query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  return (await hydrate(rows))[0] ?? null;
}

/** Prices are always read from the database, never from the client. */
export async function createOrder(userId: string, bookIds: string[]): Promise<Order> {
  const orderId = await withTransaction(async (client) => {
    const books = await client.query<{
      id: string;
      title: string;
      author: string;
      price_cents: number;
      currency: string;
    }>("SELECT id, title, author, price_cents, currency FROM books WHERE id = ANY($1::uuid[])", [
      bookIds,
    ]);
    if (books.rows.length !== bookIds.length) {
      throw new ApiError(422, "unknown_book", "One or more books do not exist");
    }
    const owned = await client.query(
      `SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id = $1 AND o.status = 'paid' AND oi.book_id = ANY($2::uuid[]) LIMIT 1`,
      [userId, bookIds],
    );
    if (owned.rowCount) {
      throw new ApiError(409, "already_owned", "You already own one or more of these books");
    }
    const currency = books.rows[0].currency;
    const total = books.rows.reduce((sum, b) => sum + b.price_cents, 0);
    const order = await client.query<{ id: string }>(
      "INSERT INTO orders (user_id, total_cents, currency) VALUES ($1, $2, $3) RETURNING id",
      [userId, total, currency],
    );
    for (const b of books.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, book_id, title, author, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.rows[0].id, b.id, b.title, b.author, b.price_cents],
      );
    }
    return order.rows[0].id;
  });
  const created = await getOrder(userId, orderId);
  if (!created) throw new Error("order vanished after insert");
  return created;
}

async function recordPayment(
  client: PoolClient,
  orderId: string,
  totalCents: number,
  currency: string,
  result: ReturnType<typeof processMockPayment>,
) {
  await client.query(
    `INSERT INTO payments (order_id, status, amount_cents, currency, card_brand, card_last4,
                           transaction_ref, failure_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      orderId,
      result.status,
      totalCents,
      currency,
      result.cardBrand,
      result.cardLast4,
      result.status === "succeeded" ? result.transactionRef : null,
      result.status === "declined" ? result.failureReason : null,
    ],
  );
}

/** Mock-pays a pending order. Declines are recorded and keep the order pending so the user can retry. */
export async function payOrder(userId: string, orderId: string, card: CardInput): Promise<Order> {
  let declinedReason: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      declinedReason = await withTransaction(async (client) => {
        // Row lock prevents a double submit from paying the same order twice.
        const locked = await client.query<{ status: string; total_cents: number; currency: string }>(
          "SELECT status, total_cents, currency FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE",
          [orderId, userId],
        );
        const row = locked.rows[0];
        if (!row) throw new ApiError(404, "not_found", "Order not found");
        if (row.status === "paid") throw new ApiError(409, "already_paid", "Order is already paid");

        const result = processMockPayment(card);
        await recordPayment(client, orderId, row.total_cents, row.currency, result);
        if (result.status === "declined") return result.failureReason;
        await client.query(
          `UPDATE orders SET status = 'paid', confirmation_code = $2, paid_at = now() WHERE id = $1`,
          [orderId, generateConfirmationCode()],
        );
        return null;
      });
      break;
    } catch (error) {
      // Confirmation code collision (astronomically unlikely): retry with a new code.
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  if (declinedReason) throw new ApiError(402, "payment_declined", declinedReason);
  const paid = await getOrder(userId, orderId);
  if (!paid) throw new ApiError(404, "not_found", "Order not found");
  return paid;
}
