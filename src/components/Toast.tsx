"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-accepted/25 bg-white text-ink",
  error: "border-rejected/25 bg-white text-ink",
  info: "border-line bg-white text-ink",
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const Icon =
    toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info;
  const iconColor =
    toast.tone === "success"
      ? "text-accepted"
      : toast.tone === "error"
        ? "text-rejected"
        : "text-secondary";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 shadow-sheet animate-fade-up md:bottom-6 ${TONE_STYLES[toast.tone]}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <p className="flex-1 text-sm leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-muted transition-colors hover:bg-line/60 hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
