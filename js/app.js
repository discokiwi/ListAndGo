// @ts-nocheck -- Dexie is global via CDN, TS can't resolve
/**
 * Application entry point for List&GO PWA.
 * Business Logic: Initializes the Dexie database, seeds default data (categories,
 * units, items) in the correct dependency order, registers the router for SPA
 * navigation, and registers the Service Worker for offline support. Listens for
 * 'categories-changed' events to refresh the UI after settings changes.
 * On boot, checks for a stored PocketBase auth token to restore the session.
 * @module
 */

import { initRouter } from './router.js';
import { initOverlayManager } from './overlay-manager.js';
import { STRINGS } from './strings/i18n.js';
import { tryAutoRefresh } from './store/auth.store.js';

// Import all Web Components so their customElements.define() calls execute.
// The router creates these elements by tag name, so they must be registered.
import './components/app-nav.js';
import './components/app-snackbar.js';
import './components/top-bar.js';
import './components/grocery-list.js';
import './components/grocery-row.js';
import './components/ingredient-picker.js';
import './components/items-library.js';
import './components/meal-planner.js';
import './components/recipe-library.js';
import './components/settings-panel.js';
import './components/login-sheet.js';
import './components/create-account-sheet.js';
import './components/toggle-switch.js';
import './components/quantity-stepper.js';
import './components/search-autocomplete.js';
import './components/confirm-dialog.js';
import './components/content-dialog.js';
import './components/recipe-detail.js';
import './components/recipe-editor.js';

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
 * Initialize the Dexie database and seed all default data.
 * Business Logic: Seeds must run in order because items reference category
 * and unit UUIDs. Categories are seeded first, then units, then items.
 * The category color cache is loaded after seeding.
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

  // Seed in dependency order
  const { seedCategories } = await import('./store/categories.store.js');
  const { seedRecipeCategories } = await import('./store/recipe-categories.store.js');
  const { seedItems } = await import('./store/items.store.js');
  const { seedRecipes } = await import('./store/recipes.store.js');
  const { loadCategoryColorCache } = await import('./utils/category-colors.js');

  await seedCategories();
  await seedRecipeCategories();
  await seedItems();
  await seedRecipes();
  await loadCategoryColorCache();

  console.log('Database initialized and seeded');
}

/**
 * Update the bottom nav labels from the current language bundle.
 * Business Logic: Called on startup and on every 'language-changed' event.
 * Updates the <span> children inside each nav <a> tag.
 * @returns {void}
 */
function updateNavLabels() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  const listsLabel = nav.querySelector('#nav-lists-label');
  const planLabel = nav.querySelector('#nav-plan-label');
  const recipesLabel = nav.querySelector('#nav-recipes-label');
  const itemsLabel = nav.querySelector('#nav-items-label');
  if (listsLabel) listsLabel.textContent = STRINGS.nav.lists;
  if (planLabel) planLabel.textContent = STRINGS.nav.plan;
  if (recipesLabel) recipesLabel.textContent = STRINGS.nav.recipes;
  if (itemsLabel) itemsLabel.textContent = STRINGS.nav.items;
}

/**
 * Update page title from the current language bundle.
 * @returns {void}
 */
function updatePageTitle() {
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = STRINGS.app.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', STRINGS.app.description);
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

  // Try to restore a previous PocketBase auth session
  tryAutoRefresh().catch(() => {
    // Silent fail — guest mode is fine
  });

  // Initialize the overlay manager (blocks navigation while modals/drawers are open)
  initOverlayManager();

  // Apply initial language labels
  updatePageTitle();
  updateNavLabels();

  // React to language changes
  document.addEventListener('language-changed', () => {
    updatePageTitle();
    updateNavLabels();
  });

  // Start the SPA router
  initRouter();

  // Wire the top bar settings button to open the settings drawer
  const settingsDrawer = document.querySelector('settings-panel');
  document.addEventListener('open-settings', () => {
    if (settingsDrawer && typeof settingsDrawer.open === 'function') {
      settingsDrawer.open();
    }
  });

  // Listen for category changes to refresh UI components
  document.addEventListener('categories-changed', async () => {
    const { loadCategoryColorCache } = await import('./utils/category-colors.js');
    await loadCategoryColorCache();

    // Dispatch a general update event for any component that needs to re-render
    document.dispatchEvent(new CustomEvent('items-updated'));
  });

  // Register Service Worker (non-blocking)
  registerServiceWorker().catch(console.warn);
}

// Boot the application
initApp().catch(console.error);

export { initApp };