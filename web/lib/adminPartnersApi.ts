/**
 * Admin console → Partners: onboard merchants, issue their logins and review
 * their campaigns before they reach the Vibes tray.
 *
 * DUMMY by default (NEXT_PUBLIC_PARTNER_PORTAL_BACKEND unset): every call
 * changes the same demo store the partner portal reads
 * (partner/demoStore.ts), so a login issued here works at /partner/login in
 * this browser and an approved campaign goes live in the portal.
 *
 * BACKEND: the same functions go through the existing admin BFF —
 * adminRequest('/gateway/…') → app/api/admin/gateway/[...path] → gateway
 * `/admin/…` (AdminGuard + x-admin-api-key; the BFF adds x-admin-user, which
 * becomes the audit actor) → backend-offers-service. Request and response
 * bodies are the types in partner/types.ts.
 *
 * TODO(backend), in order:
 *  1. Implement the routes stubbed in
 *     gateway-service/src/modules/admin/admin-partners.controller.ts.
 *  2. Allowlist them in web/lib/adminGatewayPolicy.js (+ its tests):
 *       GET   partners, partners/:id, partner-handles/:handle
 *       POST  partners, partners/:id/logins,
 *             partners/:id/logins/:userId/reset-password, campaigns/:id/review,
 *             partners/:id/integrations/:channel/{approve,rollback}
 *       PATCH partners/:id, partners/:id/logins/:userId, partners/:id/channels
 *  3. Set NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true and delete every dummy
 *     branch below.
 */
import { ApiError } from './api';
import { adminRequest } from './adminApi';
import {
  CHANNEL_DETAILS,
  channelIsLive,
  httpsHostOf,
  REDEMPTION_CHANNELS,
  type OnlineChannel,
} from './partner/channels';
import { PARTNER_PORTAL_CONFIG, partnerLoginUrl } from './partner/config';
import {
  demoPause as pause,
  demoStore as store,
  randomBytes,
  recordAudit,
  resetDemoStore,
  saveDemoStore as persist,
  sha256Hex,
  toPartnerLogin,
  type DemoState,
} from './partner/demoStore';
import { dummyVouchers } from './partner/dummyData';
import {
  baseUserId,
  formatIndianMobile,
  generateTemporaryPassword,
  hasOnboardingErrors,
  isHttpsWebsite,
  isValidEmail,
  isValidIndianMobile,
  normaliseGstin,
  normaliseIndianMobile,
  TEMPORARY_PASSWORD_TTL_MS,
  uniqueUserId,
  validateOnboarding,
} from './partner/onboarding';
import type {
  AdminGoLiveRequest,
  AdminPartnerBadge,
  AdminPartnerDetail,
  AdminPartnerSummary,
  AdminPartnersOverview,
  BookingIntegration,
  CampaignReviewDecision,
  CheckoutIntegration,
  CredentialDispatch,
  IssuedCredential,
  NewPartnerLoginInput,
  PartnerAccount,
  PartnerCampaign,
  PartnerChannelsInput,
  PartnerLogin,
  PartnerOnboardingInput,
  PartnerRole,
  PartnerUser,
  RedemptionChannel,
} from './partner/types';

const backendEnabled = () => !PARTNER_PORTAL_CONFIG.useDummyData;

/**
 * Who did it, for the dummy audit trail. The backend ignores this and takes
 * the actor from the admin session (x-admin-user).
 */
export interface AdminActor {
  actor: string;
}

const ROLE_ORDER: Record<PartnerRole, number> = { owner: 0, manager: 1, cashier: 2 };

function partnerOr404(state: DemoState, partnerId: string): PartnerAccount {
  const found = state.partners.find((candidate) => candidate.id === partnerId);
  if (!found) throw new ApiError('Partner not found.', 404);
  return found;
}

function badgeOf(partner: PartnerAccount): AdminPartnerBadge {
  const { id, brandName, logoEmoji, brandColor, plan, status, channels, integration } = partner;
  return { id, brandName, logoEmoji, brandColor, plan, status, channels: [...channels], integration: structuredClone(integration) };
}

/** Last four characters of a fresh random key, for "lgp_test_••••c4d1"-style previews. */
function keyPreview(prefix: string): string {
  const alphabet = '0123456789abcdef';
  const tail = Array.from(randomBytes(4), (byte) => alphabet[byte % 16]).join('');
  return `${prefix}••••${tail}`;
}

