const CACHE_NAME = 'kcis-cache-v3';

const ASSETS = [
  './',
  './manifest.json?v=20260317',
  './icon-192.png?v=20260317',
  './icon-512.png?v=20260317'
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

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});
