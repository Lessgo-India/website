/**
 * Partner portal BFF — everything behind app/api/partner/*.
 *
 * The browser only ever talks to this app's origin. These handlers keep the
 * partner session token in an httpOnly cookie (`lessgo_partner_session`),
 * add the server-only gateway key and forward to the gateway's BFF-only
 * routes, which proxy to backend-offers-service:
 *
 *   POST /api/partner/login                 → POST /partner-auth/login
 *   POST /api/partner/login/first-password  → POST /partner-auth/first-password
 *   GET  /api/partner/session               → GET  /partner-auth/session
 *   POST /api/partner/logout                → POST /partner-auth/logout
 *   *    /api/partner/<path>?<query>        → *    /partner/<path>?<query>
 *
 * Pure (no Next or server-only imports; dependencies are injected) so node's
 * test runner can load it — see partnerBff.test.mjs. The route files wire it
 * up through web/lib/partnerGateway.server.ts.
 */
import { trustedClientAddress } from '../adminLoginRateLimitPolicy.js';
import { bodyIsEmpty } from '../requestBody.js';

export const PARTNER_SESSION_COOKIE = 'lessgo_partner_session';
/** Absolute session lifetime; the cookie never outlives the server session. */
export const PARTNER_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const PARTNER_BFF_MAX_BODY_BYTES = 64 * 1024;
/** Longer than the gateway's own downstream timeouts, like the admin BFF. */
export const PARTNER_GATEWAY_TIMEOUT_MS = 20_000;

const MAX_PATH_DEPTH = 6;
const MAX_SEGMENT_LENGTH = 128;
const MAX_QUERY_LENGTH = 2_048;
const SEGMENT_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
/** base64url session tokens (offers service), within RFC 6265 cookie-octets. */
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{16,1024}$/;
/** Handled by their own routes; never forwarded through the catch-all. */
const RESERVED_FIRST_SEGMENTS = new Set(['login', 'logout', 'session']);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export type PartnerGatewayMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PartnerGatewayCall {
  method: PartnerGatewayMethod;
  /** Gateway path, e.g. "/partner-auth/login" or "/partner/campaigns". */
  path: string;
  /** "" or "?…" from the browser's request. */
  search: string;
  /** JSON body; omitted when the browser sent none. */
  body?: Record<string, unknown>;
  sessionToken?: string;
  idempotencyKey?: string;
  clientIp?: string;
}

export interface PartnerGatewayResult {
  status: number;
  /** Parsed JSON, or null for an empty or non-JSON body. */
  body: unknown;
}

type BoundedJsonReader = (
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) => Promise<{ ok: true; value: unknown } | { ok: false; reason: 'invalid' | 'too-large' }>;

export interface PartnerBffDeps {
  /** PARTNER_PORTAL_CONFIG.enabled: the BFF 404s exactly when the portal pages do. */
  enabled: () => boolean;
  callGateway: (call: PartnerGatewayCall) => Promise<PartnerGatewayResult>;
  /** web/lib/boundedJsonBody.ts readBoundedJson. */
  readJson: BoundedJsonReader;
  /** Secure cookies (production). */
  secureCookies: () => boolean;
  now?: () => number;
}

export type PartnerBffRouteContext = {
  params: Promise<{ path: string[] }>;
};

// ── Gateway client ──────────────────────────────────────────────────────────

export interface PartnerGatewayEnv {
  PARTNER_GATEWAY_URL?: string;
  ADMIN_GATEWAY_URL?: string;
  NEXT_PUBLIC_BACKEND_API?: string;
  PARTNER_GATEWAY_KEY?: string;
}

/**
 * PARTNER_GATEWAY_URL ?? ADMIN_GATEWAY_URL ?? NEXT_PUBLIC_BACKEND_API (a blank
 * value counts as unset, so an empty line in .env doesn't hide the fallback),
 * plus the server-only PARTNER_GATEWAY_KEY.
 */
export function resolvePartnerGatewayConfig(env: PartnerGatewayEnv): { baseUrl: string; key: string } {
  const baseUrl =
    [env.PARTNER_GATEWAY_URL, env.ADMIN_GATEWAY_URL, env.NEXT_PUBLIC_BACKEND_API]
      .map((value) => value?.trim() ?? '')
      .find(Boolean) ?? '';
  return { baseUrl: baseUrl.replace(/\/+$/, ''), key: env.PARTNER_GATEWAY_KEY?.trim() ?? '' };
}

