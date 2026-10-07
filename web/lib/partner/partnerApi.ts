/**
 * Partner (merchant) portal API.
 *
 * DUMMY by default: every call resolves against the shared demo store
 * (demoStore.ts — also used by the admin console's Partners section),
 * persisted in localStorage so edits survive reloads. With
 * NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true the same functions call the BFF
 * route documented on each one instead.
 *
 * TODO(backend): build the BFF under app/api/partner/* (pattern:
 * app/api/admin/gateway/[...path]) — it owns the httpOnly
 * `lessgo_partner_session` cookie and forwards to the gateway's /partners/*
 * routes (gateway-service/src/proxy/brand-offers.controller.ts notes where
 * they go), which proxy to backend-offers-service. Then delete the dummy
 * branch of every function below, demoStore.ts and dummyData.ts.
 */
import { PARTNER_PORTAL_CONFIG, PARTNER_SUPPORT_EMAIL } from './config';
import {
  credentialAccepts,
  demoPause as pause,
  demoStore as store,
  estimateReach,
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
import { dummyDailySeries } from './dummyData';
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
} from './rules';
import type {
  CampaignStats,
  OfferTargeting,
  PartnerAccount,
  PartnerCampaign,
  PartnerLogin,
  PartnerOutlet,
  PartnerOverview,
  PartnerRedemption,
  PartnerSession,
  PartnerUser,
  PartnerVoucherLookup,
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

/** Real mode: same-origin BFF call; a 401 tells PartnerSessionProvider to sign out. */
async function bff<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/partner${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    details?: DraftErrors;
  };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('partner:unauthorized'));
    }
    throw new PartnerApiError(
      payload.message ?? 'Request failed.',
      response.status,
      payload.code ?? 'error',
      payload.details,
    );
  }
  return payload as T;
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
 *   (offers service counts profiles by home location + age/gender, rounds,
 *   and never returns a number below PARTNER_PORTAL_CONFIG.minAudience).
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
 *     lessgo_partner_session (httpOnly, 8 h)
 *   → 200 { kind: "password_change_required", challenge, user } for
 *     temporary passwords (`user` greets them on the set-password step)
 *   → 401 invalid_credentials | temporary_password_expired
 *   → 403 login_disabled | partner_suspended (only after a correct password)
 *   → 429 locked (rate-limited per ID and IP, like
 *     web/lib/adminLoginRateLimit.server.ts).
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
 *   → { session } + cookie. The server re-checks the policy, that the new
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
 * BACKEND: GET /api/partner/session → { session } | 401.
 */
