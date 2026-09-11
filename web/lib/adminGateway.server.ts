import {
  verifySessionToken,
  SESSION_COOKIE,
  type SessionPayload,
} from "./adminSession.server";
import { randomUUID } from "node:crypto";

/**
 * SERVER ONLY — the browser never learns the gateway's admin key.
 *
 * The dashboard talks to this app's own origin; only this module talks to the
 * gateway, adding the shared secret server-side. That keeps the admin
 * credential out of any browser-reachable bundle and lets the session live in a
 * same-origin httpOnly cookie (a cross-origin one would be a third-party cookie
 * and get blocked by Safari outright).
 */

// The gateway bounds its notification-service hop at 15s. The outer BFF must
// wait longer so it never reports an uncertain timeout while that mutation is
// still running downstream.
const GATEWAY_TIMEOUT_MS = 20_000;

export function gatewayBaseUrl(): string {
  const raw =
    process.env.ADMIN_GATEWAY_URL ?? process.env.NEXT_PUBLIC_BACKEND_API ?? "";
  return raw.trim().replace(/\/+$/, "");
}

export function readSession(req: Request): SessionPayload | null {
  const header = req.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  return verifySessionToken(match?.slice(SESSION_COOKIE.length + 1));
}

export async function callGateway(
  path: string,
  search: string,
  session: SessionPayload,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  } = {},
): Promise<{ status: number; body: unknown }> {
  const base = gatewayBaseUrl();
  const key = process.env.ADMIN_GATEWAY_KEY?.trim();

  if (!base || !key) {
    return {
      status: 503,
      body: {
        message: "ADMIN_GATEWAY_URL / ADMIN_GATEWAY_KEY are not configured.",
      },
    };
  }

  try {
    const method = options.method ?? "GET";
    const response = await fetch(`${base}/admin/${path}${search}`, {
      method,
      headers: {
        accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        "x-admin-api-key": key,
        // Audit only — the gateway trusts it because only this server can call.
        "x-admin-user": session.sub,
        "x-request-id": randomUUID(),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });

    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  } catch (error) {
    const timedOut = (error as Error)?.name === "TimeoutError";
    return {
      status: 504,
      body: {
        message: timedOut
          ? "The gateway did not respond in time."
          : "Gateway unreachable.",
      },
    };
  }
}
