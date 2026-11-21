import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  validateCredentials,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/session";
import { isBodyWithinLimit } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isBodyWithinLimit(raw)) {
    return badRequest("Request body is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("Send a valid JSON body.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badRequest("Send a valid JSON object.");
  }

  const record = body as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email : "";
  const inviteCode = typeof record.inviteCode === "string" ? record.inviteCode : "";

  const result = validateCredentials(email, inviteCode);
  if (!result.ok) {
    return badRequest(result.error, result.status);
  }

  try {
    const token = await createSessionToken(result.email);
    const response = NextResponse.json(
      { ok: true, email: result.email },
      { headers: NO_STORE },
    );
    response.cookies.set({
      ...sessionCookieOptions(),
      value: token,
    });
    return response;
  } catch {
    return badRequest(
      "Server auth is not configured. Ask the owner to set SESSION_SECRET.",
      500,
    );
  }
}
