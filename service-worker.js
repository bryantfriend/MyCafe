const CACHE_VERSION = 'mycafe-v1.2.1-platform';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const MENU_CACHE = `${CACHE_VERSION}-menus`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/cafe.html',
  '/circles.html',
  '/circle.html',
  '/dashboard.html',
  '/login.html',
  '/css/style.css',
  '/js/cafes.js',
  '/js/cafePage.js',
  '/js/i18n.js',
  '/assets/logo.png',
  '/assets/mano/menu.json',
  '/assets/mano/mano_logo.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('mycafe-') && !key.startsWith(CACHE_VERSION))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isMenuRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && url.pathname.endsWith('/menu.json');
}

function isStaticRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && ['style', 'script', 'image', 'font'].includes(request.destination);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cache.match(request) || caches.match('/index.html');
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isMenuRequest(request)) {
    event.respondWith(networkFirst(request, MENU_CACHE));
    return;
  }

  if (isStaticRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});
