const CACHE_NAME = 'selfcare-sinners-static-v3';
const CATALOG_CACHE = 'selfcare-sinners-catalog-v1';
const STATIC_ASSETS = [
  '/',
  '/faq',
  '/track',
  '/logo.png',
  '/favicon.ico',
  '/site.webmanifest'
];
const CATALOG_ENDPOINTS = [
  '/api/public/home',
  '/api/products',
  '/api/seo/products',
  '/api/mobile/offline-catalog'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, CATALOG_CACHE].includes(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (CATALOG_ENDPOINTS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CATALOG_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || Response.json({ status: 'offline', products: [], categories: [] }, { status: 200 })))
    );
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
