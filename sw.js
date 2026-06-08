// @ts-nocheck
// sw.js – Service Worker (offline‑first placeholder)
/**
 * Business Logic: Enables the List&GO PWA to work offline by caching static assets.
 * Caches the core shell (HTML, CSS, JS) on install and serves from cache on fetch.
 */
const CACHE_NAME = 'listandgo-shell-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/js/app.js',
  '/js/components/app-nav.js',
  '/js/components/home-page.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network falling back to cache strategy
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
