import { ApiError } from '../api';
import type { PartnerApplication, PartnerApplicationSubmission } from './types';

export async function uploadPartnerApplicationLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/partner/applications/logo', {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  });
  const body = (await response.json().catch(() => null)) as
    | { url?: string; message?: string; code?: string; details?: unknown }
    | null;
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? 'The brand logo could not be uploaded. Try again.',
      response.status,
      body?.code,
      body?.details,
    );
  }
  if (!body?.url) throw new ApiError('The upload service returned an invalid response.', 502);
  return body.url;
}

export async function submitPartnerApplication(
  input: PartnerApplicationSubmission,
): Promise<PartnerApplication> {
  const response = await fetch('/api/partner/applications', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as
    | (PartnerApplication & { message?: string; code?: string; details?: unknown })
    | null;
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? 'The application could not be submitted. Try again.',
      response.status,
      body?.code,
      body?.details,
    );
  }
  if (!body?.id) throw new ApiError('The partner service returned an invalid response.', 502);
  return body;
}
