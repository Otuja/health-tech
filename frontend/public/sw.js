const CACHE_NAME = 'healthtech-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  '/icons/apple-touch-icon.png',
  '/patient/emergency',
  '/patient/dashboard',
  '/login',
  '/register'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache notice:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing outdated PWA cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy:
// 1. Bypass Next.js internal chunks, Turbopack, and RSC prefetch requests completely
// 2. Network-first for APIs
// 3. Stale-while-revalidate for static shell assets with offline HTML fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or unsupported protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // CRITICAL: Never intercept Next.js chunks, Turbopack HMR, or RSC routing queries
  // Intercepting these can break client-side router navigation and cause a blank screen.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__next') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1'
  ) {
    return;
  }

  // API calls: Network-first, fallback to cache if available
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For HTML navigations or public shell assets:
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          if (cachedResponse) return cachedResponse;
          // If offline and navigating to a page, serve offline emergency pass or landing page
          if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
            const offlinePass = await caches.match('/patient/emergency');
            if (offlinePass) return offlinePass;
            const offlineHome = await caches.match('/');
            if (offlineHome) return offlineHome;
          }
          return new Response('Network offline. Please check your internet connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
