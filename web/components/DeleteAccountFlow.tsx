'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ApiError, accountDeletionApi } from '@web/lib/api';
import {
  clearAccountDeletionMarker,
  readAccountDeletionMarker,
  saveAccountDeletionMarker,
  type AccountDeletionMarker,
} from '@web/lib/accountDeletion';
import { AuthIdentityChangedError, useAuth } from '@web/lib/auth';
import { getFirebaseAuth } from '@web/lib/firebase';
import { newIdempotencyKey } from '@web/lib/partner/idempotency';
import OtpAuth from '@web/components/OtpAuth';

type Phase =
  | 'restoring'
  | 'confirm'
  | 'preparing'
  | 'deleting'
  | 'awaiting-verification'
  | 'reauthenticating'
  | 'signing-out'
  | 'error'
  | 'identity-changed'
  | 'signout-error'
  | 'success';

const PRIVACY_EMAIL = 'privacy@lessgo.in';

function maskedPhone(userId: string): string {
  return `+91 •••••• ${userId.slice(-4)}`;
}

export default function DeleteAccountFlow() {
  const { configured, getToken, ready, signOut, signOutConfirmed, user, userId } = useAuth();
  const [acknowledged, setAcknowledged] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [recoveryMarker, setRecoveryMarker] = useState<AccountDeletionMarker | null>(null);
  const [phase, setPhase] = useState<Phase>('restoring');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const busy = phase === 'preparing' || phase === 'deleting' ||
    phase === 'reauthenticating' || phase === 'signing-out';

  useEffect(() => {
    if (!ready) return;
    headingRef.current?.focus();
  }, [phase, ready, user, userId]);

  const handleDifferentNumber = useCallback(async () => {
    setAcknowledged(false);
    setAuthNotice(recoveryMarker ? 'Verify the original account to resume your saved deletion.' : null);
    setProgressMessage('Resetting your verification...');
    setPhase('signing-out');
    await signOut();
    setPhase(recoveryMarker ? 'awaiting-verification' : 'confirm');
  }, [recoveryMarker, signOut]);

  const resumeDeletion = useCallback(async (saved: AccountDeletionMarker) => {
    if (inFlightRef.current) return;
    const controller = new AbortController();
    inFlightRef.current = controller;
    let currentMarker = saved;
    setErrorMessage(null);

    try {
      const completed = await accountDeletionApi.resume(saved, {
        signal: controller.signal,
        getToken: async (forceRefresh = false) => {
          if (getFirebaseAuth().currentUser?.uid !== saved.firebaseUid) {
            throw new AuthIdentityChangedError();
          }
          const token = await getToken(forceRefresh);
          if (getFirebaseAuth().currentUser?.uid !== saved.firebaseUid) {
            throw new AuthIdentityChangedError();
          }
          if (!token) throw new ApiError('Your verified session expired. Verify your phone again.', 401);
          return token;
        },
        onProgress: (marker, receipt) => {
          currentMarker = marker;
          setRecoveryMarker(marker);
          setPhase(marker.phase === 'cleanup' ? 'signing-out' : marker.phase);
          setProgressMessage(
            marker.phase === 'preparing'
              ? 'Preparing secure account deletion.'
              : marker.phase === 'cleanup'
                ? 'Account deleted. Clearing this browser and signing out.'
                : receipt?.state === 'retrying'
                  ? 'A service is temporarily unavailable. Lessgo will retry account cleanup automatically.'
                  : 'Deleting your account and confirming all cleanup steps.',
          );
        },
      });
      controller.signal.throwIfAborted();
      let identityChanged = false;
      try {
        await signOutConfirmed(completed.firebaseUid);
      } catch (error) {
        if (!(error instanceof AuthIdentityChangedError)) throw error;
        identityChanged = true;
      }
      controller.signal.throwIfAborted();
      clearAccountDeletionMarker(completed);
      setRecoveryMarker(null);
      setAuthNotice(null);
      setAcknowledged(false);
      setPhase(identityChanged ? 'identity-changed' : 'success');
    } catch (error) {
      if (controller.signal.aborted) return;
      setRecoveryMarker(currentMarker);
      if (
        currentMarker.phase === 'preparing' &&
        (error instanceof AuthIdentityChangedError ||
          (error instanceof ApiError && (error.status === 401 || error.status === 403)))
      ) {
        setAuthNotice(
          'Your saved deletion needs the original verified account. Verify that phone number to resume.',
        );
        if (error instanceof ApiError) {
          setProgressMessage('Resetting your verification...');
          setPhase('reauthenticating');
          await signOut();
          if (controller.signal.aborted) return;
        }
        setPhase('awaiting-verification');
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'Account deletion could not be confirmed. Please retry.');
      setPhase(currentMarker.phase === 'cleanup' ? 'signout-error' : 'error');
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null;
    }
  }, [getToken, signOut, signOutConfirmed]);

  const restoreRecovery = useCallback(() => {
    try {
      const marker = readAccountDeletionMarker();
      setRecoveryMarker(marker);
      setErrorMessage(null);
      setPhase(marker ? 'restoring' : 'confirm');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Saved deletion progress could not be read.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    restoreRecovery();
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [restoreRecovery]);

  useEffect(() => {
    if (!ready || !recoveryMarker || (phase !== 'restoring' && phase !== 'awaiting-verification')) return;
    if (
      recoveryMarker.phase === 'preparing' &&
      (user?.uid !== recoveryMarker.firebaseUid || userId !== recoveryMarker.userId)
    ) {
      setAuthNotice('Verify the original account to resume your saved deletion.');
      setPhase('awaiting-verification');
      return;
    }
    void resumeDeletion(recoveryMarker);
  }, [phase, ready, recoveryMarker, resumeDeletion, user, userId]);

  useEffect(() => {
    const onOnline = () => {
      if (phase === 'error' && recoveryMarker) void resumeDeletion(recoveryMarker);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [phase, recoveryMarker, resumeDeletion]);

  const deleteAccount = useCallback(() => {
    if (inFlightRef.current || !acknowledged || !user || !userId) return;
    try {
      const existing = readAccountDeletionMarker();
      const marker: AccountDeletionMarker = existing ?? {
        version: 1,
        phase: 'preparing',
        jobId: newIdempotencyKey(),
        userId,
        firebaseUid: user.uid,
      };
      if (!existing) saveAccountDeletionMarker(marker);
      setRecoveryMarker(marker);
      setAcknowledged(false);
      setAuthNotice(null);
      void resumeDeletion(marker);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Deletion progress could not be saved.');
      setPhase('error');
    }
  }, [acknowledged, resumeDeletion, user, userId]);

  if (phase === 'success') {
    return (
      <div
        className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8"
        role="status"
      >
        <CheckCircle2 className="h-10 w-10 text-split" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-5 font-display text-2xl font-bold text-ink outline-none"
        >
          Your Lessgo account has been deleted
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          Lessgo confirmed all account cleanup steps and deletion of Firebase access, and this browser
          has been signed out. Shared or retained records are handled as described in our Privacy
          Policy. You can close this page now.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
        >
          Return to Lessgo
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        className="flex min-h-48 items-center justify-center gap-3 rounded-xl border border-line bg-surface p-6 text-ink-muted"
        role="status"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Checking your sign-in status…
      </div>
    );
  }

  if (phase === 'identity-changed') {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8" role="status">
        <ShieldCheck className="h-9 w-9 text-profile" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 font-display text-2xl font-bold text-ink outline-none"
        >
          The original account was deleted
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          A different Firebase account became active in this browser while deletion was running.
          Lessgo left that newer session signed in and did not use it for the deletion request.
        </p>
      </div>
    );
  }

  if (phase === 'signout-error') {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8" role="alert">
        <AlertTriangle className="h-9 w-9 text-gold" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 font-display text-2xl font-bold text-ink outline-none"
        >
          Account deleted, but browser cleanup needs attention
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          Lessgo confirmed account deletion, but local sign-out or removal of saved recovery
          progress could not be confirmed. Retry browser cleanup before clearing site data.
        </p>
        {errorMessage ? <p className="mt-3 text-sm text-ink-muted">{errorMessage}</p> : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (recoveryMarker) void resumeDeletion(recoveryMarker);
            }}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
          >
            Retry browser cleanup
          </button>
          <a
            href={`mailto:${PRIVACY_EMAIL}`}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
          >
            Contact privacy support
          </a>
        </div>
      </div>
    );
  }

  if (phase === 'restoring') {
    return (
      <div className="flex min-h-48 items-center justify-center gap-3 rounded-xl border border-line bg-surface p-6 text-ink-muted" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Checking saved deletion progress...
      </div>
    );
  }

  if (busy) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8" role="status">
        <Loader2 className="h-9 w-9 animate-spin text-profile" aria-hidden="true" />
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 font-display text-2xl font-bold text-ink outline-none">
          {phase === 'preparing'
            ? 'Preparing account deletion'
            : phase === 'deleting'
              ? 'Deleting your account'
              : 'Completing browser sign-out'}
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">{progressMessage}</p>
        {recoveryMarker ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
            Your progress is saved in this browser. If interrupted, return to this page in the same
            browser to resume. Do not clear site data until deletion and browser cleanup finish.
          </p>
        ) : null}
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8" role="alert">
        <AlertTriangle className="h-9 w-9 text-vibes" aria-hidden="true" />
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 font-display text-2xl font-bold text-ink outline-none">
          We could not confirm the deletion
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">{errorMessage}</p>
        {recoveryMarker ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            Your progress is saved. Lessgo may still be completing account cleanup. Retrying resumes
            the same deletion; it does not delete a different account.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => recoveryMarker ? void resumeDeletion(recoveryMarker) : restoreRecovery()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-vibes px-6 text-sm font-semibold text-white transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {recoveryMarker ? 'Retry deletion' : 'Retry reading saved progress'}
          </button>
          <a href={`mailto:${PRIVACY_EMAIL}`} className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]">
            Contact privacy support
          </a>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <AlertTriangle className="h-8 w-8 text-vibes" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          Phone verification is unavailable
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          We cannot verify your account on this page right now. Email{' '}
          <a
            href={`mailto:${PRIVACY_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {PRIVACY_EMAIL}
          </a>{' '}
          and we will help with your deletion request. Never email an OTP, password, or identity
          document.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        {authNotice ? (
          <p
            role="alert"
            className="mb-5 border-l-2 border-vibes pl-4 text-sm leading-relaxed text-ink-muted"
          >
            {authNotice}
          </p>
        ) : null}
        <OtpAuth
          heading="Verify the account you want to delete"
          headingLevel="h2"
          headingRef={headingRef}
          phoneHelperText="We'll text a 6-digit code to the phone number linked to your Lessgo account."
          trackMilestones={false}
        />
      </div>
    );
  }

  if (
    recoveryMarker?.phase === 'preparing' &&
    (user.uid !== recoveryMarker.firebaseUid || userId !== recoveryMarker.userId)
  ) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8" role="status">
        <ShieldCheck className="h-9 w-9 text-profile" aria-hidden="true" />
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 font-display text-2xl font-bold text-ink outline-none">
          Verify the original account to resume
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          A deletion was saved for {maskedPhone(recoveryMarker.userId)}. The currently signed-in
          account is different and will not be used for that deletion.
        </p>
        <button type="button" onClick={() => void handleDifferentNumber()} className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]">
          Verify the original number
        </button>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <AlertTriangle className="h-8 w-8 text-vibes" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 font-display text-2xl font-bold text-ink outline-none"
        >
          We could not verify this account identity
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          This Firebase session does not contain a valid Lessgo phone identity. Sign out and
          verify the phone number attached to the account instead.
        </p>
        <button
          type="button"
          onClick={() => void handleDifferentNumber()}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
        >
          Verify another number
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-profile-tint">
              <ShieldCheck className="h-5 w-5 text-profile" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Verified account
              </p>
              <p className="mt-1 font-mono text-base font-bold text-ink">
                {maskedPhone(userId)}
              </p>
            </div>
          </div>

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-7 font-display text-2xl font-bold text-ink outline-none"
          >
            Confirm permanent deletion
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
            This permanently removes your core Lessgo profile and account access, deactivates
            notification tokens, and cleans up personal profile uploads and
            active membership data. This action cannot be undone.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            Shared event, message, and transaction records may be retained or de-identified where
            other participants rely on them or where law, fraud prevention, accounting, or dispute
            handling requires it.
          </p>

          <label className="mt-6 flex cursor-pointer items-start gap-3 border-y border-line py-5 text-sm leading-relaxed text-ink">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={busy}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--vibes)]"
            />
            <span>I understand that deleting this account is permanent and cannot be undone.</span>
          </label>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!acknowledged || busy}
              onClick={() => void deleteAccount()}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-vibes px-7 text-base font-semibold text-white transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDifferentNumber()}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-7 text-base font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              Use a different number
            </button>
          </div>
    </div>
  );
}