const CACHE_NAME = 'lessgo-partner-shell-v1';
const PRECACHE = [
  '/partner/offline.html',
  '/partner/offline.css',
  '/partner/manifest.webmanifest',
  '/partner/icon-192.png',
  '/partner/icon-512.png',
  '/partner/icon-maskable-512.png',
  '/partner/apple-touch-icon.png',
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
            .filter((key) => key.startsWith('lessgo-partner-') && key !== CACHE_NAME)
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

  if (
    request.mode === 'navigate' &&
    (url.pathname === '/partner' || url.pathname.startsWith('/partner/'))
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/partner/offline.html')),
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

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/partner/icon-') ||
    pathname === '/partner/apple-touch-icon.png' ||
    pathname === '/partner/offline.css'
  );
}
