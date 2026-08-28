import { request, type TokenProvider } from './api';

/**
 * Client for the gateway's read-only `/admin` API.
 *
 * Every call carries the operator's Firebase ID token; the gateway decides
 * whether that identity is on the allowlist. Nothing here is a security
 * boundary — the UI only ever mirrors a decision already made server-side.
 */

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unconfigured';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  httpStatus: number | null;
  detail: string | null;
}

export interface HealthSnapshot {
  checkedAt: string;
  summary: { total: number; ok: number; degraded: number; down: number };
  services: ServiceHealth[];
}

export interface AdminSession {
  admin: boolean;
  userId: string | null;
  statsAvailable: boolean;
}

export interface RsvpMix {
  going: number;
  maybe: number;
  noReply: number;
  declined: number;
}

export interface AdminStats {
  generatedAt: string;
  window: { from: string; to: string; days: number };
  users: {
    total: number;
    active: number;
    invitedNotJoined: number;
    inGraph: number;
    created: number;
    createdPrev: number;
  };
  events: {
    total: number;
    upcoming: number;
    live: number;
    wrapped: number;
    archived: number;
    recurring: number;
    created: number;
    createdPrev: number;
    byType: { type: string; count: number }[];
    rsvp: RsvpMix | null;
  };
  groups: {
    total: number;
    withEvents: number;
    created: number;
    createdPrev: number;
    buzzTotal: number;
    buzzOpen: number;
    buzzConfirmed: number;
    buzzExpired: number;
    buzzCreated: number;
    buzzCreatedPrev: number;
  };
  money: {
    expenses: number;
    expenseValue: number;
    settlements: number;
    transactions: number;
    transactionValue: number;
    eventsWithExpense: number;
    created: number;
    createdValue: number;
    createdPrev: number;
    transactionsCreated: number;
    transactionsCreatedPrev: number;
  };
  vibes: {
    total: number;
    active: number;
    created: number;
    createdPrev: number;
    interest: number;
  };
  files: {
    documents: number;
    documentsCreated: number;
    photos: number;
    photosCreated: number;
  };
  ratios: {
    guestsPerEvent: number | null;
    membersPerGroup: number | null;
    expenseAttachRate: number | null;
    signupRate: number | null;
    buzzConversion: number | null;
    avgExpenseValue: number | null;
  };
}

export interface TrendPoint {
  date: string;
  profiles?: number;
  users?: number;
  events?: number;
  groups?: number;
  buzzes?: number;
  expenses?: number;
  transactions?: number;
  statuses?: number;
}

export function getAdminSession(auth: TokenProvider): Promise<AdminSession> {
  return request<AdminSession>('/admin/session', { auth });
}

export function getAdminHealth(auth: TokenProvider): Promise<HealthSnapshot> {
  return request<HealthSnapshot>('/admin/health', { auth });
}

export function getAdminStats(
  window: { from: Date; to: Date },
  auth: TokenProvider,
): Promise<AdminStats> {
  const query = new URLSearchParams({
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });
  return request<AdminStats>(`/admin/stats?${query}`, { auth });
}

export function getAdminTrends(
  days: number,
  auth: TokenProvider,
): Promise<{ series: TrendPoint[] }> {
  return request<{ series: TrendPoint[] }>(`/admin/trends?days=${days}`, { auth });
}
