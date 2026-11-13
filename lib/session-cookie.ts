// Shared by proxy.ts and server code, so it must not import Node-only modules.
const SECURE = process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";

// The __Host- prefix pins the cookie to this exact host (requires Secure, Path=/, no Domain).
export const SESSION_COOKIE = SECURE ? "__Host-session" : "session";
export const SESSION_COOKIE_SECURE = SECURE;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
