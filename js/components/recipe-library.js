// @ts-check
/**
 * Recipe Library Web Component.
 * Business Logic: Displays a search-first list of recipe cards.
 * Stamps content from `<template id="recipes-template">`.
 * @class
 */
export class RecipeLibrary extends HTMLElement {
  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Stamps template and shows initial state.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Stamp template content on connect (not in constructor)
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('recipes-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
    const container = this.querySelector('#recipe-library-container');
    if (container) {
      container.innerHTML = `<div class="page-empty"><p>No recipes yet. Tap "+ New" to add your first recipe.</p></div>`;
    }
  }
}

customElements.define('recipe-library', RecipeLibrary);