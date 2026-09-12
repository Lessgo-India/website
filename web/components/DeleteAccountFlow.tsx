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
import { ApiError, deleteUserAccount } from '@web/lib/api';
import { AuthIdentityChangedError, useAuth } from '@web/lib/auth';
import OtpAuth from '@web/components/OtpAuth';

type Phase =
  | 'confirm'
  | 'deleting'
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
  const [cleanupComplete, setCleanupComplete] = useState(true);
  const [phase, setPhase] = useState<Phase>('confirm');
  const deletedUidRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    headingRef.current?.focus();
  }, [phase, ready, user, userId]);

  const handleDifferentNumber = useCallback(async () => {
    setAcknowledged(false);
    setAuthNotice(null);
    setPhase('signing-out');
    await signOut();
    setPhase('confirm');
  }, [signOut]);

  const finishLocalSignOut = useCallback(async (expectedUid: string) => {
    try {
      await signOutConfirmed(expectedUid);
      setPhase('success');
    } catch (error) {
      setPhase(error instanceof AuthIdentityChangedError ? 'identity-changed' : 'signout-error');
    }
  }, [signOutConfirmed]);

  const deleteAccount = useCallback(async () => {
    if (inFlightRef.current || !acknowledged || !user || !userId) return;

    const initiatingUid = user.uid;
    inFlightRef.current = true;
    setPhase('deleting');

    try {
      const result = await deleteUserAccount(userId, getToken);
      deletedUidRef.current = initiatingUid;
      setCleanupComplete(result.cleanupComplete);
      setAcknowledged(false);
      setAuthNotice(null);
      await finishLocalSignOut(initiatingUid);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setAcknowledged(false);
        setAuthNotice(
          'Your verified session expired or did not match this account. Verify your phone again before retrying.',
        );
        setPhase('reauthenticating');
        await signOut();
        setPhase('confirm');
        return;
      }

      setPhase('error');
    } finally {
      inFlightRef.current = false;
    }
  }, [acknowledged, finishLocalSignOut, getToken, signOut, user, userId]);

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
          Lessgo confirmed deletion of your core account and Firebase access, and this browser
          has been signed out. Shared or retained records are handled as described in our Privacy
          Policy. You can close this page now.
        </p>
        {!cleanupComplete ? (
          <p className="mt-4 border-l-2 border-gold pl-4 text-sm leading-relaxed text-ink-muted">
            Your account access and core profile were deleted, but some related cleanup, including
            stopping notifications, could not be confirmed. Notifications may continue until we
            review it. Email{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="font-semibold text-ink underline underline-offset-4"
            >
              {PRIVACY_EMAIL}
            </a>{' '}
            so we can review it.
          </p>
        ) : null}
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
        {!cleanupComplete ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Some related cleanup could not be confirmed. Email{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="font-semibold text-ink underline underline-offset-4"
            >
              {PRIVACY_EMAIL}
            </a>{' '}
            so we can review it.
          </p>
        ) : null}
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
          Account deleted, but local sign-out needs attention
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          Lessgo confirmed the account deletion, but this browser could not confirm that its local
          Firebase session was cleared. Retry local sign-out before closing the page.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const deletedUid = deletedUidRef.current;
              if (deletedUid) void finishLocalSignOut(deletedUid);
            }}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
          >
            Retry local sign-out
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

  const busy =
    phase === 'deleting' || phase === 'reauthenticating' || phase === 'signing-out';

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      {phase === 'error' ? (
        <div role="alert">
          <AlertTriangle className="h-9 w-9 text-vibes" aria-hidden="true" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 font-display text-2xl font-bold text-ink outline-none"
          >
            We could not confirm the deletion
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
            The account may already be deleted if the connection dropped after the request
            reached Lessgo. It is safe to retry: already-removed account records are treated as a
            successful deletion.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void deleteAccount()}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-vibes px-6 text-sm font-semibold text-white transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Retry deletion
            </button>
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
            >
              Contact privacy support
            </a>
          </div>
        </div>
      ) : (
        <>
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
            This permanently removes your core Lessgo profile and account access, and requests
            deactivation of notification tokens plus cleanup of personal profile uploads and
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
              {phase === 'reauthenticating' || phase === 'signing-out'
                ? 'Resetting verification…'
                : busy
                  ? 'Deleting…'
                  : 'Delete my account'}
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
        </>
      )}
    </div>
  );
}