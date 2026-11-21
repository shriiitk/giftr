import { describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  getRateLimitConfig,
  resetRateLimits,
} from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const store = new Map<string, number[]>();
    const options = { limit: 2, windowSeconds: 60 };
    const now = 1_000_000;

    const first = consumeRateLimit("user", options, now, store);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = consumeRateLimit("user", options, now + 1000, store);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = consumeRateLimit("user", options, now + 2000, store);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const store = new Map<string, number[]>();
    const options = { limit: 1, windowSeconds: 60 };
    expect(consumeRateLimit("a", options, 1000, store).allowed).toBe(true);
    expect(consumeRateLimit("b", options, 1000, store).allowed).toBe(true);
    expect(consumeRateLimit("a", options, 1000, store).allowed).toBe(false);
  });

  it("allows again after the window expires", () => {
    const store = new Map<string, number[]>();
    const options = { limit: 1, windowSeconds: 60 };
    expect(consumeRateLimit("user", options, 1000, store).allowed).toBe(true);
    expect(consumeRateLimit("user", options, 61_001, store).allowed).toBe(true);
  });

  it("resets all entries", () => {
    const store = new Map<string, number[]>();
    const options = { limit: 1, windowSeconds: 60 };
    consumeRateLimit("user", options, 1000, store);
    expect(consumeRateLimit("user", options, 1000, store).allowed).toBe(false);
    resetRateLimits(store);
    expect(consumeRateLimit("user", options, 1000, store).allowed).toBe(true);
  });

  it("parses environment configuration with safe defaults", () => {
    expect(getRateLimitConfig({})).toEqual({ limit: 8, windowSeconds: 600 });
    expect(
      getRateLimitConfig({
        IDEAS_RATE_LIMIT: "12",
        IDEAS_RATE_WINDOW_SECONDS: "120",
      }),
    ).toEqual({ limit: 12, windowSeconds: 120 });
    expect(
      getRateLimitConfig({ IDEAS_RATE_LIMIT: "-5", IDEAS_RATE_WINDOW_SECONDS: "nope" }),
    ).toEqual({ limit: 8, windowSeconds: 600 });
  });
});
