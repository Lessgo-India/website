import { readSession } from "@web/lib/adminGateway.server";
import {
  SESSION_COOKIE,
  listAdminSessions,
  revokeAdminSession,
} from "@web/lib/adminSession.server";
import {
  isSameOriginAdminMutation,
  noStoreJson,
  readAdminJson,
} from "@web/lib/adminRouteSecurity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session) return noStoreJson({ message: "Session expired." }, 401);
  return noStoreJson({ sessions: await listAdminSessions(session) });
}

export async function DELETE(request: Request) {
  if (!isSameOriginAdminMutation(request)) {
    return noStoreJson({ message: "Cross-origin admin mutation denied." }, 403);
  }
  const session = await readSession(request);
  if (!session) return noStoreJson({ message: "Session expired." }, 401);
  const parsed = await readAdminJson<{ sessionId?: unknown }>(request);
  if (!parsed.ok) return parsed.response;
  const sessionId =
    typeof parsed.value.sessionId === "string"
      ? parsed.value.sessionId.trim()
      : "";
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return noStoreJson({ message: "A valid session is required." }, 400);
  }
  const revoked = await revokeAdminSession(session, sessionId);
  const current = sessionId === session.sid;
  const response = noStoreJson({ revoked, current });
  if (current && revoked) clearSessionCookie(response);
  return response;
}

function clearSessionCookie(response: ReturnType<typeof noStoreJson>): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
