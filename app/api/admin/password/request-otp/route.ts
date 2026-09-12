import { callGateway, readSession } from "@web/lib/adminGateway.server";
import {
  AdminOtpRateLimitError,
  cancelPasswordChangeOtp,
  createPasswordChangeOtp,
} from "@web/lib/adminAuthStore.server";
import {
  isSameOriginAdminMutation,
  noStoreJson,
} from "@web/lib/adminRouteSecurity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginAdminMutation(request)) {
    return noStoreJson({ message: "Cross-origin admin mutation denied." }, 403);
  }
    if ((await request.text()).length > 0) {
    return noStoreJson({ message: "This action takes no body." }, 400);
  }
  const session = await readSession(request);
  if (!session) return noStoreJson({ message: "Session expired." }, 401);

  try {
    const challenge = await createPasswordChangeOtp(
      session.sub,
      session.sid,
      request,
    );
    const delivery = await callGateway(
      "notifications/auth/password-change-otp",
      "",
      session,
      { method: "POST", body: { code: challenge.code } },
    );
    if (delivery.status !== 200) {
      await cancelPasswordChangeOtp(session.sub, challenge.challengeId);
      return noStoreJson(
        { message: "Could not send the password change code." },
        503,
      );
    }
    return noStoreJson({
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AdminOtpRateLimitError) {
      return noStoreJson(
        { message: "Too many code requests. Try again in 15 minutes." },
        429,
      );
    }
    return noStoreJson(
      { message: "Password change is temporarily unavailable." },
      503,
    );
  }
}
