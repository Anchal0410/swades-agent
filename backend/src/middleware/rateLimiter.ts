import type { Context, Next } from "hono";

type Bucket = {
  count: number;
  windowStart: number;
};

// In-memory fixed-window rate limiter, per simple key (e.g. IP).
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // 20 chat messages per minute per key

const buckets = new Map<string, Bucket>();

function getKey(c: Context): string {
  // Try client IP headers first, fall back to a global key.
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp.trim();
  return "global";
}

export async function rateLimiter(c: Context, next: Next) {
  const key = getKey(c);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    // New window
    buckets.set(key, { count: 1, windowStart: now });
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS) {
      return c.json(
        {
          error: {
            message: "Too many requests. Please slow down and try again in a moment.",
          },
        },
        429,
      );
    }
  }

  await next();
}