export async function getPartnerSession(): Promise<PartnerSession | null> {
  if (backendEnabled()) {
    try {
      const { session } = await bff<{ session: PartnerSession }>('GET', '/session');
      return session;
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

/** BACKEND: POST /api/partner/logout (clears the cookie, revokes the session). */
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

/** BACKEND: POST /api/partner/password { currentPassword, newPassword } (revokes other sessions). */
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

function sumStats(campaigns: readonly PartnerCampaign[]): CampaignStats {
  const totals: CampaignStats = {
    reach: 0,
    impressions: 0,
    opens: 0,
    claims: 0,
    eventsCreated: 0,
    applied: 0,
    redeemed: 0,
    discountMinor: 0,
    gmvMinor: 0,
  };
  for (const campaign of campaigns) {
    for (const key of Object.keys(totals) as (keyof CampaignStats)[]) {
      totals[key] = key === 'reach' ? Math.max(totals.reach, campaign.stats.reach) : totals[key] + campaign.stats[key];
    }
  }
  return totals;
}

/**
 * Dashboard numbers for the signed-in partner.
 *
 * BACKEND: GET /api/partner/overview?days=30 → PartnerOverview
 *   (aggregated from offer_events + redemptions by the offers service).
 */
export async function getPartnerOverview(session: PartnerSession): Promise<PartnerOverview> {
  if (backendEnabled()) return bff<PartnerOverview>('GET', '/overview?days=30');

  await pause();
  const campaigns = partnerCampaigns(session.partner.id);
  const running = campaigns.filter((campaign) => ['live', 'paused', 'ended'].includes(campaign.status));
  const live = campaigns.filter((campaign) => campaign.status === 'live');
  const totals = sumStats(running);
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const redemptions = store().redemptions.filter((row) => campaignIds.has(row.campaignId));
  const outlets = store().outlets;

  const byDistrict = new Map<string, number>();
  for (const row of redemptions) {
    const districtId = outlets.find((candidate) => candidate.id === row.outletId)?.districtId;
    if (districtId) byDistrict.set(districtId, (byDistrict.get(districtId) ?? 0) + 1);
  }

  return {
    partner: session.partner,
    totals,
    liveCampaigns: campaigns.filter((campaign) => campaign.status === 'live').length,
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

/** The partner-editable fields of a campaign, built from a validated draft. */
function campaignFields(draft: CampaignDraft) {
  const targeting = normaliseTargeting(draft.targeting);
  return {
    headline: draft.headline.trim(),
    description: draft.description.trim(),
    terms: draft.terms.map((term) => term.trim()).filter(Boolean),
    creative: { storyImageUrl: draft.storyImageUrl, coverImageUrl: draft.coverImageUrl },
    offer: { ...draft.offer, label: offerLabel(draft.offer) },
    voucherPolicy: draft.voucherPolicy,
    targeting,
    outletIds: draft.outletIds,
    schedule: { startAt: draft.startAt, endAt: draft.endAt },
    eventDefaults: { eventType: draft.eventType, name: draft.eventName.trim() },
  } satisfies Partial<PartnerCampaign>;
}

/**
 * Submit a campaign for Lessgo review — a new one, or (`resubmitOf`) a
 * rejected one after addressing the review note, which keeps its id.
 *
 * BACKEND:
 *   POST /api/partner/campaigns (Idempotency-Key) { draft }
 *     → 201 PartnerCampaign { status: "in_review" } | 422 { details: DraftErrors }
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
  options: { resubmitOf?: string } = {},
): Promise<PartnerCampaign> {
  if (backendEnabled()) {
    return options.resubmitOf
      ? bff<PartnerCampaign>('PUT', `/campaigns/${encodeURIComponent(options.resubmitOf)}`, { draft })
      : bff<PartnerCampaign>('POST', '/campaigns', { draft });
  }

  await pause(600);
  const errors = validateCampaignDraft(draft);
  if (hasDraftErrors(errors)) {
    throw new PartnerApiError('Fix the highlighted steps and submit again.', 422, 'validation', errors);
  }
  // Synchronous from here: read the store once and save that same object.
  const state = store();
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
    stats: {
      reach: estimateReach(fields.targeting),
      impressions: 0,
      opens: 0,
      claims: 0,
      eventsCreated: 0,
      applied: 0,
      redeemed: 0,
      discountMinor: 0,
      gmvMinor: 0,
    },
  };
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
 * BACKEND: POST /api/partner/vouchers/lookup { input, outletId } → PartnerVoucherLookup
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
  outletId: string;
  billMinor: number;
  /** The 6-digit live code when the code was typed rather than scanned. */
  liveCode?: string;
}

/**
 * Confirm an in-person redemption.
 *
 * BACKEND: POST /api/partner/redemptions (Idempotency-Key) { RedeemRequest }
 *   → 201 PartnerRedemption | 409 not_redeemable.
 *   The offers service flips the voucher to "redeemed" and emits
 *   voucher.redeemed: the app shows "Coupon Redeemed" on the event, and for
 *   percent offers the coupon-credit expense is booked with the actual
 *   discount (backend-transactions-service /internal/coupon-credits).
 *   Enterprise partners can report the same thing from their POS via
 *   POST /webhooks/offers/:partnerId (HMAC-signed) instead of this console.
 */
export async function redeemVoucher(session: PartnerSession, request: RedeemRequest): Promise<PartnerRedemption> {
  if (backendEnabled()) return bff<PartnerRedemption>('POST', '/redemptions', request);

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
  const outletId = session.user.role === 'cashier' ? session.user.outletId ?? '' : request.outletId;
  if (!state.outlets.some((candidate) => candidate.id === outletId && candidate.partnerId === session.partner.id)) {
    throw new PartnerApiError('Pick the outlet you’re redeeming at.', 400, 'invalid_input');
  }
  const campaign = state.campaigns.find((candidate) => candidate.id === voucher.campaignId);
  if (!campaign) throw new PartnerApiError('Campaign not found.', 404, 'not_found');
  const quote = computeDiscount(campaign.offer, request.billMinor);
  if (!quote.eligible) throw new PartnerApiError(quote.note ?? 'This bill isn’t eligible.', 400, 'not_eligible');

  const redemption: PartnerRedemption = {
    id: randomId('rdm'),
    voucherId: voucher.voucherId,
    maskedCode: maskVoucherCode(voucher.code),
    campaignId: campaign.id,
    outletId,
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

/** BACKEND: GET /api/partner/redemptions?campaignId=&limit= → { redemptions } */
export async function listPartnerRedemptions(
  session: PartnerSession,
  options: { campaignId?: string; limit?: number } = {},
): Promise<PartnerRedemption[]> {
  if (backendEnabled()) {
    const query = new URLSearchParams();
    if (options.campaignId) query.set('campaignId', options.campaignId);
    if (options.limit) query.set('limit', String(options.limit));
    return (await bff<{ redemptions: PartnerRedemption[] }>('GET', `/redemptions?${query}`)).redemptions;
  }

  await pause(250);
  const campaignIds = new Set(partnerCampaigns(session.partner.id).map((campaign) => campaign.id));
  const rows = store().redemptions.filter(
    (row) =>
      campaignIds.has(row.campaignId) &&
      (!options.campaignId || row.campaignId === options.campaignId) &&
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
