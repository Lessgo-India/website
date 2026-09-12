import { readSession } from "@web/lib/adminGateway.server";
import { revokeOtherAdminSessions } from "@web/lib/adminSession.server";
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
  return noStoreJson({
    revoked: await revokeOtherAdminSessions(session),
  });
}
