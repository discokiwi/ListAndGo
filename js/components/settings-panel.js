// @ts-check
/**
 * Settings Panel Web Component.
 * Business Logic: Displays app settings sections (store layout, units, categories, defaults).
 * Stamps content from `<template id="settings-template">`.
 * @class
 */
export class SettingsPanel extends HTMLElement {
  /** Construct the component and stamp template content. */
  constructor() {
    super();
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('settings-template'));
    if (tmpl) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    const container = this.querySelector('#settings-container');
    if (container) {
      container.innerHTML = `
        <div class="page-empty">
          <p>Settings coming soon. Configure store layout, units, and categories here.</p>
        </div>
      `;
    }
  }
}

customElements.define('settings-panel', SettingsPanel);