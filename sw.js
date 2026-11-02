const CACHE_NAME = 'kcis-cache-v31';

const ASSETS = [
  './',
  './manifest.json?v=20260714-v16',
  './icon-192.png?v=20260318-v15',
  './icon-512.png?v=20260318-v15'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (
    event.data &&
    event.data.type === 'SKIP_WAITING'
  ) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  /*
   * Seitenaufrufe immer wirklich frisch laden.
   * Offline fällt die App auf die gespeicherte
   * Startseite zurück.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      }).catch(async () => {
        return (
          await caches.match('./')
        ) || Response.error();
      })
    );

    return;
  }

  /*
   * Nur Dateien der eigenen App behandeln.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * HTML, JS und CSS nie aus dem normalen
   * Browsercache beziehen.
   */
  const isCodeFile =
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html');

  event.respondWith(
    fetch(request, {
      cache: isCodeFile
        ? 'no-store'
        : 'default'
    })
      .then(response => {
        /*
         * Nur erfolgreiche Antworten speichern.
         */
        if (
          response &&
          response.ok &&
          response.type === 'basic'
        ) {
          const copy = response.clone();

          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then(cache => {
                return cache.put(
                  request,
                  copy
                );
              })
          );
        }

        return response;
      })
      .catch(async () => {
        const cached =
          await caches.match(request);

        return cached || Response.error();
      })
  );
});
