const CACHE_NAME = 'kcis-cache-v10';

const ASSETS = [
  './',
  './manifest.json?v=20260318-v10',
  './icon-192.png?v=20260318-v10',
  './icon-512.png?v=20260318-v10'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML bevorzugt frisch laden, offline auf Cache zurückfallen
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./'))
    );
    return;
  }

  // Für eigene Dateien: erst Netz, dann Cache
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
  }
});