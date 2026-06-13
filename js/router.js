// @ts-check
/**
 * Hash-based SPA Router with View Transitions API.
 * Business Logic: Maps URL hash routes to Web Components and swaps them
 * in the `<main>` element using the View Transitions API for native-app feel.
 * Updates `aria-current` on bottom nav links.
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
 * Cached component instances — preserves state across navigations
 * so Web Components aren't destroyed/recreated on every tab switch.
 * Business Logic: Without this cache, each navigation destroys the
 * grocery-list component, triggering an async connectedCallback()
 * that cannot render data synchronously for the View Transitions API.
 * @type {{ [key: string]: HTMLElement | null }}
 */
const componentCache = {
  'lists': null,
  'plan': null,
  'recipes': null,
  'items': null,
  'settings': null,
};

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
 * Resolve the Web Component for a given route.
 * Reuses cached instances to preserve state across navigations.
 * @param {string} route - The route name.
 * @returns {HTMLElement} The component instance.
 */
function resolveComponent(route) {
  // Return cached instance if available
  if (componentCache[route]) {
    return /** @type {HTMLElement} */ (componentCache[route]);
  }

  const tagName = ROUTE_MAP[route];
  if (tagName && customElements.get(tagName)) {
    try {
      const el = document.createElement(tagName);
      componentCache[route] = el;
      return el;
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
 * Business Logic: Hides/shows cached component instances rather than
 * destroying/recreating them. This preserves Web Component state (including
 * DOM content and event listeners) across tab switches. Without this,
 * async connectedCallback() triggers a re-fetch and re-render, which
 * cannot complete synchronously for the View Transitions API snapshot,
 * causing a flash of empty state.
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

  // Get or create the component for this route
  /** @type {HTMLElement} */
  const component = resolveComponent(route);

  // Swap content using View Transitions API (graceful fallback)
  if ('startViewTransition' in document) {
    document.startViewTransition(() => {
      // Hide all children except the target component
      let child = view.firstElementChild;
      while (child) {
        if (child !== component) {
          /** @type {HTMLElement} */ (child).style.display = 'none';
        }
        child = child.nextElementSibling;
      }
      // Append if first visit, or show if returning
      if (!component.parentNode) {
        view.appendChild(component);
      }
      component.style.display = '';
    });
  } else {
    // No transition support — hide others, show target
    let child = view.firstElementChild;
    while (child) {
      if (child !== component) {
        /** @type {HTMLElement} */ (child).style.display = 'none';
      }
      child = child.nextElementSibling;
    }
    if (!component.parentNode) {
      view.appendChild(component);
    }
    component.style.display = '';
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