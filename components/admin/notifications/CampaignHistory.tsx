"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, RotateCcw, StopCircle } from "lucide-react";
import {
  cancelCampaign,
  getCampaign,
  getCampaigns,
  retryCampaignFailures,
  type AdminCampaign,
  type CampaignPurpose,
  type CampaignState,
} from "@web/lib/adminNotificationsApi";
import AdminConfirmDialog from "@ui/admin/AdminConfirmDialog";

const ACTIVE_STATES = new Set<CampaignState>([
  "scheduled",
  "materializing",
  "queued",
  "sending",
  "cancel_requested",
]);

export default function CampaignHistory({ canSend }: { canSend: boolean }) {
  const [items, setItems] = useState<AdminCampaign[]>([]);
  const [selected, setSelected] = useState<AdminCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<CampaignState | "all">("all");
  const [purposeFilter, setPurposeFilter] = useState<CampaignPurpose | "all">(
    "all",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    action: "cancel" | "retry";
    campaign: AdminCampaign;
  } | null>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const deepLinkHandled = useRef(false);
  const replaceRequestSequence = useRef(0);
  const appendRequestSequence = useRef(0);
  const paginationInFlight = useRef(false);
  const loadedItemCount = useRef(0);
  const replacementInFlight = useRef(false);
  const replacementRerunSource = useRef<"replace" | "poll" | null>(null);
  const loadRef = useRef<(
    before?: string,
    source?: "replace" | "append" | "poll",
  ) => Promise<void>>(async () => undefined);
  const detailRequestSequence = useRef(0);
  const hasActiveCampaigns = items.some((item) =>
    ACTIVE_STATES.has(item.state),
  );

  const load = useCallback(async (
    before?: string,
    source: "replace" | "append" | "poll" = before ? "append" : "replace",
  ) => {
    const append = source === "append";
    if (append && (replacementInFlight.current || paginationInFlight.current)) {
      return;
    }
    if (source === "poll" && paginationInFlight.current) return;
    if (!append && replacementInFlight.current) {
      if (source === "replace" || replacementRerunSource.current === null) {
        replacementRerunSource.current = source;
      }
      if (source === "replace") setLoading(true);
      return;
    }
    const parentReplaceId = replaceRequestSequence.current;
    const requestId = append
      ? ++appendRequestSequence.current
      : ++replaceRequestSequence.current;
    if (append) {
      paginationInFlight.current = true;
      setLoadingMore(true);
    } else if (source === "replace") {
      replacementInFlight.current = true;
      setReplacing(true);
      appendRequestSequence.current += 1;
      paginationInFlight.current = false;
      setLoadingMore(false);
      setLoading(true);
    } else {
      replacementInFlight.current = true;
      setReplacing(true);
    }
    setError(null);
    try {
      const filters = {
        ...(stateFilter === "all" ? {} : { state: stateFilter }),
        ...(purposeFilter === "all" ? {} : { purpose: purposeFilter }),
        ...(before ? { before } : {}),
      };
      let result = await getCampaigns(filters);
      if (source === "poll") {
        const targetCount = Math.max(loadedItemCount.current, result.items.length);
        const refreshed = [...result.items];
        let cursor = result.nextCursor;
        while (
          cursor &&
          refreshed.length < targetCount &&
          requestId === replaceRequestSequence.current
        ) {
          const next = await getCampaigns({
            ...(stateFilter === "all" ? {} : { state: stateFilter }),
            ...(purposeFilter === "all" ? {} : { purpose: purposeFilter }),
            before: cursor,
          });
          const seen = new Set(refreshed.map((item) => item.id));
          refreshed.push(...next.items.filter((item) => !seen.has(item.id)));
          cursor = next.nextCursor;
        }
        result = { items: refreshed, nextCursor: cursor };
      }
      const current = append
        ? requestId === appendRequestSequence.current &&
          parentReplaceId === replaceRequestSequence.current
        : requestId === replaceRequestSequence.current;
      if (!current) return;
      setItems((current) => {
        const next = append
          ? [
              ...current,
              ...result.items.filter(
                (item) => !current.some((existing) => existing.id === item.id),
              ),
            ]
          : result.items;
        loadedItemCount.current = next.length;
        return next;
      });
      setNextCursor(result.nextCursor);
      const currentSelectedId = selectedIdRef.current;
      if (currentSelectedId) {
        const detail = await getCampaign(currentSelectedId);
        const stillCurrent = append
          ? requestId === appendRequestSequence.current &&
            parentReplaceId === replaceRequestSequence.current
          : requestId === replaceRequestSequence.current;
        if (
          stillCurrent &&
          selectedIdRef.current === currentSelectedId
        ) {
          setSelected(detail);
        }
      }
    } catch (requestError) {
      const current = append
        ? requestId === appendRequestSequence.current &&
          parentReplaceId === replaceRequestSequence.current
        : requestId === replaceRequestSequence.current;
      if (current) {
        setError((requestError as Error).message);
      }
    } finally {
      if (append && requestId === appendRequestSequence.current) {
        paginationInFlight.current = false;
        setLoadingMore(false);
      } else if (
        !append &&
        requestId === replaceRequestSequence.current
      ) {
        replacementInFlight.current = false;
        setReplacing(false);
        if (source === "replace") setLoading(false);
        const rerunSource = replacementRerunSource.current;
        replacementRerunSource.current = null;
        if (rerunSource) void loadRef.current(undefined, rerunSource);
      }
    }
  }, [purposeFilter, stateFilter]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      replaceRequestSequence.current += 1;
      appendRequestSequence.current += 1;
      paginationInFlight.current = false;
      replacementInFlight.current = false;
      setReplacing(false);
      replacementRerunSource.current = null;
    };
  }, [load]);

  useEffect(() => {
    if (!hasActiveCampaigns) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      await load(undefined, "poll");
      if (!cancelled) timer = window.setTimeout(() => void poll(), 5_000);
    };
    timer = window.setTimeout(() => void poll(), 5_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasActiveCampaigns, load]);

  const open = useCallback(async (id: string) => {
    const requestId = ++detailRequestSequence.current;
    selectedIdRef.current = id;
    setBusy(id);
    try {
      const detail = await getCampaign(id);
      if (
        requestId !== detailRequestSequence.current ||
        selectedIdRef.current !== id
      ) {
        return;
      }
      setSelected(detail);
    } catch (requestError) {
      if (requestId === detailRequestSequence.current) {
        setError((requestError as Error).message);
      }
    } finally {
      if (requestId === detailRequestSequence.current) setBusy(null);
    }
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    const frame = window.requestAnimationFrame(() =>
      selectedRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [selected?.id]);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const campaignId = new URLSearchParams(window.location.search).get(
      "campaign",
    );
    if (!campaignId || !/^[a-f0-9]{24}$/i.test(campaignId)) return;
    deepLinkHandled.current = true;
    void open(campaignId);
  }, [open]);

  const cancel = async (campaign: AdminCampaign) => {
    setBusy(campaign.id);
    try {
      setSelected(await cancelCampaign(campaign.id));
      await load();
      setConfirmation(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const retry = async (campaign: AdminCampaign) => {
    setBusy(campaign.id);
    try {
      setSelected(await retryCampaignFailures(campaign.id));
      await load();
      setConfirmation(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      role="tabpanel"
      id="campaign-history-panel"
      aria-labelledby="campaign-history-tab"
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Campaign history
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Aggregate outcomes only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="Refresh campaigns"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span className="sr-only">Refresh campaigns</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" aria-label="Campaign filters">
        <label className="space-y-1.5 text-sm font-semibold text-ink">
          State
          <select
            value={stateFilter}
            onChange={(event) =>
              setStateFilter(event.target.value as CampaignState | "all")
            }
            className="min-h-11 w-full rounded-md border border-line bg-surface px-3 font-normal text-ink"
          >
            <option value="all">All states</option>
            <option value="scheduled">Scheduled</option>
            <option value="materializing">Materializing</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="completed">Completed</option>
            <option value="completed_with_failures">Completed with failures</option>
            <option value="cancel_requested">Cancel requested</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-ink">
          Purpose
          <select
            value={purposeFilter}
            onChange={(event) =>
              setPurposeFilter(event.target.value as CampaignPurpose | "all")
            }
            className="min-h-11 w-full rounded-md border border-line bg-surface px-3 font-normal text-ink"
          >
            <option value="all">All purposes</option>
            <option value="lessgo_update">Announcements</option>
            <option value="marketing">Marketing</option>
          </select>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}
      {loading && !items.length ? (
        <p className="py-16 text-center text-sm text-ink-muted">
          Loading campaigns...
        </p>
      ) : !items.length ? (
        <p className="border-y border-line py-16 text-center text-sm text-ink-muted">
          No campaigns yet.
        </p>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {items.map((campaign) => {
            const progress = campaign.progress;
            const percent = progress.snapshottedUsers
              ? Math.round(
                  (progress.processedUsers / progress.snapshottedUsers) * 100,
                )
              : campaign.state === "completed"
                ? 100
                : 0;
            return (
              <article key={campaign.id} className="py-4">
                <div className="flex flex-wrap items-start gap-3">
                  <button
                    type="button"
                    onClick={() => void open(campaign.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="font-display text-base font-bold text-ink">
                      {campaign.name}
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      {campaign.purpose === "marketing"
                        ? "Marketing"
                        : "Announcement"}{" "}
                      | {formatIst(campaign.scheduledAt)}
                    </span>
                  </button>
                  <Status state={campaign.state} />
                  {canSend && ACTIVE_STATES.has(campaign.state) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmation({ action: "cancel", campaign })
                      }
                      disabled={busy === campaign.id}
                      title="Cancel campaign"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-down text-down hover:bg-down-tint disabled:opacity-50"
                    >
                      <StopCircle className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Cancel campaign</span>
                    </button>
                  ) : null}
                  {canSend && campaign.state === "completed_with_failures" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmation({ action: "retry", campaign })
                      }
                      disabled={busy === campaign.id}
                      title="Retry failed recipients"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Retry failed recipients</span>
                    </button>
                  ) : null}
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"
                  aria-label={`${percent}% processed`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div
                    className="h-full bg-profile transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-5">
                  <Metric label="Matched" value={progress.snapshottedUsers} />
                  <Metric
                    label="Reached"
                    value={progress.acceptedUsers + progress.partialUsers}
                  />
                  <Metric
                    label="Failed / unknown"
                    value={progress.failedUsers + progress.unknownUsers}
                  />
                  <Metric label="Partial" value={progress.partialUsers} />
                  <Metric label="Skipped" value={progress.skippedUsers} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center border-t border-line pt-4">
          <button
            type="button"
            onClick={() => void load(nextCursor)}
            disabled={loadingMore || loading || replacing}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
          >
            {loadingMore ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      {selected ? (
        <div
          ref={selectedRef}
          tabIndex={-1}
          aria-labelledby="selected-campaign-heading"
          className="border-l-2 border-profile bg-profile-tint px-5 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="selected-campaign-heading" className="font-display font-bold text-ink">
                {selected.name}
              </h3>
              <p className="mt-1 text-sm text-ink-muted">{selected.title}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                detailRequestSequence.current += 1;
                selectedIdRef.current = null;
                setSelected(null);
              }}
              className="min-h-11 px-2 text-sm font-semibold text-ink-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
            {selected.body}
          </p>
          {selected.failureReason ? (
            <p className="mt-3 text-sm text-down">{selected.failureReason}</p>
          ) : null}
          {selected.audit?.length ? (
            <ol className="mt-4 space-y-2 border-t border-line pt-3 text-xs text-ink-muted">
              {selected.audit.slice(-8).map((entry, index) => (
                <li
                  key={`${entry.createdAt}-${index}`}
                  className="flex justify-between gap-4"
                >
                  <span>{entry.action.replaceAll("_", " ")}</span>
                  <time>{formatIst(entry.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={confirmation !== null}
        title={
          confirmation?.action === "cancel"
            ? "Cancel campaign?"
            : "Retry failed deliveries?"
        }
        body={
          confirmation?.action === "cancel"
            ? `Pushes already sent for “${confirmation.campaign.name}” cannot be recalled.`
            : `Only failed and unknown recipients for “${confirmation?.campaign.name ?? "this campaign"}” will be retried.`
        }
        confirmLabel={confirmation?.action === "cancel" ? "Cancel campaign" : "Retry deliveries"}
        destructive={confirmation?.action === "cancel"}
        busy={Boolean(confirmation && busy === confirmation.campaign.id)}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (!confirmation) return;
          if (confirmation.action === "cancel") void cancel(confirmation.campaign);
          else void retry(confirmation.campaign);
        }}
      />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="block text-ink-faint">{label}</span>
      <span className="font-semibold text-ink">
        {value.toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function Status({ state }: { state: CampaignState }) {
  const healthy = state === "completed";
  const failed = state === "failed" || state === "completed_with_failures";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${healthy ? "border-ok bg-ok-tint text-ok" : failed ? "border-warn bg-warn-tint text-warn" : state === "cancelled" ? "border-line text-ink-muted" : "border-profile bg-profile-tint text-profile"}`}
    >
      {state.replaceAll("_", " ")}
    </span>
  );
}

function formatIst(value: string | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
