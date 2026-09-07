const CACHE_NAME = 'selfcare-sinners-static-v4';
const CATALOG_CACHE = 'selfcare-sinners-catalog-v2';
const OFFLINE_HTML = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Selfcare Sinners offline</title></head><body><main style="font-family:system-ui;padding:2rem;max-width:42rem;margin:auto"><h1>Sin conexión</h1><p>No pudimos cargar esta página. Revisa tu conexión e inténtalo de nuevo.</p></main></body></html>';
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

function offlineJsonResponse() {
  return Response.json({ status: 'offline', products: [], categories: [] }, { status: 200 });
}

function offlineHtmlResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function isCacheableBasicResponse(response) {
  return response && response.ok && response.type === 'basic';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![CACHE_NAME, CATALOG_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
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
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CATALOG_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || offlineJsonResponse()))
    );
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      return fetch(request)
        .then((response) => {
          if (isCacheableBasicResponse(response) && !url.search) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached || caches.match('/') || offlineHtmlResponse());
    }).catch(() => fetch(request).catch(() => offlineHtmlResponse()))
  );
});
