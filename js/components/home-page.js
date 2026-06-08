// @ts-check
/**
 * Home page component for List&GO.
 * Renders the welcoming home screen.
 * Uses Light DOM: clones content from <template id="home-page-template"> defined in index.html.
 * @class
 */
export class HomePage extends HTMLElement {
  /**
   * Construct the component and stamp template content.
   */
  constructor() {
    super();
    /** @type {HTMLTemplateElement} */
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('home-page-template'));
    if (tmpl) {
      /** @type {DocumentFragment} */
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

  }
}

// Register the custom element
customElements.define('home-page', HomePage);
