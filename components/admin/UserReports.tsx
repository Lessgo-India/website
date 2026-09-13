"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Clipboard,
  Eye,
  EyeOff,
  Flag,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AdminConfirmDialog from "@ui/admin/AdminConfirmDialog";
import {
  ADMIN_USER_REPORT_CATEGORIES,
  getAdminUserReport,
  getAdminUserReports,
  reviewAdminUserReport,
  type AdminReportProfileSummary,
  type AdminUserReportCategory,
  type AdminUserReportDetails,
  type AdminUserReportPage,
  type AdminUserReportStatus,
  type AdminUserReportSummary,
} from "@web/lib/adminApi";

const STATUS_OPTIONS: Array<{
  value: AdminUserReportStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const CATEGORY_LABELS: Record<AdminUserReportCategory, string> = {
  harassment_or_bullying: "Harassment or bullying",
  impersonation: "Impersonation",
  spam_or_scam: "Spam or scam",
  inappropriate_content_or_behavior: "Inappropriate content or behavior",
  safety_concern: "Safety concern",
  other: "Something else",
};

const STATUS_STYLES: Record<AdminUserReportStatus, string> = {
  open: "border-warn bg-warn-tint text-warn",
  in_review: "border-profile bg-profile-tint text-profile",
  resolved: "border-ok bg-ok-tint text-ok",
  dismissed: "border-line-strong bg-surface-2 text-ink-muted",
};

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function maskUserId(userId: string | null): string {
  return userId ? `******${userId.slice(-4)}` : "Unavailable";
}

function StatusBadge({ status }: { status: AdminUserReportStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}
    </span>
  );
}

