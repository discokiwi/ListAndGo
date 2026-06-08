// @ts-check
/**
 * Items Library Web Component.
 * Business Logic: Displays the catalogue of grocery items grouped by category.
 * Supports search, marking essentials, and opening the item editor.
 * Stamps content from `<template id="items-library-template">`.
 * @class
 */
export class ItemsLibrary extends HTMLElement {
  /** Construct the component and stamp template content. */
  constructor() {
    super();
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('items-library-template'));
    if (tmpl) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
  }

  /**
   * Called when element is added to the DOM. Loads items and renders them.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    await this.render();
    // Listen for item changes
    this.addEventListener('item-saved', () => this.render());
    this.addEventListener('item-deleted', () => this.render());
  }

  /**
   * Load items from store and render grouped by category.
   * @returns {Promise<void>}
   */
  async render() {
    const container = this.querySelector('#items-container');
    if (!container) return;

    try {
      const { getAllItems } = await import('../store/items.store.js');
      const items = await getAllItems();

      if (items.length === 0) {
        container.innerHTML = `<div class="page-empty"><p>No items yet. Tap "+ New" to add your first item.</p></div>`;
        return;
      }

      // Group items by categoryId
      /** @type {{ [key: string]: import("../db.js").Item[] }} */
      const grouped = {};
      items.forEach((item) => {
        const cat = item.categoryId || 'uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      // Render category sections
      let html = '';
      for (const [category, catItems] of Object.entries(grouped)) {
        const badgeClass = `badge badge--${category}`;
        html += `
          <details class="grocery-section" open>
            <summary>
              <span class="${badgeClass}">${category}</span>
              <span class="grocery-section__count">${catItems.length}</span>
            </summary>
            ${catItems.map((item) => `
              <div class="grocery-row" data-item-id="${item.id}">
                <div class="grocery-row__info">
                  <span class="grocery-row__qty">${item.defaultQty || ''}</span>
                  <span class="grocery-row__name">${item.name}</span>
                </div>
                <span class="badge badge--default">${item.unitId || ''}</span>
                <button class="grocery-row__check" data-action="edit" aria-label="Edit ${item.name}">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
              </div>
            `).join('')}
          </details>
        `;
      }
      container.innerHTML = html;

      // Add click handlers for edit buttons
      container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = /** @type {HTMLElement} */ (btn.closest('.grocery-row'));
          if (row) {
            const itemId = row.dataset.itemId;
            this.dispatchEvent(new CustomEvent('item-selected', { detail: { itemId } }));
          }
        });
      });
    } catch (err) {
      console.error('Failed to render items:', err);
      container.innerHTML = `<div class="page-empty"><p>Could not load items. Is the database ready?</p></div>`;
    }
  }
}

customElements.define('items-library', ItemsLibrary);