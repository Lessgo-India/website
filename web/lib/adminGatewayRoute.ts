import {
  isAllowedAdminDelete,
  isAllowedAdminPatch,
  isAllowedAdminPost,
  isAllowedAdminRead,
  isValidAdminAlertPreferencesBody,
  isValidAdminAlertUnsubscribeBody,
  isValidAdminBugPatchBody,
  isValidAdminPostBody,
} from "./adminGatewayPolicy.js";

export type AdminGatewayRouteContext = {
  params: Promise<{ path: string[] }>;
};

interface GatewayCallOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
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

function allowedRequestOrigins(request: Request): Set<string> {
  const url = new URL(request.url);
  const allowed = new Set([url.origin]);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const protocol = /^(http|https)$/.test(forwardedProtocol ?? "")
    ? forwardedProtocol
    : url.protocol.slice(0, -1);

  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    allowed.add(`${protocol}://${host}`);
  }
  return allowed;
}

function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return !(
    (origin && !allowedRequestOrigins(request).has(origin)) ||
    (fetchSite && fetchSite !== "same-origin")
  );
}

async function readJsonBody(request: Request): Promise<
  { body: unknown } | { response: Response }
> {
  if (
    !(request.headers.get("content-type") ?? "").startsWith(
      "application/json",
    )
  ) {
    return {
      response: reply(415, { message: "Admin mutations require JSON." }),
    };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 32_768) {
    return { response: reply(413, { message: "Admin request is too large." }) };
  }
  const raw = await request.text();
  if (raw.length > 32_768) {
    return { response: reply(413, { message: "Admin request is too large." }) };
  }
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { response: reply(400, { message: "Invalid admin request." }) };
  }
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
    if (!isSameOriginMutation(request)) {
      return reply(403, { message: "Cross-origin admin mutation denied." });
    }
    const parsedBody = await readJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const isBugPatch = parsed.segments[0] === "bugs";
    if (
      (isBugPatch && !isValidAdminBugPatchBody(parsedBody.body)) ||
      (!isBugPatch &&
        !isValidAdminAlertPreferencesBody(parsedBody.body))
    ) {
      return reply(400, { message: "Invalid admin request." });
    }

    const result = await deps.callGateway(
      parsed.segments.join("/"),
      "",
      parsed.session,
      { method: "PATCH", body: parsedBody.body },
    );
    return reply(result.status, result.body);
  }

  async function POST(
    request: Request,
    context: AdminGatewayRouteContext,
  ): Promise<Response> {
    const parsed = await readAdminRequest(request, context);
    if ("response" in parsed) return parsed.response;
    if (!isAllowedAdminPost(parsed.segments) || new URL(request.url).search) {
      return reply(404, { message: "Unknown admin endpoint." });
    }
    if (!isSameOriginMutation(request)) {
      return reply(403, { message: "Cross-origin admin mutation denied." });
    }

    const isAction =
      parsed.segments.length === 4 ||
      parsed.segments.join("/") === "notifications/alerts/test";
    let body: unknown = undefined;
    if (!isAction) {
      const parsedBody = await readJsonBody(request);
      if ("response" in parsedBody) return parsedBody.response;
      body = parsedBody.body;
      if (!isValidAdminPostBody(parsed.segments, body)) {
        return reply(400, { message: "Invalid admin request." });
      }
    } else if (request.body !== null) {
      return reply(400, { message: "This campaign action takes no body." });
    }

    const result = await deps.callGateway(
      parsed.segments.join("/"),
      "",
      parsed.session,
      { method: "POST", ...(body === undefined ? {} : { body }) },
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
    if (!isSameOriginMutation(request)) {
      return reply(403, { message: "Cross-origin admin mutation denied." });
    }
    const isSubscriptionDelete = parsed.segments[0] === "notifications";
    let body: unknown = undefined;
    if (isSubscriptionDelete) {
      const parsedBody = await readJsonBody(request);
      if ("response" in parsedBody) return parsedBody.response;
      if (!isValidAdminAlertUnsubscribeBody(parsedBody.body)) {
        return reply(400, { message: "Invalid admin request." });
      }
      body = parsedBody.body;
    } else if (request.body !== null) {
      return reply(400, { message: "This admin action takes no body." });
    }

    const result = await deps.callGateway(
      parsed.segments.join("/"),
      "",
      parsed.session,
      {
        method: "DELETE",
        ...(body === undefined ? {} : { body }),
      },
    );
    return reply(result.status, result.body);
  }

  return { GET, POST, PATCH, DELETE };
}
