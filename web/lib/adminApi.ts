import { ApiError } from "./api";

/**
 * Client for the admin dashboard.
 *
 * Every call goes to this app's own origin, which holds the session in an
 * httpOnly cookie and forwards to the gateway server-side. The browser never
 * sees a gateway credential, and there is no bearer token for a script to
 * steal.
 */

export async function adminRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Network error. Check your connection and try again.",
      0,
    );
  }

  const body = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!res.ok) {
    if (
      res.status === 401 &&
      path !== "/session" &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    throw new ApiError(
      body?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return body as T;
}

export type ServiceStatus = "ok" | "degraded" | "down" | "unconfigured";

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

export interface AdminActiveSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  browser: string;
  device: string;
  ipAddress: string;
  current: boolean;
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

export type AdminBugStatus = "open" | "resolved" | "all";

export interface AdminBugSummary {
  id: string;
  title: string;
  description: string;
  screen: string | null;
  userName: string | null;
  userId: string | null;
  done: boolean;
  createdAt: string;
  hasLogs: boolean;
  logCharacters: number;
}

export interface AdminBugDetails extends AdminBugSummary {
  logs: string;
}

export interface AdminBugPage {
  items: AdminBugSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  counts: { all: number; open: number; resolved: number };
}

export const ADMIN_USER_REPORT_CATEGORIES = [
  "harassment_or_bullying",
  "impersonation",
  "spam_or_scam",
  "inappropriate_content_or_behavior",
  "safety_concern",
  "other",
] as const;

export const ADMIN_USER_REPORT_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "dismissed",
] as const;

export type AdminUserReportCategory =
  (typeof ADMIN_USER_REPORT_CATEGORIES)[number];
export type AdminUserReportStatus =
  (typeof ADMIN_USER_REPORT_STATUSES)[number];

export interface AdminReportProfileSummary {
  userId: string | null;
  name: string | null;
  dpUrl: string | null;
  deleted: boolean;
}

export interface AdminUserReportSummary {
  id: string;
  status: AdminUserReportStatus;
  category: AdminUserReportCategory;
  detailsPreview: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  reporter: AdminReportProfileSummary;
  reportedUser: AdminReportProfileSummary;
  reportsAgainstUser: number;
}

export interface AdminUserReportReview {
  fromStatus: AdminUserReportStatus;
  toStatus: AdminUserReportStatus;
  note: string | null;
  operatorId: string;
  reviewedAt: string;
}

export interface AdminUserReportDetails extends AdminUserReportSummary {
  details: string | null;
  finalizedAt: string | null;
  expiresAt: string | null;
  reviewHistory: AdminUserReportReview[];
  recentReportsAgainstUser: Array<{
    id: string;
    category: AdminUserReportCategory;
    status: AdminUserReportStatus;
    createdAt: string;
  }>;
}

export interface AdminUserReportPage {
  items: AdminUserReportSummary[];
  nextCursor: string | null;
  counts: Record<AdminUserReportStatus, number>;
}

export function getAdminSession(): Promise<AdminSession> {
  return adminRequest<AdminSession>("/session");
}

export function getAdminSessions(): Promise<{
  sessions: AdminActiveSession[];
}> {
  return adminRequest("/sessions");
}

export function revokeAdminSessionById(
  sessionId: string,
): Promise<{ revoked: boolean; current: boolean }> {
  return adminRequest("/sessions", {
    method: "DELETE",
    body: { sessionId },
  });
}

export function revokeOtherSessions(): Promise<{ revoked: number }> {
  return adminRequest("/sessions/revoke-others", { method: "POST" });
}

export function requestAdminPasswordChangeOtp(): Promise<{
  challengeId: string;
  expiresAt: string;
}> {
  return adminRequest("/password/request-otp", { method: "POST" });
}

export function confirmAdminPasswordChange(input: {
  challengeId: string;
  code: string;
  credential: string;
}): Promise<{ ok: true }> {
  return adminRequest("/password/confirm", {
    method: "POST",
    body: input,
  });
}

export function getAdminHealth(): Promise<HealthSnapshot> {
  return adminRequest<HealthSnapshot>("/gateway/health");
}

export function getAdminStats(window: {
  from: Date;
  to: Date;
}): Promise<AdminStats> {
  const query = new URLSearchParams({
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });
  return adminRequest<AdminStats>(`/gateway/stats?${query}`);
}

export function getAdminTrends(
  days: number,
): Promise<{ series: TrendPoint[] }> {
  return adminRequest<{ series: TrendPoint[] }>(`/gateway/trends?days=${days}`);
}

export function getAdminBugs(
  status: AdminBugStatus,
  page: number,
  limit = 20,
): Promise<AdminBugPage> {
  const query = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit),
  });
  return adminRequest<AdminBugPage>(`/gateway/bugs?${query}`);
}

export function getAdminBug(id: string): Promise<AdminBugDetails> {
  return adminRequest<AdminBugDetails>(
    `/gateway/bugs/${encodeURIComponent(id)}`,
  );
}

export function setAdminBugDone(
  id: string,
  done: boolean,
): Promise<AdminBugSummary> {
  return adminRequest<AdminBugSummary>(
    `/gateway/bugs/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: { done },
    },
  );
}

export function deleteAdminDoneBugs(): Promise<{ deleted: number }> {
  return adminRequest<{ deleted: number }>("/gateway/bugs/done", {
    method: "DELETE",
  });
}

export function getAdminUserReports(
  status: AdminUserReportStatus,
  category: AdminUserReportCategory | "all" = "all",
  cursor?: string,
  limit = 20,
): Promise<AdminUserReportPage> {
  const query = new URLSearchParams({ status, limit: String(limit) });
  if (category !== "all") query.set("category", category);
  if (cursor) query.set("cursor", cursor);
  return adminRequest<AdminUserReportPage>(`/gateway/reports?${query}`);
}

export function getAdminUserReport(
  id: string,
): Promise<AdminUserReportDetails> {
  return adminRequest<AdminUserReportDetails>(
    `/gateway/reports/${encodeURIComponent(id)}`,
  );
}

export function reviewAdminUserReport(
  id: string,
  input: {
    status?: AdminUserReportStatus;
    note?: string;
    revision: number;
  },
): Promise<AdminUserReportDetails> {
  return adminRequest<AdminUserReportDetails>(
    `/gateway/reports/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  );
}

export async function adminLogin(
  phone: string,
  credential: string,
): Promise<void> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ phone, credential }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(body?.message ?? "Sign-in failed.", res.status);
  }
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => undefined);
}
