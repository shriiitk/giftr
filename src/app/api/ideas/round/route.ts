import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/llm/provider";
import { LlmConfigError, LlmError } from "@/lib/llm/types";
import { consumeRateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/session";
import { buildSearchUrl } from "@/lib/url";
import { isBodyWithinLimit, parseIdeasRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(error: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    { error },
    { status, headers: { ...NO_STORE, ...extraHeaders } },
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return errorResponse("Your session has expired. Please sign in again.", 401);
  }

  const raw = await request.text();
  if (!isBodyWithinLimit(raw)) {
    return errorResponse("Request body is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse("Send a valid JSON body.", 400);
  }

  const parsed = parseIdeasRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  const payload = parsed.value;
  const rate = consumeRateLimit(
    `ideas:${session.email.toLowerCase()}`,
    getRateLimitConfig(),
  );

  if (!rate.allowed) {
    return errorResponse(
      `You have reached the idea-generation limit. Try again in about ${Math.ceil(
        rate.retryAfterSeconds / 60,
      )} minute(s).`,
      429,
      {
        "Retry-After": String(rate.retryAfterSeconds),
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  try {
    const provider = getProvider();
    const generated = await provider.generateIdeas({
      brief: {
        nickname: payload.nickname,
        occasion: payload.occasion,
        currency: payload.currency,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        likes: payload.likes,
        age: payload.age,
        gender: payload.gender,
        location: payload.location,
        job: payload.job,
        owns: payload.owns,
        avoid: payload.avoid,
      },
      count: payload.slots.length,
      slots: payload.slots,
      excludeTitles: [...payload.acceptedTitles, ...payload.rejectedTitles],
      seed: `${session.email}:${Date.now()}:${payload.slots.join(",")}`,
    });

    const ideas = generated.slice(0, payload.slots.length).map((idea, index) => ({
      slot: payload.slots[index],
      title: idea.title,
      description: idea.description,
      estimatedPrice: idea.estimatedPrice,
      currency: idea.currency || payload.currency,
      whyItFits: idea.whyItFits,
      exactUrl: idea.exactUrl,
      searchUrl: buildSearchUrl(idea.title, payload.currency, payload.location),
    }));

    return NextResponse.json(
      {
        ideas,
        provider: provider.name,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          ...NO_STORE,
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      },
    );
  } catch (error) {
    if (error instanceof LlmConfigError) {
      return errorResponse(error.message, 503);
    }
    if (error instanceof LlmError) {
      return errorResponse(error.message, error.status);
    }
    console.error("ideas_round_unexpected_error");
    return errorResponse("Something went wrong while generating ideas. Please try again.", 500);
  }
}
