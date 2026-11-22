import type { RequestOptions, TokenProvider } from './api';

export const ACCOUNT_DELETION_STORAGE_KEY = 'lessgo.account-deletion-recovery.v1';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const COMPONENTS = [
  'reports',
  'notifications',
  'groups',
  'updates',
  'files',
  'profile',
  'user',
  'firebase',
] as const;
const STATES = ['prepared', 'queued', 'running', 'retrying', 'completed'] as const;

type DeletionReport = Record<(typeof COMPONENTS)[number], string>;

export type AccountDeletionReceipt = {
  jobId: string;
  state: (typeof STATES)[number];
  report: DeletionReport;
  nextAttemptAt?: string | null;
};

type MarkerIdentity = {
  version: 1;
  jobId: string;
  firebaseUid: string;
};

export type AccountDeletionMarker = MarkerIdentity & (
  | { phase: 'preparing'; userId: string }
  | { phase: 'deleting'; recoveryToken: string }
  | { phase: 'cleanup' }
);

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type DeletionRequest = <T>(path: string, options: RequestOptions) => Promise<T>;

export class AccountDeletionStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountDeletionStorageError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReport(value: unknown): value is DeletionReport {
  return isRecord(value) && COMPONENTS.every((component) => typeof value[component] === 'string');
}

function isReceipt(value: unknown): value is AccountDeletionReceipt {
  return (
    isRecord(value) &&
    typeof value.jobId === 'string' &&
    UUID_PATTERN.test(value.jobId) &&
    STATES.some((state) => state === value.state) &&
    isReport(value.report) &&
    (value.nextAttemptAt === undefined ||
      value.nextAttemptAt === null ||
      typeof value.nextAttemptAt === 'string')
  );
}

export function isAccountDeletionComplete(receipt: AccountDeletionReceipt): boolean {
  return receipt.state === 'completed' && COMPONENTS.every((component) => {
    const status = receipt.report?.[component];
    return typeof status === 'string' && (
      component === 'reports'
        ? /^anonymized: \d+$/.test(status)
        : status === 'ok' || status === 'already absent'
    );
  });
}

function receiptFrom(value: unknown, expectedJobId?: string): AccountDeletionReceipt {
  if (
    !isReceipt(value) ||
    (expectedJobId !== undefined && value.jobId !== expectedJobId) ||
    (value.state === 'completed' && !isAccountDeletionComplete(value))
  ) {
    throw new Error('Account deletion progress could not be confirmed. Please retry.');
  }
  return {
    jobId: value.jobId,
    state: value.state,
    report: { ...value.report },
    ...(value.nextAttemptAt === undefined ? {} : { nextAttemptAt: value.nextAttemptAt }),
  };
}

function markerFrom(value: unknown): AccountDeletionMarker {
  if (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.jobId === 'string' &&
    UUID_PATTERN.test(value.jobId) &&
    typeof value.firebaseUid === 'string' &&
    value.firebaseUid.length > 0
  ) {
    const identity: MarkerIdentity = {
      version: 1,
      jobId: value.jobId,
      firebaseUid: value.firebaseUid,
    };
    if (value.phase === 'preparing' && typeof value.userId === 'string' && /^\d{10}$/.test(value.userId)) {
      return { ...identity, phase: 'preparing', userId: value.userId };
    }
    if (value.phase === 'deleting' && typeof value.recoveryToken === 'string' && TOKEN_PATTERN.test(value.recoveryToken)) {
      return { ...identity, phase: 'deleting', recoveryToken: value.recoveryToken };
    }
    if (value.phase === 'cleanup') return { ...identity, phase: 'cleanup' };
  }
  throw new AccountDeletionStorageError(
    'Saved account deletion progress is invalid. Contact privacy support before clearing browser data.',
  );
}

export function readAccountDeletionMarker(storage?: RecoveryStorage): AccountDeletionMarker | null {
  let raw: string | null;
  try {
    raw = (storage ?? window.localStorage).getItem(ACCOUNT_DELETION_STORAGE_KEY);
  } catch {
    throw new AccountDeletionStorageError('Browser storage is unavailable. Enable site storage and retry.');
  }
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    // JSON errors can include the saved recovery credential.
    throw new AccountDeletionStorageError(
      'Saved account deletion progress is invalid. Contact privacy support before clearing browser data.',
    );
  }
  return markerFrom(value);
}

