"use client";

import {
  ChevronDown,
  Loader2,
  Plus,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { firstBriefError, type BriefErrors } from "@/lib/brief";
import {
  ALREADY_OWNS_OPTIONS,
  DO_NOT_WANT_OPTIONS,
  OCCASION_OPTIONS,
  QUICK_PRESETS,
} from "@/lib/presets";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import type { BriefFormState } from "@/lib/types";
import Chip from "./Chip";
import PrivacyNotice from "./PrivacyNotice";

interface IntakeFormProps {
  brief: BriefFormState;
  errors: BriefErrors;
  loading: boolean;
  onChange: (patch: Partial<BriefFormState>) => void;
  onSubmit: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="error-text" role="alert">
      {message}
    </p>
  );
}

function toggleValue(list: string[], value: string): string[] {
  const normalized = value.toLowerCase();
  const exists = list.some((item) => item.toLowerCase() === normalized);
  return exists
    ? list.filter((item) => item.toLowerCase() !== normalized)
    : [...list, value];
}

function addValue(list: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const normalized = trimmed.toLowerCase();
  if (list.some((item) => item.toLowerCase() === normalized)) return list;
  return [...list, trimmed];
}

export default function IntakeForm({
  brief,
  errors,
  loading,
  onChange,
  onSubmit,
}: IntakeFormProps) {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [ownsCustom, setOwnsCustom] = useState("");
  const [avoidCustom, setAvoidCustom] = useState("");

  useEffect(() => {
    const field = firstBriefError(errors);
    if (!field) return;
    const element = document.getElementById(`brief-${field}`);
    if (element instanceof HTMLElement) {
      element.focus();
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors]);

  const customOwns = brief.owns.filter(
    (item) =>
      !ALREADY_OWNS_OPTIONS.some((option) => option.toLowerCase() === item.toLowerCase()),
  );
  const customAvoid = brief.avoid.filter(
    (item) =>
      !DO_NOT_WANT_OPTIONS.some((option) => option.toLowerCase() === item.toLowerCase()),
  );

  const isCustomOccasion =
    brief.occasion.length > 0 &&
    !OCCASION_OPTIONS.some((option) => option === brief.occasion);

  function applyPreset(presetId: string) {
    const preset = QUICK_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    onChange({
      ...preset.values,
      currencyCustom: "",
      age: "",
      gender: "",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function addCustomOwn() {
    onChange({ owns: addValue(brief.owns, ownsCustom) });
    setOwnsCustom("");
  }

  function addCustomAvoid() {
    onChange({ avoid: addValue(brief.avoid, avoidCustom) });
    setAvoidCustom("");
  }

  return (
    <main className="shell py-6 md:py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <span className="eyebrow">Step 01 / Recipient brief</span>
            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Gift Finder Workspace
            </h1>
            <p className="text-sm leading-6 text-muted">
              Shape a thoughtful brief with quick presets or your own details. We&apos;ll
              suggest five options inside your budget — then you narrow to 2–3.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Quick-start presets
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm transition-colors hover:border-secondary/40 hover:bg-secondary-wash hover:text-secondary"
                  aria-label={`Use preset: ${preset.label}`}
                >
                  <span aria-hidden="true">{preset.emoji}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <form
            id="brief-form"
            onSubmit={handleSubmit}
            noValidate
            className="card flex flex-col gap-5 p-4 sm:p-5 lg:col-span-7 lg:p-6"
          >
            <PrivacyNotice compact />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="brief-nickname" className="label">
                  Recipient nickname / label
                </label>
                <input
                  id="brief-nickname"
                  value={brief.nickname}
                  onChange={(event) => onChange({ nickname: event.target.value })}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="e.g. The Coffee Purist, Desk Neighbor"
                  className={`input ${errors.nickname ? "input-error" : ""}`}
                  aria-invalid={Boolean(errors.nickname)}
                  aria-describedby={errors.nickname ? "brief-nickname-error" : undefined}
                />
                <span id="brief-nickname-error">
                  <FieldError message={errors.nickname} />
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="label">Occasion</span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Occasion">
                  {OCCASION_OPTIONS.map((occasion) => (
                    <Chip
                      key={occasion}
                      selected={brief.occasion === occasion}
                      onClick={() => onChange({ occasion })}
                      className="px-3 py-1.5 text-[11px]"
                    >
                      {occasion}
                    </Chip>
                  ))}
                </div>
                <input
                  id="brief-occasion"
                  value={isCustomOccasion ? brief.occasion : ""}
                  onChange={(event) => onChange({ occasion: event.target.value })}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Or type a custom occasion"
                  className={`input mt-1 py-2 text-sm ${
                    errors.occasion ? "input-error" : ""
                  }`}
                  aria-invalid={Boolean(errors.occasion)}
                />
                <FieldError message={errors.occasion} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label">Budget range &amp; currency</span>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-currency" className="hint">
                    Currency
                  </label>
                  <select
                    id="brief-currency"
                    value={brief.currency}
                    onChange={(event) => onChange({ currency: event.target.value })}
                    className={`input cursor-pointer py-2.5 ${errors.currency ? "input-error" : ""}`}
                    aria-invalid={Boolean(errors.currency)}
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom…</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-budgetMin" className="hint">
                    Min
                  </label>
                  <input
                    id="brief-budgetMin"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10_000_000}
                    step="any"
                    value={brief.budgetMin}
                    onChange={(event) => onChange({ budgetMin: event.target.value })}
                    placeholder="1500"
                    className={`input py-2.5 ${errors.budgetMin ? "input-error" : ""}`}
                    aria-invalid={Boolean(errors.budgetMin)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-budgetMax" className="hint">
                    Max
                  </label>
                  <input
                    id="brief-budgetMax"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10_000_000}
                    step="any"
                    value={brief.budgetMax}
                    onChange={(event) => onChange({ budgetMax: event.target.value })}
                    placeholder="4000"
                    className={`input py-2.5 ${errors.budgetMax ? "input-error" : ""}`}
                    aria-invalid={Boolean(errors.budgetMax)}
                  />
                </div>
              </div>

              {brief.currency === "CUSTOM" ? (
                <input
                  id="brief-currency-custom"
                  value={brief.currencyCustom}
                  onChange={(event) => onChange({ currencyCustom: event.target.value })}
                  maxLength={12}
                  autoComplete="off"
                  placeholder="Currency code, e.g. AED or CHF"
                  className={`input mt-1 py-2 text-sm ${errors.currency ? "input-error" : ""}`}
                  aria-label="Custom currency code"
                />
              ) : null}

              <FieldError message={errors.currency} />
              <FieldError message={errors.budgetMin} />
              <FieldError message={errors.budgetMax} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="brief-likes" className="label">
                Likes &amp; interests
              </label>
              <textarea
                id="brief-likes"
                value={brief.likes}
                onChange={(event) => onChange({ likes: event.target.value })}
                rows={3}
                maxLength={1200}
                placeholder="What lights them up? Hobbies, routines, style, favourite treats…"
                className={`input resize-y ${errors.likes ? "input-error" : ""}`}
                aria-invalid={Boolean(errors.likes)}
              />
              <div className="flex items-center justify-between gap-2">
                <FieldError message={errors.likes} />
                <span className="ml-auto text-[10px] tabular-nums text-muted/70">
                  {brief.likes.length}/1200
                </span>
              </div>
            </div>

            <div className="surface-wash p-3.5">
              <button
                type="button"
                onClick={() => setOptionalOpen((value) => !value)}
                aria-expanded={optionalOpen}
                aria-controls="optional-details"
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Optional details
                  </span>
                  <span className="block text-xs text-muted">
                    Age, gender, location, job / role — skip anything you don&apos;t know.
                  </span>
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-muted transition-transform md:hidden ${
                    optionalOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div
                id="optional-details"
                className={`grid-cols-1 gap-2.5 pt-3 sm:grid-cols-2 ${
                  optionalOpen ? "grid" : "hidden md:grid"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-age" className="hint">
                    Age or age bracket
                  </label>
                  <input
                    id="brief-age"
                    value={brief.age}
                    onChange={(event) => onChange({ age: event.target.value })}
                    maxLength={120}
                    placeholder="e.g. Late 20s"
                    className={`input py-2 text-sm ${errors.age ? "input-error" : ""}`}
                  />
                  <FieldError message={errors.age} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-gender" className="hint">
                    Gender / pronouns
                  </label>
                  <input
                    id="brief-gender"
                    value={brief.gender}
                    onChange={(event) => onChange({ gender: event.target.value })}
                    maxLength={120}
                    placeholder="Optional"
                    className={`input py-2 text-sm ${errors.gender ? "input-error" : ""}`}
                  />
                  <FieldError message={errors.gender} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-location" className="hint">
                    Location / climate
                  </label>
                  <input
                    id="brief-location"
                    value={brief.location}
                    onChange={(event) => onChange({ location: event.target.value })}
                    maxLength={120}
                    placeholder="e.g. Rainy city, Bengaluru"
                    className={`input py-2 text-sm ${errors.location ? "input-error" : ""}`}
                  />
                  <FieldError message={errors.location} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="brief-job" className="hint">
                    Job / role
                  </label>
                  <input
                    id="brief-job"
                    value={brief.job}
                    onChange={(event) => onChange({ job: event.target.value })}
                    maxLength={120}
                    placeholder="e.g. Product designer"
                    className={`input py-2 text-sm ${errors.job ? "input-error" : ""}`}
                  />
                  <FieldError message={errors.job} />
                </div>
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="card flex flex-col gap-5 p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-ink">Already owns</span>
                    <p className="mt-0.5 text-xs leading-5 text-muted">
                      Tap to exclude items already on their shelf.
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary-wash px-2 py-0.5 text-[10px] font-bold text-secondary">
                    {brief.owns.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Already owns">
                  {ALREADY_OWNS_OPTIONS.map((item) => (
                    <Chip
                      key={item}
                      selected={brief.owns.some(
                        (value) => value.toLowerCase() === item.toLowerCase(),
                      )}
                      onClick={() => onChange({ owns: toggleValue(brief.owns, item) })}
                      className="px-3 py-1.5 text-[11px]"
                    >
                      {item}
                    </Chip>
                  ))}
                  {customOwns.map((item) => (
                    <span key={item} className="chip chip-selected px-3 py-1.5 text-[11px]">
                      {item}
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            owns: brief.owns.filter((value) => value !== item),
                          })
                        }
                        className="rounded-full p-0.5 hover:bg-white/20"
                        aria-label={`Remove ${item} from already owns`}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={ownsCustom}
                    onChange={(event) => setOwnsCustom(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomOwn();
                      }
                    }}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="Add a custom item they own…"
                    className="input py-2 text-sm"
                    aria-label="Add a custom item they already own"
                  />
                  <button
                    type="button"
                    onClick={addCustomOwn}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:text-ink"
                    aria-label="Add custom already-owned item"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="divider" />

              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-ink">Do not want</span>
                    <p className="mt-0.5 text-xs leading-5 text-muted">
                      Filter out categories that tend to miss the mark.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-wash px-2 py-0.5 text-[10px] font-bold text-primary">
                    {brief.avoid.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Do not want">
                  {DO_NOT_WANT_OPTIONS.map((item) => (
                    <Chip
                      key={item}
                      variant="reject"
                      selected={brief.avoid.some(
                        (value) => value.toLowerCase() === item.toLowerCase(),
                      )}
                      onClick={() => onChange({ avoid: toggleValue(brief.avoid, item) })}
                      className="px-3 py-1.5 text-[11px]"
                    >
                      {item}
                    </Chip>
                  ))}
                  {customAvoid.map((item) => (
                    <span key={item} className="chip chip-reject px-3 py-1.5 text-[11px]">
                      {item}
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            avoid: brief.avoid.filter((value) => value !== item),
                          })
                        }
                        className="rounded-full p-0.5 hover:bg-white/20"
                        aria-label={`Remove ${item} from do not want`}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={avoidCustom}
                    onChange={(event) => setAvoidCustom(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomAvoid();
                      }
                    }}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="Add a custom item to avoid…"
                    className="input py-2 text-sm"
                    aria-label="Add a custom item to avoid"
                  />
                  <button
                    type="button"
                    onClick={addCustomAvoid}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:text-ink"
                    aria-label="Add custom item to avoid"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="card flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-wash text-primary">
                  <Wand2 className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">What happens next</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    You&apos;ll get 5 ideas in your budget. Accept 2–3, reject the rest,
                    and replace only the rejected slots until the shortlist feels right.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                form="brief-form"
                disabled={loading}
                className="btn btn-primary w-full py-3.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Finding 5 ideas…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Find 5 Gift Ideas
                  </>
                )}
              </button>
              <p className="text-center text-[11px] leading-5 text-muted">
                Nothing is saved to a database. Refreshing clears the workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
