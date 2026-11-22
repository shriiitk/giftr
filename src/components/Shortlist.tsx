"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Search,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { buildShareTitle, buildShortlistSummary } from "@/lib/summary";
import { copyText, shareText } from "@/lib/clipboard";
import { formatBudgetRange, formatMoney } from "@/lib/currency";
import type { ActiveBrief, GiftIdea } from "@/lib/types";
import { MIN_FINALISTS } from "@/lib/types";
import { safeExternalUrl } from "@/lib/url";
import type { ToastMessage } from "./Toast";

interface ShortlistProps {
  brief: ActiveBrief;
  ideas: GiftIdea[];
  note: string;
  onNoteChange: (note: string) => void;
  onBack: () => void;
  onRemove: (id: string) => void;
  onToast: (toast: ToastMessage) => void;
}

export default function Shortlist({
  brief,
  ideas,
  note,
  onNoteChange,
  onBack,
  onRemove,
  onToast,
}: ShortlistProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const sorted = [...ideas].sort((a, b) => a.slot - b.slot);
  const total = sorted.reduce((sum, idea) => sum + (idea.estimatedPrice ?? 0), 0);
  const summary = buildShortlistSummary({ brief, ideas: sorted, note });

  async function handleCopy() {
    const ok = await copyText(summary);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      onToast({ message: "Summary copied. Paste it into your notes or a chat.", tone: "success" });
    } else {
      onToast({
        message: "Could not copy automatically. Select the preview text and copy it.",
        tone: "error",
      });
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const outcome = await shareText(buildShareTitle(brief), summary);
      if (outcome === "shared") {
        onToast({ message: "Shortlist shared.", tone: "success" });
      } else if (outcome === "cancelled") {
        // The user dismissed the native share sheet; no follow-up needed.
      } else if (outcome === "copied") {
        onToast({
          message: "Sharing isn't available here, so the summary was copied instead.",
          tone: "info",
        });
      } else {
        onToast({
          message: "Could not share or copy. Select the preview text and copy it manually.",
          tone: "error",
        });
      }
    } finally {
      setSharing(false);
    }
  }

  if (sorted.length < MIN_FINALISTS) {
    return (
      <main className="shell py-10 md:py-16">
        <div className="card mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-primary-wash text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-ink">Accept 2–3 ideas first</h1>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Your shortlist needs at least {MIN_FINALISTS} accepted ideas. Head back to the
            5-slot board and lock in your favourites.
          </p>
          <button type="button" onClick={onBack} className="btn btn-primary mt-2">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to the board
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell py-6 pb-28 md:py-10 md:pb-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <span className="eyebrow text-secondary">Step 03 / Ready to share</span>
            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Final shortlist &amp; share
            </h1>
            <p className="text-sm leading-6 text-muted">
              Review your {sorted.length} finalists for {brief.nickname}, refine the
              personal note, then copy or share a clean summary.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onBack} className="btn btn-soft btn-sm">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to board
            </button>
            <div className="rounded-xl border border-secondary/20 bg-secondary-wash px-4 py-2.5 text-secondary">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em]">
                Estimated total
              </span>
              <span className="text-xl font-bold tracking-tight">
                {formatMoney(total, brief.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="flex flex-col gap-3 lg:col-span-7">
            {sorted.map((idea, index) => {
              const exactUrl = safeExternalUrl(idea.exactUrl);
              const searchUrl = safeExternalUrl(idea.searchUrl);
              const shopUrl = safeExternalUrl(idea.shopUrl) ?? searchUrl;
              return (
                <article key={idea.id} className="card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                          Slot {String(idea.slot).padStart(2, "0")}
                        </span>
                        <h2 className="text-lg font-semibold leading-snug tracking-tight text-ink">
                          {idea.title}
                        </h2>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-wash px-2.5 py-1 text-xs font-bold text-primary">
                      {formatMoney(idea.estimatedPrice, idea.currency || brief.currency)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-muted">{idea.description}</p>

                  <div className="mt-3 rounded-lg bg-secondary-wash/60 px-3 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Why it fits
                    </span>
                    <p className="mt-0.5 text-xs leading-5 text-ink/80">{idea.whyItFits}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={exactUrl ?? shopUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-soft btn-sm"
                      title={exactUrl ? "Open the product page" : "Search this item on Amazon"}
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      {exactUrl ? "Product page" : "Find on Amazon"}
                    </a>
                    <a
                      href={searchUrl ?? shopUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-soft btn-sm"
                    >
                      <Search className="size-3.5" aria-hidden="true" />
                      Check options
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemove(idea.id)}
                      className="btn btn-ghost btn-sm ml-auto text-muted hover:text-ink"
                    >
                      <Undo2 className="size-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}

            <p className="rounded-lg border border-line/70 bg-[#FBF8F3] px-3 py-2.5 text-[11px] leading-5 text-muted">
              <strong className="font-bold text-ink">Prices are estimates.</strong>{" "}
              Use <span className="font-semibold text-ink">Find on Amazon</span> or{" "}
              <span className="font-semibold text-ink">Check options</span> to verify the
              live price and availability before buying.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="card flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="shortlist-note" className="text-sm font-semibold text-ink">
                  Editable “Why it fits” note
                </label>
                <span className="text-[10px] tabular-nums text-muted">
                  {note.length}/600
                </span>
              </div>
              <textarea
                id="shortlist-note"
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Why do these picks suit this person? Add a taste insight you can reuse next time."
                className="input resize-y"
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Plaintext summary preview
                </span>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-line/70 bg-[#FBF8F3] p-3 font-sans text-[11px] leading-5 text-ink/80">
                  {summary}
                </pre>
              </div>

              <div className="hidden gap-2 md:flex">
                <button type="button" onClick={handleCopy} className="btn btn-primary flex-1">
                  {copied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copied ? "Copied!" : "Copy summary"}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing}
                  className="btn bg-secondary text-white hover:bg-secondary-soft"
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  Share
                </button>
              </div>
            </div>

            <div className="surface-wash p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Budget context
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatBudgetRange(brief.budgetMin, brief.budgetMax, brief.currency)}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {brief.occasion} · {sorted.length} finalists · estimates only
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-3 z-30 md:hidden">
          <div className="card grid grid-cols-2 gap-2 p-3 shadow-sheet">
            <button type="button" onClick={handleCopy} className="btn btn-primary">
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied!" : "Copy summary"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="btn bg-secondary text-white hover:bg-secondary-soft"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
