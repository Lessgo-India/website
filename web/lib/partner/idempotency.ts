/**
 * Idempotency-Keys for the partner portal's create-once writes: POST
 * /campaigns and POST /redemptions (offers-backend-spec §5).
 *
 * A key names one logical user action (submitting this campaign, redeeming
 * this voucher), not one HTTP request. A retry after an ambiguous failure
 * (BFF timeout, gateway 504, dropped connection, where the write may still
 * have landed) must send the same key, so the offers service replays the
 * first result instead of creating a second campaign or answering 409
 * not_redeemable for a voucher that was already redeemed.
 *
 * Self-contained so node's test runner can load it (idempotency.test.mjs).
 */

type RandomSource = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string };

/**
 * A random UUID v4. crypto.randomUUID needs a secure context; plain http on a
 * LAN address (testing on a phone) falls back to getRandomValues.
 */
export function newIdempotencyKey(source: RandomSource = crypto): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface IdempotentAction {
  /**
   * One attempt at the action. Every attempt reuses the key of the previous,
   * failed one; a success retires it, so the next action gets a new key.
   */
  attempt<T>(write: (idempotencyKey: string) => Promise<T>): Promise<T>;
  /** Abandon the current action (another voucher was looked up, the form was reset). */
  restart(): void;
}

/** Holds the key of one logical action across its retries. Create one per screen. */
export function createIdempotentAction(mint: () => string = newIdempotencyKey): IdempotentAction {
  let key: string | null = null;
  return {
    async attempt(write) {
      const current = (key ??= mint());
      const result = await write(current);
      // Unless the user moved on to another action meanwhile.
      if (key === current) key = null;
      return result;
    },
    restart() {
      key = null;
    },
  };
}