function IdentityBlock({
  label,
  profile,
}: {
  label: string;
  profile: AdminReportProfileSummary;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const userId = profile.userId;

  const copy = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-w-0 border-b border-line py-4 last:border-b-0">
      <p className="text-xs font-semibold uppercase text-ink-faint">{label}</p>
      <div className="mt-2 flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-profile-tint text-profile">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {profile.deleted ? "Deleted or unavailable user" : profile.name || "Unnamed user"}
          </p>
          <p className="mt-0.5 font-mono text-xs text-ink-muted">
            {revealed ? userId || "Unavailable" : maskUserId(userId)}
          </p>
        </div>
        {userId ? (
          <>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              title={revealed ? "Hide full user ID" : "Reveal full user ID"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <span className="sr-only">
                {revealed ? "Hide" : "Reveal"} {label.toLowerCase()} user ID
              </span>
              {revealed ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            {revealed ? (
              <button
                type="button"
                onClick={() => void copy()}
                title="Copy user ID"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <span className="sr-only">Copy {label.toLowerCase()} user ID</span>
                {copied ? (
                  <Check className="h-4 w-4 text-ok" aria-hidden="true" />
                ) : (
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ReportListRow({
  report,
  selected,
  onSelect,
}: {
  report: AdminUserReportSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`min-h-24 w-full px-4 py-4 text-left transition-colors sm:px-5 ${
          selected ? "bg-profile-tint" : "hover:bg-surface-2"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              <span className="text-xs text-ink-faint">
                {formatDate(report.createdAt)}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-ink">
              {report.reportedUser.name || "Deleted or unavailable user"}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {CATEGORY_LABELS[report.category]} · {report.reportsAgainstUser} retained report
              {report.reportsAgainstUser === 1 ? "" : "s"} against this user
            </p>
            {report.detailsPreview ? (
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink-muted">
                {report.detailsPreview}
              </p>
            ) : null}
          </div>
          <ChevronRight className="mt-2 h-4 w-4 flex-none text-ink-faint" aria-hidden="true" />
        </div>
      </button>
    </li>
  );
}

function allowedStatuses(status: AdminUserReportStatus): AdminUserReportStatus[] {
  if (status === "resolved" || status === "dismissed") {
    return [status, "in_review"];
  }
  return [status, ...STATUS_OPTIONS.map((option) => option.value).filter((value) => value !== status && value !== (status === "open" ? "open" : "in_review"))];
}

export default function UserReports() {
  const [status, setStatus] = useState<AdminUserReportStatus>("open");
  const [category, setCategory] = useState<AdminUserReportCategory | "all">("all");
  const [result, setResult] = useState<AdminUserReportPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserReportDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<AdminUserReportStatus>("open");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const loadReports = useCallback(
    async (cursor?: string, append = false): Promise<AdminUserReportPage | null> => {
      const requestId = ++listRequest.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await getAdminUserReports(status, category, cursor);
        if (requestId !== listRequest.current) return null;
        setResult((current) =>
          append && current
            ? { ...response, items: [...current.items, ...response.items] }
            : response,
        );
        return response;
      } catch (requestError) {
        if (requestId === listRequest.current) {
          setError((requestError as Error)?.message ?? "Could not load user reports.");
        }
        return null;
      } finally {
        if (requestId === listRequest.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [category, status],
  );

  const loadDetail = useCallback(async (id: string) => {
    const requestId = ++detailRequest.current;
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError(null);
    setReviewError(null);
    setNotice(null);
    try {
      const response = await getAdminUserReport(id);
      if (requestId !== detailRequest.current) return;
      setDetail(response);
      setReviewStatus(response.status);
      setNote("");
    } catch (requestError) {
      if (requestId === detailRequest.current) {
        setDetail(null);
        setDetailError((requestError as Error)?.message ?? "Could not load this report.");
      }
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setResult(null);
    setSelectedId(null);
    setDetail(null);
    const timer = window.setTimeout(() => void loadReports(), 0);
    return () => {
      window.clearTimeout(timer);
      listRequest.current += 1;
      detailRequest.current += 1;
    };
  }, [loadReports]);

  const saveReview = async () => {
    if (!detail || saving) return;
    setReviewError(null);
    const trimmedNote = note.trim();
    const changing = reviewStatus !== detail.status;
    const reopening =
      ["resolved", "dismissed"].includes(detail.status) &&
      reviewStatus === "in_review";
    if (!changing && !trimmedNote) {
      setReviewError("Choose a new status or add an internal note.");
      return;
    }
    if (
      (["resolved", "dismissed"].includes(reviewStatus) || reopening) &&
      !trimmedNote
    ) {
      setReviewError("Add an internal note for this review action.");
      return;
    }

    setSaving(true);
    try {
      const updated = await reviewAdminUserReport(detail.id, {
        status: reviewStatus,
        note: trimmedNote || undefined,
        revision: detail.revision,
      });
      setDetail(updated);
      setReviewStatus(updated.status);
      setNote("");
      setNotice("Review saved.");
      setConfirmOpen(false);
      await loadReports();
    } catch (requestError) {
      const stale = (requestError as { status?: number })?.status === 409;
      setReviewError(
        stale
          ? "This report changed in another session. Reload it before saving again."
          : (requestError as Error)?.message ?? "Could not save this review.",
      );
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const requestSave = () => {
    if (reviewStatus === "resolved" || reviewStatus === "dismissed") {
      const trimmedNote = note.trim();
      if (!trimmedNote) {
        setReviewError("Add an internal note before finalizing this report.");
        return;
      }
      setConfirmOpen(true);
      return;
    }
    void saveReview();
  };

  const counts = result?.counts ?? {
    open: 0,
    in_review: 0,
    resolved: 0,
    dismissed: 0,
  };
  const reviewOptions = useMemo(
    () => (detail ? allowedStatuses(detail.status) : []),
    [detail],
  );

  return (
    <section aria-labelledby="user-reports-heading" className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
        <div className="min-w-0 flex-1">
          <h2 id="user-reports-heading" className="font-display text-lg font-bold text-ink">
            Review queue
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Account-level safety reports submitted privately from user profiles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          title="Refresh user reports"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60"
        >
          <span className="sr-only">Refresh user reports</span>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Report status filter">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                status === option.value
                  ? "border-profile bg-profile-tint text-ink"
                  : "border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {option.label} · {counts[option.value]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex min-w-56 flex-col gap-1 text-xs font-semibold uppercase text-ink-faint">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as AdminUserReportCategory | "all")}
            className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-profile"
          >
            <option value="all">All categories</option>
            {ADMIN_USER_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p role="alert" className="border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <section aria-label="User report list" className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
          {loading && !result ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-ink-muted">
              Loading user reports...
            </div>
          ) : result?.items.length ? (
            <>
              <ul>
                {result.items.map((report) => (
                  <ReportListRow
                    key={report.id}
                    report={report}
                    selected={selectedId === report.id}
                    onSelect={() => void loadDetail(report.id)}
                  />
                ))}
              </ul>
              {result.nextCursor ? (
                <div className="border-t border-line p-3 text-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadReports(result.nextCursor!, true)}
                    className="min-h-11 rounded-md border border-line px-5 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <Flag className="h-7 w-7 text-ink-faint" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-bold text-ink">
                No {STATUS_OPTIONS.find((option) => option.value === status)?.label.toLowerCase()} reports
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Change the status or category filter to inspect another queue.
              </p>
            </div>
          )}
        </section>

        <section aria-label="Selected user report" className="min-w-0 rounded-lg border border-line bg-surface p-4 sm:p-6">
          {detailLoading ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-ink-muted">
              Loading report details...
            </div>
          ) : detailError ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <p role="alert" className="text-sm text-down">{detailError}</p>
              {selectedId ? (
                <button
                  type="button"
                  onClick={() => void loadDetail(selectedId)}
                  className="mt-4 min-h-11 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2"
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : detail ? (
            <div>
              <div className="flex flex-wrap items-start gap-3 border-b border-line pb-4">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-vibes-tint text-vibes">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={detail.status} />
                    <span className="text-xs text-ink-faint">Filed {formatDate(detail.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-ink">
                    {CATEGORY_LABELS[detail.category]}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-ink-faint">Report {detail.id}</p>
                </div>
              </div>

              <div className="grid gap-x-6 sm:grid-cols-2">
                <IdentityBlock key={`subject-${detail.id}`} label="Reported user" profile={detail.reportedUser} />
                <IdentityBlock key={`reporter-${detail.id}`} label="Reporter" profile={detail.reporter} />
              </div>

              <div className="border-b border-line py-5">
                <p className="text-xs font-semibold uppercase text-ink-faint">Submitted details</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {detail.details || "No additional details were provided."}
                </p>
              </div>

              <div className="border-b border-line py-5">
                <p className="text-xs font-semibold uppercase text-ink-faint">Review history</p>
                {detail.reviewHistory.length ? (
                  <ol className="mt-3 space-y-3">
                    {detail.reviewHistory.map((entry, index) => (
                      <li key={`${entry.reviewedAt}-${index}`} className="border-l-2 border-line-strong pl-3">
                        <p className="text-sm font-semibold text-ink">
                          {STATUS_OPTIONS.find((option) => option.value === entry.fromStatus)?.label} to {STATUS_OPTIONS.find((option) => option.value === entry.toStatus)?.label}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {formatDate(entry.reviewedAt)} · operator {maskUserId(entry.operatorId)}
                        </p>
                        {entry.note ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-ink-muted">{entry.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">No review activity yet.</p>
                )}
              </div>

              {detail.recentReportsAgainstUser.some((item) => item.id !== detail.id) ? (
                <div className="border-b border-line py-5">
                  <p className="text-xs font-semibold uppercase text-ink-faint">
                    Other retained reports against this user
                  </p>
                  <ul className="mt-3 divide-y divide-line">
                    {detail.recentReportsAgainstUser
                      .filter((item) => item.id !== detail.id)
                      .map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => void loadDetail(item.id)}
                            className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:text-profile"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink">
                                {CATEGORY_LABELS[item.category]}
                              </span>
                              <span className="mt-0.5 block text-xs text-ink-muted">
                                {formatDate(item.createdAt)}
                              </span>
                            </span>
                            <StatusBadge status={item.status} />
                            <ChevronRight
                              className="h-4 w-4 flex-none text-ink-faint"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}

              <div className="py-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-ink-faint">
                    Status
                    <select
                      value={reviewStatus}
                      onChange={(event) => {
                        setReviewStatus(event.target.value as AdminUserReportStatus);
                        setReviewError(null);
                      }}
                      className="min-h-11 rounded-md border border-line bg-bg-elev px-3 text-sm font-semibold normal-case text-ink outline-none focus:border-profile"
                    >
                      {reviewOptions.map((value) => (
                        <option key={value} value={value}>
                          {STATUS_OPTIONS.find((option) => option.value === value)?.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-ink-faint">
                    Internal note
                    <textarea
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value.slice(0, 2_000));
                        setReviewError(null);
                      }}
                      rows={4}
                      placeholder="Record the evidence reviewed and rationale."
                      className="min-h-24 resize-y rounded-md border border-line bg-bg-elev px-3 py-2 text-sm font-normal normal-case leading-5 text-ink outline-none placeholder:text-ink-faint focus:border-profile"
                    />
                    <span className="self-end font-mono text-[11px] font-normal normal-case text-ink-faint">
                      {note.length}/2000
                    </span>
                  </label>
                </div>
                {reviewError ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-down bg-down-tint px-3 py-2 text-sm text-ink">
                    <p role="alert" className="min-w-0 flex-1">{reviewError}</p>
                    {reviewError.includes("changed in another session") ? (
                      <button
                        type="button"
                        onClick={() => void loadDetail(detail.id)}
                        className="min-h-11 rounded-md border border-line px-3 font-semibold hover:bg-surface-2"
                      >
                        Reload report
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {notice ? (
                  <p role="status" className="mt-3 border-l-2 border-ok bg-ok-tint px-3 py-2 text-sm text-ink">
                    {notice}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-muted">
                    {detail.expiresAt
                      ? `Scheduled for deletion ${formatDate(detail.expiresAt)}`
                      : "Active reports are retained until reviewed."}
                  </p>
                  <button
                    type="button"
                    disabled={saving || (reviewStatus === detail.status && !note.trim())}
                    onClick={requestSave}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-profile px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {saving ? "Saving..." : "Save review"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <ShieldCheck className="h-8 w-8 text-ink-faint" aria-hidden="true" />
              <p className="mt-3 font-display text-base font-bold text-ink">Select a report</p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Review submitted details, identity context, and prior decisions here.
              </p>
            </div>
          )}
        </section>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title={reviewStatus === "resolved" ? "Resolve this report?" : "Dismiss this report?"}
        body="This finalizes the report and starts its 180-day retention period. The decision and internal note remain in the audit history."
        confirmLabel={reviewStatus === "resolved" ? "Resolve report" : "Dismiss report"}
        destructive={reviewStatus === "dismissed"}
        busy={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void saveReview()}
      />
    </section>
  );
}