/**
 * Partner (merchant) portal API.
 *
 * DUMMY by default: every call resolves against the shared demo store
 * (demoStore.ts — also used by the admin console's Partners section),
 * persisted in localStorage so edits survive reloads. With
 * NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true the same functions call the BFF
 * route documented on each one instead: app/api/partner/* (logic in
 * partnerBff.ts) owns the httpOnly `lessgo_partner_session` cookie and
 * forwards to the gateway's BFF-only /partner-auth/* and /partner/* routes,
 * which proxy to backend-offers-service (contract: offers-backend-spec §4–5).
 *
 * TODO(backend): once the offers service is live, delete the dummy branch of
 * every function below, demoStore.ts and dummyData.ts.
 */
import {
  channelIsLive,
  draftContextFor,
  httpsHostOf,
  isWithinDomain,
  normaliseDomain,
  type OnlineChannel,
} from './channels';
import { PARTNER_PORTAL_CONFIG, PARTNER_SUPPORT_EMAIL } from './config';
import {
  credentialAccepts,
  demoPause as pause,
  demoStore as store,
  estimateReach,
  randomBytes,
  randomId,
  recordAudit,
  resetDemoStore,
  saveDemoStore as persist,
  sha256Hex,
  toPartnerLogin,
  type DemoCredential,
  type DemoState,
  type DemoVoucher,
} from './demoStore';
import {
  DEVELOPER_CREDENTIAL_DETAILS,
  developerCredentialAccessRefusal,
  developerCredentialsOf,
  rotateDeveloperCredentialIn,
} from './developerCredentials';
import { dummyDailySeries, dummyIntegrationTest } from './dummyData';
import { getGeoDistrict, isPincodeInState, stateCodeOfDistrict } from './indiaGeo';
import {
  computeDiscount,
  hasDraftErrors,
  maskVoucherCode,
  newPasswordProblem,
  normaliseTargeting,
  offerLabel,
  parseRedemptionInput,
  validateCampaignDraft,
  type CampaignDraft,
  type DraftErrors,
  type DraftStep,
} from './rules';
import type {
  BookingIntegration,
  BookingIntegrationInput,
  CampaignStats,
  CheckoutIntegration,
  CheckoutIntegrationInput,
  DeveloperCredentials,
  DeveloperCredentialType,
  IntegrationTestRun,
  OfferTargeting,
  PartnerAccount,
  PartnerCampaign,
  PartnerChannelTotals,
  PartnerLogin,
  PartnerOutlet,
  PartnerOverview,
  PartnerRedemption,
  PartnerSession,
  PartnerUser,
  PartnerVoucherLookup,
  RedemptionChannel,
  RevealedCredential,
} from './types';

export class PartnerApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Field/step errors for validation failures. */
  readonly details?: DraftErrors;

  constructor(message: string, status: number, code: string, details?: DraftErrors) {
    super(message);
    this.name = 'PartnerApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const backendEnabled = () => !PARTNER_PORTAL_CONFIG.useDummyData;

const DRAFT_STEPS: readonly DraftStep[] = ['offer', 'creative', 'audience', 'rules'];

/** The per-step messages of a 422 `validation` error, ignoring anything else. */
function draftErrorsFrom(details: unknown): DraftErrors | undefined {
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return undefined;
  const errors: DraftErrors = {};
  for (const step of DRAFT_STEPS) {
    const messages = (details as Record<string, unknown>)[step];
    if (Array.isArray(messages) && messages.length > 0 && messages.every((message) => typeof message === 'string')) {
      errors[step] = messages;
    }
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * Real mode: same-origin BFF call (app/api/partner/* → gateway → offers
 * service); the session rides in the httpOnly cookie. Errors keep the
 * service's `message` and `code`, plus per-step `details` for 422
 * `validation`; a 401 tells PartnerSessionProvider to sign out.
 */
async function bff<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: { idempotencyKey?: string } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/partner${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PartnerApiError('Network error. Check your connection and try again.', 0, 'network_error');
  }
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
    code?: string;
    details?: unknown;
  } | null;
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('partner:unauthorized'));
    }
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    throw new PartnerApiError(
      message || 'Request failed.',
      response.status,
      typeof payload?.code === 'string' ? payload.code : 'error',
      response.status === 422 && payload?.code === 'validation' ? draftErrorsFrom(payload.details) : undefined,
    );
  }
  return (payload ?? {}) as T;
}

// ── Demo session ────────────────────────────────────────────────────────────

/** DUMMY session storage; the real session is the httpOnly cookie. */
export const PARTNER_SESSION_STORAGE_KEY = 'lessgo.partner.session.v1';
const SESSION_KEY = PARTNER_SESSION_STORAGE_KEY;

/** Puts every partner, login, campaign and redemption back to the demo start. */
export async function resetPartnerDemo(): Promise<void> {
  if (backendEnabled()) return;
  resetDemoStore();
  await pause(150);
}

// ── Audience ────────────────────────────────────────────────────────────────

/**
 * Users who'd see the campaign, rounded to two significant figures.
 *
 * DUMMY: computed from made-up per-state user counts (demoStore.ts).
 * BACKEND: POST /api/partner/audience/estimate { targeting } → { estimate }
 *   (the offers service counts profiles by home location + age/gender and
 *   rounds like roundEstimate). There is no minimum audience: a campaign can
 *   be submitted and go live whatever the estimate, even 0 or 1.
 */
export async function fetchAudienceEstimate(targeting: OfferTargeting): Promise<number> {
  if (backendEnabled()) {
    const { estimate } = await bff<{ estimate: number }>('POST', '/audience/estimate', { targeting });
    return estimate;
  }
  await pause(120);
  return estimateReach(targeting);
}

// ── Session ─────────────────────────────────────────────────────────────────

export type SignInResult =
  | { kind: 'signed_in'; session: PartnerSession }
  | { kind: 'password_change_required'; challenge: string; user: PartnerUser };

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
/** challenge → the login and the credential version (issuedAt) it was issued for. */
const challenges = new Map<string, { userId: string; expiresAt: number; issuedAt: string }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

function partnerById(partnerId: string, state: DemoState = store()): PartnerAccount {
  const found = state.partners.find((candidate) => candidate.id === partnerId);
  if (!found) throw new PartnerApiError('Partner account not found.', 404, 'not_found');
  return found;
}

/** Records the sign-in and persists `state`; call it at the end of a synchronous change. */
function startSession(user: PartnerUser, state: DemoState): PartnerSession {
  const now = Date.now();
  const credential = state.credentials[user.userId];
  if (credential) credential.lastSignInAt = new Date(now).toISOString();
  persist(state);
  const session: PartnerSession = {
    token: randomId('pss'),
    user: { ...user, lastActiveAt: new Date(now).toISOString() },
    partner: { ...partnerById(user.partnerId, state) },
    signedInAt: new Date(now).toISOString(),
    expiresAt: now + PARTNER_PORTAL_CONFIG.sessionTtlMs,
  };
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Session lasts for this tab only.
  }
  return session;
}

