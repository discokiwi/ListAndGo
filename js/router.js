// @ts-check
/**
 * Hash-based SPA Router with View Transitions API.
 * Business Logic: Maps URL hash routes to Web Components and swaps them
 * in the `<main>` element using the View Transitions API for native-app feel.
 * Updates `aria-current` on bottom nav links.
 *
 * @module
 */

/**
 * Route map: hash → component tag name.
 * @type {{ [key: string]: string }}
 */
const ROUTE_MAP = {
  'lists': 'grocery-list',
  'plan': 'meal-planner',
  'recipes': 'recipe-library',
  'items': 'items-library',
  'settings': 'settings-panel',
};

/**
 * Default route when no hash matches.
 * @type {string}
 */
const DEFAULT_ROUTE = 'lists';

/**
 * Parse the current hash and return the route name.
 * @returns {string} The route name (e.g., 'lists', 'plan').
 */
function getRoute() {
  const hash = location.hash.replace('#/', '').replace('#', '') || DEFAULT_ROUTE;
  return hash in ROUTE_MAP ? hash : DEFAULT_ROUTE;
}

/**
 * Update `aria-current` on the bottom navigation links.
 * @param {string} route - The active route name.
 * @returns {void}
 */
function updateActiveNav(route) {
  /** @type {HTMLAnchorElement[]} */
  const links = Array.from(document.querySelectorAll('.app-nav a[data-route]'));
  links.forEach((link) => {
    const isActive = link.getAttribute('data-route') === route;
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Resolve and create the Web Component for a given route.
 * @param {string} route - The route name.
 * @returns {HTMLElement} The component instance.
 */
function resolveComponent(route) {
  const tagName = ROUTE_MAP[route];
  if (tagName && customElements.get(tagName)) {
    try {
      return document.createElement(tagName);
    } catch (err) {
      console.error(`Failed to create element for route "${route}":`, err);
    }
  }
  // Fallback: create a basic page element
  const fallback = document.createElement('section');
  fallback.className = 'page';
  fallback.innerHTML = `<div class="page-empty"><p>Loading "${route}"…</p></div>`;
  return fallback;
}

/**
 * Navigate to a route, swapping the `<main>` content.
 * Uses View Transitions API when available, with a graceful fallback.
 * @returns {void}
 */
function navigate() {
  /** @type {string} */
  const route = getRoute();

  /** @type {HTMLElement} */
  const view = document.getElementById('router-view');
  if (!view) return;

  // Update nav active state
  updateActiveNav(route);

  // Create the component for this route
  /** @type {HTMLElement} */
  const component = resolveComponent(route);

  // Swap content using View Transitions API (graceful fallback)
  if ('startViewTransition' in document) {
    document.startViewTransition(() => {
      view.innerHTML = '';
      view.appendChild(component);
    });
  } else {
    view.innerHTML = '';
    view.appendChild(component);
  }
}

// ---- Initialize ----

/**
 * Start the router by listening to hash changes.
 * @returns {void}
 */
export function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', navigate);
  // Initial navigation
  navigate();
}

/**
 * Programmatically navigate to a route.
 * @param {string} route - The route name (e.g., 'lists', 'plan', 'recipes', 'items', 'settings').
 * @returns {void}
 */
export function goTo(route) {
  if (route in ROUTE_MAP) {
    location.hash = `#/${route}`;
  } else {
    location.hash = `#/${DEFAULT_ROUTE}`;
  }
}

// Export for testing
export { navigate, getRoute, ROUTE_MAP, DEFAULT_ROUTE };