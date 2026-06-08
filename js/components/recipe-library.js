// @ts-check
/**
 * Recipe Library Web Component.
 * Business Logic: Displays a search-first list of recipe cards.
 * Stamps content from `<template id="recipes-template">`.
 * @class
 */
export class RecipeLibrary extends HTMLElement {
  /** Construct the component and stamp template content. */
  constructor() {
    super();
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('recipes-template'));
    if (tmpl) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    const container = this.querySelector('#recipe-library-container');
    if (container) {
      container.innerHTML = `<div class="page-empty"><p>No recipes yet. Tap "+ New" to add your first recipe.</p></div>`;
    }
  }
}

customElements.define('recipe-library', RecipeLibrary);