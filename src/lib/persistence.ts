import type {
  ActiveBrief,
  BriefFormState,
  GiftIdea,
  WorkspaceView,
} from "./types";

export const WORKSPACE_STORAGE_KEY = "giftr_workspace_v1";
const STORAGE_VERSION = 1;

/**
 * Scope the snapshot to the signed-in email so two friends sharing a browser
 * cannot see each other's brief. The email is already known client-side.
 */
export function workspaceStorageKey(email: string): string {
  return `${WORKSPACE_STORAGE_KEY}:${email.trim().toLowerCase()}`;
}

export interface WorkspaceSnapshot {
  brief: BriefFormState;
  activeBrief: ActiveBrief | null;
  ideas: GiftIdea[];
  note: string;
  view: WorkspaceView;
  rejectedTitles: string[];
}

interface PersistedWorkspace extends WorkspaceSnapshot {
  version: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBriefFormState(value: unknown): value is BriefFormState {
  if (!isRecord(value)) return false;
  return (
    typeof value.nickname === "string" &&
    typeof value.occasion === "string" &&
    typeof value.currency === "string" &&
    typeof value.currencyCustom === "string" &&
    typeof value.budgetMin === "string" &&
    typeof value.budgetMax === "string" &&
    typeof value.likes === "string" &&
    typeof value.age === "string" &&
    typeof value.gender === "string" &&
    typeof value.location === "string" &&
    typeof value.job === "string" &&
    isStringArray(value.owns) &&
    isStringArray(value.avoid)
  );
}

function isActiveBrief(value: unknown): value is ActiveBrief {
  if (!isRecord(value)) return false;
  return (
    typeof value.nickname === "string" &&
    typeof value.occasion === "string" &&
    typeof value.currency === "string" &&
    typeof value.budgetMin === "number" &&
    typeof value.budgetMax === "number" &&
    typeof value.likes === "string" &&
    (value.age === undefined || typeof value.age === "string") &&
    (value.gender === undefined || typeof value.gender === "string") &&
    (value.location === undefined || typeof value.location === "string") &&
    (value.job === undefined || typeof value.job === "string") &&
    isStringArray(value.owns) &&
    isStringArray(value.avoid)
  );
}

function isGiftIdea(value: unknown): value is GiftIdea {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.slot === "number" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (value.estimatedPrice === null || typeof value.estimatedPrice === "number") &&
    typeof value.currency === "string" &&
    typeof value.whyItFits === "string" &&
    (value.exactUrl === null || typeof value.exactUrl === "string") &&
    typeof value.searchUrl === "string" &&
    typeof value.shopUrl === "string" &&
    (value.status === "reviewing" ||
      value.status === "accepted" ||
      value.status === "rejected") &&
    (value.rejectionReason === null || typeof value.rejectionReason === "string")
  );
}

/**
 * Reads the browser-local workspace snapshot. Returns null on the server, when
 * storage is unavailable, or when the saved payload does not match the current
 * schema. Invalid snapshots are ignored rather than crashing the workspace.
 */
export function loadWorkspace(email: string): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(workspaceStorageKey(email));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;
    if (!isBriefFormState(parsed.brief)) return null;
    if (!Array.isArray(parsed.ideas) || !parsed.ideas.every(isGiftIdea)) return null;
    if (!isActiveBrief(parsed.activeBrief)) {
      // A saved form without an active brief is still useful; stale cards are not.
      return {
        brief: parsed.brief,
        activeBrief: null,
        ideas: [],
        note: "",
        view: "intake",
        rejectedTitles: [],
      };
    }

    const hasIdeas = parsed.ideas.length > 0;
    const view: WorkspaceView =
      hasIdeas && (parsed.view === "grid" || parsed.view === "shortlist")
        ? parsed.view
        : "intake";

    return {
      brief: parsed.brief,
      activeBrief: parsed.activeBrief,
      ideas: parsed.ideas,
      note: typeof parsed.note === "string" ? parsed.note : "",
      view,
      rejectedTitles: isStringArray(parsed.rejectedTitles)
        ? parsed.rejectedTitles
        : [],
    };
  } catch {
    return null;
  }
}

export function saveWorkspace(email: string, snapshot: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;

  const payload: PersistedWorkspace = {
    version: STORAGE_VERSION,
    ...snapshot,
  };

  try {
    window.localStorage.setItem(workspaceStorageKey(email), JSON.stringify(payload));
  } catch {
    // Private browsing and full quotas can reject writes; the in-memory
    // workspace keeps working.
  }
}

export function clearWorkspace(email: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(workspaceStorageKey(email));
  } catch {
    // Ignore storage failures.
  }
}
