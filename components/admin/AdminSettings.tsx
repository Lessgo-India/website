"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Download,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { ThemeToggle } from "@ui/ThemeToggle";
import {
  getAdminAlertCapabilities,
  sendAdminTestAlert,
  serializePushSubscription,
  subscribeAdminAlerts,
  unsubscribeCurrentAdminDevice,
  updateAdminAlertPreferences,
  type AdminAlertCapabilities,
  type AdminAlertPreferences,
} from "@web/lib/adminAlertsApi";
import { useAdminSession } from "./AdminGate";
import { useAdminPwa } from "./AdminPwaProvider";
import AdminActiveSessions from "./AdminActiveSessions";
import AdminPasswordChange from "./AdminPasswordChange";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_ADMIN_VAPID_PUBLIC_KEY?.trim() ?? "";

export default function AdminSettings() {
  const { session } = useAdminSession();
  const pwa = useAdminPwa();
  const [capabilities, setCapabilities] =
    useState<AdminAlertCapabilities | null>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [localSubscribed, setLocalSubscribed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionReloadKey, setSessionReloadKey] = useState(0);

  async function load() {
    setError(null);
    try {
      setCapabilities(await getAdminAlertCapabilities());
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  }

  useEffect(() => {
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported",
    );
    void load();
  }, []);

  useEffect(() => {
    if (!pwa.registration) return;
    void pwa.registration.pushManager
      .getSubscription()
      .then((subscription) => setLocalSubscribed(Boolean(subscription)))
      .catch(() => setLocalSubscribed(false));
  }, [pwa.registration]);

  async function enableAlerts() {
    if (!pwa.registration || !VAPID_PUBLIC_KEY || !("Notification" in window)) {
      setError("Browser alerts are unavailable on this device.");
      return;
    }
    setBusy("subscribe");
    setError(null);
    setMessage(null);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setError("Notification permission was not granted.");
        return;
      }
      const current = await pwa.registration.pushManager.getSubscription();
      const subscription =
        current ??
        (await pwa.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(VAPID_PUBLIC_KEY),
        }));
      setCapabilities(
        await subscribeAdminAlerts(serializePushSubscription(subscription)),
      );
      setLocalSubscribed(true);
      setMessage("Browser alerts are enabled on this device.");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function disableAlerts() {
    setBusy("unsubscribe");
    setError(null);
    setMessage(null);
    try {
      const cleanup = await unsubscribeCurrentAdminDevice(pwa.registration);
      if (!cleanup.safe) {
        throw new Error(
          "Could not disable this device. Check your connection and try again.",
        );
      }
      setLocalSubscribed(false);
      await load();
      setMessage(
        cleanup.serverRemoved && cleanup.browserRemoved
          ? "This device will no longer receive admin alerts."
          : "Alerts are disabled. Remaining provider cleanup will complete automatically.",
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function changePreference(
    key: keyof AdminAlertPreferences,
    value: boolean,
  ) {
    if (!capabilities) return;
    const previous = capabilities.preferences;
    const next = { ...previous, [key]: value };
    setCapabilities({ ...capabilities, preferences: next });
    setError(null);
    try {
      const saved = await updateAdminAlertPreferences(next);
      setCapabilities({ ...capabilities, preferences: saved });
    } catch (requestError) {
      setCapabilities({ ...capabilities, preferences: previous });
      setError((requestError as Error).message);
    }
  }

  async function sendTest() {
    setBusy("test");
    setError(null);
    setMessage(null);
    try {
      const result = await sendAdminTestAlert();
      setMessage(
        result.accepted
          ? "Test alert queued for this administrator."
          : `Test alert unavailable${result.reason ? `: ${result.reason}` : "."}`,
      );
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const activeDevices = capabilities?.activeDevices ?? 0;
  const pushReady = Boolean(
    capabilities?.enabled &&
    capabilities.configured &&
    capabilities.allowed &&
    VAPID_PUBLIC_KEY &&
    pwa.registration,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <p className="text-xs font-bold uppercase text-gold">Admin app</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          Settings
        </h1>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 border-l-2 border-down bg-down-tint px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-5 border-l-2 border-ok bg-ok-tint px-4 py-3 text-sm text-ink"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <SettingsSection
          icon={<Download className="h-5 w-5" aria-hidden="true" />}
          title="Install"
          description="Open the admin console from your home screen or desktop app list."
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void pwa.install()}
              disabled={!pwa.installAvailable || pwa.standalone}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {pwa.standalone ? "Installed" : "Install admin app"}
            </button>
            {!pwa.standalone && !pwa.installAvailable && isIos() ? (
              <p className="text-sm text-ink-muted">
                In Safari, use Share, then Add to Home Screen.
              </p>
            ) : null}
          </div>
        </SettingsSection>

        <AdminPasswordChange
          onChanged={async () => {
            setSessionReloadKey((value) => value + 1);
          }}
        />

        <AdminActiveSessions reloadKey={sessionReloadKey} />

        <SettingsSection
          icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
          title="Browser alerts"
          description={`${activeDevices} active ${activeDevices === 1 ? "device" : "devices"} for this administrator.`}
        >
          {!pushReady ? (
            <p className="text-sm text-ink-muted">
              Browser alert delivery is not available in this deployment or for
              this administrator.
            </p>
          ) : (
            <div className="space-y-4">
              {!localSubscribed ? (
                <div>
                  <button
                    type="button"
                    onClick={() => void enableAlerts()}
                    disabled={busy !== null || permission === "denied"}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-profile px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === "subscribe" ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <BellRing className="h-4 w-4" aria-hidden="true" />
                    )}
                    Enable on this device
                  </button>
                  {permission === "denied" ? (
                    <p className="mt-2 text-sm text-warn">
                      Notifications are blocked in this browser’s site settings.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {activeDevices > 0 ? (
                <div className="divide-y divide-line border-y border-line">
                  <ToggleRow
                    label="Browser alerts"
                    checked={capabilities!.preferences.enabled}
                    onChange={(value) =>
                      void changePreference("enabled", value)
                    }
                  />
                  <ToggleRow
                    label="New bug reports"
                    checked={capabilities!.preferences.bugs}
                    disabled={!capabilities!.preferences.enabled}
                    onChange={(value) => void changePreference("bugs", value)}
                  />
                  <ToggleRow
                    label="My campaign outcomes"
                    checked={capabilities!.preferences.campaigns}
                    disabled={!capabilities!.preferences.enabled}
                    onChange={(value) =>
                      void changePreference("campaigns", value)
                    }
                  />
                  <ToggleRow
                    label="Service outages and recoveries"
                    checked={capabilities!.preferences.serviceHealth}
                    disabled={!capabilities!.preferences.enabled}
                    onChange={(value) =>
                      void changePreference("serviceHealth", value)
                    }
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void sendTest()}
                  disabled={busy !== null || !localSubscribed}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send test alert
                </button>
                {localSubscribed ? (
                  <button
                    type="button"
                    onClick={() => void disableAlerts()}
                    disabled={busy !== null}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-down px-4 text-sm font-semibold text-down hover:bg-down-tint disabled:opacity-50"
                  >
                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                    Disable this device
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          title="Session and appearance"
          description={`Signed in until ${formatSessionExpiry(session.expiresAt)}.`}
        >
          <div className="flex items-center justify-between gap-4 border-y border-line py-3">
            <span className="text-sm font-semibold text-ink">Appearance</span>
            <ThemeToggle className="rounded-md" />
          </div>
          {pwa.updateAvailable ? (
            <button
              type="button"
              onClick={pwa.activateUpdate}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-profile px-4 text-sm font-semibold text-profile"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Apply available update
            </button>
          ) : null}
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-gold-tint text-gold">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 flex-none rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "border-profile bg-profile" : "border-line-strong bg-surface-2"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
        <span className="sr-only">
          {checked ? "Disable" : "Enable"} {label}
        </span>
      </button>
    </div>
  );
}

function decodeVapidPublicKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function formatSessionExpiry(value?: number): string {
  if (!value) return "the current session expires";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
