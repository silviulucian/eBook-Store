import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "./errors";
import { log } from "./log";
import { rateLimit } from "./rate-limit";
import { getCurrentUser } from "./session";
import type { User } from "./types";

export function json<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (error.status === 429 && typeof error.details === "number") {
      headers["Retry-After"] = String(error.details);
    }
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.status !== 429 && error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status, headers },
    );
  }
  // Never leak internals to the client; log the detail server-side only.
  log.error("unhandled api error", {
    error: error instanceof Error ? error.message : "unknown",
    stack: error instanceof Error ? error.stack : undefined,
  });
  return json({ error: { code: "internal_error", message: "Something went wrong" } }, { status: 500 });
}

/** Wraps a route handler with uniform error handling. */
export function handle<C = unknown>(fn: (request: NextRequest, context: C) => Promise<Response>) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      return await fn(request, context);
    } catch (error) {
      // Let Next.js-internal control-flow errors (e.g. prerender bail-out) propagate.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Authentication required");
  return user;
}

/** Defence in depth next to SameSite=Lax: reject browser requests from a different origin. */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "forbidden_origin", "Cross-origin request rejected");
  }
  if (originHost !== host) {
    throw new ApiError(403, "forbidden_origin", "Cross-origin request rejected");
  }
}

export function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new ApiError(429, "rate_limited", "Too many requests", result.retryAfterSeconds);
  }
}

const MAX_BODY_BYTES = 16 * 1024;

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  assertSameOrigin(request);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body too large");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }
  return validate(schema, raw);
}

export function validate<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        422,
        "validation_error",
        "Request validation failed",
        error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      );
    }
    throw error;
  }
}
