import { adminRequest } from './adminApi';

export interface AdminAlertPreferences {
  enabled: boolean;
  bugs: boolean;
  campaigns: boolean;
  serviceHealth: boolean;
}

export interface AdminAlertCapabilities {
  enabled: boolean;
  configured: boolean;
  allowed: boolean;
  activeDevices: number;
  preferences: AdminAlertPreferences;
}

export interface SerializedPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const ALERTS_PATH = '/gateway/notifications/alerts';

export function getAdminAlertCapabilities(): Promise<AdminAlertCapabilities> {
  return adminRequest<AdminAlertCapabilities>(`${ALERTS_PATH}/capabilities`);
}

export function subscribeAdminAlerts(
  subscription: SerializedPushSubscription,
): Promise<AdminAlertCapabilities> {
  return adminRequest<AdminAlertCapabilities>(
    `${ALERTS_PATH}/subscriptions`,
    { method: 'POST', body: subscription },
  );
}

export function unsubscribeAdminAlerts(endpoint: string): Promise<{
  unsubscribed: boolean;
  serverSafe: boolean;
}> {
  return adminRequest(`${ALERTS_PATH}/subscriptions`, {
    method: 'DELETE',
    body: { endpoint },
  });
}

export function updateAdminAlertPreferences(
  preferences: AdminAlertPreferences,
): Promise<AdminAlertPreferences> {
  return adminRequest(`${ALERTS_PATH}/preferences`, {
    method: 'PATCH',
    body: preferences,
  });
}

export function sendAdminTestAlert(): Promise<{
  accepted: boolean;
  created: boolean;
  id?: string;
  reason?: string;
}> {
  return adminRequest(`${ALERTS_PATH}/test`, { method: 'POST' });
}

export function serializePushSubscription(
  subscription: PushSubscription,
): SerializedPushSubscription {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('The browser returned an incomplete push subscription.');
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

export async function unsubscribeCurrentAdminDevice(
  registration?: ServiceWorkerRegistration | null,
): Promise<{
  hadSubscription: boolean;
  serverRemoved: boolean;
  browserRemoved: boolean;
  safe: boolean;
}> {
  if (!('serviceWorker' in navigator)) {
    return {
      hadSubscription: false,
      serverRemoved: true,
      browserRemoved: true,
      safe: true,
    };
  }
  const activeRegistration =
    registration ?? (await navigator.serviceWorker.ready.catch(() => null));
  const subscription = await activeRegistration?.pushManager
    .getSubscription()
    .catch(() => null);
  if (!subscription) {
    return {
      hadSubscription: false,
      serverRemoved: true,
      browserRemoved: true,
      safe: true,
    };
  }

  let serverRemoved = false;
  let browserRemoved = false;
  try {
    const result = await unsubscribeAdminAlerts(subscription.endpoint);
    serverRemoved = result.serverSafe === true;
  } catch {
    // The local unsubscribe below still guarantees this browser cannot receive
    // the stale server record; the provider will prune it on its next 410.
  }
  try {
    browserRemoved = await subscription.unsubscribe();
  } catch {
    browserRemoved = false;
  }
  return {
    hadSubscription: true,
    serverRemoved,
    browserRemoved,
    safe: serverRemoved || browserRemoved,
  };
}

