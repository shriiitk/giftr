"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ActiveBrief, GiftIdea } from "@/lib/types";
import { MAX_FINALISTS, MIN_FINALISTS } from "@/lib/types";
import IdeaCard from "./IdeaCard";

interface IdeaGridProps {
  brief: ActiveBrief;
  ideas: GiftIdea[];
  replacing: boolean;
  replacingSlots: number[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onReason: (id: string, reason: string | null) => void;
  onReplace: () => void;
  onViewShortlist: () => void;
}

function CardSkeleton({ slot }: { slot: number }) {
  return (
    <div className="card flex h-full min-h-[22rem] flex-col gap-4 p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Slot {String(slot).padStart(2, "0")}
        </span>
        <span className="status status-reviewing">
          <Loader2 className="size-3 animate-spin" />
          Replacing
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="h-5 w-4/5 animate-pulse rounded bg-line/70" />
        <div className="h-3.5 w-full animate-pulse rounded bg-line/50" />
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-line/50" />
      </div>
      <div className="h-20 animate-pulse rounded-xl bg-line/30" />
      <div className="mt-auto space-y-2">
        <div className="h-9 animate-pulse rounded-full bg-line/40" />
        <div className="h-9 animate-pulse rounded-full bg-line/30" />
      </div>
      <p className="text-center text-[11px] text-muted">Finding a fresh idea…</p>
    </div>
  );
}

export default function IdeaGrid({
  brief,
  ideas,
  replacing,
  replacingSlots,
  onAccept,
  onReject,
  onReason,
  onReplace,
  onViewShortlist,
}: IdeaGridProps) {
  const accepted = ideas.filter((idea) => idea.status === "accepted");
  const rejected = ideas.filter((idea) => idea.status === "rejected");
  const reviewing = ideas.filter((idea) => idea.status === "reviewing");
  const acceptedCount = accepted.length;
  const acceptLimitReached = acceptedCount >= MAX_FINALISTS;
  const canViewShortlist = acceptedCount >= MIN_FINALISTS;
  const sorted = [...ideas].sort((a, b) => a.slot - b.slot);

  return (
    <main className="shell py-6 pb-28 md:py-10 md:pb-24">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <span className="eyebrow">Step 02 / Curated 5-slot grid</span>
            <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              5 tailored ideas for{" "}
              <span className="text-primary">{brief.nickname}</span>
            </h1>
            <p className="text-sm leading-6 text-muted">
              Accept 2–3 favourites, or reject and replace any slot. Accepted cards stay
              pinned so you always compare five options until you lock your shortlist.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm">
              <CheckCircle2 className="size-3.5 text-accepted" aria-hidden="true" />
              {acceptedCount} accepted
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm">
              <XCircle className="size-3.5 text-rejected" aria-hidden="true" />
              {rejected.length} rejected
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm">
              <Sparkles className="size-3.5 text-muted" aria-hidden="true" />
              {reviewing.length} reviewing
            </span>
          </div>
        </div>

        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: MAX_FINALISTS }, (_, index) => (
                <span
                  key={index}
                  className={`size-2.5 rounded-full ${
                    index < acceptedCount ? "bg-secondary" : "bg-line"
                  }`}
                />
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink" aria-live="polite">
                {acceptedCount} of {MAX_FINALISTS} finalists locked
              </p>
              <p className="text-[11px] text-muted">
                {canViewShortlist
                  ? "Your shortlist is ready — or keep refining."
                  : `Accept at least ${MIN_FINALISTS} ideas to unlock the final shortlist.`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 sm:items-end">
            <span className="text-[11px] text-muted">
              Budget: {brief.currency} {brief.budgetMin.toLocaleString()}–
              {brief.budgetMax.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted/80">
              Saved in this browser · reset to clear
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-line/70 bg-[#FBF8F3] px-3.5 py-3 text-[11px] leading-5 text-muted">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="font-bold text-ink">Prices are estimates.</strong>{" "}
            Use <span className="font-semibold text-ink">Find on Amazon</span> or{" "}
            <span className="font-semibold text-ink">Check options</span> to verify the
            live price, availability, and exact product before buying.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((idea) =>
            replacingSlots.includes(idea.slot) ? (
              <CardSkeleton key={`skeleton-${idea.slot}`} slot={idea.slot} />
            ) : (
              <IdeaCard
                key={idea.id}
                idea={idea}
                fallbackCurrency={brief.currency}
                acceptLimitReached={acceptLimitReached}
                onAccept={onAccept}
                onReject={onReject}
                onReason={onReason}
              />
            ),
          )}
        </div>

        <div className="sticky bottom-3 z-30">
          <div className="card flex flex-col gap-3 p-3 shadow-sheet sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-ink">
                {rejected.length > 0
                  ? `${rejected.length} rejected slot${rejected.length === 1 ? "" : "s"} ready to refill`
                  : "Reject any slot to unlock replacement"}
              </span>
              <span className="text-[11px] leading-4 text-muted">
                Replacement refills only rejected slots — accepted cards stay intact.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                onClick={onReplace}
                disabled={rejected.length === 0 || replacing}
                className="btn btn-soft btn-sm justify-center"
              >
                {replacing ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                )}
                Replace rejected
              </button>
              <button
                type="button"
                onClick={onViewShortlist}
                disabled={!canViewShortlist}
                className="btn btn-primary btn-sm justify-center"
                title={
                  canViewShortlist
                    ? "Open the final shortlist"
                    : "Accept 2–3 ideas to unlock the shortlist"
                }
              >
                View shortlist ({acceptedCount})
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
