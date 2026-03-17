const CACHE_NAME = 'kc-getraenke-cache-v1';
const urlsToCache = [
  './getraenke-abrechnung.html',
  './icon-192.png',
  './icon-512.png',
  './sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
