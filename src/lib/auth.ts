/**
 * Lightweight friend authentication.
 *
 * Credentials: allowlisted email + one of the active invite codes.
 * Codes come from `INVITE_CODES` (comma-separated, one per friend) or the
 * legacy single-value `INVITE_CODE`. Removing one code revokes only that code.
 * Session: a 7-day signed, HttpOnly cookie named `giftr_session`.
 *
 * The token format is `<base64url(payload)>.<base64url(HMAC-SHA-256(payload))>`
 * where payload is `{ email, exp }` (exp is a Unix timestamp in seconds).
 */

export const SESSION_COOKIE = "giftr_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 604800 seconds
const MAX_TOKEN_LENGTH = 4096;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface SessionPayload {
  email: string;
  exp: number;
}

export type CredentialResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const withPadding = padded.padEnd(Math.ceil(padded.length / 4) * 4, "=");
    const binary = atob(withPadding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function sign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

function constantTimeStringEqual(a: string, b: string): boolean {
  return constantTimeEqual(encoder.encode(a), encoder.encode(b));
}

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(
  email: string,
  rawAllowlist: string | undefined | null = process.env.ALLOWED_EMAILS,
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return parseAllowlist(rawAllowlist).includes(normalized);
}

export function parseInviteCodes(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const part of raw.split(",")) {
    const code = part.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }

  return codes;
}

function activeInviteCodesFromEnv(): string | undefined {
  const list = process.env.INVITE_CODES?.trim();
  return list ? process.env.INVITE_CODES : process.env.INVITE_CODE;
}

export function isInviteCodeValid(
  inviteCode: string,
  rawCodes: string | undefined | null = activeInviteCodesFromEnv(),
): boolean {
  const normalized = inviteCode.trim();
  if (!normalized) return false;

  const codes = parseInviteCodes(rawCodes);
  if (codes.length === 0) return false;

  // Compare against every code without short-circuiting.
  let matched = false;
  for (const code of codes) {
    matched = constantTimeStringEqual(normalized, code) || matched;
  }
  return matched;
}

export function validateCredentials(
  email: string,
  inviteCode: string,
  env: { ALLOWED_EMAILS?: string; INVITE_CODE?: string; INVITE_CODES?: string } = {
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
    INVITE_CODE: process.env.INVITE_CODE,
    INVITE_CODES: process.env.INVITE_CODES,
  },
): CredentialResult {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = inviteCode.trim();
  const activeCodes = env.INVITE_CODES?.trim() ? env.INVITE_CODES : env.INVITE_CODE;

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  if (!env.ALLOWED_EMAILS || !activeCodes) {
    return {
      ok: false,
      status: 500,
      error: "Access is not configured yet. Ask the owner to set the server environment.",
    };
  }

  if (!isAllowedEmail(normalizedEmail, env.ALLOWED_EMAILS)) {
    return {
      ok: false,
      status: 401,
      error: "This email is not on the invite list.",
    };
  }

  if (!isInviteCodeValid(normalizedCode, activeCodes)) {
    return { ok: false, status: 401, error: "That invite code is not correct." };
  }

  return { ok: true, email: normalizedEmail };
}

export async function createSessionToken(
  email: string,
  now: number = Date.now(),
  secret: string | undefined = process.env.SESSION_SECRET,
): Promise<string> {
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(secret, encodedPayload);
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
  secret: string | undefined = process.env.SESSION_SECRET,
): Promise<{ email: string } | null> {
  if (!token || !secret || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const providedSignature = fromBase64Url(encodedSignature);
    if (!providedSignature) return null;

    const expectedSignature = await sign(secret, encodedPayload);
    if (!constantTimeEqual(providedSignature, expectedSignature)) return null;

    const payloadBytes = fromBase64Url(encodedPayload);
    if (!payloadBytes) return null;

    const parsed = JSON.parse(decoder.decode(payloadBytes)) as Partial<SessionPayload>;
    if (typeof parsed.email !== "string" || !parsed.email) return null;
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) return null;
    if (parsed.exp <= Math.floor(now / 1000)) return null;

    return { email: parsed.email };
  } catch {
    return null;
  }
}
