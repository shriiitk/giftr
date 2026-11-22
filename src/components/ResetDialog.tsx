"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ResetDialogProps {
  open: boolean;
  currencyLabel: string;
  location: string;
  onClose: () => void;
  onConfirm: (keepDefaults: boolean) => void;
}

export default function ResetDialog({
  open,
  currencyLabel,
  location,
  onClose,
  onConfirm,
}: ResetDialogProps) {
  const keepRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-sheet animate-fade-up sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Start fresh</span>
            <h2 id="reset-dialog-title" className="mt-1 text-xl font-semibold text-ink">
              Start a new person?
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-line/60 hover:text-ink"
            aria-label="Close reset dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p id="reset-dialog-description" className="mt-3 text-sm leading-6 text-muted">
          This clears the recipient brief, all 5 cards, your finalists, the “Why it fits”
          note, and the workspace saved in this browser. You will stay signed in on this
          device.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#FBF8F3] p-3.5">
          <input
            ref={keepRef}
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line text-primary accent-primary"
          />
          <span className="text-sm leading-5 text-ink">
            Keep my currency &amp; location defaults
            <span className="mt-0.5 block text-xs text-muted">
              {currencyLabel || "No currency set"}
              {location ? ` · ${location}` : ""}
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-ghost border border-line">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(keepRef.current?.checked ?? false)}
            className="btn btn-primary"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset workspace
          </button>
        </div>
      </div>
    </div>
  );
}
