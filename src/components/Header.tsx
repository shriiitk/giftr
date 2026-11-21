"use client";

import {
  ArrowRight,
  Grid2X2,
  ListChecks,
  Loader2,
  LogOut,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { WorkspaceView } from "@/lib/types";
import Brand from "./Brand";

interface HeaderProps {
  authenticated: boolean;
  email?: string;
  view?: WorkspaceView;
  hasIdeas?: boolean;
  acceptedCount?: number;
  loggingOut?: boolean;
  onNavigate?: (view: WorkspaceView) => void;
  onReset?: () => void;
  onLogout?: () => void;
}

const STEPS: Array<{
  view: WorkspaceView;
  label: string;
  shortLabel: string;
  number: string;
}> = [
  { view: "intake", label: "Find Ideas", shortLabel: "Find Ideas", number: "01" },
  { view: "grid", label: "5-Slot Grid", shortLabel: "5-Slot Grid", number: "02" },
  { view: "shortlist", label: "Shortlist", shortLabel: "Shortlist", number: "03" },
];

export default function Header({
  authenticated,
  email,
  view = "intake",
  hasIdeas = false,
  acceptedCount = 0,
  loggingOut = false,
  onNavigate,
  onReset,
  onLogout,
}: HeaderProps) {
  if (!authenticated) {
    return (
      <header className="shell flex items-center justify-between gap-4 py-4">
        <Brand />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-muted shadow-sm">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Private invitation
        </span>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      <div className="shell flex items-center justify-between gap-3 py-3">
        <Brand />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className="hidden max-w-[16rem] truncate rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-muted shadow-sm lg:inline"
            title={email}
          >
            {email}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="btn btn-soft btn-sm shadow-sm"
            aria-label="New person or reset workspace"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">New Person / Reset</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="grid size-9 place-items-center rounded-full border border-line bg-white text-muted shadow-sm transition-colors hover:text-ink disabled:opacity-50"
            aria-label="Sign out"
            title="Sign out"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-line/60 bg-[#F6F3EE]/70">
        <div className="shell no-scrollbar flex items-center gap-1.5 overflow-x-auto py-2">
          {STEPS.map((step) => {
            const active = view === step.view;
            const disabled =
              (step.view === "grid" && !hasIdeas) ||
              (step.view === "shortlist" && acceptedCount < 2);
            const label =
              step.view === "shortlist"
                ? `${step.shortLabel} (${acceptedCount}/3)`
                : step.label;

            return (
              <button
                key={step.view}
                type="button"
                onClick={() => onNavigate?.(step.view)}
                disabled={disabled}
                aria-current={active ? "step" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "border border-line bg-white text-muted hover:text-ink"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <span className="mr-1.5 opacity-65">{step.number}</span>
                {label}
              </button>
            );
          })}

          <div className="ml-auto hidden shrink-0 items-center gap-2 pl-3 md:flex">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <ListChecks className="size-3.5 text-secondary" aria-hidden="true" />
              {acceptedCount} of 2–3 finalists
            </span>
            <span className="text-line" aria-hidden="true">
              |
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <Grid2X2 className="size-3.5 text-primary" aria-hidden="true" />
              {hasIdeas ? "5-slot board active" : "Brief not submitted"}
            </span>
            <ArrowRight className="size-3.5 text-line" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
