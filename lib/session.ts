import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_SECURE,
  SESSION_TTL_SECONDS,
} from "./session-cookie";
import type { User } from "./types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a server-side session and sets the cookie. Only the token hash is stored. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [userId, hashToken(token), SESSION_TTL_SECONDS],
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Returns the signed-in user, or null. Reads cookies, so it is request-time only. */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const rows = await query<User>(
    `SELECT u.id, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}