/** Why a login with the right password still can't sign in, or null. */
function signInBlock(account: PartnerAccount, credential: DemoCredential): PartnerApiError | null {
  if (account.status === 'suspended') {
    return new PartnerApiError(
      `${account.brandName}’s partner account is suspended. Contact ${PARTNER_SUPPORT_EMAIL}.`,
      403,
      'partner_suspended',
    );
  }
  if (credential.status === 'disabled') {
    return new PartnerApiError('This login has been turned off. Ask your account owner or Lessgo.', 403, 'login_disabled');
  }
  if (
    credential.mustChangePassword &&
    credential.temporaryExpiresAt &&
    Date.parse(credential.temporaryExpiresAt) <= Date.now()
  ) {
    return new PartnerApiError(
      'This temporary password has expired. Ask Lessgo to send a new one.',
      401,
      'temporary_password_expired',
    );
  }
  return null;
}

/** Narrows the BFF's login response; anything else is reported, not rendered. */
function parseSignInResult(payload: unknown): SignInResult {
  const value = (payload ?? {}) as {
    kind?: unknown;
    session?: PartnerSession;
    challenge?: unknown;
    user?: PartnerUser;
  };
  if (value.kind === 'signed_in' && value.session?.user && value.session.partner) {
    return { kind: 'signed_in', session: value.session };
  }
  if (value.kind === 'password_change_required' && typeof value.challenge === 'string' && value.user?.userId) {
    return { kind: 'password_change_required', challenge: value.challenge, user: value.user };
  }
  throw new PartnerApiError('Sign-in returned an unexpected response. Try again.', 502, 'bad_response');
}

/**
 * Sign in with the user ID + password Lessgo issued.
 *
 * DUMMY: checks the demo store's credentials (seeded demo logins and any
 * issued from Admin → Partners); 5 failures lock the ID for a minute.
 * BACKEND: POST /api/partner/login { userId, password } → SignInResult:
 *   → 200 { kind: "signed_in", session } and Set-Cookie
 *     lessgo_partner_session (httpOnly, SameSite=Lax, ≤ 8 h); the BFF takes
 *     the gateway's top-level `token` into the cookie and never returns it
 *   → 200 { kind: "password_change_required", challenge, user } for
 *     temporary passwords (`user` greets them on the set-password step)
 *   → 401 invalid_credentials | temporary_password_expired
 *   → 403 login_disabled | partner_suspended (only after a correct password)
 *   → 429 locked (5 failures lock the ID for a minute; the offers service
 *     also limits each IP, which the BFF forwards as x-partner-client-ip).
 */
export async function partnerSignIn(rawUserId: string, password: string): Promise<SignInResult> {
  const userId = rawUserId.trim().toLowerCase();
  if (backendEnabled()) return parseSignInResult(await bff<unknown>('POST', '/login', { userId, password }));

  await pause(450);
  const attempts = failedAttempts.get(userId);
  if (attempts && attempts.lockedUntil > Date.now()) {
    throw new PartnerApiError('Too many attempts. Try again in a minute.', 429, 'locked');
  }

  // Hash before reading the store: everything after this is synchronous.
  const passwordHash = await sha256Hex(password);
  const state = store();
  const user = state.users.find((candidate) => candidate.userId === userId);
  const credential = state.credentials[userId];
  const valid = !!user && !!credential && credentialAccepts(credential, password, passwordHash);

  if (!valid || !user || !credential) {
    const count = (attempts?.count ?? 0) + 1;
    failedAttempts.set(userId, {
      count: count >= MAX_ATTEMPTS ? 0 : count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
    });
    // Same message for unknown IDs and wrong passwords.
    throw new PartnerApiError('Incorrect user ID or password.', 401, 'invalid_credentials');
  }

  failedAttempts.delete(userId);
  const blocked = signInBlock(partnerById(user.partnerId, state), credential);
  if (blocked) throw blocked;
  if (credential.mustChangePassword) {
    const challenge = randomId('chg');
    challenges.set(challenge, { userId, expiresAt: Date.now() + 10 * 60_000, issuedAt: credential.issuedAt });
    return { kind: 'password_change_required', challenge, user };
  }
  return { kind: 'signed_in', session: startSession(user, state) };
}

/**
 * Replace a temporary password on first sign-in.
 *
 * BACKEND: POST /api/partner/login/first-password { challenge, newPassword }
 *   → { session } + cookie (401 challenge_expired, 400 weak_password, 403 as
 *   for sign-in). The server re-checks the policy, that the new
 *   password differs from the temporary one, and — because an admin may have
 *   acted since the challenge — that the partner isn't suspended, the login is
 *   on, and the temporary password is unexpired and the one the challenge was
 *   issued for (a reset cancels pending challenges). It marks an invited
 *   partner active when the login is the owner's.
 */
export async function partnerCompleteFirstLogin(challenge: string, newPassword: string): Promise<PartnerSession> {
  if (backendEnabled()) {
    const { session } = await bff<{ session?: PartnerSession }>('POST', '/login/first-password', {
      challenge,
      newPassword,
    });
    if (!session?.user || !session.partner) {
      throw new PartnerApiError('Sign-in returned an unexpected response. Try again.', 502, 'bad_response');
    }
    return session;
  }

  await pause(400);
  const expired = () =>
    new PartnerApiError('This sign-in expired. Sign in again with your temporary password.', 401, 'challenge_expired');
  const pending = challenges.get(challenge);
  if (!pending || pending.expiresAt < Date.now()) {
    challenges.delete(challenge);
    throw expired();
  }

  // Hash before reading the store: everything after this is synchronous.
  const newHash = await sha256Hex(newPassword);
  const state = store();
  const credential = state.credentials[pending.userId];
  const user = state.users.find((candidate) => candidate.userId === pending.userId);
  if (!credential || !user) {
    challenges.delete(challenge);
    throw new PartnerApiError('Account not found.', 404, 'not_found');
  }
  const account = partnerById(user.partnerId, state);
  const blocked =
    credential.issuedAt !== pending.issuedAt || !credential.mustChangePassword
      ? expired()
      : signInBlock(account, credential);
  if (blocked) {
    challenges.delete(challenge);
    throw blocked;
  }
  const problem =
    newPasswordProblem(newPassword, { userId: pending.userId }) ??
    (credentialAccepts(credential, newPassword, newHash) ? 'Choose a new password, not the temporary one.' : null);
  if (problem) throw new PartnerApiError(problem, 400, 'weak_password');

  credential.passwordHash = newHash;
  delete credential.demoPassword;
  delete credential.temporaryExpiresAt;
  credential.mustChangePassword = false;
  challenges.delete(challenge);

  recordAudit(state, { partnerId: account.id, actor: user.userId, action: 'login.password_set', detail: `${user.userId} set their own password.` });
  if (account.status === 'invited' && user.role === 'owner') {
    account.status = 'active';
    account.activatedAt = new Date().toISOString();
    recordAudit(state, { partnerId: account.id, actor: user.userId, action: 'partner.activated', detail: 'Owner set a password and signed in.' });
  }
  return startSession(user, state);
}