function newCheckoutIntegration(website: string | undefined): CheckoutIntegration {
  const host = website ? httpsHostOf(website) : null;
  return { status: 'not_connected', allowedDomains: host ? [host] : [], sandboxKeyPreview: keyPreview('lgp_test_') };
}

function newBookingIntegration(input: Pick<PartnerChannelsInput, 'bookingProducts' | 'bookingMethod'>): BookingIntegration {
  return {
    status: 'not_connected',
    method: input.bookingMethod ?? 'lessgo_connect',
    products: [...(input.bookingProducts ?? [])],
    auth: 'oauth2_client_credentials',
  };
}

const channelNames = (channels: readonly RedemptionChannel[]) =>
  channels.map((channel) => CHANNEL_DETAILS[channel].label).join(' + ');

function userOr404(state: DemoState, partnerId: string, userId: string): PartnerUser {
  const found = state.users.find((candidate) => candidate.userId === userId && candidate.partnerId === partnerId);
  if (!found) throw new ApiError('Login not found.', 404);
  return found;
}

interface MintedPassword {
  temporaryPassword: string;
  passwordHash: string;
}

/**
 * Generates and hashes a temporary password. Call it before reading the
 * store: everything after the read stays synchronous, so a write from another
 * tab can't land between reading and saving.
 */
async function mintTemporaryPassword(): Promise<MintedPassword> {
  const temporaryPassword = generateTemporaryPassword(randomBytes);
  return { temporaryPassword, passwordHash: await sha256Hex(temporaryPassword) };
}

/** Replaces the login's password with `minted` (signing it out) and "sends" it. */
function applyTemporaryCredential(
  state: DemoState,
  user: PartnerUser,
  minted: MintedPassword,
  dispatch: { email: boolean; sms: boolean },
): IssuedCredential {
  const now = Date.now();
  const expiresAt = new Date(now + TEMPORARY_PASSWORD_TTL_MS).toISOString();
  const previous = state.credentials[user.userId];
  state.credentials[user.userId] = {
    passwordHash: minted.passwordHash,
    mustChangePassword: true,
    temporaryExpiresAt: expiresAt,
    status: previous?.status ?? 'active',
    issuedAt: new Date(now).toISOString(),
    ...(previous?.lastSignInAt ? { lastSignInAt: previous.lastSignInAt } : {}),
    // Any open portal session — or half-finished first sign-in — ends now.
    sessionsRevokedAt: new Date(now).toISOString(),
  };
  // TODO(backend): the offers service asks backend-notification-service to
  // send these, always to the email/mobile stored on the login; the dummy
  // marks them queued and sends nothing.
  const sent: CredentialDispatch[] = [];
  if (dispatch.email) sent.push({ channel: 'email', to: user.email, status: 'queued' });
  if (dispatch.sms && user.phone) sent.push({ channel: 'sms', to: user.phone, status: 'queued' });
  return { userId: user.userId, temporaryPassword: minted.temporaryPassword, expiresAt, loginUrl: partnerLoginUrl(), dispatch: sent };
}

/** "98450 12345" → "9845012345" when it's a valid mobile, else undefined. */
function mobileOrUndefined(input: string | undefined): string | undefined {
  return input && isValidIndianMobile(input) ? normaliseIndianMobile(input) : undefined;
}

