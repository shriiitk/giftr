import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const ENV_KEYS = [
  "ALLOWED_EMAILS",
  "INVITE_CODE",
  "INVITE_CODES",
  "SESSION_SECRET",
] as const;
const saved: Record<string, string | undefined> = {};

for (const key of ENV_KEYS) saved[key] = process.env[key];

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function makeRequest(body: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  process.env.ALLOWED_EMAILS = "friend@example.com, Second@Example.com";
  process.env.INVITE_CODE = "WARM-GIFT-2026";
  process.env.SESSION_SECRET = "test-session-secret-long-enough";
});

afterEach(() => {
  restoreEnv();
});

describe("POST /api/auth/login", () => {
  it("sets a 7-day HttpOnly session cookie for valid credentials", async () => {
    const response = await POST(
      makeRequest(
        JSON.stringify({ email: "FRIEND@example.com", inviteCode: "WARM-GIFT-2026" }),
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, email: "friend@example.com" });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=604800");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");

    const token = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
    expect(token).toBeTruthy();
    const session = await verifySessionToken(decodeURIComponent(token!));
    expect(session?.email).toBe("friend@example.com");
  });

  it("rejects an email that is not allowlisted", async () => {
    const response = await POST(
      makeRequest(JSON.stringify({ email: "stranger@example.com", inviteCode: "WARM-GIFT-2026" })),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an incorrect invite code", async () => {
    const response = await POST(
      makeRequest(JSON.stringify({ email: "friend@example.com", inviteCode: "NOPE" })),
    );
    expect(response.status).toBe(401);
  });

  it("accepts any active code from the INVITE_CODES list", async () => {
    process.env.INVITE_CODES = "CODE-ALEX, CODE-SAM, CODE-PRIYA";
    const response = await POST(
      makeRequest(JSON.stringify({ email: "second@example.com", inviteCode: "CODE-SAM" })),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).email).toBe("second@example.com");
  });

  it("revokes only a removed code", async () => {
    process.env.INVITE_CODES = "CODE-ALEX,CODE-SAM";
    const removed = await POST(
      makeRequest(JSON.stringify({ email: "friend@example.com", inviteCode: "CODE-PRIYA" })),
    );
    expect(removed.status).toBe(401);

    const active = await POST(
      makeRequest(JSON.stringify({ email: "friend@example.com", inviteCode: "CODE-ALEX" })),
    );
    expect(active.status).toBe(200);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(makeRequest("{not json"));
    expect(response.status).toBe(400);
  });

  it("rejects a malformed email", async () => {
    const response = await POST(
      makeRequest(JSON.stringify({ email: "not-an-email", inviteCode: "WARM-GIFT-2026" })),
    );
    expect(response.status).toBe(400);
  });

  it("returns 500 when the server secret is missing", async () => {
    delete process.env.SESSION_SECRET;
    const response = await POST(
      makeRequest(JSON.stringify({ email: "friend@example.com", inviteCode: "WARM-GIFT-2026" })),
    );
    expect(response.status).toBe(500);
  });
});
