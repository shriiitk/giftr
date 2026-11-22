import { describe, expect, it } from "vitest";
import { buildShareTitle, buildShortlistSummary } from "@/lib/summary";
import { formatMoney } from "@/lib/currency";
import type { ActiveBrief, GiftIdea } from "@/lib/types";

const brief: ActiveBrief = {
  nickname: "The Coffee Purist",
  occasion: "Birthday",
  currency: "INR",
  budgetMin: 1500,
  budgetMax: 4000,
  likes: "pour-over coffee",
  owns: [],
  avoid: [],
};

function idea(overrides: Partial<GiftIdea> = {}): GiftIdea {
  return {
    id: "one",
    slot: 1,
    title: "Stoneware Pour-Over Set",
    description: "A hand-glazed dripper and carafe.",
    estimatedPrice: 3200,
    currency: "INR",
    whyItFits: "Matches the pour-over ritual.",
    exactUrl: "https://example.com/pour-over",
    searchUrl: "https://www.google.com/search?q=Stoneware+Pour-Over+Set+INR",
    shopUrl: "https://www.amazon.in/s?k=Stoneware+Pour-Over+Set",
    status: "accepted",
    rejectionReason: null,
    ...overrides,
  };
}

describe("shortlist summary", () => {
  it("formats ideas, prices, links, note, and the verification reminder", () => {
    const summary = buildShortlistSummary({
      brief,
      ideas: [
        idea(),
        idea({
          id: "two",
          slot: 2,
          title: "Brass Desk Tray",
          estimatedPrice: 1800,
          exactUrl: null,
          whyItFits: "Warm desk accent.",
        }),
      ],
      note: "Thoughtful picks for slow mornings.",
    });

    expect(summary).toContain("Gift Shortlist for The Coffee Purist (Birthday)");
    expect(summary).toContain("Stoneware Pour-Over Set");
    expect(summary).toContain("Brass Desk Tray");
    expect(summary).toContain("3,200");
    expect(summary).toContain("1,800");
    expect(summary).toContain("Estimated total");
    expect(summary).toContain("Product link: https://example.com/pour-over");
    expect(summary).toContain("Shop link: https://www.amazon.in/s?k=Stoneware+Pour-Over+Set");
    expect(summary).toContain(
      "Check options: https://www.google.com/search?q=Stoneware+Pour-Over+Set+INR",
    );
    expect(summary).toContain("Why it fits: Thoughtful picks for slow mornings.");
    expect(summary).toContain("Verify links & live prices yourself before buying.");
    expect(summary).not.toContain("Product link: null");
  });

  it("omits the note block when the note is empty", () => {
    const summary = buildShortlistSummary({ brief, ideas: [idea()], note: "   " });
    expect(summary).not.toContain("Why it fits: \n");
    expect(summary).toContain("Verify links");
  });

  it("builds a share title from the nickname", () => {
    expect(buildShareTitle(brief)).toBe("Gift shortlist for The Coffee Purist");
  });
});

describe("currency formatting", () => {
  it("formats known ISO currencies", () => {
    expect(formatMoney(3200, "INR")).toContain("3,200");
    expect(formatMoney(45, "USD")).toContain("45");
  });

  it("falls back to a plain code for custom currencies", () => {
    expect(formatMoney(1200, "XYZ")).toBe("XYZ 1,200");
  });

  it("handles missing prices", () => {
    expect(formatMoney(null, "INR")).toBe("Price not provided");
  });
});
