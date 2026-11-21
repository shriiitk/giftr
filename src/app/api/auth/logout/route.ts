import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set({
    ...sessionCookieOptions(),
    value: "",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
