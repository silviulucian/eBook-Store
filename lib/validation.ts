import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(1).max(80),
  password: z.string().min(12, "Password must be at least 12 characters").max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const booksQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(60)
    .optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const createOrderSchema = z.object({
  bookIds: z
    .array(z.uuid())
    .min(1)
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length, "bookIds must be unique"),
});

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export const cardSchema = z.object({
  number: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d{12,19}$/, "Card number must be 12-19 digits")
        .refine(luhnValid, "Card number is invalid"),
    ),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(2000).max(2200),
  cvc: z.string().regex(/^\d{3,4}$/, "CVC must be 3 or 4 digits"),
});

export const payOrderSchema = z.object({ card: cardSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BooksQuery = z.infer<typeof booksQuerySchema>;
export type CardInput = z.infer<typeof cardSchema>;
