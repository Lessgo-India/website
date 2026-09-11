"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bug,
  Check,
  CheckCircle2,
  Circle,
  Clipboard,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  deleteAdminDoneBugs,
  getAdminBugs,
  setAdminBugDone,
  type AdminBug,
} from "@web/lib/adminApi";

type BugFilter = "open" | "resolved" | "all";

const FILTERS: { id: BugFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

function formatFiledAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function BugReportCard({
  bug,
  busy,
  copied,
  onToggleDone,
  onCopyLogs,
}: {
  bug: AdminBug;
  busy: boolean;
  copied: boolean;
  onToggleDone: (bug: AdminBug) => void;
  onCopyLogs: (bug: AdminBug) => void;
}) {
  const [logsOpen, setLogsOpen] = useState(false);

  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-sm ${
            bug.done ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
          }`}
          aria-hidden="true"
        >
          <Bug className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-bold text-ink sm:text-lg">
                {bug.title}
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                Filed {formatFiledAt(bug.createdAt)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggleDone(bug)}
              aria-label={
                bug.done ? `Reopen ${bug.title}` : `Mark ${bug.title} resolved`
              }
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                bug.done
                  ? "border-ok bg-ok-tint text-ok hover:bg-surface-2"
                  : "border-line-strong text-ink hover:bg-surface-2"
              }`}
            >
              {bug.done ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
              {bug.done ? "Reopen" : "Mark resolved"}
            </button>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-faint">
                Screen
              </dt>
              <dd className="mt-1 text-ink">{bug.screen || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-faint">
                Reporter
              </dt>
              <dd className="mt-1 text-ink">{bug.userName || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-faint">
                User ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-ink">
                {bug.userId || "Unavailable"}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-ink-faint">
              Description
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
              {bug.description || "No description provided."}
            </p>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLogsOpen((open) => !open)}
                aria-expanded={logsOpen}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-profile"
              >
                <span>{logsOpen ? "Hide local log" : "Show local log"}</span>
                <span className="font-mono text-xs font-normal text-ink-faint">
                  {bug.logs
                    ? `${bug.logs.length.toLocaleString("en-IN")} chars`
                    : "none"}
                </span>
              </button>
              {bug.logs ? (
                <button
                  type="button"
                  onClick={() => onCopyLogs(bug)}
                  title="Copy local log"
                  className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <span className="sr-only">
                    Copy local log for {bug.title}
                  </span>
                  {copied ? (
                    <Check className="h-4 w-4 text-ok" aria-hidden="true" />
                  ) : (
                    <Clipboard className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>

            {logsOpen ? (
              bug.logs ? (
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words border-l-2 border-profile bg-bg-elev px-4 py-3 font-mono text-[11px] leading-5 text-ink">
                  {bug.logs}
                </pre>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  No local log was attached.
                </p>
              )
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BugHouse({ active }: { active: boolean }) {
  const [bugs, setBugs] = useState<AdminBug[]>([]);
  const [filter, setFilter] = useState<BugFilter>("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBugs(await getAdminBugs());
    } catch (requestError) {
      setError(
        (requestError as Error)?.message ?? "Could not load bug reports.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [active, load]);

  const toggleDone = async (bug: AdminBug) => {
    setBusyId(bug.id);
    setError(null);
    try {
      const updated = await setAdminBugDone(bug.id, !bug.done);
      setBugs((current) =>
        current.map((item) => (item.id === bug.id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        (requestError as Error)?.message ?? "Could not update the bug report.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteResolved = async () => {
    const resolvedCount = bugs.filter((bug) => bug.done).length;
    if (resolvedCount === 0) return;
    if (
      !window.confirm(
        `Delete ${resolvedCount} resolved bug report${resolvedCount === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await deleteAdminDoneBugs();
      setBugs((current) => current.filter((bug) => !bug.done));
      setNotice(
        `${result.deleted} resolved report${result.deleted === 1 ? "" : "s"} deleted.`,
      );
    } catch (requestError) {
      setError(
        (requestError as Error)?.message ??
          "Could not delete resolved bug reports.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyLogs = async (bug: AdminBug) => {
    if (!bug.logs) return;
    try {
      await navigator.clipboard.writeText(bug.logs);
      setCopiedId(bug.id);
      window.setTimeout(
        () => setCopiedId((current) => (current === bug.id ? null : current)),
        1800,
      );
    } catch {
      setError("Could not copy the local log.");
    }
  };

  const openCount = bugs.filter((bug) => !bug.done).length;
  const resolvedCount = bugs.length - openCount;
  const visibleBugs = bugs.filter((bug) => {
    if (filter === "open") return !bug.done;
    if (filter === "resolved") return bug.done;
    return true;
  });

  return (
    <section
      role="tabpanel"
      id="bugs-panel"
      aria-labelledby="bugs-tab"
      hidden={!active}
      className="mt-6 space-y-4"
    >
      <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-ink">Bug House</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Reports sent from the mobile app, including the selected screen and
            sanitized local log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh bug reports"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            <span className="sr-only">Refresh bug reports</span>
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={deleteResolved}
            disabled={deleting || resolvedCount === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-down px-4 text-sm font-semibold text-down transition-colors hover:bg-down-tint disabled:cursor-not-allowed disabled:border-line disabled:text-ink-faint"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete resolved
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Bug report filter"
      >
        {FILTERS.map((option) => {
          const count =
            option.id === "open"
              ? openCount
              : option.id === "resolved"
                ? resolvedCount
                : bugs.length;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                filter === option.id
                  ? "border-profile bg-profile-tint text-ink"
                  : "border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {option.label} · {count}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="border-l-2 border-ok bg-ok-tint px-4 py-3 text-sm text-ink"
        >
          {notice}
        </p>
      ) : null}

      {loading && bugs.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-ink-muted">
          Loading bug reports…
        </div>
      ) : visibleBugs.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center border-y border-line px-6 text-center">
          <Bug className="h-7 w-7 text-ink-faint" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-bold text-ink">
            No {filter} reports
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Bug reports will appear here after they are filed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBugs.map((bug) => (
            <BugReportCard
              key={bug.id}
              bug={bug}
              busy={busyId === bug.id}
              copied={copiedId === bug.id}
              onToggleDone={toggleDone}
              onCopyLogs={copyLogs}
            />
          ))}
        </div>
      )}
    </section>
  );
}
