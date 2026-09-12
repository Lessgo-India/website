import { isIP } from 'node:net';

export function trustedClientAddress(headers) {
  const forwarded = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const forwardedAddress = forwarded.at(-1) ?? '';
  if (isIP(forwardedAddress)) return forwardedAddress;

  const realAddress = (headers.get('x-real-ip') ?? '').trim();
  return isIP(realAddress) ? realAddress : 'unknown';
}

export function rateLimitSubjects(address, phone) {
  const normalizedPhone = /^\d{10}$/.test(phone) ? phone : 'invalid';
  if (address === 'unknown') {
    return [{ scope: 'phone', value: normalizedPhone, limit: 5 }];
  }
  return [
    { scope: 'address', value: address, limit: 20 },
    {
      scope: 'address-phone',
      value: `${address}:${normalizedPhone}`,
      limit: 5,
    },
    { scope: 'phone', value: normalizedPhone, limit: 5 },
  ];
}
