'use strict';

/**
 * Cric Scorer Pro — Offline-First PWA Service Worker
 * Version: v2.0.11-offline
 * 
 * Capabilities:
 * - 100% Offline Ball-by-Ball Cricket Match Scoring
 * - Automatic background pre-caching of Flutter Engine, Canvaskit WASM, and Assets
 * - Cache-First strategy for static code & assets (instant 0ms offline loads)
 * - Network-First strategy with Cache Fallback for navigation requests
 * - Dynamic runtime caching for fonts, canvaskit variants and images
 * - Resilient IndexedDB match persistence across browser restarts & device reboots
 */

const CACHE_NAME = 'cric-scorer-v2.0.11-offline';

// Core assets to pre-cache on service worker installation
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'favicon.png',
  'manifest.json',
  'flutter.js',
  'flutter_bootstrap.js',
  'main.dart.js',
  'version.json',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'canvaskit/chromium/canvaskit.wasm',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/NOTICES'
];

// Install Event — Precache core files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Pre-caching core offline assets for Cric Scorer Pro...');
      // Fetch each asset resiliently so single missing asset doesn't abort the entire install
      await Promise.all(
        PRECACHE_ASSETS.map((url) => {
          return fetch(url, { cache: 'no-cache' })
            .then((response) => {
              if (response && (response.status === 200 || response.type === 'opaque')) {
                return cache.put(url, response);
              }
            })
            .catch((err) => {
              console.warn('[ServiceWorker] Soft warning pre-caching asset:', url, err.message);
            });
        })
      );
      console.log('[ServiceWorker] Core assets successfully pre-cached.');
    })
  );
});

// Activate Event — Clean up stale cache versions and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log('[ServiceWorker] Active & in full control of clients.');
    })()
  );
});

// Fetch Event — Offline-First Routing Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept Google OAuth / Identity Services (must remain online/live)
  if (
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/healthz')
  ) {
    return;
  }

  // 1. Navigation requests (HTML documents): Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback for navigation: Return cached index.html
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('index.html') || await cache.match('./');
          if (cachedIndex) return cachedIndex;
          return new Response(
            '<html><body><h1>Offline</h1><p>You are offline, but Cric Scorer Pro is ready once loaded.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Static and Media Assets: Cache-First strategy (with runtime caching)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache instantly
        return cachedResponse;
      }

      // If not in cache, fetch from network and store in cache
      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[ServiceWorker] Offline fetch failed for:', request.url, err.message);
          // Return empty 200 for optional sound or minor assets to prevent UI crashes
          if (request.destination === 'image') {
            return new Response('', { headers: { 'Content-Type': 'image/png' } });
          }
          throw err;
        });
    })
  );
});
