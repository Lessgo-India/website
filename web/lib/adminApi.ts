import { ApiError } from './api';

/**
 * Client for the admin dashboard.
 *
 * Every call goes to this app's own origin, which holds the session in an
 * httpOnly cookie and forwards to the gateway server-side. The browser never
 * sees a gateway credential, and there is no bearer token for a script to
 * steal.
 */

async function adminRequest<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

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
  configured: boolean;
  userId?: string;
  expiresAt?: number;
  statsAvailable?: boolean;
  gatewayReachable?: boolean;
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

export function getAdminSession(): Promise<AdminSession> {
  return adminRequest<AdminSession>('/session');
}

export function getAdminHealth(): Promise<HealthSnapshot> {
  return adminRequest<HealthSnapshot>('/gateway/health');
}

export function getAdminStats(window: { from: Date; to: Date }): Promise<AdminStats> {
  const query = new URLSearchParams({
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });
  return adminRequest<AdminStats>(`/gateway/stats?${query}`);
}

export function getAdminTrends(days: number): Promise<{ series: TrendPoint[] }> {
  return adminRequest<{ series: TrendPoint[] }>(`/gateway/trends?days=${days}`);
}

export async function adminLogin(phone: string, credential: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ phone, credential }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? 'Sign-in failed.', res.status);
  }
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(
    () => undefined,
  );
}
