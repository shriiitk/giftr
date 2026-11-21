"use client";

import { AlertCircle, LogIn, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createEmptyBrief, validateBriefForm, type BriefErrors } from "@/lib/brief";
import { currencyLabel } from "@/lib/currency";
import type {
  ActiveBrief,
  BriefFormState,
  GeneratedIdeaDTO,
  GiftIdea,
  IdeasRoundResponse,
  WorkspaceView,
} from "@/lib/types";
import { MAX_FINALISTS, MIN_FINALISTS, SLOT_COUNT } from "@/lib/types";
import Header from "./Header";
import IdeaGrid from "./IdeaGrid";
import IntakeForm from "./IntakeForm";
import ResetDialog from "./ResetDialog";
import Shortlist from "./Shortlist";
import Toast, { type ToastMessage } from "./Toast";

class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

function createIdeaId(slot: number): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `slot-${slot}-${random}`;
}

function toGiftIdea(dto: GeneratedIdeaDTO): GiftIdea {
  return {
    id: createIdeaId(dto.slot),
    slot: dto.slot,
    title: dto.title,
    description: dto.description,
    estimatedPrice: dto.estimatedPrice,
    currency: dto.currency,
    whyItFits: dto.whyItFits,
    exactUrl: dto.exactUrl,
    searchUrl: dto.searchUrl,
    status: "reviewing",
    rejectionReason: null,
  };
}

async function requestIdeas(
  brief: ActiveBrief,
  slots: number[],
  currentIdeas: GiftIdea[],
): Promise<GeneratedIdeaDTO[]> {
  const response = await fetch("/api/ideas/round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: brief.nickname,
      occasion: brief.occasion,
      currency: brief.currency,
      budgetMin: brief.budgetMin,
      budgetMax: brief.budgetMax,
      likes: brief.likes,
      age: brief.age ?? "",
      gender: brief.gender ?? "",
      location: brief.location ?? "",
      job: brief.job ?? "",
      owns: brief.owns,
      avoid: brief.avoid,
      slots,
      acceptedTitles: currentIdeas
        .filter((idea) => idea.status === "accepted")
        .map((idea) => idea.title),
      rejectedTitles: currentIdeas
        .filter((idea) => idea.status === "rejected")
        .map((idea) => idea.title),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<IdeasRoundResponse> & {
    error?: string;
  };

  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Could not generate ideas. Please try again.");
  }

  const ideas = Array.isArray(data.ideas) ? data.ideas : [];
  if (ideas.length !== slots.length) {
    throw new Error("The gift provider returned an unexpected number of ideas. Try again.");
  }

  return ideas;
}

interface WorkspaceProps {
  initialEmail: string;
}

