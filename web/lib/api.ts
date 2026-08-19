import { BACKEND_API } from './config';
import type { DocItem, EventDetail, EventPreview, GalleryItem, Muo, Profile } from './types';

type RequestOptions = { method?: string; token?: string | null; body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BACKEND_API) throw new Error('NEXT_PUBLIC_BACKEND_API is not set.');
  const { method = 'GET', token, body } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string | string[]; error?: string };
      const raw = data?.message ?? data?.error;
      if (raw) message = Array.isArray(raw) ? raw.join(', ') : raw;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The gallery/documents endpoints may return either a bare array or a wrapped
// object depending on the service version; tolerate both.
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    for (const key of ['data', 'documents', 'gallery', 'photos', 'items', 'result']) {
      const inner = (value as Record<string, unknown>)[key];
      if (Array.isArray(inner)) return inner as T[];
    }
  }
  return [];
}

// --- Public (no auth): shareable deep-link preview + OG metadata ---
export function getEventPreview(id: string): Promise<EventPreview> {
  return request<EventPreview>(`/public/events/${encodeURIComponent(id)}`);
}

// --- Authenticated (Firebase ID token as Bearer) ---
export function getEvent(id: string, token: string): Promise<EventDetail> {
  return request<EventDetail>(`/events/${encodeURIComponent(id)}`, { token });
}

export function getMuo(userId: string, token: string): Promise<Muo> {
  return request<Muo>(`/users/getMUO/${encodeURIComponent(userId)}`, { token });
}

export async function getProfileOrNull(userId: string, token: string): Promise<Profile | null> {
  try {
    return await request<Profile>(`/profile/${encodeURIComponent(userId)}`, { token });
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}

export function setRsvp(
  eventId: string,
  userId: string,
  status: number,
  token: string,
): Promise<unknown> {
  return request(
    `/events/${encodeURIComponent(eventId)}/members/${encodeURIComponent(userId)}/status`,
    { method: 'PATCH', token, body: { status } },
  );
}

export async function getGallery(eventId: string, token: string): Promise<GalleryItem[]> {
  return asArray<GalleryItem>(
    await request(`/file-upload/gallery/${encodeURIComponent(eventId)}`, { token }),
  );
}

export async function getDocuments(eventId: string, token: string): Promise<DocItem[]> {
  return asArray<DocItem>(
    await request(`/file-upload/documents/${encodeURIComponent(eventId)}`, { token }),
  );
}

export type CreateProfileInput = {
  userId: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'T';
  regionCode?: string;
};

export function createProfile(input: CreateProfileInput, token: string): Promise<unknown> {
  const now = new Date().toISOString();
  return request(`/profile/create`, {
    method: 'POST',
    token,
    body: {
      user_id: input.userId,
      account_status: '1',
      name: input.name,
      dob: input.dob,
      gender: input.gender,
      region_code: input.regionCode || 'IN',
      dp_url: 'https://lessgo.blob.core.windows.net/lessgocontainer/default-profile.png',
      status: "Hey! I'm at Lessgo",
      user_settings: { blocked_users: [] },
      friendList: [],
      groupList: [],
      stats: {
        eventsAttended: 0,
        celebrationsAttended: 0,
        eventHosted: 0,
        tripsCompleted: 0,
      },
      createdAt: now,
      lastModifiedAt: now,
    },
  });
}