/**
 * The signed-in partner, or null.
 *
 * DUMMY: re-checks the stored session against the demo store, the way the
 * server re-reads the session on every request — suspending the partner,
 * turning the login off or resetting its password ends it for good (those
 * actions revoke sessions, so reactivating doesn't bring it back).
 * BACKEND: GET /api/partner/session → { session } | 401 (no cookie, or the
 *   offers service revoked it — the BFF then clears the cookie).
 */
export async function getPartnerSession(): Promise<PartnerSession | null> {
  if (backendEnabled()) {
    try {
      const { session } = await bff<{ session?: PartnerSession }>('GET', '/session');
      return session?.user && session.partner ? session : null;
    } catch (error) {
      if (error instanceof PartnerApiError && error.status === 401) return null;
      throw error;
    }
  }

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as PartnerSession) : null;
    if (!session) return null;
    const state = store();
    const user = state.users.find((candidate) => candidate.userId === session.user.userId);
    const credential = state.credentials[session.user.userId];
    const account = state.partners.find((candidate) => candidate.id === session.partner.id);
    const revoked =
      !!credential?.sessionsRevokedAt && Date.parse(credential.sessionsRevokedAt) > Date.parse(session.signedInAt);
    if (
      session.expiresAt <= Date.now() ||
      !user ||
      !credential ||
      !account ||
      credential.status !== 'active' ||
      credential.mustChangePassword ||
      account.status === 'suspended' ||
      revoked
    ) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { ...session, user: { ...user, lastActiveAt: session.user.lastActiveAt }, partner: { ...account } };
  } catch {
    return null;
  }
}

/** BACKEND: POST /api/partner/logout → 204 (revokes the session; the BFF always clears the cookie). */
export async function partnerSignOut(): Promise<void> {
  if (backendEnabled()) {
    await bff('POST', '/logout');
    return;
  }
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** BACKEND: POST /api/partner/password { currentPassword, newPassword } → 204 (revokes other sessions). */
export async function changePartnerPassword(
  session: PartnerSession,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (backendEnabled()) {
    await bff('POST', '/password', { currentPassword, newPassword });
    return;
  }

  await pause(400);
  const { userId } = session.user;
  // Hash before reading the store: everything after this is synchronous.
  const [currentHash, newHash] = await Promise.all([sha256Hex(currentPassword), sha256Hex(newPassword)]);
  const state = store();
  const credential = state.credentials[userId];
  if (!credential || !credentialAccepts(credential, currentPassword, currentHash)) {
    throw new PartnerApiError('Your current password is incorrect.', 400, 'invalid_credentials');
  }
  const problem = newPasswordProblem(newPassword, { userId, previous: currentPassword });
  if (problem) throw new PartnerApiError(problem, 400, 'weak_password');
  credential.passwordHash = newHash;
  delete credential.demoPassword;
  recordAudit(state, { partnerId: session.partner.id, actor: userId, action: 'login.password_set', detail: `${userId} changed their password.` });
  persist(state);
}

// ── Overview ────────────────────────────────────────────────────────────────

function partnerCampaigns(partnerId: string): PartnerCampaign[] {
  return store().campaigns.filter((campaign) => campaign.partnerId === partnerId);
}

function zeroStats(): CampaignStats {
  return {
    reach: 0,
    impressions: 0,
    opens: 0,
    claims: 0,
    eventsCreated: 0,
    applied: 0,
    redeemed: 0,
    discountMinor: 0,
    gmvMinor: 0,
    checkouts: 0,
    units: 0,
    reversed: 0,
  };
}

function sumStats(campaigns: readonly PartnerCampaign[]): CampaignStats {
  const totals = zeroStats();
  for (const campaign of campaigns) {
    for (const key of Object.keys(totals) as (keyof CampaignStats)[]) {
      totals[key] = key === 'reach' ? Math.max(totals.reach, campaign.stats.reach) : totals[key] + campaign.stats[key];
    }
  }
  return totals;
}

/**
 * Dashboard numbers for the signed-in partner, overall and per channel.
 *
 * BACKEND: GET /api/partner/overview?days=30 → PartnerOverview
 *   (aggregated from offer_events + redemptions by the offers service).
 */
export async function getPartnerOverview(session: PartnerSession): Promise<PartnerOverview> {
  if (backendEnabled()) return bff<PartnerOverview>('GET', '/overview?days=30');

  await pause();
  const state = store();
  const account = partnerById(session.partner.id, state);
  const campaigns = state.campaigns.filter((campaign) => campaign.partnerId === account.id);
  const isRunning = (campaign: PartnerCampaign) => ['live', 'paused', 'ended'].includes(campaign.status);
  const running = campaigns.filter(isRunning);
  const live = campaigns.filter((campaign) => campaign.status === 'live');
  const totals = sumStats(running);
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const redemptions = state.redemptions.filter((row) => campaignIds.has(row.campaignId));

  const byDistrict = new Map<string, number>();
  for (const row of redemptions) {
    const districtId = row.outletId ? state.outlets.find((candidate) => candidate.id === row.outletId)?.districtId : undefined;
    if (districtId) byDistrict.set(districtId, (byDistrict.get(districtId) ?? 0) + 1);
  }
  const byChannel: PartnerChannelTotals[] = account.channels.map((channel) => {
    const own = campaigns.filter((campaign) => campaign.channel === channel);
    return {
      channel,
      campaigns: own.length,
      liveCampaigns: own.filter((campaign) => campaign.status === 'live').length,
      totals: sumStats(own.filter(isRunning)),
    };
  });

  return {
    partner: account,
    totals,
    byChannel,
    liveCampaigns: live.length,
    // A partner with nothing live has no activity to chart (e.g. just onboarded).
    daily: live.length > 0 ? dummyDailySeries(session.partner.id, sumStats(live)) : [],
    recentRedemptions: redemptions.slice(0, 8),
    topDistricts: [...byDistrict.entries()]
      .map(([districtId, redeemed]) => ({ districtId, redeemed }))
      .sort((a, b) => b.redeemed - a.redeemed)
      .slice(0, 5),
  };
}

// ── Campaigns ───────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<PartnerCampaign['status'], number> = {
  live: 0,
  paused: 1,
  scheduled: 2,
  in_review: 3,
  rejected: 4,
  draft: 5,
  ended: 6,
};

/** BACKEND: GET /api/partner/campaigns → { campaigns: PartnerCampaign[] } */
export async function listPartnerCampaigns(session: PartnerSession): Promise<PartnerCampaign[]> {
  if (backendEnabled()) return (await bff<{ campaigns: PartnerCampaign[] }>('GET', '/campaigns')).campaigns;

  await pause();
  return partnerCampaigns(session.partner.id).sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.schedule.startAt.localeCompare(a.schedule.startAt),
  );
}

