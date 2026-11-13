import { handle, json, clientKey, enforceRateLimit, parseBody } from "@/lib/api";
import { query } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

type Row = { id: string; email: string; name: string; password_hash: string };

export const POST = handle(async (request) => {
  const input = await parseBody(request, loginSchema);
  // Limit per IP and per account to slow credential stuffing and brute force.
  enforceRateLimit(`login-ip:${clientKey(request)}`, 30, 15 * 60_000);
  enforceRateLimit(`login-email:${input.email}`, 10, 15 * 60_000);

  const [row] = await query<Row>(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [input.email],
  );
  const ok = row ? await verifyPassword(input.password, row.password_hash) : false;
  if (!row) await verifyAgainstDummy(input.password);
  if (!row || !ok) {
    // Same message for unknown email and wrong password: no account enumeration.
    throw new ApiError(401, "invalid_credentials", "Invalid email or password");
  }
  await createSession(row.id);
  return json({ user: { id: row.id, email: row.email, name: row.name } });
});
