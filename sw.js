const CACHE_NAME = 'cric-scorer-pro-v2.0.14-pwa';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/bn/',
  '/bn/index.html',
  '/css/style.css',
  '/icon.png',
  '/favicon.png',
  '/privacy.html',
  '/terms.html',
  '/releases.html',
  '/404.html',
  '/manifest.json',
  '/web/web-scorer.html',
  '/web/js/cricket-engine.js',
  '/web/js/ThemeManager.js',
  '/core/ThemeManager.js',
  '/web/dls-calculator.html',
  '/web/overlay.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/download') || url.pathname.endsWith('.apk') || url.pathname.startsWith('/health')) {
    return;
  }

  // Cache-first for stable static resources (App Shell, CSS, JS, Fonts, Icons)
  const isStaticResource = url.pathname.endsWith('.css') || 
                           url.pathname.endsWith('.js') || 
                           url.pathname.endsWith('.png') ||
                           url.pathname.endsWith('.json') ||
                           url.pathname === '/web/web-scorer.html' ||
                           url.pathname === '/web/dls-calculator.html' ||
                           url.pathname === '/web/overlay.html';

  if (isStaticResource) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Stale While Revalidate logic
          fetch(event.request).then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for remaining HTML documents to ensure latest is served immediately
  const isDoc = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');

  if (isDoc) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (url.pathname.startsWith('/bn')) {
            return (await caches.match('/bn/index.html')) || (await caches.match('/index.html'));
          }
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Fallback for everything else
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    }).catch(() => {
      if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
        return caches.match('/404.html');
      }
    })
  );
});