export function saveAccountDeletionMarker(marker: AccountDeletionMarker, storage?: RecoveryStorage): void {
  const raw = JSON.stringify(markerFrom(marker));
  try {
    const target = storage ?? window.localStorage;
    target.setItem(ACCOUNT_DELETION_STORAGE_KEY, raw);
    if (target.getItem(ACCOUNT_DELETION_STORAGE_KEY) !== raw) throw new Error('Storage write not confirmed');
  } catch {
    throw new AccountDeletionStorageError(
      'Deletion progress could not be saved. Enable browser storage and retry; do not clear site data.',
    );
  }
}

export function clearAccountDeletionMarker(marker: AccountDeletionMarker, storage?: RecoveryStorage): void {
  const current = readAccountDeletionMarker(storage);
  if (current && (current.jobId !== marker.jobId || current.firebaseUid !== marker.firebaseUid)) {
    throw new AccountDeletionStorageError('Another deletion is saved in this browser. Reload to resume it.');
  }
  try {
    const target = storage ?? window.localStorage;
    target.removeItem(ACCOUNT_DELETION_STORAGE_KEY);
    if (target.getItem(ACCOUNT_DELETION_STORAGE_KEY) !== null) throw new Error('Storage removal not confirmed');
  } catch {
    throw new AccountDeletionStorageError('Saved deletion progress could not be cleared. Retry browser cleanup.');
  }
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, 2_000);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function createAccountDeletionWorkflow(request: DeletionRequest) {
  const prepare = async (userId: string, jobId: string, auth: TokenProvider, signal?: AbortSignal) => {
    if (!/^\d{10}$/.test(userId) || !UUID_PATTERN.test(jobId)) {
      throw new Error('The account deletion identity could not be verified.');
    }
    const data = await request<unknown>(`/users/${userId}/account-deletion`, {
      method: 'POST',
      body: { jobId },
      auth,
      headers: { 'Idempotency-Key': jobId },
      signal,
      timeoutMs: 30_000,
    });
    const receipt = receiptFrom(data);
    if (!isRecord(data) || typeof data.recoveryToken !== 'string' || !TOKEN_PATTERN.test(data.recoveryToken)) {
      throw new Error('Account deletion recovery could not be secured. Please retry.');
    }
    return { ...receipt, recoveryToken: data.recoveryToken };
  };

  const recoveryHeaders = (jobId: string, token: string) => {
    if (!UUID_PATTERN.test(jobId) || !TOKEN_PATTERN.test(token)) {
      throw new Error('Account deletion recovery could not be verified. Contact privacy support.');
    }
    return { 'x-account-deletion-token': token };
  };

  const start = async (jobId: string, token: string, signal?: AbortSignal) => receiptFrom(
    await request<unknown>(`/account-deletions/${jobId}/start`, {
      method: 'POST',
      headers: { ...recoveryHeaders(jobId, token), 'Idempotency-Key': jobId },
      signal,
      timeoutMs: 30_000,
    }),
    jobId,
  );

  const status = async (jobId: string, token: string, signal?: AbortSignal) => receiptFrom(
    await request<unknown>(`/account-deletions/${jobId}`, {
      method: 'GET',
      headers: recoveryHeaders(jobId, token),
      signal,
      timeoutMs: 30_000,
    }),
    jobId,
  );

  const resume = async (
    saved: AccountDeletionMarker,
    options: {
      getToken: TokenProvider;
      signal: AbortSignal;
      onProgress: (marker: AccountDeletionMarker, receipt?: AccountDeletionReceipt) => void;
      storage?: RecoveryStorage;
    },
  ) => {
    const { getToken, signal, onProgress, storage } = options;
    let marker = markerFrom(saved);
    signal.throwIfAborted();
    onProgress(marker);
    if (marker.phase === 'preparing') {
      const prepared = await prepare(marker.userId, marker.jobId, getToken, signal);
      signal.throwIfAborted();
      marker = {
        version: 1,
        phase: 'deleting',
        jobId: prepared.jobId,
        firebaseUid: marker.firebaseUid,
        recoveryToken: prepared.recoveryToken,
      };
      // Persist the capability before starting a job that removes Firebase access.
      saveAccountDeletionMarker(marker, storage);
      onProgress(marker, prepared);
    }
    if (marker.phase === 'deleting') {
      let progress = await start(marker.jobId, marker.recoveryToken, signal);
      signal.throwIfAborted();
      onProgress(marker, progress);
      while (progress.state !== 'completed') {
        await waitForNextPoll(signal);
        progress = await status(marker.jobId, marker.recoveryToken, signal);
        signal.throwIfAborted();
        onProgress(marker, progress);
      }
      marker = {
        version: 1,
        phase: 'cleanup',
        jobId: marker.jobId,
        firebaseUid: marker.firebaseUid,
      };
      saveAccountDeletionMarker(marker, storage);
      onProgress(marker, progress);
    }
    return marker;
  };

  return { prepare, start, status, resume };
}
