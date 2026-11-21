import { normalizeCurrency } from "../currency";
import { LlmError } from "./types";
import type { GeneratedIdea } from "./types";

const MAX_TITLE = 160;
const MAX_DESCRIPTION = 500;
const MAX_WHY = 500;
const MAX_URL = 2000;

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseJsonLoose(raw: string): unknown {
  const cleaned = stripCodeFences(raw);
  return JSON.parse(cleaned) as unknown;
}

function asTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function asPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

function asUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Deliberately no URL probing/validation here. The backend passes the model's
  // value through; the client only renders it when it is an http(s) URL.
  return trimmed.slice(0, MAX_URL);
}

export function parseGeneratedIdeas(
  raw: unknown,
  expectedCount: number,
  fallbackCurrency: string,
): GeneratedIdea[] {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = parseJsonLoose(raw);
    } catch {
      throw new LlmError("The gift provider returned an unreadable response.");
    }
  }

  const record =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(record?.ideas)
      ? (record.ideas as unknown[])
      : null;

  if (!list) {
    throw new LlmError("The gift provider did not return an ideas list.");
  }

  const ideas: GeneratedIdea[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const idea = item as Record<string, unknown>;
    const title = asTrimmedString(idea.title, MAX_TITLE);
    const description = asTrimmedString(idea.description, MAX_DESCRIPTION);
    const whyItFits = asTrimmedString(idea.whyItFits, MAX_WHY);

    if (!title || !description || !whyItFits) continue;

    const currency =
      asTrimmedString(idea.currency, 12)?.toUpperCase() ??
      normalizeCurrency(fallbackCurrency);

    ideas.push({
      title,
      description,
      whyItFits,
      estimatedPrice: asPrice(idea.estimatedPrice),
      currency: normalizeCurrency(currency) || normalizeCurrency(fallbackCurrency),
      exactUrl: asUrl(idea.exactUrl),
    });
  }

  if (ideas.length < expectedCount) {
    throw new LlmError("The gift provider returned fewer ideas than requested.");
  }

  return ideas.slice(0, expectedCount);
}
