import { describe, expect, it } from "vitest";
import { detectBrand, generateConfirmationCode, processMockPayment, TEST_CARDS } from "@/lib/payment";
import type { CardInput } from "@/lib/validation";

const now = new Date("2026-06-15T12:00:00Z");
const card = (over: Partial<CardInput> = {}): CardInput => ({
  number: TEST_CARDS.success,
  expMonth: 12,
  expYear: 2030,
  cvc: "123",
  ...over,
});

describe("processMockPayment", () => {
  it("succeeds for the success test card and exposes only brand + last4", () => {
    const result = processMockPayment(card(), now);
    expect(result).toMatchObject({ status: "succeeded", cardBrand: "Visa", cardLast4: "4242" });
    expect(JSON.stringify(result)).not.toContain(TEST_CARDS.success);
    expect(result.status === "succeeded" && result.transactionRef).toMatch(/^mock_[0-9a-f]{16}$/);
  });

  it("declines the declined test card", () => {
    expect(processMockPayment(card({ number: TEST_CARDS.declined }), now)).toMatchObject({
      status: "declined",
      failureReason: "Your card was declined.",
    });
  });

  it("declines insufficient funds", () => {
    expect(processMockPayment(card({ number: TEST_CARDS.insufficientFunds }), now)).toMatchObject({
      status: "declined",
      failureReason: "Insufficient funds.",
    });
  });

  it("declines expired cards (previous year and earlier month this year)", () => {
    expect(processMockPayment(card({ expYear: 2025 }), now).status).toBe("declined");
    expect(processMockPayment(card({ expYear: 2026, expMonth: 5 }), now).status).toBe("declined");
  });

  it("accepts a card expiring this month", () => {
    expect(processMockPayment(card({ expYear: 2026, expMonth: 6 }), now).status).toBe("succeeded");
  });

  it("generates a unique transaction ref each time", () => {
    const a = processMockPayment(card(), now);
    const b = processMockPayment(card(), now);
    expect(a).not.toEqual(b);
  });
});

describe("detectBrand", () => {
  it.each([
    ["4242424242424242", "Visa"],
    ["5555555555554444", "Mastercard"],
    ["2223003122003222", "Mastercard"],
    ["378282246310005", "American Express"],
    ["6011111111111117", "Card"],
  ])("%s -> %s", (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });
});

describe("generateConfirmationCode", () => {
  it("has the PL- prefix and no ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateConfirmationCode()).toMatch(/^PL-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/);
    }
  });
});
