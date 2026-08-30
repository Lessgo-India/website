import { BACKEND_API } from './config';
import type { EventDetail, EventPreview, Muo, Profile } from './types';

const PROFILE_AVATAR_BASE_URL =
  'https://lessgo-asset.s3.ap-south-1.amazonaws.com/avatars';
export const PROFILE_AVATAR_COUNT = 9;

/** Public URL of the built-in default avatar at a 1-based index (wraps around). */
export function avatarUrlForIndex(index: number): string {
  const n = ((index - 1) % PROFILE_AVATAR_COUNT + PROFILE_AVATAR_COUNT) % PROFILE_AVATAR_COUNT;
  return `${PROFILE_AVATAR_BASE_URL}/avatar${n + 1}.png`;
}

export function randomProfileAvatarUrl(): string {
  const avatarNumber = Math.floor(Math.random() * PROFILE_AVATAR_COUNT) + 1;
  return `${PROFILE_AVATAR_BASE_URL}/avatar${avatarNumber}.png`;
}

/**
 * Returns a Firebase ID token, forcing a refresh when asked. Taking the
 * provider rather than a token string lets `request` recover from a token that
 * expired while the tab sat open, mirroring the mobile axios interceptor.
 */
export type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: TokenProvider;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    const data = (await res.json()) as { message?: string | string[]; error?: string };
    const raw = data?.message ?? data?.error;
    if (raw) message = Array.isArray(raw) ? raw.join(', ') : raw;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(message, res.status);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!BACKEND_API) throw new ApiError('The Lessgo backend is not configured.', 0);
  const { method = 'GET', body, auth } = options;

  const call = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${BACKEND_API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  };

  let res: Response;
  try {
    res = await call(auth ? await auth() : null);
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  if (res.status === 401 && auth) {
    const fresh = await auth(true);
    if (fresh) {
      try {
        res = await call(fresh);
      } catch {
        throw new ApiError('Network error. Check your connection and try again.', 0);
      }
    }
  }

  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Public (no auth): shareable deep-link preview + OG metadata ---
export function getEventPreview(id: string): Promise<EventPreview> {
  return request<EventPreview>(`/public/events/${encodeURIComponent(id)}`);
}

// --- Authenticated (Firebase ID token as Bearer) ---
export function getEvent(id: string, auth: TokenProvider): Promise<EventDetail> {
  return request<EventDetail>(`/events/${encodeURIComponent(id)}`, { auth });
}

export function getMuo(userId: string, auth: TokenProvider): Promise<Muo> {
  return request<Muo>(`/users/getMUO/${encodeURIComponent(userId)}`, { auth });
}

/** `null` means "no Lessgo account yet" — the signal that onboarding is needed. */
export async function getProfileOrNull(
  userId: string,
  auth: TokenProvider,
): Promise<Profile | null> {
  try {
    return await request<Profile>(`/profile/${encodeURIComponent(userId)}`, { auth });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function setRsvp(
  eventId: string,
  userId: string,
  status: number,
  auth: TokenProvider,
): Promise<unknown> {
  return request(
    `/events/${encodeURIComponent(eventId)}/members/${encodeURIComponent(userId)}/status`,
    { method: 'PATCH', auth, body: { status } },
  );
}

export type CreateProfileInput = {
  userId: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'T';
  regionCode?: string;
  /** Chosen profile picture (uploaded blob URL or a default avatar); random when omitted. */
  dpUrl?: string;
};

export function createProfile(input: CreateProfileInput, auth: TokenProvider): Promise<unknown> {
  const now = new Date().toISOString();
  return request(`/profile/create`, {
    method: 'POST',
    auth,
    body: {
      user_id: input.userId,
      account_status: '1',
      name: input.name,
      dob: input.dob,
      gender: input.gender,
      region_code: input.regionCode || 'IN',
      dp_url: input.dpUrl || randomProfileAvatarUrl(),
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

/**
 * Uploads a custom profile picture (multipart) to the gateway and returns its
 * public blob URL. Kept separate from `request` because it sends FormData (the
 * browser must set the multipart boundary, so no JSON Content-Type) and reads a
 * `{ url }` body. Retries once on 401 with a force-refreshed token.
 */
export async function uploadProfileImage(
  userId: string,
  file: File,
  auth: TokenProvider,
): Promise<string> {
  if (!BACKEND_API) throw new ApiError('The Lessgo backend is not configured.', 0);

  const call = async (token: string | null): Promise<Response> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folderPath', `profiles/${userId}`);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${BACKEND_API}/file-upload/upload-image`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    });
  };

  let res: Response;
  try {
    res = await call(await auth());
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  if (res.status === 401) {
    const fresh = await auth(true);
    if (fresh) {
      try {
        res = await call(fresh);
      } catch {
        throw new ApiError('Network error. Check your connection and try again.', 0);
      }
    }
  }

  if (!res.ok) throw await errorFrom(res);
  const data = (await res.json()) as { url?: string };
  if (!data?.url) throw new ApiError('Upload succeeded but no image URL was returned.', res.status);
  return data.url;
}