/** BACKEND: GET /api/partner/campaigns/:id → PartnerCampaign | 404 */
export async function getPartnerCampaign(session: PartnerSession, campaignId: string): Promise<PartnerCampaign> {
  if (backendEnabled()) return bff<PartnerCampaign>('GET', `/campaigns/${encodeURIComponent(campaignId)}`);

  await pause();
  const campaign = partnerCampaigns(session.partner.id).find((candidate) => candidate.id === campaignId);
  if (!campaign) throw new PartnerApiError('Campaign not found.', 404, 'not_found');
  return campaign;
}

/**
 * The partner-editable fields of a campaign, built from a validated draft.
 * Only the chosen channel's settings are kept (a resubmission can switch
 * channel), so stale online/booking/outlet settings never linger.
 */
function campaignFields(draft: CampaignDraft) {
  const targeting = normaliseTargeting(draft.targeting);
  const online =
    draft.channel === 'online_code' && draft.online
      ? {
          ...draft.online,
          landingUrl: draft.online.landingUrl.trim(),
          ...(draft.online.applyUrlTemplate?.trim() ? { applyUrlTemplate: draft.online.applyUrlTemplate.trim() } : {}),
          appliesTo: draft.online.appliesTo.trim(),
        }
      : undefined;
  if (online && !draft.online?.applyUrlTemplate?.trim()) delete online.applyUrlTemplate;
  return {
    headline: draft.headline.trim(),
    description: draft.description.trim(),
    terms: draft.terms.map((term) => term.trim()).filter(Boolean),
    creative: { storyImageUrl: draft.storyImageUrl, coverImageUrl: draft.coverImageUrl },
    offer: { ...draft.offer, label: offerLabel(draft.offer) },
    voucherPolicy: draft.voucherPolicy,
    targeting,
    channel: draft.channel,
    online,
    booking:
      draft.channel === 'api_booking' && draft.booking ? { ...draft.booking, scope: draft.booking.scope.trim() } : undefined,
    outletIds: draft.channel === 'in_store' ? draft.outletIds : [],
    schedule: { startAt: draft.startAt, endAt: draft.endAt },
    eventDefaults: { eventType: draft.eventType, name: draft.eventName.trim() },
  } satisfies Partial<PartnerCampaign>;
}

/**
 * Submit a campaign for Lessgo review — a new one, or (`resubmitOf`) a
 * rejected one after addressing the review note, which keeps its id.
 *
 * `idempotencyKey` names the submit, not the request: the wizard keeps it
 * across retries (idempotency.ts), so a retry after a timeout gets back the
 * campaign the first attempt created rather than a duplicate. Only the POST
 * sends it; DUMMY ignores it.
 *
 * BACKEND:
 *   POST /api/partner/campaigns (Idempotency-Key) { draft }
 *     → 201 PartnerCampaign { status: "in_review" } (the same key again → that campaign)
 *     | 422 { code: "validation", details: DraftErrors }
 *   PUT /api/partner/campaigns/:id { draft }   (resubmission)
 *     → 200 PartnerCampaign { status: "in_review" } | 409 unless "rejected" | 422
 *   An admin approves it in the Admin portal (→ "scheduled"/"live"). From
 *   then on the offers service's distribution engine matches users against
 *   `targeting` (home location + age/gender) for GET /offers/tray, and mints
 *   each user's unique voucher on claim, enforcing voucherPolicy limits
 *   atomically.
 */
export async function submitPartnerCampaign(
  session: PartnerSession,
  draft: CampaignDraft,
  options: { idempotencyKey: string; resubmitOf?: string },
): Promise<PartnerCampaign> {
  if (backendEnabled()) {
    return options.resubmitOf
      ? bff<PartnerCampaign>('PUT', `/campaigns/${encodeURIComponent(options.resubmitOf)}`, { draft })
      : bff<PartnerCampaign>('POST', '/campaigns', { draft }, { idempotencyKey: options.idempotencyKey });
  }

  await pause(600);
  // Synchronous from here: read the store once and save that same object.
  const state = store();
  const errors = validateCampaignDraft(draft, { partner: draftContextFor(partnerById(session.partner.id, state)) });
  if (hasDraftErrors(errors)) {
    throw new PartnerApiError('Fix the highlighted steps and submit again.', 422, 'validation', errors);
  }
  const ownOutletIds = new Set(
    state.outlets.filter((candidate) => candidate.partnerId === session.partner.id).map((candidate) => candidate.id),
  );
  if (draft.outletIds.some((id) => !ownOutletIds.has(id))) {
    throw new PartnerApiError('One of the selected outlets no longer exists.', 422, 'validation');
  }

  const now = new Date().toISOString();
  const fields = campaignFields(draft);

  if (options.resubmitOf) {
    const rejected = state.campaigns.find(
      (candidate) => candidate.id === options.resubmitOf && candidate.partnerId === session.partner.id,
    );
    if (!rejected) throw new PartnerApiError('Campaign not found.', 404, 'not_found');
    if (rejected.status !== 'rejected') {
      throw new PartnerApiError('Only campaigns that need changes can be resubmitted.', 409, 'invalid_state');
    }
    Object.assign(rejected, fields, { status: 'in_review', updatedAt: now, submittedAt: now });
    if (!fields.online) delete rejected.online;
    if (!fields.booking) delete rejected.booking;
    delete rejected.reviewNote;
    rejected.stats.reach = estimateReach(fields.targeting);
    recordAudit(state, {
      partnerId: session.partner.id,
      actor: session.user.userId,
      action: 'campaign.submitted',
      detail: `Resubmitted “${rejected.headline}” after changes.`,
    });
    persist(state);
    return rejected;
  }

  const campaign: PartnerCampaign = {
    id: randomId('cmp'),
    partnerId: session.partner.id,
    status: 'in_review',
    ...fields,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    stats: { ...zeroStats(), reach: estimateReach(fields.targeting) },
  };
  if (!campaign.online) delete campaign.online;
  if (!campaign.booking) delete campaign.booking;
  state.campaigns.unshift(campaign);
  recordAudit(state, {
    partnerId: session.partner.id,
    actor: session.user.userId,
    action: 'campaign.submitted',
    detail: `Submitted “${campaign.headline}”.`,
  });
  persist(state);
  return campaign;
}

/**
 * Pause or resume a live campaign. Paused campaigns leave the tray at once;
 * vouchers already claimed stay valid until they expire.
 *
 * BACKEND: PATCH /api/partner/campaigns/:id { status: "paused" | "live" }
 *   → 409 channel_not_live when resuming a campaign whose online channel
 *   Lessgo has taken offline (or not approved yet) — only Lessgo can undo that.
 */
