import { readSession } from "@web/lib/adminGateway.server";
import {
  getAdminSessionToken,
  rotateAdminCredential,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@web/lib/adminSession.server";
import {
  isSameOriginAdminMutation,
  noStoreJson,
  readAdminJson,
} from "@web/lib/adminRouteSecurity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHALLENGE_ID = /^[0-9a-f-]{36}$/i;
const OTP = /^\d{6}$/;
const CREDENTIAL = /^[0-9a-f]{64}$/;

export async function POST(request: Request) {
  if (!isSameOriginAdminMutation(request)) {
    return noStoreJson({ message: "Cross-origin admin mutation denied." }, 403);
  }
  const parsed = await readAdminJson<{
    challengeId?: unknown;
    code?: unknown;
    credential?: unknown;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const challengeId =
    typeof parsed.value.challengeId === "string"
      ? parsed.value.challengeId.trim()
      : "";
  const code =
    typeof parsed.value.code === "string" ? parsed.value.code.trim() : "";
  const credential =
    typeof parsed.value.credential === "string"
      ? parsed.value.credential.trim()
      : "";
  if (
    !CHALLENGE_ID.test(challengeId) ||
    !OTP.test(code) ||
    !CREDENTIAL.test(credential)
  ) {
    return noStoreJson({ message: "Invalid or expired code." }, 400);
  }

  let session = await readSession(request);
  let resumeOnly = false;
  if (!session) {
    session = verifySessionToken(getAdminSessionToken(request));
    resumeOnly = true;
  }
  if (!session) return noStoreJson({ message: "Session expired." }, 401);

  try {
    const nextSession = await rotateAdminCredential(
      session,
      challengeId,
      code,
      credential,
      request,
      resumeOnly,
    );
    if (!nextSession) {
      return noStoreJson({ message: "Invalid or expired code." }, 400);
    }
    const response = noStoreJson({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: nextSession.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch {
    return noStoreJson(
      { message: "Password change is temporarily unavailable." },
      503,
    );
  }
}
