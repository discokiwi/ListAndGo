// @ts-check
import { getCategoryColor } from '../utils/category-colors.js';
import { getCategoryName, categoryCache } from '../store/categories.store.js';

/**
 * Items Library Web Component — Categorized inventory of all grocery items.
 * Business Logic: Displays the catalogue of grocery items grouped by category,
 * with a search bar, reusable pill filter buttons, expandable category sections,
 * and an "Add to List" button per item. Uses flat list rows with category color
 * accent borders (matching the grocery list visual style). Essential items show
 * a decorative star icon — no interactive toggle.
 * Stamps content from `<template id="items-library-template">`.
 * @class
 */
export class ItemsLibrary extends HTMLElement {
  /** @type {import("../db.js").Item[]} */
  #allItems = [];

  /** @type {string} */
  #currentFilter = 'all';

  /** @type {string} */
  #searchQuery = '';

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Stamps template, loads items.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('items-library-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

    // Wire up UI event listeners
    this.#wireListeners();

    await this.render();
    // Re-render on item changes.
    // Listen on document because the item-editor lives inside a <dialog>
    // which is a sibling of <main>, not an ancestor — so bubbled events
    // from the editor never reach this component.
    document.addEventListener('item-saved', this.#onItemSaved);
    document.addEventListener('item-deleted', this.#onItemDeleted);
  }

  /**
   * Wire up search input and filter pills.
   * @returns {void}
   */
  #wireListeners() {
    const searchInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#items-search-input'));

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.#searchQuery = searchInput.value.trim().toLowerCase();
        this.#applyFilters();
      });
    }

    // FAB button opens the editor in add mode
    const fabBtn = this.querySelector('#add-item-btn');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        this.#openItemEditor();
      });
    }

    // Essentials toggle button — same design as grocery list's EVERY WEEK button
    const essentialsBtn = this.querySelector('#items-essentials-btn');
    if (essentialsBtn) {
      essentialsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Toggle essentials filter on/off
        this.#currentFilter = this.#currentFilter === 'essential' ? 'all' : 'essential';
        // Use pill--filled for active state, pill--outlined for inactive
        essentialsBtn.classList.toggle('pill--filled', this.#currentFilter === 'essential');
        essentialsBtn.classList.toggle('pill--outlined', this.#currentFilter === 'all');
        this.#applyFilters();
      });
    }
  }

  /**
   * Apply both search query and active filter, updating visible items.
   * @returns {void}
   */
  #applyFilters() {
    const container = this.querySelector('#items-container');
    if (!container) return;

    let filtered = this.#allItems;

    // Search filter
    if (this.#searchQuery) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(this.#searchQuery) ||
        (item.categoryId && getCategoryName(item.categoryId).toLowerCase().includes(this.#searchQuery))
      );
    }

    // Essentials filter
    if (this.#currentFilter === 'essential') {
      filtered = filtered.filter((item) => item.isEssential);
    }

    this.#renderItems(filtered, /** @type {HTMLElement} */ (container));
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
      /** @type {import("../db.js").Item[]} */
      this.#allItems = await getAllItems();

      if (this.#allItems.length === 0) {
        container.innerHTML = `<div class="items-empty"><p>No items yet. Tap "+ New" to add your first item.</p></div>`;
        return;
      }

      // Update filter pills with dynamic category pills
      this.#updateFilterPills();

      // Render with current filters applied
      this.#applyFilters();
    } catch (err) {
      console.error('Failed to render items:', err);
      container.innerHTML = `<div class="items-empty"><p>Could not load items. Is the database ready?</p></div>`;
    }
  }

  /**
   * Update the essentials toggle pill to match the current filter state.
   * Uses pill--filled (active) vs pill--outlined (inactive) styles,
   * matching the grocery list's EVERY WEEK button pattern.
   * @returns {void}
   */
  #updateFilterPills() {
    const essentialsBtn = /** @type {HTMLElement | null} */ (this.querySelector('#items-essentials-btn'));
    if (!essentialsBtn) return;

    const isActive = this.#currentFilter === 'essential';
    essentialsBtn.classList.toggle('pill--filled', isActive);
    essentialsBtn.classList.toggle('pill--outlined', !isActive);
  }

  /**
   * Render filtered items grouped by category into inventory rows.
   * @param {import("../db.js").Item[]} items - The filtered items to render.
   * @param {HTMLElement} container - The DOM element to render into.
   * @returns {void}
   */
  #renderItems(items, container) {
    if (items.length === 0) {
      container.innerHTML = `<div class="items-empty"><p>No items match your search or filter.</p></div>`;
      return;
    }

    // Group items by category
    /** @type {{ [key: string]: import("../db.js").Item[] }} */
    const grouped = {};
    items.forEach((item) => {
      const cat = item.categoryId || 'uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Sort categories by store layout order (sortOrder from categories store)
    // Business Logic: The user sets the order in Settings → Store Layout.
    const categoryIds = Object.keys(grouped);
    categoryIds.sort((a, b) => {
      const catA = categoryCache.byId.get(a);
      const catB = categoryCache.byId.get(b);
      const orderA = catA?.sortOrder ?? 999;
      const orderB = catB?.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (catA?.name || a).localeCompare(catB?.name || b);
    });

    let html = '';
    for (const category of categoryIds) {
      const catItems = grouped[category];
      html += `
        <details class="category-section" open>
          <summary>
            <div class="category-section__header">
              <span class="category-section__label">${getCategoryName(category).toUpperCase()} (${catItems.length})</span>
              <span class="category-section__divider"></span>
              <span class="category-section__chevron">
                <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
              </span>
            </div>
          </summary>
          <div class="category-section__items">
            ${catItems.map((item) => this.#renderItemRow(item)).join('')}
          </div>
        </details>
      `;
    }

    container.innerHTML = html;

    // Wire up "Add to List" buttons
    container.querySelectorAll('[data-action="add-to-list"]').forEach((/** @type {Element} */ _btn) => {
      const btn = /** @type {HTMLElement} */ (_btn);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-item-id');
        if (!itemId) return;
        this.#addItemToList(itemId);
      });
    });

    // Wire up item row clicks to open the editor in edit mode
    container.querySelectorAll('.item-row').forEach((/** @type {Element} */ row) => {
      row.addEventListener('click', (e) => {
        // Don't open editor if clicking a button inside the row
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.closest('button')) return;
        const itemId = row.getAttribute('data-item-id');
        if (!itemId) return;
        this.#openItemEditor(itemId);
      });
    });
  }

  /**
   * Render a single item row using flat list style with category accent border.
   * Essential items show a decorative star icon (non-interactive).
   * @param {import("../db.js").Item} item - The item data to render.
   * @returns {string} HTML string for the row.
   */
  #renderItemRow(item) {
    const accentColor = getCategoryColor(item.categoryId || '');
    const qtyText = item.defaultQty ? `${item.defaultQty} ${item.unitId || ''}`.trim() : '';
    const isMultiUse = item.isMultiUse;
    const usageType = isMultiUse ? 'Multi-use' : '';
    const usageIconPath = isMultiUse
      ? '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>'
      : '';
    // Decorative star for essential items only
    const starHtml = item.isEssential
      ? '<span class="item-row__essential-star" aria-label="Essential"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>'
      : '';

    return `
      <div class="item-row" style="--accent-color: ${accentColor}" data-item-id="${item.id}">
        <div class="item-row__info">
          <div class="item-row__name-row">
            <span class="item-row__name">${this.#escapeHtml(item.name)}</span>
            ${starHtml}
          </div>
          <div class="item-row__meta">
            ${qtyText ? `<span class="item-row__qty">${this.#escapeHtml(qtyText)}</span>` : ''}
            ${usageType ? `<span class="item-row__usage">${usageIconPath} <span>${usageType}</span></span>` : ''}
          </div>
        </div>
        <button class="item-row__add-btn" data-action="add-to-list" data-item-id="${item.id}" aria-label="Add ${item.name} to list">
          <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03L21 4.96 19.25 4l-3.7 7H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2z"/></svg>
        </button>
      </div>
    `;
  }

  /**
   * Add an item to the active grocery list with its default quantity and show a toast.
   * Business Logic: When the user taps "Add to List" on an item in the library,
   * the item is added to the active grocery list using its defaultQty and unitId.
   * If the item already exists on the list, the quantity is incremented (handled
   * by addGroceryItem's merge logic).
   * @param {string} itemId - UUID of the item.
   * @returns {Promise<void>}
   */
  async #addItemToList(itemId) {
    try {
      const { getItemById } = await import('../store/items.store.js');
      const item = await getItemById(itemId);
      if (!item) return;

      const { getOrCreateActiveList, addGroceryItem } = await import('../store/grocery.store.js');
      const list = await getOrCreateActiveList();

      await addGroceryItem(
        list.id,
        item.id,
        item.name,
        item.categoryId || '',
        item.defaultQty || 1,
        item.unitId || '',
      );

      // Show snackbar confirmation
      const snackbar = /** @type {import("./app-snackbar.js").AppSnackbar | null} */ (
        document.querySelector('app-snackbar')
      );
      if (snackbar) {
        snackbar.show(`Added ${item.name} to Grocery List`);
      }
    } catch (err) {
      console.error('Failed to add item to list:', err);
    }
  }

  /**
   * Open the item editor in add mode (triggered by FAB) or edit mode (click on row).
   * @param {string} [itemId] - Optional item UUID for edit mode.
   * @returns {Promise<void>}
   */
  async #openItemEditor(itemId) {
    try {
      // Ensure the item-editor component is loaded
      await import('./item-editor.js');

      const sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('item-editor-sheet'));
      if (!sheet) return;

      // @ts-ignore -- dynamic import, type resolved at runtime
      let editor = /** @type {any} */ (sheet.querySelector('item-editor'));
      if (!editor) {
        // Inject the component if not present
        editor = document.createElement('item-editor');
        const body = sheet.querySelector('#item-editor-body');
        if (body) body.appendChild(editor);
      }

      if (itemId) {
        const { getItemById } = await import('../store/items.store.js');
        const item = await getItemById(itemId);
        if (item) editor.openEdit(item);
      } else {
        editor.openAdd();
      }
    } catch (err) {
      console.error('Failed to open item editor:', err);
    }
  }

  /**
   * Handle item-saved event: re-render the items list.
   * Bound as a method so it works as a document event listener.
   * @returns {Promise<void>}
   */
  #onItemSaved = async () => {
    await this.render();
  };

  /**
   * Handle item-deleted event: re-render the items list.
   * Bound as a method so it works as a document event listener.
   * @returns {Promise<void>}
   */
  #onItemDeleted = async () => {
    await this.render();
  };

  /**
   * Called when the element is removed from the DOM.
   * Removes document-level listeners to prevent stale references.
   * @returns {void}
   */
  disconnectedCallback() {
    document.removeEventListener('item-saved', this.#onItemSaved);
    document.removeEventListener('item-deleted', this.#onItemDeleted);
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str - The string to escape.
   * @returns {string} Escaped HTML string.
   */
  #escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
}

customElements.define('items-library', ItemsLibrary);