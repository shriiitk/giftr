import type { NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "./auth";

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<{ email: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}
