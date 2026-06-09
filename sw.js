// @ts-nocheck -- Service Worker globals (self, caches, clients) are provided by the SW runtime, not bundled
// sw.js – Service Worker (offline-first)
/**
 * Business Logic: Enables the List&GO PWA to work offline by caching static assets.
 * Uses Cache-First strategy for the app shell (HTML, CSS, JS) and
 * Network-First for API calls. On install, precaches all shell assets.
 * Bumps CACHE_VERSION to invalidate old caches on deploy.
 */

const CACHE_VERSION = 'listandgo-shell-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components/badge.css',
  '/css/components/bottom-sheet.css',
  '/css/components/fab.css',
  '/css/components/inputs.css',
  '/css/components/grocery-row.css',
  '/js/app.js',
  '/js/router.js',
  '/js/db.js',
  '/js/components/app-nav.js',
  '/js/components/grocery-list.js',
  '/js/components/meal-planner.js',
  '/js/components/recipe-library.js',
  '/js/components/settings-panel.js',
  '/js/components/items-library.js',
  '/js/store/items.store.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches and take control of clients immediately
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-First for shell assets, Network-First for everything else
  const url = new URL(event.request.url);

  // For app shell assets, serve from cache first (network fallback)
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  } else {
    // For everything else (API calls, fonts, etc.), network first with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses for offline use
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});