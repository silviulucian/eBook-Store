import { describe, expect, it } from "vitest";
import {
  booksQuerySchema,
  cardSchema,
  createOrderSchema,
  loginSchema,
  luhnValid,
  registerSchema,
} from "@/lib/validation";

describe("registerSchema", () => {
  const valid = { email: "  Alice@Example.COM ", name: " Alice ", password: "123456789012" };

  it("normalises email and name", () => {
    expect(registerSchema.parse(valid)).toEqual({
      email: "alice@example.com",
      name: "Alice",
      password: "123456789012",
    });
  });

  it.each([
    ["short password", { ...valid, password: "12345678901" }],
    ["overlong password", { ...valid, password: "x".repeat(129) }],
    ["bad email", { ...valid, email: "not-an-email" }],
    ["empty name", { ...valid, name: "   " }],
    ["overlong name", { ...valid, name: "n".repeat(81) }],
  ])("rejects %s", (_label, input) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("booksQuerySchema", () => {
  it("applies defaults", () => {
    expect(booksQuerySchema.parse({})).toEqual({ page: 1, pageSize: 12 });
  });

  it("coerces numeric strings", () => {
    expect(booksQuerySchema.parse({ page: "2", pageSize: "5" })).toMatchObject({ page: 2, pageSize: 5 });
  });

  it.each([{ page: "0" }, { pageSize: "51" }, { pageSize: "abc" }, { category: "Bad Slug!" }, { q: "x".repeat(101) }])(
    "rejects %j",
    (input) => {
      expect(booksQuerySchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("createOrderSchema", () => {
  const id = "0b8f3a52-2c0e-4a8b-9f58-6f2d1f0e5c11";
  const id2 = "5a1f3a52-2c0e-4a8b-9f58-6f2d1f0e5c22";

  it("accepts unique uuids", () => {
    expect(createOrderSchema.safeParse({ bookIds: [id, id2] }).success).toBe(true);
  });

  it.each([
    ["empty", { bookIds: [] }],
    ["duplicates", { bookIds: [id, id] }],
    ["non-uuid", { bookIds: ["1; DROP TABLE books"] }],
    ["too many", { bookIds: Array.from({ length: 21 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`) }],
  ])("rejects %s", (_label, input) => {
    expect(createOrderSchema.safeParse(input).success).toBe(false);
  });
});

describe("luhnValid", () => {
  it("accepts well-known test numbers", () => {
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4000000000000002")).toBe(true);
  });
  it("rejects a single changed digit", () => {
    expect(luhnValid("4242424242424241")).toBe(false);
  });
});

describe("cardSchema", () => {
  const card = { number: "4242 4242 4242 4242", expMonth: "12", expYear: "2030", cvc: "123" };

  it("strips separators and coerces expiry", () => {
    expect(cardSchema.parse(card)).toEqual({ number: "4242424242424242", expMonth: 12, expYear: 2030, cvc: "123" });
  });

  it.each([
    ["bad luhn", { ...card, number: "4242 4242 4242 4241" }],
    ["letters", { ...card, number: "4242 4242 4242 42ab" }],
    ["month 13", { ...card, expMonth: "13" }],
    ["cvc too short", { ...card, cvc: "12" }],
    ["cvc letters", { ...card, cvc: "12a" }],
  ])("rejects %s", (_label, input) => {
    expect(cardSchema.safeParse(input).success).toBe(false);
  });
});
