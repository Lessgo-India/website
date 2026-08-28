/**
 * Turns an admin password into a site-specific credential *in the browser*, so
 * the password itself never crosses the network and never exists in server
 * memory or logs.
 *
 * HTTPS already encrypts the request. What this adds is containment: if a
 * request is ever captured — a broken TLS terminator, an over-eager proxy log,
 * a misconfigured APM — the attacker gets a value that only works on this site,
 * not the operator's actual password (which they may well reuse elsewhere).
 *
 * ⚠️ These three constants are duplicated in `scripts/hash-admin-password.mjs`,
 * which generates the stored hash. Change one, change both, and every stored
 * credential must be regenerated.
 */
export const PBKDF2_ITERATIONS = 310_000;
export const PBKDF2_HASH = 'SHA-256';
export const CREDENTIAL_BYTES = 32;

/** Deterministic per-operator salt, so no round-trip is needed to learn it. */
export function credentialSalt(phone: string): string {
  return `lessgo-admin:v1:${normalisePhone(phone)}`;
}

/** Same 10-digit identity the rest of the stack uses. */
export function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

/**
 * Derives the credential sent to the server. Uses WebCrypto, which needs a
 * secure context — fine on HTTPS and on localhost.
 */
export async function deriveCredential(phone: string, password: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(credentialSalt(phone)),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    key,
    CREDENTIAL_BYTES * 8,
  );

  return toHex(new Uint8Array(bits));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
