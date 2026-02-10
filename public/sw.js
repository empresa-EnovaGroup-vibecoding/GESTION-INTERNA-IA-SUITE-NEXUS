const CACHE_NAME = 'nexus-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // No interceptar llamadas API
  if (request.method !== 'GET' || request.url.includes('/rest/') || request.url.includes('/auth/') || request.url.includes('/functions/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first para navegación (HTML) - siempre cargar lo más reciente
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open('nexus-v2').then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first solo para assets estáticos (imágenes, fonts, JS, CSS)
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open('nexus-v2').then(cache => cache.put(request, clone));
        return response;
      })
    )
  );
});
