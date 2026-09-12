const CACHE_NAME = 'lessgo-admin-shell-v1';
const PRECACHE = [
  '/admin/offline.html',
  '/admin/offline.css',
  '/admin/manifest.webmanifest',
  '/admin/icon-192.png',
  '/admin/icon-512.png',
  '/admin/icon-maskable-512.png',
  '/admin/apple-touch-icon.png',
  '/admin/notification-badge.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lessgo-admin-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith('/api/') ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-Prefetch') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  if (request.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/admin/offline.html')),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  if (!payload) return;
  const destination = destinationFor(payload.data);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/admin/icon-192.png',
      badge: '/admin/notification-badge.png',
      tag: payload.tag,
      renotify: false,
      data: { destination },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = safeAdminDestination(
    event.notification.data?.destination,
  );
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windows) => {
        const existing = windows.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });
        if (existing) {
          await existing.navigate(destination);
          existing.postMessage({ type: 'ADMIN_SESSION_RECHECK' });
          return existing.focus();
        }
        return self.clients.openWindow(destination);
      }),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/admin/icon-') ||
    pathname === '/admin/apple-touch-icon.png' ||
    pathname === '/admin/notification-badge.png' ||
    pathname === '/admin/offline.css'
  );
}

function readPushPayload(event) {
  try {
    const value = event.data?.json();
    if (
      !value ||
      typeof value.title !== 'string' ||
      typeof value.body !== 'string' ||
      typeof value.tag !== 'string' ||
      !value.data ||
      typeof value.data.type !== 'string'
    ) {
      return null;
    }
    return {
      title: value.title.slice(0, 80),
      body: value.body.slice(0, 160),
      tag: value.tag.slice(0, 220),
      data: value.data,
    };
  } catch {
    return null;
  }
}

function destinationFor(data) {
  const objectId = /^[a-f0-9]{24}$/i;
  if (data.type === 'admin.test') return '/admin/settings';
  if (data.type === 'bug.filed' && objectId.test(data.resourceId ?? '')) {
    return `/admin/bugs?bug=${encodeURIComponent(data.resourceId)}`;
  }
  if (
    typeof data.type === 'string' &&
    data.type.startsWith('campaign.') &&
    objectId.test(data.resourceId ?? '')
  ) {
    return `/admin/notifications?view=history&campaign=${encodeURIComponent(data.resourceId)}`;
  }
  if (
    data.type === 'health.status_changed' &&
    /^[a-z0-9-]{1,80}$/i.test(data.resourceId ?? '')
  ) {
    return `/admin?focus=health&service=${encodeURIComponent(data.resourceId)}`;
  }
  return '/admin';
}

function safeAdminDestination(value) {
  if (typeof value !== 'string') return '/admin';
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || !url.pathname.startsWith('/admin')) {
      return '/admin';
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return '/admin';
  }
}
