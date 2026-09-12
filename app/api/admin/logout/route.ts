import { NextResponse } from "next/server";
import { readSession } from "@web/lib/adminGateway.server";
import {
  SESSION_COOKIE,
  revokeAdminSession,
} from "@web/lib/adminSession.server";
import { isSameOriginAdminMutation } from "@web/lib/adminRouteSecurity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginAdminMutation(request)) {
    return NextResponse.json(
      { message: "Cross-origin admin mutation denied." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const session = await readSession(request);
    if (session) await revokeAdminSession(session, session.sid);
  } catch {
    // Local sign-out must still clear the cookie if shared storage is degraded.
  }
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