export async function setCampaignPaused(
  session: PartnerSession,
  campaignId: string,
  paused: boolean,
): Promise<PartnerCampaign> {
  if (backendEnabled()) {
    return bff<PartnerCampaign>('PATCH', `/campaigns/${encodeURIComponent(campaignId)}`, {
      status: paused ? 'paused' : 'live',
    });
  }

  await pause();
  const state = store();
  const campaign = state.campaigns.find(
    (candidate) => candidate.id === campaignId && candidate.partnerId === session.partner.id,
  );
  if (!campaign) throw new PartnerApiError('Campaign not found.', 404, 'not_found');
  if (campaign.status !== (paused ? 'live' : 'paused')) {
    throw new PartnerApiError(`A ${campaign.status.replace('_', ' ')} campaign can’t be ${paused ? 'paused' : 'resumed'}.`, 409, 'invalid_state');
  }
  if (!paused && !channelIsLive(partnerById(session.partner.id, state), campaign.channel)) {
    throw new PartnerApiError(
      'Lessgo has taken this channel offline. It can be resumed once the connection is live again (Integrations).',
      409,
      'channel_not_live',
    );
  }
  campaign.status = paused ? 'paused' : 'live';
  campaign.updatedAt = new Date().toISOString();
  persist(state);
  return campaign;
}

// ── Outlets ─────────────────────────────────────────────────────────────────

/** BACKEND: GET /api/partner/outlets → { outlets: PartnerOutlet[] } */
export async function listPartnerOutlets(session: PartnerSession): Promise<PartnerOutlet[]> {
  if (backendEnabled()) return (await bff<{ outlets: PartnerOutlet[] }>('GET', '/outlets')).outlets;

  await pause(250);
  return store().outlets.filter((candidate) => candidate.partnerId === session.partner.id);
}

export interface OutletInput {
  name: string;
  address: string;
  pincode: string;
  stateCode: string;
  districtId: string;
  coordinates: [number, number];
}

function haversineKm([lat1, lng1]: readonly [number, number], [lat2, lng2]: readonly [number, number]): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Hard checks for a new outlet; null when it can be saved. */
export function outletProblem(input: OutletInput): string | null {
  if (input.name.trim().length < 3) return 'Give the outlet a name.';
  if (input.address.trim().length < 8) return 'Add the street address.';
  if (!input.stateCode) return 'Pick the state or union territory.';
  if (!isPincodeInState(input.pincode, input.stateCode)) return 'That PIN code isn’t in the selected state.';
  if (stateCodeOfDistrict(input.districtId) !== input.stateCode) return 'Pick a district in the selected state.';
  const [lat, lng] = input.coordinates;
  if (!(lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5)) return 'The map pin must be inside India.';
  return null;
}

/**
 * Soft check for a pin that is far from its district. District centres are
 * approximate and big districts (Kutch, Leh, Lahaul & Spiti…) span well over
 * 100 km, so this asks for a second look instead of blocking the save.
 */
export function outletPinWarning(input: Pick<OutletInput, 'districtId' | 'coordinates'>): string | null {
  const district = getGeoDistrict(input.districtId);
  if (!district) return null;
  const distanceKm = haversineKm(district.centroid, input.coordinates);
  if (distanceKm <= 60) return null;
  return `The pin is about ${Math.round(distanceKm)} km from the centre of ${district.name}. Double-check the coordinates before saving.`;
}

/**
 * Add an outlet. New outlets can be picked as event venues straight away.
 *
 * BACKEND: POST /api/partner/outlets { OutletInput } → 201 PartnerOutlet
 *   (server checks PIN → district against the India Post directory).
 */
export async function createPartnerOutlet(session: PartnerSession, input: OutletInput): Promise<PartnerOutlet> {
  if (backendEnabled()) return bff<PartnerOutlet>('POST', '/outlets', input);

  await pause(450);
  const problem = outletProblem(input);
  if (problem) throw new PartnerApiError(problem, 422, 'validation');
  const created: PartnerOutlet = {
    id: randomId('out'),
    partnerId: session.partner.id,
    name: input.name.trim(),
    address: input.address.trim(),
    pincode: input.pincode,
    stateCode: input.stateCode,
    districtId: input.districtId,
    coordinates: input.coordinates,
    status: 'active',
  };
  const state = store();
  state.outlets.push(created);
  persist(state);
  return created;
}

/** BACKEND: PATCH /api/partner/outlets/:id { status } */
export async function setOutletStatus(
  session: PartnerSession,
  outletId: string,
  status: PartnerOutlet['status'],
): Promise<PartnerOutlet> {
  if (backendEnabled()) return bff<PartnerOutlet>('PATCH', `/outlets/${encodeURIComponent(outletId)}`, { status });

  await pause(250);
  const state = store();
  const found = state.outlets.find((candidate) => candidate.id === outletId && candidate.partnerId === session.partner.id);
  if (!found) throw new PartnerApiError('Outlet not found.', 404, 'not_found');
  found.status = status;
  persist(state);
  return found;
}

// ── Redemption ──────────────────────────────────────────────────────────────

function toLookup(voucher: DemoVoucher): PartnerVoucherLookup {
  const campaign = store().campaigns.find((candidate) => candidate.id === voucher.campaignId);
  if (!campaign) throw new PartnerApiError('No Lessgo voucher matches this code.', 404, 'not_found');
  const expired = voucher.status !== 'redeemed' && Date.parse(voucher.validUntil) <= Date.now();
  return {
    voucherId: voucher.voucherId,
    code: voucher.code,
    maskedCode: maskVoucherCode(voucher.code),
    campaignId: campaign.id,
    campaignHeadline: campaign.headline,
    offer: campaign.offer,
    status: expired ? 'expired' : voucher.status,
    holderDisplayName: voucher.holderDisplayName,
    eventName: voucher.eventName,
    eventStartAt: voucher.eventStartAt,
    acceptedCount: voucher.acceptedCount,
    ...(voucher.outletId ? { outletId: voucher.outletId } : {}),
    validUntil: voucher.validUntil,
    ...(voucher.redeemedAt ? { redeemedAt: voucher.redeemedAt } : {}),
    ...(voucher.redemptionId ? { redemptionId: voucher.redemptionId } : {}),
  };
}

/**
 * Look a voucher up from a scanned QR payload or a typed code.
 *
 * DUMMY: any 6-digit live code is accepted.
 * BACKEND: POST /api/partner/vouchers/lookup { input } → PartnerVoucherLookup
 *   QR payloads carry the rotating code, which the offers service verifies
 *   as a 30-second TOTP (±1 step) so screenshots can't be reused. Unknown
 *   codes and other partners' codes both return 404.
 */
export async function lookupVoucher(session: PartnerSession, input: string): Promise<PartnerVoucherLookup> {
  if (backendEnabled()) return bff<PartnerVoucherLookup>('POST', '/vouchers/lookup', { input });

  await pause(400);
  const parsed = parseRedemptionInput(input);
  if (parsed.kind === 'invalid') throw new PartnerApiError(parsed.reason, 400, 'invalid_input');
  const voucher = store().vouchers.find((candidate) =>
    parsed.kind === 'qr' ? candidate.voucherId === parsed.voucherId : candidate.code === parsed.code,
  );
  if (!voucher || voucher.partnerId !== session.partner.id) {
    throw new PartnerApiError('No Lessgo voucher matches this code.', 404, 'not_found');
  }
  return toLookup(voucher);
}

