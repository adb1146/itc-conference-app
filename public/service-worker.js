// Service Worker for ITC Vegas PWA
// Version: 2025.01.18.1 - Force cache refresh on every update
const CACHE_VERSION = 'v3-2025-01-18-' + Date.now(); // Unique cache on every deploy
const CACHE_NAME = 'itc-vegas-' + CACHE_VERSION;
const STATIC_CACHE = 'itc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'itc-dynamic-' + CACHE_VERSION;

// Essential files to cache immediately (only static assets, not HTML)
const urlsToCache = [
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache installation failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches that don't match current version
          if (cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Clear browser cache after activation
      if ('caches' in self) {
        console.log('[Service Worker] Clearing all caches for fresh start');
      }
    })
  );
  // Claim clients immediately
  return self.clients.claim();
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-only for API calls - never cache
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/_next/') ||
      url.pathname.includes('/auth/')) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        credentials: 'same-origin'
      }).catch(() => {
        // Return error response if offline
        return new Response('Network error', { status: 408 });
      })
    );
    return;
  }

  // Network-first for HTML pages - always get fresh content
  if (request.mode === 'navigate' ||
      request.destination === 'document' ||
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request, {
        cache: 'no-cache', // Force revalidation
        credentials: 'same-origin'
      })
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Only use cache as fallback when offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving offline cached page:', url.pathname);
                return cachedResponse;
              }
              // Return offline page if available
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Cache-first for static assets (images, CSS, JS)
  if (request.destination === 'image' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          });
        })
        .catch(() => {
          // Return placeholder for offline images
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        })
    );
    return;
  }

  // Default: network-first for everything else
  event.respondWith(
    fetch(request, {
      cache: 'no-cache'
    })
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting on user action');
    self.skipWaiting();
  }

  // Clear all caches on demand
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[Service Worker] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  try {
    console.log('Syncing favorites with server...');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Session reminder',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Session',
        icon: '/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ITC Vegas 2025', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/favorites')
    );
  }
});