const CACHE_NAME = 'kc-getraenke-cache-v1';
const urlsToCache = [
  '/getraenke-abrechnung.html',
  '/icon-192.png',
  '/icon-512.png',
  '/'
];

// Beim Installieren: alle wichtigen Dateien cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Beim Aktivieren: alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Bei jedem Fetch: erst Cache, dann Netzwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => {
        // Optional: fallback für HTML-Seiten
        if (event.request.destination === 'document') {
          return caches.match('/getraenke-abrechnung.html');
        }
      })
  );
});