export interface RedeemRequest {
  voucherId: string;
  /** Required only when the campaign explicitly restricts redemption outlets. */
  outletId?: string;
  billMinor: number;
  /** The 6-digit live code when the code was typed rather than scanned. */
  liveCode?: string;
}

/**
 * Confirm an in-person redemption.
 *
 * `idempotencyKey` names this redemption: the console mints one per
 * looked-up voucher and reuses it on every Confirm retry (idempotency.ts), so
 * a retry after a timeout gets the redemption the first attempt booked rather
 * than 409 not_redeemable. DUMMY ignores it.
 *
 * BACKEND: POST /api/partner/redemptions (Idempotency-Key) { RedeemRequest }
 *   → 201 PartnerRedemption (the same key again → that redemption)
 *   | 409 not_redeemable | 409 idempotency_conflict (key used for another voucher).
 *   The offers service flips the voucher to "redeemed" and emits
 *   voucher.redeemed: the app shows "Coupon Redeemed" on the event, and for
 *   percent offers the coupon-credit expense is booked with the actual
 *   discount (backend-transactions-service /internal/coupon-credits).
 *   Enterprise partners can report the same thing from their POS via
 *   POST /webhooks/offers/:partnerId (HMAC-signed) instead of this console.
 */
export async function redeemVoucher(
  session: PartnerSession,
  request: RedeemRequest,
  options: { idempotencyKey: string },
): Promise<PartnerRedemption> {
  if (backendEnabled()) {
    return bff<PartnerRedemption>('POST', '/redemptions', request, { idempotencyKey: options.idempotencyKey });
  }

  await pause(550);
  const state = store();
  const voucher = state.vouchers.find(
    (candidate) => candidate.voucherId === request.voucherId && candidate.partnerId === session.partner.id,
  );
  if (!voucher) throw new PartnerApiError('No Lessgo voucher matches this code.', 404, 'not_found');
  const current = toLookup(voucher);
  if (current.status !== 'applied') {
    throw new PartnerApiError(
      current.status === 'redeemed' ? 'This voucher was already redeemed.' : 'This voucher can’t be redeemed.',
      409,
      'not_redeemable',
    );
  }
  const campaign = state.campaigns.find((candidate) => candidate.id === voucher.campaignId);
  if (!campaign) throw new PartnerApiError('Campaign not found.', 404, 'not_found');
  const requestedOutletId = session.user.role === 'cashier' ? session.user.outletId : request.outletId;
  const outlet = requestedOutletId
    ? state.outlets.find(
        (candidate) => candidate.id === requestedOutletId && candidate.partnerId === session.partner.id,
      )
    : undefined;
  if (campaign.outletIds.length > 0 && (!outlet || !campaign.outletIds.includes(outlet.id))) {
    throw new PartnerApiError('Pick the outlet you’re redeeming at.', 400, 'invalid_input');
  }
  const quote = computeDiscount(campaign.offer, request.billMinor);
  if (!quote.eligible) throw new PartnerApiError(quote.note ?? 'This bill isn’t eligible.', 400, 'not_eligible');

  const redemption: PartnerRedemption = {
    id: randomId('rdm'),
    voucherId: voucher.voucherId,
    maskedCode: maskVoucherCode(voucher.code),
    campaignId: campaign.id,
    channel: 'in_store',
    ...(outlet ? { outletId: outlet.id } : {}),
    staffUserId: session.user.userId,
    holderDisplayName: voucher.holderDisplayName,
    groupSize: voucher.acceptedCount,
    billMinor: request.billMinor,
    discountMinor: quote.discountMinor,
    redeemedAt: new Date().toISOString(),
    source: 'console',
  };
  voucher.status = 'redeemed';
  voucher.redeemedAt = redemption.redeemedAt;
  voucher.redemptionId = redemption.id;
  campaign.stats.redeemed += 1;
  campaign.stats.discountMinor += quote.discountMinor;
  campaign.stats.gmvMinor += request.billMinor;
  state.redemptions.unshift(redemption);
  persist(state);
  return redemption;
}

/**
 * Confirmed coupon uses: outlet redemptions, online orders and bookings.
 *
 * BACKEND: GET /api/partner/redemptions?campaignId=&channel=&limit=
 *   → { redemptions }. Online orders arrive through the Partner API
 *   (POST /partner-api/v1/vouchers/redeem) and bookings through the
 *   booking.confirmed webhook; cancellations set `reversedAt`.
 */
export async function listPartnerRedemptions(
  session: PartnerSession,
  options: { campaignId?: string; channel?: RedemptionChannel; limit?: number } = {},
): Promise<PartnerRedemption[]> {
  if (backendEnabled()) {
    const query = new URLSearchParams();
    if (options.campaignId) query.set('campaignId', options.campaignId);
    if (options.channel) query.set('channel', options.channel);
    if (options.limit) query.set('limit', String(options.limit));
    const search = query.toString();
    return (await bff<{ redemptions: PartnerRedemption[] }>('GET', `/redemptions${search ? `?${search}` : ''}`))
      .redemptions;
  }

  await pause(250);
  const campaignIds = new Set(partnerCampaigns(session.partner.id).map((campaign) => campaign.id));
  const rows = store().redemptions.filter(
    (row) =>
      campaignIds.has(row.campaignId) &&
      (!options.campaignId || row.campaignId === options.campaignId) &&
      (!options.channel || row.channel === options.channel) &&
      (session.user.role !== 'cashier' || row.outletId === session.user.outletId),
  );
  return rows.slice(0, options.limit ?? 50);
}

/** DUMMY only: codes to try in the redeem console (there is no real app traffic yet). */
export function demoVouchersFor(session: PartnerSession): (DemoVoucher & { qrPayload: string })[] {
  if (backendEnabled()) return [];
  const live = new Set(
    partnerCampaigns(session.partner.id)
      .filter((campaign) => campaign.status === 'live' || campaign.status === 'paused')
      .map((campaign) => campaign.id),
  );
  return store()
    .vouchers.filter((voucher) => live.has(voucher.campaignId))
    .map((voucher) => ({
      ...voucher,
      qrPayload: `LGV1:${voucher.voucherId}:${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`,
    }));
}

// ── Team & integrations ─────────────────────────────────────────────────────

/**
 * Everyone who can sign in for this partner, with their email and mobile.
 *
 * BACKEND: GET /api/partner/team → { members: PartnerLogin[] } for owners
 *   and managers; 403 forbidden for cashiers (new logins are issued by
 *   Lessgo admins — Admin → Partners).
 */
export async function listPartnerTeam(session: PartnerSession): Promise<PartnerLogin[]> {
  if (backendEnabled()) return (await bff<{ members: PartnerLogin[] }>('GET', '/team')).members;

  await pause(250);
  if (session.user.role === 'cashier') {
    throw new PartnerApiError('Only owners and managers can see the team.', 403, 'forbidden');
  }
  const state = store();
  return state.users
    .filter((member) => member.partnerId === session.partner.id)
    .map((member) => toPartnerLogin(member, state.credentials[member.userId]));
}

