import { MAX_BODY_BYTES, MAX_BUDGET, SLOT_COUNT } from "./types";
import type { IdeasRoundPayload } from "./types";
import { normalizeCurrency } from "./currency";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  source: Record<string, unknown>,
  key: string,
  label: string,
  maxLength: number,
): ValidationResult<string> {
  const value = source[key];
  if (typeof value !== "string") {
    return { ok: false, error: `${label} is required.` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${label} is required.` };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
  }
  return { ok: true, value: trimmed };
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  label: string,
  maxLength: number,
): ValidationResult<string | undefined> {
  const value = source[key];
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be text.` };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
  }
  return { ok: true, value: trimmed };
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  label: string,
): ValidationResult<number> {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number.` };
  }
  if (value < 0) {
    return { ok: false, error: `${label} cannot be negative.` };
  }
  if (value > MAX_BUDGET) {
    return { ok: false, error: `${label} is unrealistically high.` };
  }
  return { ok: true, value };
}

function readStringArray(
  source: Record<string, unknown>,
  key: string,
  label: string,
  maxItems = 20,
  maxLength = 80,
): ValidationResult<string[]> {
  const value = source[key];
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: `${label} must be a list.` };
  }
  if (value.length > maxItems) {
    return { ok: false, error: `${label} can have at most ${maxItems} items.` };
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${label} must contain text values.` };
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) {
      return { ok: false, error: `${label} items must be ${maxLength} characters or fewer.` };
    }
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(trimmed);
  }
  return { ok: true, value: result };
}

function readSlots(source: Record<string, unknown>): ValidationResult<number[]> {
  const value = source.slots;
  if (value === undefined || value === null) {
    return { ok: true, value: Array.from({ length: SLOT_COUNT }, (_, index) => index + 1) };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: "slots must be a list of slot numbers." };
  }
  if (value.length === 0) {
    return { ok: true, value: Array.from({ length: SLOT_COUNT }, (_, index) => index + 1) };
  }
  if (value.length > SLOT_COUNT) {
    return { ok: false, error: `At most ${SLOT_COUNT} slots can be requested.` };
  }

  const seen = new Set<number>();
  for (const item of value) {
    if (
      typeof item !== "number" ||
      !Number.isInteger(item) ||
      item < 1 ||
      item > SLOT_COUNT
    ) {
      return { ok: false, error: `Slot numbers must be whole numbers from 1 to ${SLOT_COUNT}.` };
    }
    if (seen.has(item)) {
      return { ok: false, error: "Slot numbers must be unique." };
    }
    seen.add(item);
  }

  return { ok: true, value: [...seen].sort((a, b) => a - b) };
}

export function parseIdeasRequest(input: unknown): ValidationResult<IdeasRoundPayload> {
  if (!isRecord(input)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const nickname = readRequiredString(input, "nickname", "Recipient nickname", 80);
  if (!nickname.ok) return nickname;

  const occasion = readRequiredString(input, "occasion", "Occasion", 80);
  if (!occasion.ok) return occasion;

  const likes = readRequiredString(input, "likes", "Likes", 1200);
  if (!likes.ok) return likes;

  const currency = readRequiredString(input, "currency", "Currency", 12);
  if (!currency.ok) return currency;

  const budgetMin = readNumber(input, "budgetMin", "Minimum budget");
  if (!budgetMin.ok) return budgetMin;

  const budgetMax = readNumber(input, "budgetMax", "Maximum budget");
  if (!budgetMax.ok) return budgetMax;

  if (budgetMax.value < budgetMin.value) {
    return { ok: false, error: "Maximum budget must be greater than or equal to the minimum." };
  }
  if (budgetMax.value <= 0) {
    return { ok: false, error: "Maximum budget must be greater than zero." };
  }

  const age = readOptionalString(input, "age", "Age", 120);
  if (!age.ok) return age;
  const gender = readOptionalString(input, "gender", "Gender", 120);
  if (!gender.ok) return gender;
  const location = readOptionalString(input, "location", "Location", 120);
  if (!location.ok) return location;
  const job = readOptionalString(input, "job", "Job or role", 120);
  if (!job.ok) return job;

  const owns = readStringArray(input, "owns", "Already owns");
  if (!owns.ok) return owns;
  const avoid = readStringArray(input, "avoid", "Do not want");
  if (!avoid.ok) return avoid;

  const slots = readSlots(input);
  if (!slots.ok) return slots;

  // Keep a longer rejection history so a card that was replaced earlier in the
  // session is still excluded from later replacement rounds.
  const acceptedTitles = readStringArray(input, "acceptedTitles", "Accepted titles", 100, 160);
  if (!acceptedTitles.ok) return acceptedTitles;
  const rejectedTitles = readStringArray(input, "rejectedTitles", "Rejected titles", 100, 160);
  if (!rejectedTitles.ok) return rejectedTitles;

  return {
    ok: true,
    value: {
      nickname: nickname.value,
      occasion: occasion.value,
      currency: normalizeCurrency(currency.value),
      budgetMin: budgetMin.value,
      budgetMax: budgetMax.value,
      likes: likes.value,
      age: age.value,
      gender: gender.value,
      location: location.value,
      job: job.value,
      owns: owns.value,
      avoid: avoid.value,
      slots: slots.value,
      acceptedTitles: acceptedTitles.value,
      rejectedTitles: rejectedTitles.value,
    },
  };
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isBodyWithinLimit(body: string): boolean {
  return new TextEncoder().encode(body).length <= MAX_BODY_BYTES;
}
