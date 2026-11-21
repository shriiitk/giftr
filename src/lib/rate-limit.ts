export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

type Store = Map<string, number[]>;

const defaultStore: Store = new Map();

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRateLimitConfig(
  env: { IDEAS_RATE_LIMIT?: string; IDEAS_RATE_WINDOW_SECONDS?: string } = {
    IDEAS_RATE_LIMIT: process.env.IDEAS_RATE_LIMIT,
    IDEAS_RATE_WINDOW_SECONDS: process.env.IDEAS_RATE_WINDOW_SECONDS,
  },
): RateLimitOptions {
  return {
    limit: positiveInteger(env.IDEAS_RATE_LIMIT, 8),
    windowSeconds: positiveInteger(env.IDEAS_RATE_WINDOW_SECONDS, 600),
  };
}

export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  now: number = Date.now(),
  store: Store = defaultStore,
): RateLimitResult {
  const windowMs = options.windowSeconds * 1000;
  const cutoff = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((time) => time > cutoff);

  if (timestamps.length >= options.limit) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, timestamps);
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits(store: Store = defaultStore): void {
  store.clear();
}