/**
 * Fire a signed test event at the partner's webhook.
 *
 * BACKEND: POST /api/partner/integrations/webhook/test → { status, latencyMs }
 *   Payload { type: "voucher.redeemed.test", ... } signed with
 *   X-Lessgo-Signature: t=<unix>,v1=<HMAC-SHA256(secret, t.body)>.
 */
export async function sendTestWebhook(session: PartnerSession): Promise<{ status: number; latencyMs: number }> {
  if (backendEnabled()) return bff('POST', '/integrations/webhook/test');

  await pause(700);
  if (!session.partner.integration.webhookUrl) {
    throw new PartnerApiError('Ask Lessgo to register a webhook URL first.', 400, 'no_webhook');
  }
  return { status: 200, latencyMs: 140 + Math.round(Math.random() * 120) };
}

// ── Online integrations ─────────────────────────────────────────────────────
// online_code: the partner's checkout calls Lessgo (Partner API) — the portal
// manages its domains and sandbox checks. api_booking: Lessgo calls the
// partner's booking API — the portal manages the connection details.

export interface PartnerIntegrations {
  channels: RedemptionChannel[];
  website?: string;
  checkout?: CheckoutIntegration;
  booking?: BookingIntegration;
}

/** Days a passing sandbox run stays good enough to request go-live. */
const TEST_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

function ownerOnly(session: PartnerSession): void {
  if (session.user.role !== 'owner') {
    throw new PartnerApiError('Only the account owner can manage integrations.', 403, 'forbidden');
  }
}

function integrationOf(account: PartnerAccount, channel: OnlineChannel): CheckoutIntegration | BookingIntegration {
  const integration = channel === 'online_code' ? account.integration.checkout : account.integration.booking;
  if (!account.channels.includes(channel) || !integration) {
    throw new PartnerApiError('This channel isn’t enabled for your account. Ask Lessgo to add it.', 404, 'not_found');
  }
  return integration;
}

const CHANNEL_NAME: Record<OnlineChannel, string> = { online_code: 'Online checkout', api_booking: 'Booking API' };

/** BACKEND: GET /api/partner/integrations → PartnerIntegrations (owner only). */
export async function getPartnerIntegrations(session: PartnerSession): Promise<PartnerIntegrations> {
  if (backendEnabled()) return bff<PartnerIntegrations>('GET', '/integrations');

  await pause(250);
  ownerOnly(session);
  const account = partnerById(session.partner.id);
  const { checkout, booking } = account.integration;
  return {
    channels: [...account.channels],
    ...(account.website ? { website: account.website } : {}),
    ...(checkout && account.channels.includes('online_code') ? { checkout: structuredClone(checkout) } : {}),
    ...(booking && account.channels.includes('api_booking') ? { booking: structuredClone(booking) } : {}),
  };
}

/** A live connection is changed by Lessgo (roll back to testing first), never silently by the partner. */
function assertEditable(integration: CheckoutIntegration | BookingIntegration): void {
  if (integration.status === 'live') {
    throw new PartnerApiError(
      'This connection is live. Ask Lessgo to move it back to testing before changing it.',
      409,
      'integration_live',
    );
  }
}

/**
 * Checkout domains for the online checkout code channel.
 *
 * BACKEND: PUT /api/partner/integrations/checkout { allowedDomains }
 *   → CheckoutIntegration. The offers service verifies each domain (DNS TXT
 *   record) before it counts, and only ever opens or accepts links on them.
 */
export async function saveCheckoutIntegration(
  session: PartnerSession,
  input: CheckoutIntegrationInput,
): Promise<CheckoutIntegration> {
  if (backendEnabled()) return bff<CheckoutIntegration>('PUT', '/integrations/checkout', input);

  await pause(450);
  ownerOnly(session);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const integration = integrationOf(account, 'online_code') as CheckoutIntegration;
  assertEditable(integration);
  const websiteHost = account.website ? httpsHostOf(account.website) : null;
  const domains = [...new Set(input.allowedDomains.map((domain) => normaliseDomain(domain)))];
  if (domains.length === 0 || domains.length > 5 || domains.some((domain) => !domain)) {
    throw new PartnerApiError('Add 1–5 domains like shop.example.com (no https:// or paths).', 422, 'validation');
  }
  if (websiteHost && domains.some((domain) => !isWithinDomain(domain as string, websiteHost))) {
    throw new PartnerApiError(`Checkout domains must be on ${websiteHost}.`, 422, 'validation');
  }
  integration.allowedDomains = domains as string[];
  if (integration.status === 'not_connected' || integration.status === 'ready_for_review') {
    integration.status = 'testing';
    delete integration.goLiveRequestedAt;
  }
  recordAudit(state, {
    partnerId: account.id,
    actor: session.user.userId,
    action: 'integration.updated',
    detail: `Online checkout domains: ${integration.allowedDomains.join(', ')}.`,
  });
  persist(state);
  return structuredClone(integration);
}

/**
 * Connection to the partner's booking API (Lessgo Connect or an adapter).
 *
 * BACKEND: PUT /api/partner/integrations/booking
 *   { sandboxBaseUrl, liveBaseUrl?, auth, clientId, clientSecret? }
 *   → BookingIntegration. The secret is write-only: the offers service
 *   encrypts it (AES-256-GCM, Key Vault) and never returns it.
 */
export async function saveBookingIntegration(
  session: PartnerSession,
  input: BookingIntegrationInput,
): Promise<BookingIntegration> {
  if (backendEnabled()) return bff<BookingIntegration>('PUT', '/integrations/booking', input);

  await pause(450);
  ownerOnly(session);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const integration = integrationOf(account, 'api_booking') as BookingIntegration;
  assertEditable(integration);
  if (!httpsHostOf(input.sandboxBaseUrl)) {
    throw new PartnerApiError('The sandbox base URL must be an https address.', 422, 'validation');
  }
  if (input.liveBaseUrl?.trim() && !httpsHostOf(input.liveBaseUrl)) {
    throw new PartnerApiError('The production base URL must be an https address.', 422, 'validation');
  }
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(input.clientId.trim())) {
    throw new PartnerApiError('The client ID must be 3–64 letters, digits, dots, dashes or underscores.', 422, 'validation');
  }
  const secret = input.clientSecret?.trim();
  if (secret !== undefined && secret !== '' && secret.length < 16) {
    throw new PartnerApiError('The client secret must be at least 16 characters.', 422, 'validation');
  }
  if (!secret && !integration.secretPreview) {
    throw new PartnerApiError('Add the client secret or API key.', 422, 'validation');
  }

  integration.sandboxBaseUrl = input.sandboxBaseUrl.trim();
  if (input.liveBaseUrl?.trim()) integration.liveBaseUrl = input.liveBaseUrl.trim();
  else delete integration.liveBaseUrl;
  integration.auth = input.auth;
  integration.clientId = input.clientId.trim();
  // DUMMY: only a preview is kept; the secret itself is never stored here.
  if (secret) integration.secretPreview = `••••${secret.slice(-4)}`;
  // Any change needs a fresh sandbox run before go-live.
  integration.status = 'testing';
  delete integration.goLiveRequestedAt;
  delete integration.lastTest;
  recordAudit(state, {
    partnerId: account.id,
    actor: session.user.userId,
    action: 'integration.updated',
    detail: `Booking API: ${integration.sandboxBaseUrl} (${input.auth === 'api_key' ? 'API key' : 'OAuth client credentials'}).`,
  });
  persist(state);
  return structuredClone(integration);
}

