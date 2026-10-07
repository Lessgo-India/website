/**
 * DUMMY stand-in for backend-offers-service, shared by the partner portal
 * (partnerApi.ts) and the admin console (adminPartnersApi.ts). A partner
 * onboarded under /admin/partners can therefore sign in at /partner/login in
 * the same browser, and a campaign approved in the admin console goes live in
 * the portal.
 *
 * Persisted in localStorage and re-read when another tab writes it. Nothing
 * here runs once NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true.
 *
 * TODO(backend): delete together with dummyData.ts.
 */
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DUMMY_DISTRICT_WEIGHT,
  DUMMY_OUTLETS,
  DUMMY_USERS,
  DUMMY_USERS_BY_STATE,
  dummyAuditTrail,
  dummyCampaigns,
  dummyPartners,
  dummyRedemptions,
  dummyVouchers,
  type DemoVoucher,
} from './dummyData';
import { INDIA_GEO } from './indiaGeo';
import { estimateAudience, normaliseTargeting, roundEstimate, type AudienceModel } from './rules';
import type {
  OfferTargeting,
  PartnerAccount,
  PartnerAuditEntry,
  PartnerCampaign,
  PartnerLogin,
  PartnerLoginStatus,
  PartnerOutlet,
  PartnerRedemption,
  PartnerUser,
} from './types';

/** localStorage key; other tabs watch it to pick up changes. */
export const DEMO_STORE_KEY = 'lessgo.partner.demo.v1';
const STATE_KEY = DEMO_STORE_KEY;
const STATE_VERSION = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Demo vouchers say "event in 2 hours", so they're re-minted daily. */
const VOUCHER_REFRESH_MS = DAY_MS;

export interface DemoCredential {
  /** SHA-256 hex. DUMMY only — the offers service stores scrypt hashes. */
  passwordHash?: string;
  /** Seeded demo logins only, until the password is changed. */
  demoPassword?: string;
  mustChangePassword: boolean;
  /** When the outstanding temporary password stops working. */
  temporaryExpiresAt?: string;
  status: PartnerLoginStatus;
  issuedAt: string;
  lastSignInAt?: string;
  /** Portal sessions started before this are invalid (reset/disable). */
  sessionsRevokedAt?: string;
}

export interface DemoState {
  version: number;
  seededAt: number;
  vouchersSeededAt: number;
  partners: PartnerAccount[];
  users: PartnerUser[];
  credentials: Record<string, DemoCredential>;
  campaigns: PartnerCampaign[];
  outlets: PartnerOutlet[];
  vouchers: DemoVoucher[];
  redemptions: PartnerRedemption[];
  audit: PartnerAuditEntry[];
}

// ── Audience model ──────────────────────────────────────────────────────────

let audienceModel: AudienceModel | null = null;

function model(): AudienceModel {
  audienceModel ??= {
    usersByState: DUMMY_USERS_BY_STATE,
    districtsByState: Object.fromEntries(
      INDIA_GEO.map((state) => [state.code, state.districts.map((district) => district.id)]),
    ),
    districtWeight: DUMMY_DISTRICT_WEIGHT,
  };
  return audienceModel;
}

/** Users matching `targeting`, rounded to two significant figures (dummy counts). */
export function estimateReach(targeting: OfferTargeting): number {
  return roundEstimate(estimateAudience(normaliseTargeting(targeting), model()));
}

// ── Store ───────────────────────────────────────────────────────────────────

let cache: DemoState | null = null;
let listening = false;

function listenForOtherTabs(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('storage', (event) => {
    if (event.key === STATE_KEY || event.key === null) cache = null;
  });
}

