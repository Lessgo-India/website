// Shared shapes for the gateway responses the web client consumes.

export type EventPreview = {
  id: string;
  name: string | null;
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  dp_url: string | null;
  locationName: string | null;
  hostName: string | null;
  description: string | null;
  memberCount: number;
};

export type EventMember = {
  userId: string;
  role: number; // 0 = host, 1 = member, 2 = co-host
  status: number; // -1 = not going, 0 = maybe, 1 = going, 2 = pending
};

export type EventDetail = {
  _id: string;
  name: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  dp_url?: string;
  description?: string;
  hostName?: string;
  locationName?: string;
  location_pin?: [number, number];
  members_list?: EventMember[];
  whatsapp_group_url?: string;
};

export type MuoEvent = {
  event_id: string;
  eventName?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  dp_url?: string;
  hostName?: string;
  locationName?: string;
  status?: number;
};

export type Muo = {
  user_id: string;
  profile?: { name?: string; dp_url?: string; status?: string };
  events?: MuoEvent[];
  groups?: unknown[];
};

export type Profile = {
  user_id: string;
  name?: string;
  dp_url?: string;
};

export type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'pending';

export const RSVP_TO_NUMBER: Record<RsvpStatus, number> = {
  going: 1,
  maybe: 0,
  not_going: -1,
  pending: 2,
};

export function numberToRsvp(n: number | undefined): RsvpStatus {
  if (n === 1) return 'going';
  if (n === 0) return 'maybe';
  if (n === -1) return 'not_going';
  return 'pending';
}
