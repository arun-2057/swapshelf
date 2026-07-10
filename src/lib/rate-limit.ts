const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  expiresAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt < now) {
    buckets.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return { ok: true };
  }

  bucket.count += 1;

  if (bucket.count > MAX_ATTEMPTS) {
    return { ok: false, retryAfterMs: bucket.expiresAt - now };
  }

  return { ok: true };
}
