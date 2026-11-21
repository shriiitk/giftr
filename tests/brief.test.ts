import { describe, expect, it } from "vitest";
import { createEmptyBrief, toActiveBrief, validateBriefForm } from "@/lib/brief";

function validForm() {
  return createEmptyBrief({
    nickname: "  The Coffee Purist ",
    occasion: "Birthday",
    budgetMin: "1500",
    budgetMax: "4000",
    likes: "Pour-over coffee and tactile stationery",
    location: " Bengaluru ",
    owns: ["French press"],
    avoid: ["Gift cards"],
  });
}

describe("brief form validation", () => {
  it("accepts a complete form and normalizes the active brief", () => {
    const result = validateBriefForm(validForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.brief.nickname).toBe("The Coffee Purist");
      expect(result.brief.location).toBe("Bengaluru");
      expect(result.brief.budgetMin).toBe(1500);
      expect(result.brief.budgetMax).toBe(4000);
      expect(result.brief.currency).toBe("INR");
    }
  });

  it("returns field errors for an empty form", () => {
    const result = validateBriefForm(createEmptyBrief());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.nickname).toBeTruthy();
      expect(result.errors.occasion).toBeTruthy();
      expect(result.errors.likes).toBeTruthy();
      expect(result.errors.budgetMin).toBeTruthy();
      expect(result.errors.budgetMax).toBeTruthy();
    }
  });

  it("rejects a maximum below the minimum", () => {
    const result = validateBriefForm(
      validForm(),
    );
    expect(result.ok).toBe(true);

    const bad = validateBriefForm({
      ...validForm(),
      budgetMin: "5000",
      budgetMax: "1000",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.budgetMax).toMatch(/at least/i);
  });

  it("supports a custom currency", () => {
    const form = { ...validForm(), currency: "CUSTOM", currencyCustom: "aed" };
    const result = validateBriefForm(form);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.brief.currency).toBe("AED");
    expect(toActiveBrief(form).currency).toBe("AED");
  });

  it("requires a custom currency value when CUSTOM is selected", () => {
    const result = validateBriefForm({
      ...validForm(),
      currency: "CUSTOM",
      currencyCustom: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.currency).toBeTruthy();
  });
});
