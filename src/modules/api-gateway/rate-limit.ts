/**
 * Rate limiting — in-memory window; Redis-compatible interface later.
 */

import { DEFAULT_RATE_LIMIT } from "./constants";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export type RateLimiter = (key: string) => Promise<RateLimitResult> | RateLimitResult;

type WindowState = { count: number; resetAt: number };

const windows = new Map<string, WindowState>();

export const memoryRateLimiter: RateLimiter = (key) => {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, {
      count: 1,
      resetAt: now + DEFAULT_RATE_LIMIT.windowMs,
    });
    return {
      allowed: true,
      remaining: DEFAULT_RATE_LIMIT.maxRequests - 1,
      retryAfterMs: 0,
    };
  }
  current.count += 1;
  const allowed = current.count <= DEFAULT_RATE_LIMIT.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, DEFAULT_RATE_LIMIT.maxRequests - current.count),
    retryAfterMs: allowed ? 0 : Math.max(0, current.resetAt - now),
  };
};

let activeLimiter: RateLimiter = memoryRateLimiter;

/** Inject rate limiter (Redis later). */
export function setRateLimiter(limiter: RateLimiter): void {
  activeLimiter = limiter;
}

/** Check rate limit for a key. */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  return activeLimiter(key);
}
