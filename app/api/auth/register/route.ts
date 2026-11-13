import { handle, json, clientKey, enforceRateLimit, parseBody } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { isUniqueViolation, query } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import type { User } from "@/lib/types";

export const POST = handle(async (request) => {
  enforceRateLimit(`register:${clientKey(request)}`, 10, 60 * 60_000);
  const input = await parseBody(request, registerSchema);
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await query<User>(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name",
      [input.email, input.name, passwordHash],
    );
    await createSession(user.id);
    return json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "email_taken", "An account with this email already exists");
    }
    throw error;
  }
});
