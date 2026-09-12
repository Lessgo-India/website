import "server-only";

import { NextResponse } from "next/server";
import { readBoundedJson } from "./boundedJsonBody";

export function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isSameOriginAdminMutation(request: Request): boolean {
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
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return !(
    (origin && !allowed.has(origin)) ||
    (fetchSite && fetchSite !== "same-origin")
  );
}

export async function readAdminJson<T>(
  request: Request,
  maximumBytes = 4_096,
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  if (
    !(request.headers.get("content-type") ?? "").startsWith("application/json")
  ) {
    return {
      ok: false,
      response: noStoreJson({ message: "Admin requests require JSON." }, 415),
    };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return {
      ok: false,
      response: noStoreJson({ message: "Admin request is too large." }, 413),
    };
  }
  const parsed = await readBoundedJson<T>(request.body, maximumBytes);
  if (!parsed.ok) {
    return {
      ok: false,
      response: noStoreJson(
        {
          message:
            parsed.reason === "too-large"
              ? "Admin request is too large."
              : "Invalid admin request.",
        },
        parsed.reason === "too-large" ? 413 : 400,
      ),
    };
  }
  if (
    typeof parsed.value !== "object" ||
    parsed.value === null ||
    Array.isArray(parsed.value)
  ) {
    return {
      ok: false,
      response: noStoreJson({ message: "Invalid admin request." }, 400),
    };
  }
  return { ok: true, value: parsed.value };
}
