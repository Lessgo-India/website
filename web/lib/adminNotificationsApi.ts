import { adminRequest } from "./adminApi";

export type CampaignPurpose = "lessgo_update" | "marketing";
export type CampaignDestination =
  "home" | "events" | "vibes" | "balances" | "profile" | "event" | "group";
export type AudienceEventMode = "none" | "recent" | "specific" | "near_event";
export type CampaignState =
  | "scheduled"
  | "materializing"
  | "queued"
  | "sending"
  | "completed"
  | "completed_with_failures"
  | "cancel_requested"
  | "cancelled"
  | "failed";

export interface CampaignAudience {
  minAge?: number;
  maxAge?: number;
  genders?: Array<"M" | "F" | "T">;
  eventMode: AudienceEventMode;
  lookbackDays?: 7 | 30 | 90 | 180;
  eventId?: string;
  anchorEventId?: string;
  radiusKm?: number;
  eventTypes?: string[];
  roles?: number[];
  rsvpStatuses?: number[];
}

export interface CampaignCapabilities {
  enabled: boolean;
  canSend: boolean;
  audienceConfigured: boolean;
  firebaseReady: boolean;
  queue: {
    configured: boolean;
    reachable: boolean;
    workers: number;
    waiting: number;
    active: number;
    delayed: number;
  };
}

export interface CampaignEvent {
  id: string;
  name: string;
  eventType: string;
  startDate: string | null;
  locationName: string | null;
  hasLocation: boolean;
  memberCount: number;
}

export interface CampaignPreviewCounts {
  matchedProfiles: number;
  preferenceEligibleUsers: number;
  pushReachableUsers: number;
  activeTokens: number;
  excludedMalformedDob: number;
  excludedByPreference: number;
  excludedWithoutActiveToken: number;
}

export interface CampaignPreview {
  id: string;
  purpose: CampaignPurpose;
  audience: CampaignAudience;
  state: "queued" | "running" | "ready" | "failed" | "expired";
  counts: CampaignPreviewCounts | null;
  failureReason: string | null;
  completedAt: string | null;
  testedAt: string | null;
  expiresAt: string;
}

export interface CampaignProgress {
  snapshottedUsers: number;
  processedUsers: number;
  batchesTotal: number;
  batchesCompleted: number;
  acceptedUsers: number;
  partialUsers: number;
  failedUsers: number;
  unknownUsers: number;
  skippedUsers: number;
  activeTokens: number;
  acceptedTokens: number;
  failedTokens: number;
  prunedTokens: number;
}

export interface AdminCampaign {
  id: string;
  name: string;
  purpose: CampaignPurpose;
  title: string;
  body: string;
  destination: CampaignDestination;
  destinationId: string | null;
  audience: CampaignAudience;
  state: CampaignState;
  scheduledAt: string | null;
  snapshotAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancellationRequestedAt: string | null;
  failureReason: string | null;
  progress: CampaignProgress;
  operatorId: string;
  createdAt: string | null;
  audit?: Array<{
    action: string;
    actorId: string;
    details: Record<string, string | number | boolean | null>;
    createdAt: string;
  }>;
}

export function getCampaignCapabilities(): Promise<CampaignCapabilities> {
  return adminRequest("/gateway/notifications/capabilities");
}

export function searchCampaignEvents(query: string): Promise<CampaignEvent[]> {
  const params = new URLSearchParams({ query, limit: "30" });
  return adminRequest(`/gateway/notifications/events?${params}`);
}

export function createCampaignPreview(input: {
  purpose: CampaignPurpose;
  audience: CampaignAudience;
}): Promise<CampaignPreview> {
  return adminRequest("/gateway/notifications/previews", {
    method: "POST",
    body: input,
  });
}

export function getCampaignPreview(id: string): Promise<CampaignPreview> {
  return adminRequest(
    `/gateway/notifications/previews/${encodeURIComponent(id)}`,
  );
}

export function sendCampaignTest(input: {
  previewId: string;
  purpose: CampaignPurpose;
  title: string;
  body: string;
  destination: CampaignDestination;
  destinationId?: string;
}): Promise<{
  success: boolean;
  acceptedTokens: number;
  failedTokens: number;
  testedAt: string;
}> {
  return adminRequest("/gateway/notifications/test", {
    method: "POST",
    body: input,
  });
}

export function createCampaign(input: {
  name: string;
  previewId: string;
  purpose: CampaignPurpose;
  title: string;
  body: string;
  destination: CampaignDestination;
  destinationId?: string;
  scheduledAt?: string;
  confirmation: string;
  idempotencyKey: string;
}): Promise<AdminCampaign> {
  return adminRequest("/gateway/notifications/campaigns", {
    method: "POST",
    body: input,
  });
}

export function getCampaigns(filters: {
  state?: CampaignState;
  purpose?: CampaignPurpose;
  limit?: number;
  before?: string;
} = {}): Promise<{
  items: AdminCampaign[];
  nextCursor: string | null;
}> {
  const params = new URLSearchParams({
    limit: String(filters.limit ?? 25),
  });
  if (filters.state) params.set("state", filters.state);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.before) params.set("before", filters.before);
  return adminRequest(`/gateway/notifications/campaigns?${params}`);
}

export function getCampaign(id: string): Promise<AdminCampaign> {
  return adminRequest(
    `/gateway/notifications/campaigns/${encodeURIComponent(id)}`,
  );
}

export function cancelCampaign(id: string): Promise<AdminCampaign> {
  return adminRequest(
    `/gateway/notifications/campaigns/${encodeURIComponent(id)}/cancel`,
    { method: "POST" },
  );
}

export function retryCampaignFailures(id: string): Promise<AdminCampaign> {
  return adminRequest(
    `/gateway/notifications/campaigns/${encodeURIComponent(id)}/retry-failures`,
    { method: "POST" },
  );
}
