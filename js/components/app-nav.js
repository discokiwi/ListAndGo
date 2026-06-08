// @ts-check

/**
 * Navigation component for List&GO.
 * Provides quick access to main sections.
 * Uses Light DOM and stamps content from <template id="app-nav-template">.
 * @class
 * @classdesc Navigation component for List&GO. Provides quick access to main sections.
 */
export class AppNav extends HTMLElement {
  /**
   * Construct the component and stamp template content.
   */
  constructor() {
    super();
    /** @type {HTMLTemplateElement} */
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('app-nav-template'));

    if (tmpl) {
      /** @type {DocumentFragment} */
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      if (!content) {
        console.error('Template content not found');
        return;
      }
      this.appendChild(content);
    }
    else {
      console.error('Template not found');
    }
  }

  /**
   * Attach click listeners after element is added to the DOM.
   * @returns {void}
   */
  connectedCallback() {
    /** @type {HTMLButtonElement[]} */
    const buttons = (Array.from(this.querySelectorAll('button[data-link]')));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        /** @type {string} */
        const target = btn.getAttribute('data-link');
        if (target) {
          location.hash = target;
        }
      });
    });
  }
}

// Register the custom element
customElements.define('app-nav', AppNav);
