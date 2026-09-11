import { callGateway, readSession } from "@web/lib/adminGateway.server";
import { createAdminGatewayHandlers } from "@web/lib/adminGatewayRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAdminGatewayHandlers({ readSession, callGateway });

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
