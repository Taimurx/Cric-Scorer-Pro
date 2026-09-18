'use strict';

const CACHE_NAME = 'cric-scorer-pro-v2.0.15';
const CORE_ASSETS = [
  './',
  'index.html',
  'favicon.png',
  'manifest.json',
  'js/cricket-engine.js',
  'dls-calculator.html',
  'overlay.html',
  'main.dart.js',
  'flutter_bootstrap.js',
  'version.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network First, Fallback to Cache
  event.respondWith(
    fetch(req).then((res) => {
      // If network succeeds, cache the latest version
      if (res && res.status === 200 && (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return res;
    }).catch(() => {
      // If network fails (offline), fallback to cache
      return caches.match(req).then((cached) => {
        if (cached) return cached;
        // Fallback to index.html for navigation requests
        const acceptHeader = req.headers.get('accept') || '';
        if (acceptHeader.includes('text/html')) {
          return caches.match('index.html');
        }
      });
    })
  );
});