function describeDispatch(credential: IssuedCredential): string {
  if (credential.dispatch.length === 0) return 'nothing sent — shared manually';
  return credential.dispatch
    .map((item) => (item.channel === 'email' ? `emailed ${item.to}` : `texted ${formatIndianMobile(item.to)}`))
    .join(', ');
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * Every partner with headline numbers, plus campaigns waiting for review.
 *
 * BACKEND: GET /admin/partners → AdminPartnersOverview
 */
export async function getAdminPartnersOverview(): Promise<AdminPartnersOverview> {
  if (backendEnabled()) return adminRequest<AdminPartnersOverview>('/gateway/partners');

  await pause(250);
  const state = store();
  const partners: AdminPartnerSummary[] = state.partners.map((partner) => {
    const members = state.users.filter((member) => member.partnerId === partner.id);
    const credentials = members.map((member) => state.credentials[member.userId]).filter(Boolean);
    const campaigns = state.campaigns.filter((campaign) => campaign.partnerId === partner.id);
    const lastSignInAt = credentials
      .map((credential) => credential.lastSignInAt)
      .filter((value): value is string => !!value)
      .sort()
      .pop();
    return {
      partner,
      logins: members.length,
      pendingLogins: credentials.filter((credential) => credential.mustChangePassword && credential.status === 'active').length,
      outlets: state.outlets.filter((outlet) => outlet.partnerId === partner.id).length,
      liveCampaigns: campaigns.filter((campaign) => campaign.status === 'live').length,
      inReview: campaigns.filter((campaign) => campaign.status === 'in_review').length,
      ...(lastSignInAt ? { lastSignInAt } : {}),
    };
  });
  partners.sort((a, b) => b.partner.onboardedAt.localeCompare(a.partner.onboardedAt));

  const reviewQueue = state.campaigns
    .filter((campaign) => campaign.status === 'in_review')
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
    .map((campaign) => ({ campaign, partner: badgeOf(partnerOr404(state, campaign.partnerId)) }));

  const goLiveQueue: AdminGoLiveRequest[] = [];
  for (const partner of state.partners) {
    const requests: [OnlineChannel, CheckoutIntegration | BookingIntegration | undefined][] = [
      ['online_code', partner.integration.checkout],
      ['api_booking', partner.integration.booking],
    ];
    for (const [channel, integration] of requests) {
      if (integration?.status !== 'ready_for_review' || !partner.channels.includes(channel)) continue;
      goLiveQueue.push({
        partner: badgeOf(partner),
        channel,
        requestedAt: integration.goLiveRequestedAt ?? partner.onboardedAt,
        ...(integration.lastTest ? { lastTest: structuredClone(integration.lastTest) } : {}),
      });
    }
  }
  goLiveQueue.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  return { partners, reviewQueue, goLiveQueue };
}

/** BACKEND: GET /admin/partners/:id → AdminPartnerDetail */
export async function getAdminPartner(partnerId: string): Promise<AdminPartnerDetail> {
  if (backendEnabled()) return adminRequest<AdminPartnerDetail>(`/gateway/partners/${encodeURIComponent(partnerId)}`);

  await pause(250);
  const state = store();
  const partner = partnerOr404(state, partnerId);
  const logins = state.users
    .filter((member) => member.partnerId === partnerId)
    .map((member) => toPartnerLogin(member, state.credentials[member.userId]))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.userId.localeCompare(b.userId));
  return {
    partner,
    logins,
    outlets: state.outlets.filter((outlet) => outlet.partnerId === partnerId),
    campaigns: state.campaigns
      .filter((campaign) => campaign.partnerId === partnerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    activity: state.audit.filter((entry) => entry.partnerId === partnerId).slice(0, 60),
  };
}

/** BACKEND: GET /admin/partner-handles/:handle → { available } */
export async function isPartnerHandleAvailable(handle: string): Promise<boolean> {
  if (backendEnabled()) {
    const { available } = await adminRequest<{ available: boolean }>(
      `/gateway/partner-handles/${encodeURIComponent(handle)}`,
    );
    return available;
  }
  return !store().partners.some((partner) => partner.handle === handle);
}

/** DUMMY only: handles already in use, for instant form feedback. */
export function takenPartnerHandles(): string[] {
  return backendEnabled() ? [] : store().partners.map((partner) => partner.handle);
}

// ── Onboarding & logins ─────────────────────────────────────────────────────

/**
 * Create the partner account and its first owner login.
 *
 * BACKEND: POST /admin/partners PartnerOnboardingInput
 *   → 201 { partner, credential: IssuedCredential } | 409 handle_taken | 422
 *   The temporary password is generated server-side (CSPRNG), stored as a
 *   slow hash, emailed/texted through backend-notification-service when
 *   `dispatch` asks for it, and returned this once so the admin can share it.
 */
export async function onboardPartner(
  input: PartnerOnboardingInput,
  { actor }: AdminActor,
): Promise<{ partner: PartnerAccount; credential: IssuedCredential }> {
  if (backendEnabled()) {
    return adminRequest<{ partner: PartnerAccount; credential: IssuedCredential }>('/gateway/partners', {
      method: 'POST',
      body: input,
    });
  }

  await pause(600);
  const minted = await mintTemporaryPassword();
  const state = store();
  const check = validateOnboarding(input, state.partners.map((partner) => partner.handle));
  if (hasOnboardingErrors(check)) throw new ApiError(Object.values(check.errors)[0] ?? 'Check the form.', 422);

  const now = new Date().toISOString();
  let id = `ptr_${input.handle}`;
  while (state.partners.some((partner) => partner.id === id)) id = `ptr_${input.handle}_${Math.random().toString(36).slice(2, 6)}`;

  const partner: PartnerAccount = {
    id,
    handle: input.handle,
    status: 'invited',
    brandName: input.brandName.trim(),
    legalName: input.legalName.trim(),
    logoEmoji: input.logoEmoji.trim(),
    brandColor: input.brandColor.toUpperCase(),
    category: input.category,
    channels: [...input.channels],
    ...(input.website.trim() ? { website: input.website.trim() } : {}),
    gstin: normaliseGstin(input.gstin),
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: normaliseIndianMobile(input.contactPhone),
    city: input.city.trim(),
    stateCode: input.stateCode,
    plan: input.plan,
    onboardedAt: now,
    integration: {
      apiKeyPreview: 'Not issued',
      // Online channels start unconnected: the owner sets them up in the
      // portal (Integrations) and Lessgo approves go-live.
      ...(input.channels.includes('online_code') ? { checkout: newCheckoutIntegration(input.website.trim()) } : {}),
      ...(input.channels.includes('api_booking') ? { booking: newBookingIntegration(input) } : {}),
    },
  };
  const ownerPhone = mobileOrUndefined(input.owner.phone);
  const owner: PartnerUser = {
    userId: uniqueUserId(baseUserId(input.handle, 'owner'), new Set(state.users.map((member) => member.userId))),
    partnerId: id,
    name: input.owner.name.trim(),
    email: input.owner.email.trim().toLowerCase(),
    ...(ownerPhone ? { phone: ownerPhone } : {}),
    role: 'owner',
  };
  state.partners.push(partner);
  state.users.push(owner);
  const credential = applyTemporaryCredential(state, owner, minted, input.dispatch);

  recordAudit(state, {
    partnerId: id,
    actor,
    action: 'partner.onboarded',
    detail: `Onboarded on the ${partner.plan} plan · ${channelNames(partner.channels)}.`,
  });
  recordAudit(state, {
    partnerId: id,
    actor,
    action: 'login.issued',
    detail: `Issued ${owner.userId} (owner); ${describeDispatch(credential)}.`,
  });
  persist(state);
  return { partner, credential };
}

/**
 * Issue another login (an extra owner, a manager, or a cashier for one outlet).
 *
 * BACKEND: POST /admin/partners/:id/logins NewPartnerLoginInput
 *   → 201 { login: PartnerLogin, credential: IssuedCredential } | 409 | 422
 */
export async function addPartnerLogin(
  partnerId: string,
  input: NewPartnerLoginInput,
  { actor }: AdminActor,
): Promise<{ login: PartnerLogin; credential: IssuedCredential }> {
  if (backendEnabled()) {
    return adminRequest<{ login: PartnerLogin; credential: IssuedCredential }>(
      `/gateway/partners/${encodeURIComponent(partnerId)}/logins`,
      { method: 'POST', body: input },
    );
  }

  await pause(450);
  const minted = await mintTemporaryPassword();
  const state = store();
  const partner = partnerOr404(state, partnerId);
  if (partner.status === 'suspended') throw new ApiError('Reactivate the partner before adding logins.', 409);
  if (input.role === 'cashier' && !partner.channels.includes('in_store')) {
    throw new ApiError('Counter-staff logins are only for partners whose groups redeem in store.', 422);
  }
  if (input.name.trim().length < 2) throw new ApiError('Add the person’s name.', 422);
  if (!isValidEmail(input.email)) throw new ApiError('Enter a valid email address.', 422);
  // The mobile is stored on the login (resets are texted to it), so a typo is rejected even without SMS.
  if ((input.dispatch.sms || input.phone?.trim()) && !isValidIndianMobile(input.phone ?? '')) {
    throw new ApiError(
      input.dispatch.sms ? 'Enter a 10-digit Indian mobile number to send the SMS.' : 'Enter a 10-digit Indian mobile number.',
      422,
    );
  }
  const outlet =
    input.role === 'cashier'
      ? state.outlets.find(
          (candidate) => candidate.id === input.outletId && candidate.partnerId === partnerId && candidate.status === 'active',
        )
      : undefined;
  if (input.role === 'cashier' && !outlet) throw new ApiError('Pick the outlet this cashier works at.', 422);

  const phone = mobileOrUndefined(input.phone);
  const user: PartnerUser = {
    userId: uniqueUserId(
      baseUserId(partner.handle, input.role, outlet?.name),
      new Set(state.users.map((member) => member.userId)),
    ),
    partnerId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    ...(phone ? { phone } : {}),
    role: input.role,
    ...(outlet ? { outletId: outlet.id } : {}),
  };
  state.users.push(user);
  const credential = applyTemporaryCredential(state, user, minted, input.dispatch);
  recordAudit(state, {
    partnerId,
    actor,
    action: 'login.issued',
    detail: `Issued ${user.userId} (${user.role}${outlet ? `, ${outlet.name}` : ''}); ${describeDispatch(credential)}.`,
  });
  persist(state);
  return { login: toPartnerLogin(user, state.credentials[user.userId]), credential };
}

/**
 * Replace a login's password with a new temporary one and sign it out
 * everywhere. Also how a lost or expired invite is re-sent.
 *
 * BACKEND: POST /admin/partners/:id/logins/:userId/reset-password
 *   { dispatch: { email, sms } } → { credential: IssuedCredential }
 *   Delivery always goes to the email and mobile stored on the login; the
 *   client never chooses the recipient.
 */
export async function resetPartnerLoginPassword(
  partnerId: string,
  userId: string,
  dispatch: { email: boolean; sms: boolean },
  { actor }: AdminActor,
): Promise<IssuedCredential> {
  if (backendEnabled()) {
    const { credential } = await adminRequest<{ credential: IssuedCredential }>(
      `/gateway/partners/${encodeURIComponent(partnerId)}/logins/${encodeURIComponent(userId)}/reset-password`,
      { method: 'POST', body: { dispatch } },
    );
    return credential;
  }

  await pause(450);
  const minted = await mintTemporaryPassword();
  const state = store();
  partnerOr404(state, partnerId);
  const user = userOr404(state, partnerId, userId);
  if (state.credentials[userId]?.status === 'disabled') throw new ApiError('Turn the login back on first.', 409);
  if (dispatch.sms && !user.phone) throw new ApiError('This login has no mobile number on file. Send it by email instead.', 422);
  const credential = applyTemporaryCredential(state, user, minted, dispatch);
  recordAudit(state, {
    partnerId,
    actor,
    action: 'login.reset',
    detail: `Reset ${userId}; ${describeDispatch(credential)}.`,
  });
  persist(state);
  return credential;
}

/**
 * Turn a login off (signs it out at once) or back on. A partner always keeps
 * at least one active owner.
 *
 * BACKEND: PATCH /admin/partners/:id/logins/:userId { status } → PartnerLogin
 */
export async function setPartnerLoginStatus(
  partnerId: string,
  userId: string,
  status: PartnerLogin['status'],
  { actor }: AdminActor,
): Promise<PartnerLogin> {
  if (backendEnabled()) {
    return adminRequest<PartnerLogin>(
      `/gateway/partners/${encodeURIComponent(partnerId)}/logins/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: { status } },
    );
  }

  await pause(300);
  const state = store();
  partnerOr404(state, partnerId);
  const user = userOr404(state, partnerId, userId);
  const credential = state.credentials[userId];
  if (!credential) throw new ApiError('Login not found.', 404);
  if (status === 'active' && user.role === 'cashier' && !partnerOr404(state, partnerId).channels.includes('in_store')) {
    throw new ApiError('Counter-staff logins only work for partners that redeem in store.', 409);
  }
  if (status === 'disabled' && user.role === 'owner') {
    const otherOwners = state.users.filter(
      (member) =>
        member.partnerId === partnerId &&
        member.role === 'owner' &&
        member.userId !== userId &&
        state.credentials[member.userId]?.status === 'active',
    );
    if (otherOwners.length === 0) {
      throw new ApiError('A partner needs one active owner login. Add another owner first, or suspend the partner.', 409);
    }
  }
  credential.status = status;
  if (status === 'disabled') credential.sessionsRevokedAt = new Date().toISOString();
  recordAudit(state, {
    partnerId,
    actor,
    action: status === 'disabled' ? 'login.disabled' : 'login.enabled',
    detail: `${status === 'disabled' ? 'Turned off' : 'Turned on'} ${userId}.`,
  });
  persist(state);
  return toPartnerLogin(user, credential);
}

/**
 * Suspend (logins blocked, offers leave the tray) or reactivate a partner.
 *
 * BACKEND: PATCH /admin/partners/:id { status: "suspended", reason } |
 *   { status: "active" } → PartnerAccount. Suspending revokes every session
 *   of the partner's logins; reactivating returns "invited" if the owner
 *   never signed in.
 */
export async function setPartnerStatus(
  partnerId: string,
  change: { status: 'suspended'; reason: string } | { status: 'active' },
  { actor }: AdminActor,
): Promise<PartnerAccount> {
  if (backendEnabled()) {
    return adminRequest<PartnerAccount>(`/gateway/partners/${encodeURIComponent(partnerId)}`, {
      method: 'PATCH',
      body: change,
    });
  }

  await pause(350);
  const state = store();
  const partner = partnerOr404(state, partnerId);
  if (change.status === 'suspended') {
    const reason = change.reason.trim();
    if (reason.length < 5) throw new ApiError('Say why the partner is being suspended.', 422);
    const now = new Date().toISOString();
    partner.status = 'suspended';
    partner.suspendedAt = now;
    partner.suspendedReason = reason;
    // Sessions end for good: reactivating doesn't bring old ones back.
    for (const member of state.users) {
      const credential = state.credentials[member.userId];
      if (member.partnerId === partnerId && credential) credential.sessionsRevokedAt = now;
    }
    recordAudit(state, { partnerId, actor, action: 'partner.suspended', detail: `Suspended: ${reason}` });
  } else {
    if (partner.status !== 'suspended') throw new ApiError('This partner isn’t suspended.', 409);
    // Back to where they were: invited until the owner first signed in.
    partner.status = partner.activatedAt ? 'active' : 'invited';
    delete partner.suspendedAt;
    delete partner.suspendedReason;
    recordAudit(state, { partnerId, actor, action: 'partner.reactivated', detail: 'Reactivated.' });
  }
  persist(state);
  return partner;
}

// ── Channels & integrations ─────────────────────────────────────────────────

const OPEN_CAMPAIGN_STATUSES: readonly PartnerCampaign['status'][] = ['in_review', 'scheduled', 'live', 'paused'];

/**
 * Change how a partner's groups redeem (e.g. add online booking to a cinema
 * chain). Removing a channel needs its campaigns ended first.
 *
 * BACKEND: PATCH /admin/partners/:id/channels PartnerChannelsInput
 *   → PartnerAccount | 409 (open campaigns / counter staff on a removed channel) | 422.
 *   Removing an online channel deletes its integration (keys revoked); adding
 *   it back starts unconnected.
 */
export async function setPartnerChannels(
  partnerId: string,
  input: PartnerChannelsInput,
  { actor }: AdminActor,
): Promise<PartnerAccount> {
  if (backendEnabled()) {
    return adminRequest<PartnerAccount>(`/gateway/partners/${encodeURIComponent(partnerId)}/channels`, {
      method: 'PATCH',
      body: input,
    });
  }

  await pause(400);
  const state = store();
  const partner = partnerOr404(state, partnerId);
  const channels = [...new Set(input.channels)];
  if (channels.length === 0) throw new ApiError('Keep at least one channel.', 422);
  const website = input.website?.trim() || partner.website || '';
  if (channels.some((channel) => channel !== 'in_store') && !isHttpsWebsite(website)) {
    throw new ApiError('Online channels need the partner’s https website.', 422);
  }
  const products = input.bookingProducts ?? partner.integration.booking?.products ?? [];
  if (channels.includes('api_booking') && products.length === 0) {
    throw new ApiError('Pick what the partner sells through Lessgo.', 422);
  }
  for (const removed of partner.channels.filter((channel) => !channels.includes(channel))) {
    const open = state.campaigns.filter(
      (campaign) => campaign.partnerId === partnerId && campaign.channel === removed && OPEN_CAMPAIGN_STATUSES.includes(campaign.status),
    );
    if (open.length > 0) {
      throw new ApiError(
        `${CHANNEL_DETAILS[removed].label} still has ${open.length} open campaign${open.length === 1 ? '' : 's'}. End or reject them first.`,
        409,
      );
    }
    if (removed === 'in_store') {
      const counterStaff = state.users.filter(
        (member) => member.partnerId === partnerId && member.role === 'cashier' && state.credentials[member.userId]?.status === 'active',
      );
      if (counterStaff.length > 0) throw new ApiError('Turn off the counter-staff logins before removing In-store.', 409);
    }
  }

  const before = channelNames(partner.channels);
  // A removed online channel loses its connection: adding it back starts from
  // "not connected" and needs a fresh go-live review.
  if (!channels.includes('online_code')) delete partner.integration.checkout;
  if (!channels.includes('api_booking')) delete partner.integration.booking;
  partner.channels = REDEMPTION_CHANNELS.filter((channel) => channels.includes(channel));
  if (website) partner.website = website;
  if (channels.includes('online_code') && !partner.integration.checkout) {
    partner.integration.checkout = newCheckoutIntegration(website);
  }
  if (channels.includes('api_booking')) {
    if (!partner.integration.booking) {
      partner.integration.booking = newBookingIntegration({ bookingProducts: products, bookingMethod: input.bookingMethod });
    } else {
      partner.integration.booking.products = [...products];
      if (input.bookingMethod) partner.integration.booking.method = input.bookingMethod;
    }
  }
  recordAudit(state, {
    partnerId,
    actor,
    action: 'partner.channels_changed',
    detail: `Channels: ${before} → ${channelNames(partner.channels)}.`,
  });
  persist(state);
  return partner;
}

function onlineIntegration(partner: PartnerAccount, channel: OnlineChannel): CheckoutIntegration | BookingIntegration {
  const integration = channel === 'online_code' ? partner.integration.checkout : partner.integration.booking;
  if (!integration || !partner.channels.includes(channel)) throw new ApiError('This partner doesn’t use that channel.', 404);
  return integration;
}

/**
 * Approve production for an online channel after its sandbox checks passed.
 *
 * BACKEND: POST /admin/partners/:id/integrations/:channel/approve
 *   → integration { status: "live" } | 409 unless "ready_for_review".
 *   online_code also issues the partner's lgp_live_ Partner API key (shown
 *   once to the owner in the portal).
 */
export async function approveIntegrationGoLive(
  partnerId: string,
  channel: OnlineChannel,
  { actor }: AdminActor,
): Promise<CheckoutIntegration | BookingIntegration> {
  if (backendEnabled()) {
    return adminRequest(`/gateway/partners/${encodeURIComponent(partnerId)}/integrations/${channel}/approve`, {
      method: 'POST',
    });
  }

  await pause(400);
  const state = store();
  const partner = partnerOr404(state, partnerId);
  if (partner.status === 'suspended') throw new ApiError('Reactivate the partner first.', 409);
  const integration = onlineIntegration(partner, channel);
  if (integration.status !== 'ready_for_review') throw new ApiError('The partner hasn’t asked to go live.', 409);
  if (!integration.lastTest?.ok) throw new ApiError('The last sandbox run failed. Send it back instead.', 409);
  integration.status = 'live';
  integration.liveSince = new Date().toISOString();
  if (channel === 'online_code') (integration as CheckoutIntegration).liveKeyPreview = keyPreview('lgp_live_');
  recordAudit(state, {
    partnerId,
    actor,
    action: 'integration.approved',
    detail: `${CHANNEL_DETAILS[channel].label}: approved for production.`,
  });
  persist(state);
  return integration;
}

/**
 * Send a go-live request back, or take a live channel offline (kill switch):
 * the integration returns to testing and that channel's live campaigns pause.
 *
 * BACKEND: POST /admin/partners/:id/integrations/:channel/rollback { reason }
 *   → integration { status: "testing" }
 */
export async function rollbackIntegration(
  partnerId: string,
  channel: OnlineChannel,
  reason: string,
  { actor }: AdminActor,
): Promise<CheckoutIntegration | BookingIntegration> {
  if (backendEnabled()) {
    return adminRequest(`/gateway/partners/${encodeURIComponent(partnerId)}/integrations/${channel}/rollback`, {
      method: 'POST',
      body: { reason },
    });
  }

  await pause(400);
  const note = reason.trim();
  if (note.length < 5) throw new ApiError('Say why (the partner sees this in their activity).', 422);
  const state = store();
  const partner = partnerOr404(state, partnerId);
  const integration = onlineIntegration(partner, channel);
  if (integration.status !== 'live' && integration.status !== 'ready_for_review') {
    throw new ApiError('Only live or pending connections can be sent back.', 409);
  }
  const wasLive = integration.status === 'live';
  integration.status = 'testing';
  delete integration.goLiveRequestedAt;
  delete integration.liveSince;
  let paused = 0;
  if (wasLive) {
    const nowIso = new Date().toISOString();
    for (const campaign of state.campaigns) {
      if (campaign.partnerId === partnerId && campaign.channel === channel && campaign.status === 'live') {
        campaign.status = 'paused';
        campaign.updatedAt = nowIso;
        paused += 1;
      }
    }
  }
  recordAudit(state, {
    partnerId,
    actor,
    action: 'integration.rolled_back',
    detail: `${CHANNEL_DETAILS[channel].label}: ${wasLive ? 'taken offline' : 'go-live sent back'} — ${note}${
      paused ? ` (${paused} campaign${paused === 1 ? '' : 's'} paused)` : ''
    }`,
  });
  persist(state);
  return integration;
}

// ── Campaign review ─────────────────────────────────────────────────────────

/**
 * Approve a submitted campaign (→ scheduled, or live if it has started) or
 * send it back with a note the partner sees.
 *
 * BACKEND: POST /admin/campaigns/:id/review CampaignReviewDecision
 *   → PartnerCampaign | 409 not_in_review | 409 integration_not_live (an
 *   online campaign whose channel Lessgo hasn't approved for production)
 */
export async function reviewPartnerCampaign(
  campaignId: string,
  decision: CampaignReviewDecision,
  { actor }: AdminActor,
): Promise<PartnerCampaign> {
  if (backendEnabled()) {
    return adminRequest<PartnerCampaign>(`/gateway/campaigns/${encodeURIComponent(campaignId)}/review`, {
      method: 'POST',
      body: decision,
    });
  }

  await pause(400);
  const state = store();
  const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);
  if (!campaign) throw new ApiError('Campaign not found.', 404);
  if (campaign.status !== 'in_review') throw new ApiError('This campaign isn’t waiting for review.', 409);
  const partner = partnerOr404(state, campaign.partnerId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  if (decision.decision === 'reject') {
    const note = decision.note.trim();
    if (note.length < 10) throw new ApiError('Tell the partner what to change (at least 10 characters).', 422);
    campaign.status = 'rejected';
    campaign.reviewNote = note;
    campaign.reviewedAt = nowIso;
    campaign.updatedAt = nowIso;
    recordAudit(state, {
      partnerId: partner.id,
      actor,
      action: 'campaign.rejected',
      detail: `Sent back “${campaign.headline}”: ${note}`,
    });
  } else {
    if (partner.status === 'suspended') throw new ApiError('Reactivate the partner before approving campaigns.', 409);
    if (!channelIsLive(partner, campaign.channel)) {
      throw new ApiError(
        `${partner.brandName}’s ${CHANNEL_DETAILS[campaign.channel].connection} isn’t live yet. Approve its go-live first.`,
        409,
      );
    }
    if (Date.parse(campaign.schedule.endAt) <= now) {
      throw new ApiError('This campaign’s end date has passed. Send it back for new dates.', 409);
    }
    campaign.status = Date.parse(campaign.schedule.startAt) <= now ? 'live' : 'scheduled';
    delete campaign.reviewNote;
    campaign.reviewedAt = nowIso;
    campaign.updatedAt = nowIso;
    // Demo vouchers so the partner can try the redeem console straight away.
    if (campaign.status === 'live') state.vouchers.push(...dummyVouchers([campaign], now));
    recordAudit(state, {
      partnerId: partner.id,
      actor,
      action: 'campaign.approved',
      detail: `Approved “${campaign.headline}” (${campaign.status === 'live' ? 'live now' : 'scheduled'}).`,
    });
  }
  persist(state);
  return campaign;
}

/** DUMMY only: back to the seeded partners (also used by the partner portal). */
export async function resetPartnersDemo(): Promise<void> {
  if (backendEnabled()) return;
  resetDemoStore();
  await pause(150);
}
