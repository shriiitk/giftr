import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isAllowedEmail,
  isInviteCodeValid,
  parseAllowlist,
  parseInviteCodes,
  validateCredentials,
  verifySessionToken,
} from "@/lib/auth";

const SECRET = "test-secret-that-is-long-enough-for-hmac";
const DAY = 24 * 60 * 60 * 1000;

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("session constants", () => {
  it("uses the required cookie name and 7-day lifetime", () => {
    expect(SESSION_COOKIE).toBe("giftr_session");
    expect(SESSION_MAX_AGE).toBe(604800);
  });
});

describe("allowlist helpers", () => {
  it("parses, trims, and lowercases comma-separated emails", () => {
    expect(parseAllowlist(" A@Example.com, b@example.com ,, ")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("matches emails case-insensitively", () => {
    expect(isAllowedEmail("Friend@Example.COM", "friend@example.com")).toBe(true);
    expect(isAllowedEmail("other@example.com", "friend@example.com")).toBe(false);
  });

  it("parses a comma-separated invite-code list", () => {
    expect(parseInviteCodes(" CODE-ALEX, CODE-SAM ,, CODE-ALEX, CODE-PRIYA ")).toEqual([
      "CODE-ALEX",
      "CODE-SAM",
      "CODE-PRIYA",
    ]);
  });

  it("accepts any active invite code and compares case-sensitively", () => {
    const codes = "CODE-ALEX,CODE-SAM,CODE-PRIYA";
    expect(isInviteCodeValid("CODE-SAM", codes)).toBe(true);
    expect(isInviteCodeValid(" CODE-PRIYA ", codes)).toBe(true);
    expect(isInviteCodeValid("code-sam", codes)).toBe(false);
    expect(isInviteCodeValid("REMOVED-CODE", codes)).toBe(false);
    expect(isInviteCodeValid("", codes)).toBe(false);
  });

  it("supports the legacy single INVITE_CODE value", () => {
    expect(isInviteCodeValid("WARM-GIFT", "WARM-GIFT")).toBe(true);
    expect(isInviteCodeValid("warm-gift", "WARM-GIFT")).toBe(false);
  });
});

describe("validateCredentials", () => {
  const env = {
    ALLOWED_EMAILS: "Friend@Example.com, second@example.com",
    INVITE_CODE: "WARM-GIFT-2026",
  };

  it("accepts a valid allowlisted email and invite code", () => {
    const result = validateCredentials(" FRIEND@example.com ", "WARM-GIFT-2026", env);
    expect(result).toEqual({ ok: true, email: "friend@example.com" });
  });

  it("accepts any code from the INVITE_CODES list", () => {
    const listEnv = {
      ALLOWED_EMAILS: "friend@example.com,second@example.com",
      INVITE_CODES: "CODE-ALEX, CODE-SAM, CODE-PRIYA",
    };
    expect(validateCredentials("friend@example.com", "CODE-SAM", listEnv)).toEqual({
      ok: true,
      email: "friend@example.com",
    });
    expect(validateCredentials("second@example.com", "CODE-PRIYA", listEnv)).toEqual({
      ok: true,
      email: "second@example.com",
    });
    expect(validateCredentials("friend@example.com", "CODE-REMOVED", listEnv).ok).toBe(false);
  });

  it("prefers INVITE_CODES over the legacy INVITE_CODE", () => {
    const both = {
      ALLOWED_EMAILS: "friend@example.com",
      INVITE_CODE: "LEGACY-CODE",
      INVITE_CODES: "CODE-ALEX,CODE-SAM",
    };
    expect(validateCredentials("friend@example.com", "LEGACY-CODE", both).ok).toBe(false);
    expect(validateCredentials("friend@example.com", "CODE-ALEX", both).ok).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = validateCredentials("not-an-email", "WARM-GIFT-2026", env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an email outside the allowlist", () => {
    const result = validateCredentials("stranger@example.com", "WARM-GIFT-2026", env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toMatch(/invite list/i);
    }
  });

  it("rejects an incorrect invite code", () => {
    const result = validateCredentials("friend@example.com", "wrong", env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toMatch(/invite code/i);
    }
  });

  it("reports missing server configuration", () => {
    const result = validateCredentials("friend@example.com", "WARM-GIFT-2026", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });
});

describe("session tokens", () => {
  it("signs and verifies a token round-trip", async () => {
    const token = await createSessionToken("Friend@Example.com", Date.now(), SECRET);
    expect(token.split(".")).toHaveLength(2);
    const session = await verifySessionToken(token, Date.now(), SECRET);
    expect(session).toEqual({ email: "friend@example.com" });
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken("friend@example.com", Date.now(), SECRET);
    const [payload, signature] = token.split(".");
    const flipped = signature[0] === "A" ? "B" : "A";
    const tampered = `${payload}.${flipped}${signature.slice(1)}`;
    expect(await verifySessionToken(tampered, Date.now(), SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("friend@example.com", Date.now(), SECRET);
    expect(await verifySessionToken(token, Date.now(), "another-secret")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const created = Date.now() - 8 * DAY;
    const token = await createSessionToken("friend@example.com", created, SECRET);
    expect(await verifySessionToken(token, Date.now(), SECRET)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySessionToken(undefined, Date.now(), SECRET)).toBeNull();
    expect(await verifySessionToken("", Date.now(), SECRET)).toBeNull();
    expect(await verifySessionToken("a.b.c", Date.now(), SECRET)).toBeNull();
    expect(await verifySessionToken("not-a-token", Date.now(), SECRET)).toBeNull();
    expect(await verifySessionToken("abc.def", Date.now(), SECRET)).toBeNull();
  });

  it("throws when the signing secret is missing", async () => {
    delete process.env.SESSION_SECRET;
    await expect(createSessionToken("friend@example.com", Date.now())).rejects.toThrow(
      /SESSION_SECRET/,
    );
  });
});