export default function Workspace({ initialEmail }: WorkspaceProps) {
  const router = useRouter();

  const [brief, setBrief] = useState<BriefFormState>(() => createEmptyBrief());
  const [briefErrors, setBriefErrors] = useState<BriefErrors>({});
  const [activeBrief, setActiveBrief] = useState<ActiveBrief | null>(null);
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [note, setNote] = useState("");
  const [view, setView] = useState<WorkspaceView>("intake");

  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [replacingSlots, setReplacingSlots] = useState<number[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const accepted = ideas.filter((idea) => idea.status === "accepted");
  const acceptedCount = accepted.length;

  const pushToast = useCallback((next: ToastMessage) => setToast(next), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeReset = useCallback(() => setResetOpen(false), []);

  function handleError(cause: unknown) {
    if (cause instanceof SessionExpiredError) {
      setSessionExpired(true);
      setError("Your session expired. Sign in again to keep curating.");
      return;
    }
    const message =
      cause instanceof TypeError
        ? "Could not reach the server. Check your connection and try again."
        : cause instanceof Error
          ? cause.message
          : "Something went wrong. Check your connection and try again.";
    setError(message);
    pushToast({ message, tone: "error" });
  }

  function handleBriefChange(patch: Partial<BriefFormState>) {
    setBrief((previous) => ({ ...previous, ...patch }));
    setBriefErrors({});
  }

  async function handleSubmit() {
    if (loading) return;

    const validation = validateBriefForm(brief);
    if (!validation.ok) {
      setBriefErrors(validation.errors);
      pushToast({
        message: "Check the highlighted fields and try again.",
        tone: "error",
      });
      return;
    }

    setBriefErrors({});
    setError(null);
    setLoading(true);

    try {
      const slots = Array.from({ length: SLOT_COUNT }, (_, index) => index + 1);
      const dtos = await requestIdeas(validation.brief, slots, []);
      setActiveBrief(validation.brief);
      setIdeas(dtos.map(toGiftIdea));
      setNote("");
      setView("grid");
      pushToast({
        message: "5 ideas ready. Accept 2–3 favourites to build your shortlist.",
        tone: "success",
      });
    } catch (cause) {
      handleError(cause);
    } finally {
      setLoading(false);
    }
  }

  function handleAccept(id: string) {
    const target = ideas.find((idea) => idea.id === id);
    if (!target) return;

    if (target.status === "accepted") {
      setIdeas((previous) =>
        previous.map((idea) =>
          idea.id === id
            ? { ...idea, status: "reviewing", rejectionReason: null }
            : idea,
        ),
      );
      return;
    }

    if (acceptedCount >= MAX_FINALISTS) {
      pushToast({
        message: "You can lock up to 3 finalists. Reject or un-accept one first.",
        tone: "info",
      });
      return;
    }

    setIdeas((previous) =>
      previous.map((idea) =>
        idea.id === id
          ? { ...idea, status: "accepted", rejectionReason: null }
          : idea,
      ),
    );
  }

  function handleReject(id: string) {
    setIdeas((previous) =>
      previous.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              status: idea.status === "rejected" ? "reviewing" : "rejected",
              rejectionReason: null,
            }
          : idea,
      ),
    );
  }

  function handleReason(id: string, reason: string | null) {
    setIdeas((previous) =>
      previous.map((idea) =>
        idea.id === id ? { ...idea, rejectionReason: reason } : idea,
      ),
    );
  }

  async function handleReplace() {
    if (!activeBrief || replacing) return;

    const rejected = ideas.filter((idea) => idea.status === "rejected");
    if (rejected.length === 0) {
      pushToast({ message: "Reject a card first, then replace it.", tone: "info" });
      return;
    }

    const slots = rejected.map((idea) => idea.slot);
    setReplacing(true);
    setReplacingSlots(slots);
    setError(null);

    try {
      const dtos = await requestIdeas(activeBrief, slots, ideas);
      const replacements = new Map<number, GiftIdea>();
      for (const dto of dtos) {
        replacements.set(dto.slot, toGiftIdea(dto));
      }

      setIdeas((previous) =>
        previous
          .map((idea) => replacements.get(idea.slot) ?? idea)
          .sort((a, b) => a.slot - b.slot),
      );
      pushToast({
        message: `Refreshed ${slots.length} rejected slot${
          slots.length === 1 ? "" : "s"
        }. Accepted cards stayed in place.`,
        tone: "success",
      });
    } catch (cause) {
      handleError(cause);
    } finally {
      setReplacing(false);
      setReplacingSlots([]);
    }
  }

  function handleViewShortlist() {
    if (acceptedCount < MIN_FINALISTS) {
      pushToast({
        message: `Accept at least ${MIN_FINALISTS} ideas to unlock the shortlist.`,
        tone: "info",
      });
      return;
    }
    setView("shortlist");
  }

  function handleNavigate(next: WorkspaceView) {
    if (next === view) return;

    if (next === "grid" && ideas.length === 0) {
      pushToast({ message: "Generate your first 5 ideas from the brief.", tone: "info" });
      return;
    }
    if (next === "shortlist" && acceptedCount < MIN_FINALISTS) {
      pushToast({
        message: `Accept at least ${MIN_FINALISTS} ideas to open the shortlist.`,
        tone: "info",
      });
      return;
    }

    setView(next);
  }

  function handleRemoveFromShortlist(id: string) {
    const nextCount = acceptedCount - 1;
    setIdeas((previous) =>
      previous.map((idea) =>
        idea.id === id
          ? { ...idea, status: "reviewing", rejectionReason: null }
          : idea,
      ),
    );

    if (nextCount < MIN_FINALISTS) {
      setView("grid");
      pushToast({
        message: "Moved back to the board. Accept another idea to keep 2–3 finalists.",
        tone: "info",
      });
    } else {
      pushToast({ message: "Moved back to the board.", tone: "info" });
    }
  }

  function handleReset(keepDefaults: boolean) {
    const next = createEmptyBrief(
      keepDefaults
        ? {
            currency: brief.currency,
            currencyCustom: brief.currencyCustom,
            location: brief.location,
          }
        : {},
    );

    setBrief(next);
    setBriefErrors({});
    setActiveBrief(null);
    setIdeas([]);
    setNote("");
    setView("intake");
    setError(null);
    setSessionExpired(false);
    setResetOpen(false);
    pushToast({
      message: keepDefaults
        ? "Workspace cleared. Currency and location kept."
        : "Workspace cleared. Ready for a new person.",
      tone: "success",
    });
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.refresh();
    } catch {
      pushToast({ message: "Could not sign out. Please try again.", tone: "error" });
    } finally {
      setLoggingOut(false);
    }
  }

  const displayCurrency =
    brief.currency === "CUSTOM" ? brief.currencyCustom : brief.currency;

  return (
    <>
      <Header
        authenticated
        email={initialEmail}
        view={view}
        hasIdeas={ideas.length > 0}
        acceptedCount={acceptedCount}
        loggingOut={loggingOut}
        onNavigate={handleNavigate}
        onReset={() => setResetOpen(true)}
        onLogout={handleLogout}
      />

      {error ? (
        <div className="shell pt-4">
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 rounded-xl border border-rejected/20 bg-rejected-wash px-4 py-3 text-sm leading-6 text-rejected"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            {sessionExpired ? (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="btn btn-sm shrink-0 bg-white text-rejected hover:bg-white/80"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                Sign in again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-full p-1 transition-colors hover:bg-white/60"
                aria-label="Dismiss error"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ) : null}

      {view === "grid" && activeBrief ? (
        <IdeaGrid
          brief={activeBrief}
          ideas={ideas}
          replacing={replacing}
          replacingSlots={replacingSlots}
          onAccept={handleAccept}
          onReject={handleReject}
          onReason={handleReason}
          onReplace={handleReplace}
          onViewShortlist={handleViewShortlist}
        />
      ) : view === "shortlist" && activeBrief ? (
        <Shortlist
          brief={activeBrief}
          ideas={accepted}
          note={note}
          onNoteChange={setNote}
          onBack={() => setView("grid")}
          onRemove={handleRemoveFromShortlist}
          onToast={pushToast}
        />
      ) : (
        <IntakeForm
          brief={brief}
          errors={briefErrors}
          loading={loading}
          onChange={handleBriefChange}
          onSubmit={handleSubmit}
        />
      )}

      <ResetDialog
        open={resetOpen}
        currencyLabel={displayCurrency ? currencyLabel(displayCurrency) : ""}
        location={brief.location}
        onClose={closeReset}
        onConfirm={handleReset}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
