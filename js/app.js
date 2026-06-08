// @ts-check
/**
 * Application entry point for List&GO PWA.
 * @module
 */

// Import component definitions (they register themselves)
import './components/app-nav.js';
import './components/home-page.js';

/**
 * Register Service Worker for offline‑first support.
 * @returns {void}
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  }
}

/**
 * Simple router implementation using hash changes.
 * @returns {void}
 */
function router() {
  /** @type {HTMLElement} */
  const view = document.getElementById('router-view');

  // Extract route name without leading '#'
  /** @type {string} */
  const route = location.hash.replace('#', '') || 'home';

  // Clear previous content
  view.innerHTML = '';

  /** @type {HTMLElement} */
  let element;

  switch (route) {
    case 'home':
      element = document.createElement('home-page');
      break;
    // Future routes (lists, recipes, settings) can be added here
    default:
      element = document.createElement('home-page');
  }
  view.appendChild(element);

  // View Transitions API – optional, graceful fallback
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      // No special animation, the DOM swap above is the transition
    });
  }
}

// Listen for hash changes and initial load
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Initialize the app
registerServiceWorker();
router();

// Export for potential testing (optional)
export { router };
