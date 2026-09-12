"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import {
  confirmAdminPasswordChange,
  requestAdminPasswordChangeOtp,
} from "@web/lib/adminApi";
import { deriveCredential } from "@web/lib/adminCredential";
import { useAdminSession } from "./AdminGate";

export default function AdminPasswordChange({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const { session, recheck } = useAdminSession();
  const [challenge, setChallenge] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await requestAdminPasswordChangeOtp();
      setChallenge({ id: result.challengeId, expiresAt: result.expiresAt });
      setCode("");
      setMessage(
        `A six-digit code was sent by SMS to the admin number ending in ${session.userId?.slice(-4) ?? "your phone"}.`,
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code sent by SMS.");
      return;
    }
    if (password.length < 12) {
      setError("Use at least 12 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    if (!session.userId) {
      setError("The current administrator could not be identified.");
      return;
    }

    setBusy(true);
    try {
      const credential = await deriveCredential(session.userId, password);
      await confirmAdminPasswordChange({
        challengeId: challenge.id,
        code,
        credential,
      });
      setChallenge(null);
      setCode("");
      setPassword("");
      setConfirmation("");
      await recheck();
      await onChanged();
      setMessage("Password changed. Every other admin session was signed out.");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-profile-tint text-profile">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Change password
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Confirm the change with a Twilio SMS code. Your password never
            leaves this browser.
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-4 border-l-2 border-ok bg-ok-tint px-4 py-3 text-sm text-ink"
        >
          {message}
        </p>
      ) : null}

      {!challenge ? (
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={busy}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
          Send verification code
        </button>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={changePassword}>
          <label className="block text-sm font-semibold text-ink">
            Verification code
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-surface-2 px-3 font-mono text-base tracking-[0.2em] text-ink outline-none focus:border-profile"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
            />
            <PasswordField
              label="Confirm new password"
              value={confirmation}
              onChange={setConfirmation}
            />
          </div>
          <p className="text-xs text-ink-muted">
            Code expires {formatExpiry(challenge.expiresAt)}. Changing the
            password revokes every other active session.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-profile px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              Change password
            </button>
            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={busy}
              className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              Send a new code
            </button>
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setCode("");
                setPassword("");
                setConfirmation("");
                setError(null);
              }}
              disabled={busy}
              className="min-h-11 px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
        className="mt-2 min-h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-profile"
      />
    </label>
  );
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
