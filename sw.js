// ---- Combatant DB Service Worker ----
// Version bump to clear old caches when structure changes.
const CACHE_NAME = 'combatant-id-db-v1.1.0';

// App shell to precache (local files only)
const APP_SHELL = [
  '/',                // base
  'index.html',
  'style.css',
  'script.js',
  'data.csv'
  // intentionally NOT caching external CDNs here
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[SW] addAll failed:', err))
  );
  // take control ASAP
  self.skipWaiting();
});

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : Promise.resolve()))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - data.csv => Network First (fresh data), fallback to cache
// - everything else (GET only) => Cache First (fast)
self.addEventListener('fetch', (event) => {
  // only handle GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle data.csv with Network First
  if (url.pathname.endsWith('/data.csv') || url.pathname === '/data.csv') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell & other GET requests: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          // cache successful, same-origin basic responses
          const clone = res.clone();
          if (res.ok && res.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch((err) => {
          // As a simple fallback, if requesting the root document, try index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
          throw err;
        });
    })
  );
});
