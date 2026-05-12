// ============================================
// NivAI — service-worker.js: PWA Offline Support
// ============================================

const CACHE_NAME = 'nivai-v1';
const STATIC_ASSETS = [
  '/',
  '/tracking',
  '/analytics',
  '/static/css/base.css',
  '/static/css/nav.css',
  '/static/css/citizen.css',
  '/static/css/tracking.css',
  '/static/css/dashboard.css',
  '/static/css/admin.css',
  '/static/css/analytics.css',
  '/static/js/main.js',
  '/static/js/api.js',
  '/static/js/complaint.js',
  '/static/js/voice.js',
  '/static/js/tracking.js',
  '/static/js/dashboard.js',
  '/static/js/analytics.js',
  '/static/js/offline.js',
  '/static/js/duplicate.js',
  '/static/js/translate.js',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install — cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({
          success: false,
          error: 'You are offline. Please check your connection.',
          data: {}
        }), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// Background sync for queued complaints
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-complaints') {
    event.waitUntil(syncQueuedComplaints());
  }
});

async function syncQueuedComplaints() {
  // This is handled by offline.js in the main thread
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }));
}
