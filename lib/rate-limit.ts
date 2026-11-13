// Fixed-window in-memory limiter. Per-process only: behind multiple replicas use a shared store (e.g. Redis).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

export function resetRateLimits(): void {
  buckets.clear();
}
