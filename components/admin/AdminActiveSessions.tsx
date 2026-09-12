"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut, MonitorSmartphone, RefreshCw } from "lucide-react";
import {
  getAdminSessions,
  revokeAdminSessionById,
  revokeOtherSessions,
  type AdminActiveSession,
} from "@web/lib/adminApi";

export default function AdminActiveSessions({
  reloadKey,
}: {
  reloadKey: number;
}) {
  const [sessions, setSessions] = useState<AdminActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setSessions((await getAdminSessions()).sessions);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [reloadKey]);

  async function revoke(sessionId: string) {
    setBusy(sessionId);
    setError(null);
    setMessage(null);
    try {
      const result = await revokeAdminSessionById(sessionId);
      if (result.current) {
        window.location.reload();
        return;
      }
      await load();
      setMessage(
        result.revoked
          ? "Session signed out."
          : "Session was already inactive.",
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeOthers() {
    setBusy("others");
    setError(null);
    setMessage(null);
    try {
      const result = await revokeOtherSessions();
      await load();
      setMessage(
        `${result.revoked} other ${result.revoked === 1 ? "session" : "sessions"} signed out.`,
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const otherSessions = sessions.filter((session) => !session.current).length;

  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-groups-tint text-groups">
          <MonitorSmartphone className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-ink">
            Active sessions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Review signed-in browsers and revoke access you do not recognize.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy !== null}
          title="Refresh sessions"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span className="sr-only">Refresh sessions</span>
        </button>
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

      {loading && sessions.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">No active sessions found.</p>
      ) : (
        <div className="mt-5 divide-y divide-line border-y border-line">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">
                    {session.browser} on {session.device}
                  </p>
                  {session.current ? (
                    <span className="rounded-full border border-ok bg-ok-tint px-2 py-0.5 text-xs font-semibold text-ok">
                      This device
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 break-all text-xs text-ink-muted">
                  {session.ipAddress} · Last active{" "}
                  {formatDate(session.lastSeenAt)}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Signed in {formatDate(session.createdAt)} · Expires{" "}
                  {formatDate(session.expiresAt)}
                </p>
              </div>
              {!session.current ? (
                <button
                  type="button"
                  onClick={() => void revoke(session.id)}
                  disabled={busy !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-down px-4 text-sm font-semibold text-down hover:bg-down-tint disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {otherSessions > 0 ? (
        <button
          type="button"
          onClick={() => void revokeOthers()}
          disabled={busy !== null}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-down px-4 text-sm font-semibold text-down hover:bg-down-tint disabled:opacity-50"
        >
          {busy === "others" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden="true" />
          )}
          Sign out all other sessions
        </button>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
