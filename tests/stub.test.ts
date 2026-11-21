import { describe, expect, it } from "vitest";
import { StubProvider } from "@/lib/llm/stub";
import type { IdeaGenerationInput } from "@/lib/llm/types";

const input: IdeaGenerationInput = {
  brief: {
    nickname: "The Coffee Purist",
    occasion: "Birthday",
    currency: "INR",
    budgetMin: 1500,
    budgetMax: 4000,
    likes: "pour-over coffee",
    owns: [],
    avoid: [],
  },
  count: 5,
  slots: [1, 2, 3, 4, 5],
  excludeTitles: [],
  seed: "test",
};

describe("stub provider", () => {
  it("returns the requested number of ideas", async () => {
    const ideas = await new StubProvider().generateIdeas(input);
    expect(ideas).toHaveLength(5);
    expect(new Set(ideas.map((idea) => idea.title)).size).toBe(5);
  });

  it("respects the budget range and currency", async () => {
    const ideas = await new StubProvider().generateIdeas(input);
    for (const idea of ideas) {
      expect(idea.estimatedPrice).not.toBeNull();
      expect(idea.estimatedPrice!).toBeGreaterThanOrEqual(1500);
      expect(idea.estimatedPrice!).toBeLessThanOrEqual(4000);
      expect(idea.currency).toBe("INR");
    }
  });

  it("avoids excluded titles", async () => {
    const ideas = await new StubProvider().generateIdeas({
      ...input,
      excludeTitles: ["Hand-thrown Stoneware Pour-Over Set"],
    });
    expect(ideas.map((idea) => idea.title)).not.toContain(
      "Hand-thrown Stoneware Pour-Over Set",
    );
  });

  it("is deterministic for the same seed", async () => {
    const provider = new StubProvider();
    const first = await provider.generateIdeas(input);
    const second = await provider.generateIdeas(input);
    expect(second.map((idea) => idea.title)).toEqual(first.map((idea) => idea.title));
  });

  it("returns a single idea when only one slot is requested", async () => {
    const ideas = await new StubProvider().generateIdeas({
      ...input,
      count: 1,
      slots: [3],
    });
    expect(ideas).toHaveLength(1);
  });
});
