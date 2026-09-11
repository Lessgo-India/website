"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, StopCircle } from "lucide-react";
import {
  cancelCampaign,
  getCampaign,
  getCampaigns,
  retryCampaignFailures,
  type AdminCampaign,
  type CampaignState,
} from "@web/lib/adminNotificationsApi";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedId = selected?.id;

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getCampaigns();
      setItems(result.items);
      if (selectedId) {
        const detail = await getCampaign(selectedId);
        setSelected(detail);
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!items.some((item) => ACTIVE_STATES.has(item.state))) return;
    const timer = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(timer);
  }, [items, load]);

  const open = async (id: string) => {
    setBusy(id);
    try {
      setSelected(await getCampaign(id));
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (campaign: AdminCampaign) => {
    if (
      !window.confirm(
        `Cancel "${campaign.name}"? Pushes already sent cannot be recalled.`,
      )
    )
      return;
    setBusy(campaign.id);
    try {
      setSelected(await cancelCampaign(campaign.id));
      await load();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const retry = async (campaign: AdminCampaign) => {
    if (
      !window.confirm(
        `Retry failed and unknown recipients for "${campaign.name}"?`,
      )
    )
      return;
    setBusy(campaign.id);
    try {
      setSelected(await retryCampaignFailures(campaign.id));
      await load();
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
                      onClick={() => void cancel(campaign)}
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
                      onClick={() => void retry(campaign)}
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

      {selected ? (
        <div className="border-l-2 border-profile bg-profile-tint px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-ink">
                {selected.name}
              </h3>
              <p className="mt-1 text-sm text-ink-muted">{selected.title}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
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
