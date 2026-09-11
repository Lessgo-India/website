"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { BellRing, FlaskConical, LogOut, RefreshCw, Send } from "lucide-react";
import AdminSectionNav from "@ui/admin/AdminSectionNav";
import { ThemeToggle } from "@ui/ThemeToggle";
import { adminLogout } from "@web/lib/adminApi";
import {
  createCampaign,
  createCampaignPreview,
  getCampaignCapabilities,
  getCampaignPreview,
  searchCampaignEvents,
  sendCampaignTest,
  type CampaignAudience,
  type CampaignCapabilities,
  type CampaignDestination,
  type CampaignEvent,
  type CampaignPreview,
  type CampaignPurpose,
} from "@web/lib/adminNotificationsApi";
import AudienceFilters from "./AudienceFilters";
import CampaignHistory from "./CampaignHistory";

type View = "compose" | "history";

const DEFAULT_AUDIENCE: CampaignAudience = {
  eventMode: "none",
  lookbackDays: 30,
  radiusKm: 25,
  roles: [],
  rsvpStatuses: [1],
};

export default function NotificationCenter() {
  const [view, setView] = useState<View>("compose");
  const [capabilities, setCapabilities] = useState<CampaignCapabilities | null>(
    null,
  );
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [purpose, setPurpose] = useState<CampaignPurpose>("lessgo_update");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destination, setDestination] = useState<CampaignDestination>("home");
  const [destinationId, setDestinationId] = useState("");
  const [audience, setAudience] = useState<CampaignAudience>(DEFAULT_AUDIENCE);
  const [previewRecord, setPreviewRecord] = useState<{
    data: CampaignPreview;
    fingerprint: string;
  } | null>(null);
  const [testedFingerprint, setTestedFingerprint] = useState<string | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toIstInputValue(new Date(Date.now() + 30 * 60_000)),
  );
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [eventQuery, setEventQuery] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const loadCapabilities = useCallback(async () => {
    setCapabilityLoading(true);
    setCapabilityError(null);
    try {
      setCapabilities(await getCampaignCapabilities());
    } catch (requestError) {
      setCapabilityError((requestError as Error).message);
    } finally {
      setCapabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCapabilities(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCapabilities]);

  const normalizedAudience = useMemo(
    () => sanitizeAudience(audience),
    [audience],
  );
  const audienceFingerprint = useMemo(
    () => JSON.stringify({ purpose, audience: normalizedAudience }),
    [purpose, normalizedAudience],
  );
  const messageFingerprint = useMemo(
    () =>
      JSON.stringify({
        purpose,
        title: title.trim(),
        body: body.trim(),
        destination,
        destinationId: destinationId || null,
      }),
    [purpose, title, body, destination, destinationId],
  );
  const preview = previewRecord?.data ?? null;
  const previewFresh = previewRecord?.fingerprint === audienceFingerprint;
  const previewId = preview?.id;
  const previewState = preview?.state;

  useEffect(() => {
    if (
      !previewId ||
      !previewState ||
      !["queued", "running"].includes(previewState)
    ) {
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const next = await getCampaignPreview(previewId);
        setPreviewRecord((current) =>
          current?.data.id === previewId ? { ...current, data: next } : current,
        );
      } catch (requestError) {
        setError((requestError as Error).message);
      }
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [previewId, previewState]);

  const infrastructureReady = Boolean(
    capabilities?.enabled &&
    capabilities.audienceConfigured &&
    capabilities.firebaseReady &&
    capabilities.queue.reachable &&
    capabilities.queue.workers > 0,
  );

  const changeAudience = (next: CampaignAudience) => {
    setAudience(next);
    setPreviewRecord(null);
    setTestedFingerprint(null);
    setConfirmation("");
    idempotencyKey.current = null;
  };

  const changePurpose = (next: CampaignPurpose) => {
    setPurpose(next);
    setPreviewRecord(null);
    setTestedFingerprint(null);
    setConfirmation("");
    idempotencyKey.current = null;
  };

  const staleTest = () => {
    setTestedFingerprint(null);
    setConfirmation("");
    idempotencyKey.current = null;
  };

  const searchEvents = async () => {
    setEventsLoading(true);
    setError(null);
    try {
      setEvents(await searchCampaignEvents(eventQuery));
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setEventsLoading(false);
    }
  };

  const requestPreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setNotice(null);
    setTestedFingerprint(null);
    try {
      const next = await createCampaignPreview({
        purpose,
        audience: normalizedAudience,
      });
      setPreviewRecord({ data: next, fingerprint: audienceFingerprint });
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendTest = async () => {
    if (!preview || preview.state !== "ready" || !previewFresh) return;
    setTestLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await sendCampaignTest({
        previewId: preview.id,
        purpose,
        title: title.trim(),
        body: body.trim(),
        destination,
        ...(destinationId ? { destinationId } : {}),
      });
      setTestedFingerprint(messageFingerprint);
      setNotice(
        `Test accepted by ${result.acceptedTokens.toLocaleString("en-IN")} device${result.acceptedTokens === 1 ? "" : "s"}.`,
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

  const launch = async () => {
    if (!preview) return;
    if (scheduleMode === "later") {
      const requestedTime = parseIstInput(scheduledAt).getTime();
      if (!Number.isFinite(requestedTime) || requestedTime <= Date.now()) {
        setError("Choose a future campaign time.");
        return;
      }
    }
    setLaunching(true);
    setError(null);
    setNotice(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        previewId: preview.id,
        purpose,
        title: title.trim(),
        body: body.trim(),
        destination,
        ...(destinationId ? { destinationId } : {}),
        ...(scheduleMode === "later"
          ? { scheduledAt: parseIstInput(scheduledAt).toISOString() }
          : {}),
        confirmation,
        idempotencyKey: idempotencyKey.current,
      });
      setNotice(`Campaign "${campaign.name}" queued.`);
      setView("history");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLaunching(false);
    }
  };

  const messageValid = title.trim().length > 0 && body.trim().length > 0;
  const destinationValid =
    destination === "event" || destination === "group"
      ? /^[a-f0-9]{24}$/i.test(destinationId)
      : !destinationId;
  const canTest = Boolean(
    previewFresh &&
    preview?.state === "ready" &&
    preview.counts?.pushReachableUsers &&
    messageValid &&
    destinationValid,
  );
  const canLaunch = Boolean(
    capabilities?.canSend &&
    canTest &&
    testedFingerprint === messageFingerprint &&
    name.trim().length >= 3 &&
    confirmation === name.trim() &&
    (scheduleMode === "now" ||
      Number.isFinite(parseIstInput(scheduledAt).getTime())),
  );

  const signOut = async () => {
    await adminLogout();
    window.location.reload();
  };

  return (
    <div className="container-page py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line pb-5">
        <Image
          src="/admin-icon.png"
          alt=""
          width={53}
          height={48}
          priority
          className="h-12 w-auto flex-none object-contain"
        />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold text-ink">
            Admin<span className="text-gradient"> · </span>Notification Centre
          </h1>
          <p className="text-xs text-ink-muted">
            Push campaigns and aggregate delivery outcomes
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCapabilities()}
            title="Refresh readiness"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${capabilityLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="sr-only">Refresh readiness</span>
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mt-4">
        <AdminSectionNav />
      </div>

      {capabilityError ? (
        <p
          role="alert"
          className="mt-5 border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink"
        >
          {capabilityError}
        </p>
      ) : null}
      {capabilities && !infrastructureReady ? (
        <p
          role="alert"
          className="mt-5 border-l-2 border-warn bg-warn-tint px-4 py-3 text-sm text-ink"
        >
          Campaign delivery is unavailable. Check the feature flag, audience
          database, Firebase, Redis, and worker readiness.
        </p>
      ) : null}
      {capabilities && !capabilities.canSend ? (
        <p className="mt-5 border-l-2 border-profile bg-profile-tint px-4 py-3 text-sm text-ink">
          History is available in read-only mode for this administrator.
        </p>
      ) : null}

      <div
        className="mt-6 flex gap-1 border-b border-line"
        role="tablist"
        aria-label="Notification Centre views"
      >
        {(["compose", "history"] as const).map((item) => (
          <button
            key={item}
            id={`campaign-${item}-tab`}
            type="button"
            role="tab"
            aria-selected={view === item}
            aria-controls={`campaign-${item}-panel`}
            onClick={() => setView(item)}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold capitalize ${view === item ? "border-profile text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {view === "history" ? (
        <div className="mt-6">
          <CampaignHistory canSend={capabilities?.canSend ?? false} />
        </div>
      ) : (
        <main
          role="tabpanel"
          id="campaign-compose-panel"
          aria-labelledby="campaign-compose-tab"
          className="mt-6"
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <form
              className="min-w-0 space-y-6"
              onSubmit={(event) => event.preventDefault()}
            >
              <section className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Campaign name"
                  value={name}
                  maxLength={80}
                  onChange={(value) => {
                    setName(value);
                    setConfirmation("");
                    idempotencyKey.current = null;
                  }}
                />
                <label className="space-y-2 text-sm font-semibold text-ink">
                  Purpose
                  <select
                    value={purpose}
                    onChange={(event) =>
                      changePurpose(event.target.value as CampaignPurpose)
                    }
                    className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
                  >
                    <option value="lessgo_update">Platform announcement</option>
                    <option value="marketing">Marketing (opt-in only)</option>
                  </select>
                </label>
              </section>

              <section className="space-y-5 border-t border-line pt-6">
                <TextField
                  label="Push title"
                  value={title}
                  maxLength={80}
                  onChange={(value) => {
                    setTitle(value);
                    staleTest();
                  }}
                />
                <label className="block space-y-2 text-sm font-semibold text-ink">
                  Message
                  <textarea
                    value={body}
                    maxLength={500}
                    rows={5}
                    onChange={(event) => {
                      setBody(event.target.value);
                      staleTest();
                    }}
                    className="w-full resize-y rounded-md border border-line bg-surface px-3 py-3 text-sm font-normal text-ink outline-none focus:border-profile"
                  />
                  <span className="block text-right text-xs font-normal text-ink-faint">
                    {body.length}/500
                  </span>
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    Tap destination
                    <select
                      value={destination}
                      onChange={(event) => {
                        const next = event.target.value as CampaignDestination;
                        setDestination(next);
                        setDestinationId("");
                        staleTest();
                      }}
                      className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
                    >
                      <option value="home">Home</option>
                      <option value="events">Events</option>
                      <option value="vibes">Vibes</option>
                      <option value="balances">Balances</option>
                      <option value="profile">Profile</option>
                      <option value="event">Specific event</option>
                      <option value="group">Specific group</option>
                    </select>
                  </label>
                  {destination === "event" || destination === "group" ? (
                    <TextField
                      label={`${destination === "event" ? "Event" : "Group"} ID`}
                      value={destinationId}
                      maxLength={24}
                      onChange={(value) => {
                        setDestinationId(value);
                        staleTest();
                      }}
                    />
                  ) : null}
                </div>
              </section>

              <AudienceFilters
                audience={audience}
                onChange={changeAudience}
                events={events}
                eventQuery={eventQuery}
                onEventQueryChange={setEventQuery}
                onSearchEvents={() => void searchEvents()}
                eventsLoading={eventsLoading}
              />

              <section className="border-y border-line py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-ink">
                      Audience preview
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Calculated without exposing individual users.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void requestPreview()}
                    disabled={
                      !infrastructureReady ||
                      !capabilities?.canSend ||
                      previewLoading
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-profile px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                    {previewLoading ? "Queuing..." : "Preview audience"}
                  </button>
                </div>
                {preview ? (
                  <PreviewSummary preview={preview} fresh={previewFresh} />
                ) : null}
              </section>

              <section className="grid gap-5 sm:grid-cols-2">
                <fieldset>
                  <legend className="text-sm font-semibold text-ink">
                    Send time
                  </legend>
                  <div className="mt-2 flex min-h-11 items-center gap-5">
                    <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                      <input
                        type="radio"
                        name="schedule"
                        checked={scheduleMode === "now"}
                        onChange={() => setScheduleMode("now")}
                        className="accent-profile"
                      />
                      Now
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
                      <input
                        type="radio"
                        name="schedule"
                        checked={scheduleMode === "later"}
                        onChange={() => setScheduleMode("later")}
                        className="accent-profile"
                      />
                      Schedule
                    </label>
                  </div>
                </fieldset>
                {scheduleMode === "later" ? (
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    Date and time (IST)
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
                    />
                  </label>
                ) : null}
              </section>

              <section className="space-y-4 border-t border-line pt-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void sendTest()}
                    disabled={!canTest || testLoading || !capabilities?.canSend}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    {testLoading ? "Sending test..." : "Send test to me"}
                  </button>
                  {testedFingerprint === messageFingerprint ? (
                    <span
                      role="status"
                      className="inline-flex items-center text-sm font-semibold text-ok"
                    >
                      Test passed
                    </span>
                  ) : null}
                </div>
                <TextField
                  label="Type the campaign name to confirm"
                  value={confirmation}
                  maxLength={80}
                  onChange={setConfirmation}
                />
                <button
                  type="button"
                  onClick={() => void launch()}
                  disabled={!canLaunch || launching}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {launching
                    ? "Queueing campaign..."
                    : scheduleMode === "later"
                      ? "Schedule campaign"
                      : "Send campaign"}
                </button>
              </section>

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
            </form>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <div className="rounded-lg border border-line bg-surface p-5">
                <p className="text-xs font-bold uppercase text-ink-faint">
                  Push preview
                </p>
                <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-profile text-white">
                      <BellRing className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-muted">
                        LESSGO
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-ink">
                        {title || "Notification title"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-muted">
                        {body || "Your message will appear here."}
                      </p>
                    </div>
                  </div>
                </div>
                <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Channel</dt>
                    <dd className="font-semibold text-ink">Push</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Purpose</dt>
                    <dd className="font-semibold text-ink">
                      {purpose === "marketing" ? "Marketing" : "Announcement"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Opens</dt>
                    <dd className="font-semibold capitalize text-ink">
                      {destination}
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-ink">
      {label}
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
      />
    </label>
  );
}

function PreviewSummary({
  preview,
  fresh,
}: {
  preview: CampaignPreview;
  fresh: boolean;
}) {
  if (!fresh)
    return (
      <p className="mt-4 text-sm text-warn">
        Filters changed. Generate a new preview.
      </p>
    );
  if (preview.state === "queued" || preview.state === "running")
    return (
      <p role="status" className="mt-4 text-sm text-ink-muted">
        Calculating audience...
      </p>
    );
  if (preview.state === "failed" || preview.state === "expired")
    return (
      <p role="alert" className="mt-4 text-sm text-down">
        {preview.failureReason ?? `Preview ${preview.state}.`}
      </p>
    );
  const counts = preview.counts;
  if (!counts) return null;
  return (
    <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <PreviewMetric label="Matched" value={counts.matchedProfiles} />
      <PreviewMetric
        label="Preference eligible"
        value={counts.preferenceEligibleUsers}
      />
      <PreviewMetric label="Push reachable" value={counts.pushReachableUsers} />
      <PreviewMetric label="Active devices" value={counts.activeTokens} />
    </dl>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">
        {value.toLocaleString("en-IN")}
      </dd>
    </div>
  );
}

function sanitizeAudience(value: CampaignAudience): CampaignAudience {
  const next: CampaignAudience = { eventMode: value.eventMode };
  if (value.minAge !== undefined) next.minAge = value.minAge;
  if (value.maxAge !== undefined) next.maxAge = value.maxAge;
  if (value.genders?.length) next.genders = value.genders;
  if (value.eventMode === "recent" || value.eventMode === "near_event")
    next.lookbackDays = value.lookbackDays ?? 30;
  if (value.eventMode === "specific" && value.eventId)
    next.eventId = value.eventId;
  if (value.eventMode === "near_event") {
    if (value.anchorEventId) next.anchorEventId = value.anchorEventId;
    next.radiusKm = value.radiusKm ?? 25;
  }
  if (value.eventMode !== "none") {
    if (value.eventTypes?.length) next.eventTypes = value.eventTypes;
    if (value.roles?.length) next.roles = value.roles;
    if (value.rsvpStatuses?.length) next.rsvpStatuses = value.rsvpStatuses;
  }
  return next;
}

function toIstInputValue(date: Date): string {
  return new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

function parseIstInput(value: string): Date {
  return new Date(`${value}:00+05:30`);
}
