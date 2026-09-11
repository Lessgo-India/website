import {
  isAllowedAdminDelete,
  isAllowedAdminPatch,
  isAllowedAdminRead,
  isValidAdminBugPatchBody,
} from "./adminGatewayPolicy.js";

export type AdminGatewayRouteContext = {
  params: Promise<{ path: string[] }>;
};

interface GatewayCallOptions {
  method?: "GET" | "PATCH" | "DELETE";
  body?: unknown;
}

interface AdminGatewayRouteDeps<Session> {
  readSession: (request: Request) => Session | null;
  callGateway: (
    path: string,
    search: string,
    session: Session,
    options?: GatewayCallOptions,
  ) => Promise<{ status: number; body: unknown }>;
}

function reply(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function createAdminGatewayHandlers<Session>(
  deps: AdminGatewayRouteDeps<Session>,
) {
  async function readAdminRequest(
    request: Request,
    { params }: AdminGatewayRouteContext,
  ): Promise<
    { response: Response } | { session: Session; segments: string[] }
  > {
    const session = deps.readSession(request);
    if (!session) {
      return {
        response: reply(401, {
          message: "Your session has expired. Please sign in again.",
        }),
      };
    }

    const { path } = await params;
    const segments = path ?? [];
    if (
      segments.length === 0 ||
      segments.some((segment) => !/^[a-z0-9-]+$/i.test(segment))
    ) {
      return {
        response: reply(404, { message: "Unknown admin endpoint." }),
      };
    }

    return { session, segments };
  }

  async function GET(
    request: Request,
    context: AdminGatewayRouteContext,
  ): Promise<Response> {
    const parsed = await readAdminRequest(request, context);
    if ("response" in parsed) return parsed.response;
    const url = new URL(request.url);
    if (!isAllowedAdminRead(parsed.segments, url.searchParams)) {
      return reply(404, { message: "Unknown admin endpoint." });
    }

    const result = await deps.callGateway(
      parsed.segments.join("/"),
      url.search,
      parsed.session,
    );
    return reply(result.status, result.body);
  }

  async function PATCH(
    request: Request,
    context: AdminGatewayRouteContext,
  ): Promise<Response> {
    const parsed = await readAdminRequest(request, context);
    if ("response" in parsed) return parsed.response;
    if (!isAllowedAdminPatch(parsed.segments)) {
      return reply(404, { message: "Unknown admin endpoint." });
    }
    if (new URL(request.url).search) {
      return reply(404, { message: "Unknown admin endpoint." });
    }

    const body = (await request.json().catch(() => null)) as {
      done?: unknown;
    } | null;
    if (!isValidAdminBugPatchBody(body)) {
      return reply(400, { message: "A boolean done value is required." });
    }

    const result = await deps.callGateway(
      `bugs/${parsed.segments[1]}`,
      "",
      parsed.session,
      { method: "PATCH", body: { done: body!.done } },
    );
    return reply(result.status, result.body);
  }

  async function DELETE(
    request: Request,
    context: AdminGatewayRouteContext,
  ): Promise<Response> {
    const parsed = await readAdminRequest(request, context);
    if ("response" in parsed) return parsed.response;
    if (!isAllowedAdminDelete(parsed.segments)) {
      return reply(404, { message: "Unknown admin endpoint." });
    }
    if (new URL(request.url).search) {
      return reply(404, { message: "Unknown admin endpoint." });
    }

    const result = await deps.callGateway("bugs/done", "", parsed.session, {
      method: "DELETE",
    });
    return reply(result.status, result.body);
  }

  return { GET, PATCH, DELETE };
}
