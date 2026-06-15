// @ts-check

/**
 * Navigation component for List&GO.
 * Business Logic: Manages the active state of bottom navigation links.
 * The nav links are hardcoded in index.html as <a> tags with hash hrefs.
 * This component tracks which tab is active by listening to hashchange events
 * and updating the aria-current attribute on the matching link.
 * The links themselves handle navigation natively via href.
 * @class
 * @augments {HTMLElement}
 */
export class AppNav extends HTMLElement {
  /** @type {AbortController | null} */
  _abortController = null;

  /**
   * Construct the component.
   */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM.
   * Wires up event listeners and sets initial active state.
   * @returns {void}
   */
  connectedCallback() {
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    // Update active link on hash change
    window.addEventListener('hashchange', () => this._updateActiveLink(), { signal });
    this._updateActiveLink();
  }

  /**
   * Clean up on disconnect.
   * @returns {void}
   */
  disconnectedCallback() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  /**
   * Update the aria-current attribute on nav links based on the current hash.
   * Business Logic: The current route is determined from location.hash.
   * The matching <a> element gets aria-current="page", all others get it removed.
   * @returns {void}
   */
  _updateActiveLink() {
    const currentHash = location.hash || '#/lists';
    const links = this.querySelectorAll('a[data-route]');

    for (let i = 0; i < links.length; i++) {
      const link = /** @type {HTMLAnchorElement} */ (links[i]);
      if (link.getAttribute('href') === currentHash) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }
}

// Register the custom element
customElements.define('app-nav', AppNav);
