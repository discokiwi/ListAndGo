// @ts-nocheck -- Dexie is global via CDN, TS can't resolve
/**
 * Application entry point for List&GO PWA.
 * Business Logic: Initializes the Dexie database, seeds default data,
 * registers the router for SPA navigation, and registers the Service Worker
 * for offline support.
 * @module
 */

import { initRouter, goTo } from './router.js';

// Import all Web Components so their customElements.define() calls execute.
// The router creates these elements by tag name, so they must be registered.
import './components/app-nav.js';
import './components/top-bar.js';
import './components/grocery-list.js';
import './components/grocery-row.js';
import './components/ingredient-picker.js';
import './components/items-library.js';
import './components/meal-planner.js';
import './components/recipe-library.js';
import './components/settings-panel.js';
import './components/search-autocomplete.js';

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

  // Wire the top bar settings button to navigate to settings route
  document.addEventListener('open-settings', () => {
    goTo('settings');
  });

  // Register Service Worker (non-blocking)
  registerServiceWorker().catch(console.warn);
}

// Boot the application
initApp().catch(console.error);

export { initApp };