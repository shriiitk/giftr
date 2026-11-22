export const SLOT_COUNT = 5;
export const MIN_FINALISTS = 2;
export const MAX_FINALISTS = 3;
export const MAX_BUDGET = 10_000_000;
export const MAX_BODY_BYTES = 64 * 1024;

export type IdeaStatus = "reviewing" | "accepted" | "rejected";

export interface BriefFormState {
  nickname: string;
  occasion: string;
  currency: string;
  currencyCustom: string;
  budgetMin: string;
  budgetMax: string;
  likes: string;
  age: string;
  gender: string;
  location: string;
  job: string;
  owns: string[];
  avoid: string[];
}

export interface ActiveBrief {
  nickname: string;
  occasion: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  likes: string;
  age?: string;
  gender?: string;
  location?: string;
  job?: string;
  owns: string[];
  avoid: string[];
}

export interface GiftIdea {
  id: string;
  slot: number;
  title: string;
  description: string;
  estimatedPrice: number | null;
  currency: string;
  whyItFits: string;
  exactUrl: string | null;
  searchUrl: string;
  shopUrl: string;
  status: IdeaStatus;
  rejectionReason: string | null;
}

export interface GeneratedIdeaDTO {
  slot: number;
  title: string;
  description: string;
  estimatedPrice: number | null;
  currency: string;
  whyItFits: string;
  exactUrl: string | null;
  searchUrl: string;
  shopUrl: string;
}

export interface IdeasRoundResponse {
  ideas: GeneratedIdeaDTO[];
  provider: string;
  generatedAt: string;
}

export interface IdeasRoundPayload {
  nickname: string;
  occasion: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  likes: string;
  age?: string;
  gender?: string;
  location?: string;
  job?: string;
  owns: string[];
  avoid: string[];
  slots: number[];
  acceptedTitles: string[];
  rejectedTitles: string[];
}

export type WorkspaceView = "intake" | "grid" | "shortlist";

export const REJECTION_REASONS = [
  "Too expensive",
  "Over budget",
  "Wrong style",
  "Not their taste",
  "Too similar",
  "Already owns it",
  "Not available",
  "Already considered",
  "Too generic",
  "Not useful",
  "Wrong size or fit",
  "Delivery risk",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];