function seed(now: number): DemoState {
  const partners = dummyPartners(now);
  const users: PartnerUser[] = DUMMY_USERS.map((member) => {
    const contactPhone = partners.find((candidate) => candidate.id === member.partnerId)?.contactPhone;
    return member.role === 'owner' && contactPhone ? { ...member, phone: contactPhone } : { ...member };
  });
  const campaigns = dummyCampaigns(now);
  for (const campaign of campaigns) campaign.stats.reach = estimateReach(campaign.targeting);
  const outlets = DUMMY_OUTLETS.map((item) => ({ ...item, coordinates: [...item.coordinates] as [number, number] }));

  const credentials: Record<string, DemoCredential> = {};
  users.forEach((member, index) => {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.userId === member.userId);
    const issuedAt = partners.find((candidate) => candidate.id === member.partnerId)?.onboardedAt ?? new Date(now).toISOString();
    credentials[member.userId] = account?.mustChangePassword
      ? {
          demoPassword: account.password,
          mustChangePassword: true,
          temporaryExpiresAt: new Date(now + 30 * DAY_MS).toISOString(),
          status: 'active',
          issuedAt,
        }
      : {
          demoPassword: account?.password ?? DEMO_PASSWORD,
          mustChangePassword: false,
          status: 'active',
          issuedAt,
          lastSignInAt: new Date(now - (index % 5 + 1) * 0.6 * DAY_MS).toISOString(),
        };
  });

  return {
    version: STATE_VERSION,
    seededAt: now,
    vouchersSeededAt: now,
    partners,
    users,
    credentials,
    campaigns,
    outlets,
    vouchers: dummyVouchers(campaigns, now),
    redemptions: dummyRedemptions(campaigns, outlets, now),
    audit: dummyAuditTrail(partners, users, campaigns),
  };
}

/** What the offers service's scheduler does: scheduled → live → ended. */
function runSchedules(state: DemoState, now: number): boolean {
  let changed = false;
  for (const campaign of state.campaigns) {
    const start = Date.parse(campaign.schedule.startAt);
    const end = Date.parse(campaign.schedule.endAt);
    if (campaign.status === 'scheduled' && start <= now) {
      campaign.status = end <= now ? 'ended' : 'live';
      if (campaign.status === 'live') state.vouchers.push(...dummyVouchers([campaign], now));
      changed = true;
    } else if ((campaign.status === 'live' || campaign.status === 'paused') && end <= now) {
      campaign.status = 'ended';
      changed = true;
    }
  }
  return changed;
}

export function demoStore(): DemoState {
  listenForOtherTabs();
  if (cache) return cache;
  const now = Date.now();
  let saved: DemoState | null = null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    saved = raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    saved = null;
  }
  if (saved?.version !== STATE_VERSION) {
    const fresh = seed(now);
    saveDemoStore(fresh);
    return fresh;
  }
  cache = saved;
  let changed = runSchedules(cache, now);
  if (now - cache.vouchersSeededAt > VOUCHER_REFRESH_MS) {
    cache.vouchers = dummyVouchers(cache.campaigns, now);
    cache.vouchersSeededAt = now;
    changed = true;
  }
  if (changed) saveDemoStore(cache);
  return cache;
}

/**
 * Persists `state` — the object the caller read and changed. Callers keep the
 * read → change → save sequence synchronous (hash passwords first), so a write
 * from another tab can't land in between.
 */
export function saveDemoStore(state: DemoState): void {
  cache = state;
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota: the demo still works in this tab.
  }
}

/** Puts every partner, login, campaign and redemption back to the demo start. */
export function resetDemoStore(): void {
  saveDemoStore(seed(Date.now()));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export const demoPause = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 200));

export const randomId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const randomBytes = (count: number) => crypto.getRandomValues(new Uint8Array(count));

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * True when `password` (hashed beforehand as `passwordHash`) is the login's
 * current or temporary password. Synchronous so callers can hash first and
 * then read and write the store without awaiting in between.
 */
export function credentialAccepts(credential: DemoCredential, password: string, passwordHash: string): boolean {
  if (credential.passwordHash) return credential.passwordHash === passwordHash;
  return credential.demoPassword !== undefined && credential.demoPassword === password;
}

export function recordAudit(
  state: DemoState,
  entry: Omit<PartnerAuditEntry, 'id' | 'at'> & { at?: string },
): void {
  state.audit.unshift({ id: randomId('aud'), at: entry.at ?? new Date().toISOString(), ...entry });
}

/** The login as the admin console and the partner's team page see it. */
export function toPartnerLogin(user: PartnerUser, credential: DemoCredential | undefined): PartnerLogin {
  return {
    ...user,
    lastActiveAt: credential?.lastSignInAt,
    status: credential?.status ?? 'disabled',
    mustChangePassword: credential?.mustChangePassword ?? false,
    credentialIssuedAt: credential?.issuedAt ?? '',
    ...(credential?.temporaryExpiresAt && credential.mustChangePassword
      ? { temporaryExpiresAt: credential.temporaryExpiresAt }
      : {}),
    ...(credential?.lastSignInAt ? { lastSignInAt: credential.lastSignInAt } : {}),
  };
}

export type { DemoVoucher };
