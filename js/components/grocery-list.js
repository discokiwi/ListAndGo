// @ts-check
/**
 * Grocery List Web Component.
 * Business Logic: Displays the active grocery list with category-grouped items,
 * inline check/uncheck, and swipe-to-delete. Stamps content from the
 * `<template id="grocery-list-template">` defined in index.html.
 * @class
 */
export class GroceryList extends HTMLElement {
  /**
   * Construct the component and stamp template content.
   */
  constructor() {
    super();
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('grocery-list-template'));
    if (tmpl) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
  }

  /**
   * Called when element is added to the DOM.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Placeholder: will load grocery items from store in future iteration
    const container = this.querySelector('#grocery-list-container');
    if (container) {
      container.innerHTML = `<div class="page-empty"><p>Your grocery list is empty. Add items or plan meals to get started.</p></div>`;
    }
  }
}

customElements.define('grocery-list', GroceryList);