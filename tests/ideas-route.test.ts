import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/ideas/round/route";
import { createSessionToken } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";

const ENV_KEYS = [
  "SESSION_SECRET",
  "LLM_PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "IDEAS_RATE_LIMIT",
  "IDEAS_RATE_WINDOW_SECONDS",
] as const;
const saved: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) saved[key] = process.env[key];

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

const basePayload = {
  nickname: "The Coffee Purist",
  occasion: "Birthday",
  currency: "INR",
  budgetMin: 1500,
  budgetMax: 4000,
  likes: "pour-over coffee, tactile stationery",
  age: "late 20s",
  gender: "",
  location: "Bengaluru",
  job: "product designer",
  owns: ["French press"],
  avoid: ["Gift cards"],
  slots: [2, 4],
  acceptedTitles: [],
  rejectedTitles: [],
};

function makeRequest(body: unknown, token?: string) {
  return new NextRequest("http://localhost/api/ideas/round", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `giftr_session=${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function token() {
  return createSessionToken("friend@example.com");
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-long-enough";
  process.env.LLM_PROVIDER = "stub";
  delete process.env.GEMINI_API_KEY;
  process.env.IDEAS_RATE_LIMIT = "20";
  process.env.IDEAS_RATE_WINDOW_SECONDS = "600";
  resetRateLimits();
});

afterEach(() => {
  restoreEnv();
  resetRateLimits();
});

describe("POST /api/ideas/round", () => {
  it("returns 401 without a session cookie", async () => {
    const response = await POST(makeRequest(basePayload));
    expect(response.status).toBe(401);
  });

  it("returns 401 with an invalid session cookie", async () => {
    const response = await POST(makeRequest(basePayload, "invalid.token"));
    expect(response.status).toBe(401);
  });

  it("generates ideas for the requested slots using the stub provider", async () => {
    const response = await POST(makeRequest(basePayload, await token()));
    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      ideas: Array<{
        slot: number;
        title: string;
        searchUrl: string;
        exactUrl: string | null;
        currency: string;
      }>;
      provider: string;
      generatedAt: string;
    };

    expect(data.provider).toBe("stub");
    expect(data.ideas).toHaveLength(2);
    expect(data.ideas.map((idea) => idea.slot)).toEqual([2, 4]);
    expect(data.generatedAt).toBeTruthy();
    for (const idea of data.ideas) {
      expect(idea.title.length).toBeGreaterThan(0);
      expect(idea.currency).toBe("INR");
      expect(idea.searchUrl.startsWith("https://www.google.com/search?q=")).toBe(true);
    }
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("generates five ideas by default", async () => {
    const payload = { ...basePayload, slots: undefined };
    const response = await POST(makeRequest(payload, await token()));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { ideas: Array<{ slot: number }> };
    expect(data.ideas.map((idea) => idea.slot)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      makeRequest({ ...basePayload, budgetMin: 9000, budgetMax: 100 }, await token()),
    );
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(makeRequest("{oops", await token()));
    expect(response.status).toBe(400);
  });

  it("enforces the per-session rate limit", async () => {
    process.env.IDEAS_RATE_LIMIT = "1";
    resetRateLimits();
    const sessionToken = await token();

    const first = await POST(makeRequest(basePayload, sessionToken));
    expect(first.status).toBe(200);

    const second = await POST(makeRequest(basePayload, sessionToken));
    expect(second.status).toBe(429);
    expect(Number(second.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("returns 503 when the selected provider is not configured", async () => {
    process.env.LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    resetRateLimits();

    const response = await POST(makeRequest(basePayload, await token()));
    expect(response.status).toBe(503);
  });

  it("rejects oversized request bodies", async () => {
    const huge = JSON.stringify({ ...basePayload, likes: "x".repeat(70_000) });
    const response = await POST(makeRequest(huge, await token()));
    expect(response.status).toBe(413);
  });
});
