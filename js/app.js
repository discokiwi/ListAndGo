// @ts-nocheck -- Dexie is global via CDN, TS can't resolve
/**
 * Application entry point for List&GO PWA.
 * Business Logic: Initializes the Dexie database, seeds default data,
 * registers the router for SPA navigation, and registers the Service Worker
 * for offline support.
 *
 * @module
 */

import { initRouter } from './router.js';

/**
 * Register the Service Worker for offline-first support.
 * @returns {Promise<void>}
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }
}

/**
 * Initialize the Dexie database.
 * Currently imported via global script tag from CDN.
 * @returns {Promise<void>}
 */
async function initDatabase() {
  // Dexie is loaded globally via <script> in index.html
  if (typeof Dexie === 'undefined') {
    console.warn('Dexie not loaded yet, retrying…');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return initDatabase();
  }
  // The db module is self-initializing
  await import('./db.js');
  // Seed items if needed
  await import('./store/items.store.js');
  console.log('Database initialized');
}

/**
 * Main app initialization.
 * @returns {Promise<void>}
 */
async function initApp() {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database init error:', err);
  }

  // Start the SPA router
  initRouter();

  // Register Service Worker (non-blocking)
  registerServiceWorker().catch(console.warn);
}

// Boot the application
initApp().catch(console.error);

export { initApp };