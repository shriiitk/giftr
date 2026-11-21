import { describe, expect, it } from "vitest";
import { isBodyWithinLimit, parseIdeasRequest } from "@/lib/validation";
import { MAX_BODY_BYTES } from "@/lib/types";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    nickname: "The Coffee Purist",
    occasion: "Birthday",
    currency: "inr",
    budgetMin: 1500,
    budgetMax: 4000,
    likes: "pour-over coffee, tactile stationery",
    age: "late 20s",
    gender: "",
    location: "Bengaluru",
    job: "product designer",
    owns: ["French press"],
    avoid: ["Gift cards"],
    slots: [2, 4],
    acceptedTitles: ["Brass tray"],
    rejectedTitles: ["Scented candle"],
    ...overrides,
  };
}

describe("parseIdeasRequest", () => {
  it("accepts a valid payload and normalizes currency", () => {
    const result = parseIdeasRequest(validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currency).toBe("INR");
      expect(result.value.slots).toEqual([2, 4]);
      expect(result.value.gender).toBeUndefined();
      expect(result.value.age).toBe("late 20s");
    }
  });

  it("defaults to all five slots when slots are omitted", () => {
    const result = parseIdeasRequest(validPayload({ slots: undefined }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slots).toEqual([1, 2, 3, 4, 5]);
  });

  it("trims and de-duplicates string arrays case-insensitively", () => {
    const result = parseIdeasRequest(
      validPayload({ owns: [" Kindle ", "kindle", "Mug"] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.owns).toEqual(["Kindle", "Mug"]);
  });

  it("rejects a maximum below the minimum", () => {
    const result = parseIdeasRequest(validPayload({ budgetMin: 5000, budgetMax: 1000 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/maximum/i);
  });

  it("rejects a non-positive maximum", () => {
    const result = parseIdeasRequest(validPayload({ budgetMin: 0, budgetMax: 0 }));
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate or out-of-range slots", () => {
    expect(parseIdeasRequest(validPayload({ slots: [1, 1] })).ok).toBe(false);
    expect(parseIdeasRequest(validPayload({ slots: [0, 2] })).ok).toBe(false);
    expect(parseIdeasRequest(validPayload({ slots: [6] })).ok).toBe(false);
    expect(parseIdeasRequest(validPayload({ slots: [1.5] })).ok).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(parseIdeasRequest(validPayload({ nickname: "  " })).ok).toBe(false);
    expect(parseIdeasRequest(validPayload({ likes: undefined })).ok).toBe(false);
    expect(parseIdeasRequest(validPayload({ occasion: 42 })).ok).toBe(false);
  });

  it("rejects oversized exclusion arrays", () => {
    const result = parseIdeasRequest(
      validPayload({ avoid: Array.from({ length: 21 }, (_, i) => `item ${i}`) }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects non-object bodies", () => {
    expect(parseIdeasRequest(null).ok).toBe(false);
    expect(parseIdeasRequest([]).ok).toBe(false);
    expect(parseIdeasRequest("hello").ok).toBe(false);
  });
});

describe("body size guard", () => {
  it("accepts bodies at or under the limit and rejects larger ones", () => {
    expect(isBodyWithinLimit("a".repeat(MAX_BODY_BYTES))).toBe(true);
    expect(isBodyWithinLimit("a".repeat(MAX_BODY_BYTES + 1))).toBe(false);
  });
});