/**
 * Run the end-to-end check for an online channel.
 *
 * BACKEND: POST /api/partner/integrations/:channel/test → IntegrationTestRun
 *   api_booking: the offers service calls the partner's sandbox —
 *     GET /lessgo/v1/inventory → POST /quotes (test coupon) → POST /bookings
 *     → waits for the signed booking.confirmed webhook → POST /bookings/:id/cancel.
 *   online_code: reports the sandbox calls the partner's checkout made with
 *     its lgp_test_ key — validate → redeem → reverse, signatures checked.
 *   Live integrations run the same checks against production as a health check.
 */
export async function runIntegrationTest(session: PartnerSession, channel: OnlineChannel): Promise<IntegrationTestRun> {
  if (backendEnabled()) return bff<IntegrationTestRun>('POST', `/integrations/${channel}/test`);

  await pause(1_200);
  ownerOnly(session);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const integration = integrationOf(account, channel);
  if (integration.status === 'not_connected') {
    throw new PartnerApiError('Save the connection details first.', 409, 'not_configured');
  }
  const environment = integration.status === 'live' ? 'live' : 'sandbox';
  let failAt: number | undefined;
  let failure: string | undefined;
  if (channel === 'api_booking') {
    const booking = integration as BookingIntegration;
    const host = httpsHostOf((environment === 'live' ? booking.liveBaseUrl : booking.sandboxBaseUrl) ?? '') ?? '';
    // DUMMY failure modes so the error states can be seen.
    if (/fail|down/.test(host)) {
      failAt = 0;
      failure = `Connection to ${host} timed out after 10 s`;
    } else if (/bad|wrong/.test(booking.clientId ?? '')) {
      failAt = 1;
      failure = '401 invalid_client — check the client ID and secret';
    }
  }
  const run = dummyIntegrationTest(channel, {
    at: Date.now(),
    environment,
    failAt,
    failure,
    product: channel === 'api_booking' ? (integration as BookingIntegration).products[0] : undefined,
  });
  integration.lastTest = run;
  recordAudit(state, {
    partnerId: account.id,
    actor: session.user.userId,
    action: 'integration.tested',
    detail: `${CHANNEL_NAME[channel]}: ${environment} checks ${run.ok ? 'passed' : 'failed'}.`,
  });
  persist(state);
  return structuredClone(run);
}

/**
 * Ask Lessgo to approve production for a channel.
 *
 * BACKEND: POST /api/partner/integrations/:channel/go-live
 *   → the integration { status: "ready_for_review", goLiveRequestedAt }.
 *   Needs a passing sandbox run from the last 7 days (409 test_required);
 *   an admin approves it under Admin → Partners.
 */
export async function requestIntegrationGoLive(
  session: PartnerSession,
  channel: OnlineChannel,
): Promise<CheckoutIntegration | BookingIntegration> {
  if (backendEnabled()) return bff('POST', `/integrations/${channel}/go-live`);

  await pause(450);
  ownerOnly(session);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const integration = integrationOf(account, channel);
  if (integration.status !== 'testing') {
    throw new PartnerApiError(
      integration.status === 'ready_for_review' ? 'Lessgo is already reviewing this connection.' : 'Save and test the connection first.',
      409,
      'invalid_state',
    );
  }
  const test = integration.lastTest;
  if (!test || !test.ok || test.environment !== 'sandbox' || Date.now() - Date.parse(test.at) > TEST_FRESH_MS) {
    throw new PartnerApiError('Run the sandbox checks until they pass, then ask to go live.', 409, 'test_required');
  }
  integration.status = 'ready_for_review';
  integration.goLiveRequestedAt = new Date().toISOString();
  recordAudit(state, {
    partnerId: account.id,
    actor: session.user.userId,
    action: 'integration.go_live_requested',
    detail: `${CHANNEL_NAME[channel]}: asked Lessgo to go live.`,
  });
  persist(state);
  return structuredClone(integration);
}

// ── Developer credentials ───────────────────────────────────────────────────

/**
 * The signing secret every online partner's servers sign with, plus the
 * Partner API keys for online checkout — previews and dates only (owner only).
 * Booking-only partners get testKey/liveKey null.
 *
 * DUMMY: the rules in developerCredentials.ts on the demo store.
 * BACKEND: GET /api/partner/integrations/credentials → DeveloperCredentials
 *   (403 forbidden for non-owners, 404 without an online channel).
 */
export async function getDeveloperCredentials(session: PartnerSession): Promise<DeveloperCredentials> {
  if (backendEnabled()) return bff<DeveloperCredentials>('GET', '/integrations/credentials');

  await pause(250);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const refusal = developerCredentialAccessRefusal(account, session.user.role);
  if (refusal) throw new PartnerApiError(refusal.message, refusal.status, refusal.code);
  return developerCredentialsOf(account, state.developerCredentials?.[account.id]);
}

/**
 * Generate a new credential of `type`. The previous one stops working at
 * once; the full value is returned exactly once (only a preview is kept).
 *
 * DUMMY: a fake value in the real format (crypto.getRandomValues).
 * BACKEND: POST /api/partner/integrations/credentials { type }
 *   → RevealedCredential | 409 not_applicable (test_key/live_key without
 *   online checkout) | 409 integration_not_live (live_key before Lessgo
 *   approves go-live) | 403 forbidden (not the owner); audit
 *   integration.credentials_rotated.
 */
export async function rotateDeveloperCredential(
  session: PartnerSession,
  type: DeveloperCredentialType,
): Promise<RevealedCredential> {
  if (backendEnabled()) return bff<RevealedCredential>('POST', '/integrations/credentials', { type });

  await pause(450);
  const state = store();
  const account = partnerById(session.partner.id, state);
  const records = { ...state.developerCredentials?.[account.id] };
  const result = rotateDeveloperCredentialIn(account, session.user.role, records, type, {
    now: Date.now(),
    randomBytes,
  });
  if (!result.ok) throw new PartnerApiError(result.message, result.status, result.code);
  state.developerCredentials = { ...state.developerCredentials, [account.id]: records };
  const { label } = DEVELOPER_CREDENTIAL_DETAILS[result.revealed.type];
  recordAudit(state, {
    partnerId: account.id,
    actor: session.user.userId,
    action: 'integration.credentials_rotated',
    detail: result.replaced
      ? `${label}: generated a new one (${result.revealed.preview}); the previous one stopped working.`
      : `${label}: generated (${result.revealed.preview}).`,
  });
  persist(state);
  return result.revealed;
}
