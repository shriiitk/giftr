import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/llm/provider", () => ({
  getProvider: () => ({
    name: "fake",
    generateIdeas: async () => [
      {
        title: "Scented Candle",
        description: "A candle.",
        estimatedPrice: 500,
        currency: "INR",
        whyItFits: "Smells nice.",
        exactUrl: null,
      },
      {
        title: "Brass Tray",
        description: "A tray.",
        estimatedPrice: 800,
        currency: "INR",
        whyItFits: "Useful on a desk.",
        exactUrl: null,
      },
    ],
  }),
}));

import { POST } from "@/app/api/ideas/round/route";
import { createSessionToken } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";

const payload = {
  nickname: "The Coffee Purist",
  occasion: "Birthday",
  currency: "INR",
  budgetMin: 100,
  budgetMax: 1000,
  likes: "coffee",
  owns: [],
  avoid: [],
  slots: [1, 2],
  acceptedTitles: [],
  rejectedTitles: ["Scented Candle"],
};

function makeRequest(body: unknown, token: string) {
  return new NextRequest("http://localhost/api/ideas/round", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `giftr_session=${token}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-long-enough";
  process.env.IDEAS_RATE_LIMIT = "20";
  process.env.IDEAS_RATE_WINDOW_SECONDS = "600";
  resetRateLimits();
});

describe("ideas route exclusion guard", () => {
  it("rejects a provider response that repeats a rejected title", async () => {
    const token = await createSessionToken("friend@example.com");
    const response = await POST(makeRequest(payload, token));
    expect(response.status).toBe(502);

    const data = (await response.json()) as { error: string };
    expect(data.error).toMatch(/already rejected/i);
  });
});
