"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { REJECTION_REASONS } from "@/lib/types";
import type { GiftIdea } from "@/lib/types";
import { safeExternalUrl } from "@/lib/url";
import Chip from "./Chip";

interface IdeaCardProps {
  idea: GiftIdea;
  fallbackCurrency: string;
  acceptLimitReached: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onReason: (id: string, reason: string | null) => void;
}

const STATUS_META = {
  reviewing: {
    label: "Reviewing",
    className: "status-reviewing",
    icon: null,
  },
  accepted: {
    label: "Accepted",
    className: "status-accepted",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "status-rejected",
    icon: XCircle,
  },
} as const;

export default function IdeaCard({
  idea,
  fallbackCurrency,
  acceptLimitReached,
  onAccept,
  onReject,
  onReason,
}: IdeaCardProps) {
  const meta = STATUS_META[idea.status];
  const StatusIcon = meta.icon;
  const exactUrl = safeExternalUrl(idea.exactUrl);
  const accepted = idea.status === "accepted";
  const rejected = idea.status === "rejected";
  const acceptDisabled = acceptLimitReached && !accepted;

  return (
    <article
      className={`card flex h-full flex-col justify-between gap-4 p-4 transition-colors sm:p-5 ${
        accepted
          ? "border-secondary/40 bg-secondary-wash/20"
          : rejected
            ? "border-rejected/20"
            : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Slot {String(idea.slot).padStart(2, "0")}
          </span>
          <span className={`status ${meta.className}`}>
            {StatusIcon ? <StatusIcon className="size-3" aria-hidden="true" /> : null}
            {meta.label}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">
            {idea.title}
          </h3>
          <span className="shrink-0 rounded-full bg-primary-wash px-2.5 py-1 text-xs font-bold text-primary">
            {formatMoney(idea.estimatedPrice, idea.currency || fallbackCurrency)}
          </span>
        </div>

        <p className="text-sm leading-6 text-muted">{idea.description}</p>

        <div className="surface-wash p-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
            Why it fits
          </span>
          <p className="mt-1 text-xs leading-5 text-ink/80">{idea.whyItFits}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          {exactUrl ? (
            <a
              href={exactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft btn-sm w-full"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Exact link
            </a>
          ) : (
            <span
              className="btn btn-soft btn-sm w-full cursor-not-allowed opacity-55"
              aria-disabled="true"
              title="No exact product link was returned for this idea"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              No exact link
            </span>
          )}
          <a
            href={idea.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-soft btn-sm w-full"
          >
            <Search className="size-3.5" aria-hidden="true" />
            Search link
          </a>
        </div>

        <div className="flex items-start gap-1.5 rounded-lg border border-line/70 bg-[#FBF8F3] px-2.5 py-2 text-[10px] leading-4 text-muted">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="font-bold text-ink">
              Verify link &amp; live price yourself before buying.
            </strong>{" "}
            Estimates can change or be inaccurate.
          </span>
        </div>

        {rejected ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Optional reason
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rejection reason">
              {REJECTION_REASONS.map((reason) => (
                <Chip
                  key={reason}
                  selected={idea.rejectionReason === reason}
                  variant="reject"
                  onClick={() =>
                    onReason(idea.id, idea.rejectionReason === reason ? null : reason)
                  }
                  className="px-2.5 py-1 text-[10px]"
                >
                  {reason}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAccept(idea.id)}
            disabled={acceptDisabled}
            aria-pressed={accepted}
            title={
              acceptDisabled
                ? "You can lock up to 3 finalists. Reject one first."
                : accepted
                  ? "Move this idea back to reviewing"
                  : "Accept this idea for the shortlist"
            }
            className={`btn btn-sm w-full ${
              accepted ? "bg-secondary text-white hover:bg-secondary-soft" : "btn-soft"
            }`}
          >
            {accepted ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
            {accepted ? "Accepted" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => onReject(idea.id)}
            aria-pressed={rejected}
            className={`btn btn-sm w-full ${
              rejected ? "bg-rejected text-white hover:bg-rejected/90" : "btn-soft"
            }`}
          >
            <X className="size-3.5" aria-hidden="true" />
            {rejected ? "Rejected" : "Reject"}
          </button>
        </div>
      </div>
    </article>
  );
}
