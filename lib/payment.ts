import { randomBytes } from "node:crypto";
import type { CardInput } from "./validation";

export type MockPaymentResult =
  | { status: "succeeded"; cardBrand: string; cardLast4: string; transactionRef: string }
  | { status: "declined"; cardBrand: string; cardLast4: string; failureReason: string };

/** Test cards. Any other Luhn-valid, unexpired card succeeds. */
export const TEST_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
  insufficientFunds: "4000000000009995",
} as const;

export function detectBrand(number: string): string {
  if (/^4/.test(number)) return "Visa";
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(number)) return "Mastercard";
  if (/^3[47]/.test(number)) return "American Express";
  return "Card";
}

/** MOCK payment processor: no network call, no real money, nothing is charged. */
export function processMockPayment(card: CardInput, now: Date = new Date()): MockPaymentResult {
  const cardBrand = detectBrand(card.number);
  const cardLast4 = card.number.slice(-4);

  const expired =
    card.expYear < now.getUTCFullYear() ||
    (card.expYear === now.getUTCFullYear() && card.expMonth < now.getUTCMonth() + 1);
  if (expired) {
    return { status: "declined", cardBrand, cardLast4, failureReason: "Your card has expired." };
  }
  if (card.number === TEST_CARDS.declined) {
    return { status: "declined", cardBrand, cardLast4, failureReason: "Your card was declined." };
  }
  if (card.number === TEST_CARDS.insufficientFunds) {
    return { status: "declined", cardBrand, cardLast4, failureReason: "Insufficient funds." };
  }
  return {
    status: "succeeded",
    cardBrand,
    cardLast4,
    transactionRef: `mock_${randomBytes(8).toString("hex")}`,
  };
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L

export function generateConfirmationCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `PL-${code}`;
}
