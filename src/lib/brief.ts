import { MAX_BUDGET } from "./types";
import type { ActiveBrief, BriefFormState } from "./types";
import { normalizeCurrency } from "./currency";

export type BriefField =
  | "nickname"
  | "occasion"
  | "likes"
  | "budgetMin"
  | "budgetMax"
  | "currency"
  | "age"
  | "gender"
  | "location"
  | "job";

export type BriefErrors = Partial<Record<BriefField, string>>;

export type BriefValidation =
  | { ok: true; brief: ActiveBrief; errors: BriefErrors }
  | { ok: false; errors: BriefErrors };

export function createEmptyBrief(overrides: Partial<BriefFormState> = {}): BriefFormState {
  return {
    nickname: "",
    occasion: "",
    currency: "INR",
    currencyCustom: "",
    budgetMin: "",
    budgetMax: "",
    likes: "",
    age: "",
    gender: "",
    location: "",
    job: "",
    owns: [],
    avoid: [],
    ...overrides,
  };
}

function resolvedCurrency(form: BriefFormState): string {
  return normalizeCurrency(
    form.currency === "CUSTOM" ? form.currencyCustom : form.currency,
  );
}

export function toActiveBrief(form: BriefFormState): ActiveBrief {
  const optional = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  return {
    nickname: form.nickname.trim(),
    occasion: form.occasion.trim(),
    currency: resolvedCurrency(form),
    budgetMin: Number.parseFloat(form.budgetMin),
    budgetMax: Number.parseFloat(form.budgetMax),
    likes: form.likes.trim(),
    age: optional(form.age),
    gender: optional(form.gender),
    location: optional(form.location),
    job: optional(form.job),
    owns: form.owns.map((item) => item.trim()).filter(Boolean),
    avoid: form.avoid.map((item) => item.trim()).filter(Boolean),
  };
}

export function validateBriefForm(form: BriefFormState): BriefValidation {
  const errors: BriefErrors = {};

  const nickname = form.nickname.trim();
  if (!nickname) errors.nickname = "Add a nickname or persona label.";
  else if (nickname.length > 80) errors.nickname = "Keep the label under 80 characters.";

  const occasion = form.occasion.trim();
  if (!occasion) errors.occasion = "Pick an occasion or type your own.";
  else if (occasion.length > 80) errors.occasion = "Keep the occasion under 80 characters.";

  const likes = form.likes.trim();
  if (!likes) errors.likes = "Share a few interests so ideas can be tailored.";
  else if (likes.length > 1200) errors.likes = "Keep likes under 1,200 characters.";

  const currency = resolvedCurrency(form);
  if (!currency) errors.currency = "Choose or enter a currency.";
  else if (currency.length > 12) errors.currency = "Use a short currency code.";

  const min = Number.parseFloat(form.budgetMin);
  const max = Number.parseFloat(form.budgetMax);

  if (!Number.isFinite(min)) errors.budgetMin = "Enter a minimum budget.";
  else if (min < 0) errors.budgetMin = "Minimum cannot be negative.";

  if (!Number.isFinite(max)) errors.budgetMax = "Enter a maximum budget.";
  else if (max <= 0) errors.budgetMax = "Maximum must be greater than zero.";
  else if (max > MAX_BUDGET) errors.budgetMax = "That maximum is unrealistically high.";

  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    errors.budgetMax = "Maximum must be at least the minimum.";
  }

  const optionalFields: Array<[BriefField, string]> = [
    ["age", form.age],
    ["gender", form.gender],
    ["location", form.location],
    ["job", form.job],
  ];
  for (const [field, value] of optionalFields) {
    if (value.trim().length > 120) {
      errors[field] = "Keep optional details under 120 characters.";
    }
  }

  if (form.owns.length > 20) errors.nickname = "Too many 'already owns' items.";
  if (form.avoid.length > 20) errors.likes = "Too many 'do not want' items.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, brief: toActiveBrief(form), errors: {} };
}

export function firstBriefError(errors: BriefErrors): BriefField | null {
  const order: BriefField[] = [
    "nickname",
    "occasion",
    "currency",
    "budgetMin",
    "budgetMax",
    "likes",
    "age",
    "gender",
    "location",
    "job",
  ];
  return order.find((field) => Boolean(errors[field])) ?? null;
}
