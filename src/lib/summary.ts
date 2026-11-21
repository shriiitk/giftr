import { formatBudgetRange, formatMoney } from "./currency";
import type { ActiveBrief, GiftIdea } from "./types";

export interface SummaryInput {
  brief: ActiveBrief;
  ideas: GiftIdea[];
  note: string;
}

export function buildShortlistSummary({ brief, ideas, note }: SummaryInput): string {
  const total = ideas.reduce(
    (sum, idea) => sum + (idea.estimatedPrice ?? 0),
    0,
  );
  const hasKnownPrice = ideas.some((idea) => idea.estimatedPrice !== null);

  const header = [
    `Gift Shortlist for ${brief.nickname} (${brief.occasion})`,
    `Budget: ${formatBudgetRange(brief.budgetMin, brief.budgetMax, brief.currency)}${
      hasKnownPrice ? ` · Estimated total: ${formatMoney(total, brief.currency)}` : ""
    }`,
  ];

  const items = ideas.map((idea, index) => {
    const lines = [
      `${index + 1}. ${idea.title} — ${formatMoney(idea.estimatedPrice, idea.currency || brief.currency)}`,
      `   ${idea.description}`,
      `   Why it fits: ${idea.whyItFits}`,
    ];

    if (idea.exactUrl) {
      lines.push(`   Exact link: ${idea.exactUrl}`);
    }
    lines.push(`   Search: ${idea.searchUrl}`);

    return lines.join("\n");
  });

  const parts = [header.join("\n"), items.join("\n\n")];

  if (note.trim()) {
    parts.push(`Why it fits: ${note.trim()}`);
  }

  parts.push("Verify links & live prices yourself before buying.");

  return parts.join("\n\n");
}

export function buildShareTitle(brief: ActiveBrief): string {
  return `Gift shortlist for ${brief.nickname}`;
}
