import { NextResponse } from "next/server";
import { callGateway, readSession } from "@web/lib/adminGateway.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function readAdminRequest(req: Request, { params }: RouteContext) {
  const session = readSession(req);
  if (!session) {
    return {
      response: NextResponse.json(
        { message: "Your session has expired. Please sign in again." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const { path } = await params;
  const segments = path ?? [];
  if (
    segments.length === 0 ||
    segments.some((segment) => !/^[a-z0-9-]+$/i.test(segment))
  ) {
    return {
      response: NextResponse.json(
        { message: "Unknown admin endpoint." },
        { status: 404 },
      ),
    };
  }

  return { session, segments };
}

function reply(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Read pass-through for the existing admin API and Bug House list. */
export async function GET(req: Request, context: RouteContext) {
  const request = await readAdminRequest(req, context);
  if (request.response) return request.response;

  const { status, body } = await callGateway(
    request.segments.join("/"),
    new URL(req.url).search,
    request.session,
  );

  return reply(status, body);
}

/** Bug House may only toggle the `done` state of one valid report id. */
export async function PATCH(req: Request, context: RouteContext) {
  const request = await readAdminRequest(req, context);
  if (request.response) return request.response;
  const [resource, id, ...rest] = request.segments;
  if (
    resource !== "bugs" ||
    !/^[a-f0-9]{24}$/i.test(id ?? "") ||
    rest.length > 0
  ) {
    return reply(404, { message: "Unknown admin endpoint." });
  }

  const body = (await req.json().catch(() => null)) as {
    done?: unknown;
  } | null;
  if (typeof body?.done !== "boolean") {
    return reply(400, { message: "A boolean done value is required." });
  }

  const result = await callGateway(`bugs/${id}`, "", request.session, {
    method: "PATCH",
    body: { done: body.done },
  });
  return reply(result.status, result.body);
}

/** Bug House cleanup is restricted to the single completed-reports endpoint. */
export async function DELETE(req: Request, context: RouteContext) {
  const request = await readAdminRequest(req, context);
  if (request.response) return request.response;
  if (request.segments.join("/") !== "bugs/done") {
    return reply(404, { message: "Unknown admin endpoint." });
  }

  const result = await callGateway("bugs/done", "", request.session, {
    method: "DELETE",
  });
  return reply(result.status, result.body);
}