/** The only headers the gateway ever sees from the BFF. */
export function partnerGatewayHeaders(call: PartnerGatewayCall, key: string, requestId: string): Record<string, string> {
  return {
    'x-partner-portal-key': key,
    'x-request-id': requestId,
    ...(call.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(call.sessionToken ? { 'x-partner-session': call.sessionToken } : {}),
    ...(call.idempotencyKey ? { 'idempotency-key': call.idempotencyKey } : {}),
    ...(call.clientIp ? { 'x-partner-client-ip': call.clientIp } : {}),
  };
}

export function createPartnerGatewayCaller(deps: {
  env: () => PartnerGatewayEnv;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  requestId: () => string;
  timeoutMs?: number;
}): (call: PartnerGatewayCall) => Promise<PartnerGatewayResult> {
  return async function callPartnerGateway(call) {
    const { baseUrl, key } = resolvePartnerGatewayConfig(deps.env());
    if (!baseUrl || !key) {
      return {
        status: 503,
        body: {
          message: 'The partner portal backend isn’t configured on this site (PARTNER_GATEWAY_URL / PARTNER_GATEWAY_KEY).',
          code: 'not_configured',
        },
      };
    }

    try {
      const response = await deps.fetch(`${baseUrl}${call.path}${call.search}`, {
        method: call.method,
        headers: partnerGatewayHeaders(call, key, deps.requestId()),
        body: call.body === undefined ? undefined : JSON.stringify(call.body),
        cache: 'no-store',
        // Never follow a redirect: it would carry the portal key to another host.
        redirect: 'manual',
        signal: AbortSignal.timeout(deps.timeoutMs ?? PARTNER_GATEWAY_TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel().catch(() => undefined);
        return badResponseResult();
      }
      if (NULL_BODY_STATUSES.has(response.status)) return { status: response.status, body: null };
      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      return { status: response.status, body };
    } catch (error) {
      if ((error as { name?: string })?.name === 'TimeoutError') {
        return {
          status: 504,
          body: { message: 'The partner service didn’t respond in time. Try again.', code: 'gateway_timeout' },
        };
      }
      return {
        status: 502,
        body: { message: 'The partner service is unreachable. Try again shortly.', code: 'gateway_unreachable' },
      };
    }
  };
}

function badResponseResult(): PartnerGatewayResult {
  return {
    status: 502,
    body: { message: 'The partner service returned an unexpected response. Try again.', code: 'bad_response' },
  };
}

// ── Cookies ─────────────────────────────────────────────────────────────────

export function partnerSessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return [
    `${PARTNER_SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearedPartnerSessionCookie(secure: boolean): string {
  return [
    `${PARTNER_SESSION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** min(8 h, session.expiresAt − now) in whole seconds; 8 h when expiresAt isn't a number. */
export function partnerSessionMaxAge(expiresAt: unknown, now: number): number {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return PARTNER_SESSION_MAX_AGE_SECONDS;
  return Math.max(0, Math.min(PARTNER_SESSION_MAX_AGE_SECONDS, Math.floor((expiresAt - now) / 1000)));
}

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return undefined;
}

// ── Request checks ──────────────────────────────────────────────────────────

/**
 * Catch-all path segments that may be forwarded, or null. Rejects empty and
 * dot-only segments, anything outside [A-Za-z0-9_.:-] (so a decoded "/" or
 * "\" can't add path levels), over-deep paths and the auth routes.
 */
export function partnerPathSegments(path: unknown): string[] | null {
  if (!Array.isArray(path) || path.length === 0 || path.length > MAX_PATH_DEPTH) return null;
  for (const segment of path) {
    if (
      typeof segment !== 'string' ||
      segment.length > MAX_SEGMENT_LENGTH ||
      !SEGMENT_PATTERN.test(segment) ||
      /^\.+$/.test(segment)
    ) {
      return null;
    }
  }
  return RESERVED_FIRST_SEGMENTS.has(path[0]) ? null : (path as string[]);
}

/** Mirrors the admin BFF (adminGatewayRoute.ts): browser mutations must come from this origin. */
function isSameOriginMutation(request: Request): boolean {
  const url = new URL(request.url);
  const allowed = new Set([url.origin]);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost || request.headers.get('host')?.trim();
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = /^(http|https)$/.test(forwardedProtocol ?? '') ? forwardedProtocol : url.protocol.slice(0, -1);
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) allowed.add(`${protocol}://${host}`);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  return !((origin && !allowed.has(origin)) || (fetchSite && fetchSite !== 'same-origin'));
}

/** The browser's address exactly as the admin sign-in limiter derives it; omitted when unknown. */
function clientIpOf(request: Request): string | undefined {
  const address: string = trustedClientAddress(request.headers);
  return address === 'unknown' ? undefined : address;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ── Responses ───────────────────────────────────────────────────────────────

function respond(status: number, body: unknown, cookies: readonly string[] = []): Response {
  const headers = new Headers({ 'cache-control': 'no-store' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  if (NULL_BODY_STATUSES.has(status)) return new Response(null, { status, headers });
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

/** Upstream status and JSON body unchanged (`message`, `code`, `details` intact). */
function passThrough(result: PartnerGatewayResult, cookies: readonly string[] = []): Response {
  if (NULL_BODY_STATUSES.has(result.status)) return respond(result.status, null, cookies);
  if (result.body === null || result.body === undefined) {
    return result.status >= 400
      ? respond(
          result.status,
          { message: `The partner service failed (${result.status}). Try again.`, code: 'bad_response' },
          cookies,
        )
      : respond(502, badResponseResult().body, cookies);
  }
  return respond(result.status, result.body, cookies);
}

const NOT_FOUND = { message: 'Not found.', code: 'not_found' };
const UNKNOWN_ENDPOINT = { message: 'Unknown partner endpoint.', code: 'not_found' };
const CROSS_ORIGIN = { message: 'Cross-origin request denied.', code: 'forbidden' };
const SIGNED_OUT = { message: 'Your session has expired. Please sign in again.', code: 'unauthenticated' };
const INVALID = { message: 'Invalid request.', code: 'invalid_input' };
const TOO_LARGE = { message: 'Request is too large.', code: 'invalid_input' };

// ── Handlers ────────────────────────────────────────────────────────────────

export function createPartnerBffHandlers(deps: PartnerBffDeps) {
  const now = () => (deps.now ?? Date.now)();
  const cleared = () => clearedPartnerSessionCookie(deps.secureCookies());

  function sessionTokenOf(request: Request): { token?: string; present: boolean } {
    const raw = readCookie(request, PARTNER_SESSION_COOKIE);
    if (raw === undefined) return { present: false };
    return SESSION_TOKEN_PATTERN.test(raw) ? { token: raw, present: true } : { present: true };
  }

  /** Bounded JSON object, or no body at all; anything else is refused. */
  async function readBody(
    request: Request,
    { required }: { required: boolean },
  ): Promise<{ body?: Record<string, unknown> } | { response: Response }> {
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > PARTNER_BFF_MAX_BODY_BYTES) {
      return { response: respond(413, TOO_LARGE) };
    }
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      if (!(await bodyIsEmpty(request))) {
        return { response: respond(415, { message: 'Send the request body as JSON.', code: 'invalid_input' }) };
      }
      return required ? { response: respond(400, INVALID) } : {};
    }
    const parsed = await deps.readJson(request.body, PARTNER_BFF_MAX_BODY_BYTES);
    if (!parsed.ok) {
      return { response: parsed.reason === 'too-large' ? respond(413, TOO_LARGE) : respond(400, INVALID) };
    }
    if (!isPlainObject(parsed.value)) return { response: respond(400, INVALID) };
    return { body: parsed.value };
  }

  /**
   * A 2xx sign-in: the token moves into the httpOnly cookie and never reaches
   * the browser. `session.token` is blanked too, whatever upstream sent.
   */
  function signedIn(result: PartnerGatewayResult): Response {
    const body = result.body as Record<string, unknown>;
    const token = body.token;
    const session = body.session;
    if (typeof token !== 'string' || !SESSION_TOKEN_PATTERN.test(token) || !isPlainObject(session)) {
      return respond(502, badResponseResult().body);
    }
    const maxAge = partnerSessionMaxAge(session.expiresAt, now());
    if (maxAge <= 0) return respond(502, badResponseResult().body);
    const visible: Record<string, unknown> = { ...body, session: { ...session, token: '' } };
    delete visible.token;
    return respond(result.status, visible, [partnerSessionCookie(token, maxAge, deps.secureCookies())]);
  }

  function withoutToken(body: Record<string, unknown>): Record<string, unknown> {
    const visible = { ...body };
    delete visible.token;
    if (isPlainObject(visible.session)) visible.session = { ...visible.session, token: '' };
    return visible;
  }

  /** Shared preamble of the two sign-in routes. */
  async function signInRequest(
    request: Request,
    path: string,
  ): Promise<{ result: PartnerGatewayResult } | { response: Response }> {
    if (!deps.enabled()) return { response: respond(404, NOT_FOUND) };
    if (!isSameOriginMutation(request)) return { response: respond(403, CROSS_ORIGIN) };
    const parsed = await readBody(request, { required: true });
    if ('response' in parsed) return parsed;
    const result = await deps.callGateway({
      method: 'POST',
      path,
      search: '',
      body: parsed.body,
      clientIp: clientIpOf(request),
    });
    return { result };
  }

  /** POST /api/partner/login → { kind: "signed_in", session } (+ cookie) | { kind: "password_change_required", … }. */
  async function login(request: Request): Promise<Response> {
    const outcome = await signInRequest(request, '/partner-auth/login');
    if ('response' in outcome) return outcome.response;
    const { result } = outcome;
    if (result.status < 200 || result.status >= 300) return passThrough(result);
    if (!isPlainObject(result.body)) return respond(502, badResponseResult().body);
    if (result.body.kind === 'signed_in') return signedIn(result);
    if (result.body.kind === 'password_change_required') return respond(result.status, withoutToken(result.body));
    return respond(502, badResponseResult().body);
  }

  /** POST /api/partner/login/first-password → { session } (+ cookie). */
  async function firstPassword(request: Request): Promise<Response> {
    const outcome = await signInRequest(request, '/partner-auth/first-password');
    if ('response' in outcome) return outcome.response;
    const { result } = outcome;
    if (result.status < 200 || result.status >= 300) return passThrough(result);
    if (!isPlainObject(result.body)) return respond(502, badResponseResult().body);
    return signedIn(result);
  }

  /** GET /api/partner/session → { session } | 401 (and the cookie is cleared). */
  async function session(request: Request): Promise<Response> {
    if (!deps.enabled()) return respond(404, NOT_FOUND);
    const { token, present } = sessionTokenOf(request);
    if (!token) return respond(401, SIGNED_OUT, present ? [cleared()] : []);
    const result = await deps.callGateway({
      method: 'GET',
      path: '/partner-auth/session',
      search: '',
      sessionToken: token,
      clientIp: clientIpOf(request),
    });
    if (result.status === 401) return passThrough(result, [cleared()]);
    if (result.status >= 200 && result.status < 300 && isPlainObject(result.body)) {
      return respond(result.status, withoutToken(result.body));
    }
    return passThrough(result);
  }

  /** POST /api/partner/logout → 204; the cookie is cleared even if the gateway call fails. */
  async function logout(request: Request): Promise<Response> {
    if (!deps.enabled()) return respond(404, NOT_FOUND);
    if (!isSameOriginMutation(request)) return respond(403, CROSS_ORIGIN);
    const { token } = sessionTokenOf(request);
    if (token) {
      await deps
        .callGateway({
          method: 'POST',
          path: '/partner-auth/logout',
          search: '',
          sessionToken: token,
          clientIp: clientIpOf(request),
        })
        .catch(() => undefined);
    }
    return respond(204, null, [cleared()]);
  }

  /** /api/partner/<path> → gateway /partner/<path> with the session from the cookie. */
  async function forward(
    method: PartnerGatewayMethod,
    request: Request,
    { params }: PartnerBffRouteContext,
  ): Promise<Response> {
    if (!deps.enabled()) return respond(404, NOT_FOUND);
    const url = new URL(request.url);
    const segments = partnerPathSegments((await params).path);
    // Encoded separators are refused outright, whatever the router decoded them to.
    if (!segments || /%(2f|5c)/i.test(url.pathname)) return respond(404, UNKNOWN_ENDPOINT);
    if (url.search.length > MAX_QUERY_LENGTH) {
      return respond(414, { message: 'Request URL is too long.', code: 'invalid_input' });
    }

    const mutation = method !== 'GET';
    if (mutation && !isSameOriginMutation(request)) return respond(403, CROSS_ORIGIN);

    const { token, present } = sessionTokenOf(request);
    if (!token) return respond(401, SIGNED_OUT, present ? [cleared()] : []);

    let idempotencyKey: string | undefined;
    let body: Record<string, unknown> | undefined;
    if (mutation) {
      const rawKey = request.headers.get('idempotency-key');
      if (rawKey !== null) {
        if (!IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
          return respond(400, { message: 'Invalid Idempotency-Key header.', code: 'invalid_input' });
        }
        idempotencyKey = rawKey;
      }
      const parsed = await readBody(request, { required: false });
      if ('response' in parsed) return parsed.response;
      body = parsed.body;
    }

    const result = await deps.callGateway({
      method,
      path: `/partner/${segments.join('/')}`,
      search: url.search,
      ...(body === undefined ? {} : { body }),
      sessionToken: token,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      clientIp: clientIpOf(request),
    });
    return passThrough(result, result.status === 401 ? [cleared()] : []);
  }

  return {
    login,
    firstPassword,
    session,
    logout,
    GET: (request: Request, context: PartnerBffRouteContext) => forward('GET', request, context),
    POST: (request: Request, context: PartnerBffRouteContext) => forward('POST', request, context),
    PUT: (request: Request, context: PartnerBffRouteContext) => forward('PUT', request, context),
    PATCH: (request: Request, context: PartnerBffRouteContext) => forward('PATCH', request, context),
    DELETE: (request: Request, context: PartnerBffRouteContext) => forward('DELETE', request, context),
  };
}
