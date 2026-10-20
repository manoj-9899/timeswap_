// ==============================================================================
// TimeSwap Production Service Worker (PWA)
// Security Guarantees:
//   - Zero caching of private Supabase endpoints, tokens, wallet balances, or RPCs.
//   - Zero offline queuing of mutations (POST/PUT/PATCH/DELETE).
//   - Cache-first for immutable Next.js static revisioned chunks (/_next/static/*).
//   - Network-first with /offline fallback for navigation requests.
// ==============================================================================

const CACHE_NAME = 'timeswap-static-v1';

const STATIC_PRECACHE = [
  '/offline',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// 1. Install event: pre-cache static offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: purge obsolete caches & claim immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: strict security and routing rules
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Security Rule 1: Never intercept or cache non-GET requests (mutations)
  if (request.method !== 'GET') {
    return;
  }

  // Security Rule 2: Never cache Supabase API calls (Auth, REST, Realtime, RPCs)
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1')) {
    return;
  }

  // Security Rule 3: Never cache auth callback or OAuth exchanges
  if (url.pathname.startsWith('/auth/callback')) {
    return;
  }

  // Strategy A: Next.js immutable static assets (/_next/static/*) -> Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy B: Public static assets (icons, images, fonts) -> Stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/og.png' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Strategy C: HTML Page Navigation -> Network-first with /offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Return pre-cached dedicated offline fallback page
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match('/offline');
        if (cachedOffline) {
          return cachedOffline;
        }
        return new Response('Network error. You are currently offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // Default: Pass through to network
});

// 4. Message listener for client update prompts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
