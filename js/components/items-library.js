// @ts-check
/**
 * Items Library Web Component — Inventory Manager Categorized List View.
 * Business Logic: Displays the catalogue of grocery items grouped by category,
 * with a search bar, filter pills, expandable category sections, favorite toggles,
 * and an "Add to List" button per item. Follows the Stitch "Inventory Manager -
 * Categorized List View" design spec.
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

    // Filter pills are delegated via the pills container
    const pillsContainer = this.querySelector('#items-filter-pills');
    if (pillsContainer) {
      pillsContainer.addEventListener('click', (e) => {
        const evtTarget = /** @type {EventTarget} */ (e.target);
        const target = /** @type {HTMLElement} */ (evtTarget);
        const pill = /** @type {HTMLElement} */ (target.closest('[data-filter]'));
        if (!pill) return;
        const filter = pill.getAttribute('data-filter');
        if (!filter) return;

        // Toggle: if clicking the already-active Essentials pill, reset to "all"
        if (filter === 'essential' && this.#currentFilter === 'essential') {
          this.#currentFilter = 'all';
        } else {
          this.#currentFilter = filter;
        }
        // Update active state on all pills
        pillsContainer.querySelectorAll('[data-filter]').forEach((/** @type {Element} */ p) => {
          (/** @type {HTMLElement} */ (p)).classList.toggle('items-filter-pill--active', (/** @type {HTMLElement} */ (p)).getAttribute('data-filter') === this.#currentFilter);
        });
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
        (item.categoryId && item.categoryId.toLowerCase().includes(this.#searchQuery))
      );
    }

    // Category filter (if not "all")
    if (this.#currentFilter !== 'all' && this.#currentFilter !== 'essential') {
      filtered = filtered.filter((item) => item.categoryId === this.#currentFilter);
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
   * No dynamic category pills needed — only the static "All Items" and "Essentials"
   * pills from the template remain.
   * @returns {void}
   */
  #updateFilterPills() {
    const pillsContainer = this.querySelector('#items-filter-pills');
    if (!pillsContainer) return;

    // Remove any dynamically injected pills from previous renders
    const existingDynamic = pillsContainer.querySelectorAll('[data-filter][data-dynamic]');
    existingDynamic.forEach((el) => el.remove());

    // Keep only the static "All Items" and "Essentials" pills from the template
    // Ensure the active state reflects #currentFilter
    pillsContainer.querySelectorAll('[data-filter]').forEach((/** @type {Element} */ p) => {
      (/** @type {HTMLElement} */ (p)).classList.toggle('items-filter-pill--active', (/** @type {HTMLElement} */ (p)).getAttribute('data-filter') === this.#currentFilter);
    });
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

    let html = '';
    for (const [category, catItems] of Object.entries(grouped)) {
      html += `
        <details class="items-category" open>
          <summary>
            <div class="items-category-header">
              <span class="items-category-label">${category.toUpperCase()} (${catItems.length})</span>
              <span class="items-category-divider"></span>
              <span class="items-category-chevron">
                <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
              </span>
            </div>
          </summary>
          <div class="items-category-items">
            ${catItems.map((item) => this.#renderItemRow(item)).join('')}
          </div>
        </details>
      `;
    }

    container.innerHTML = html;

    // Wire up favorite toggles
    container.querySelectorAll('[data-action="favorite"]').forEach((/** @type {Element} */ _btn) => {
      const btn = /** @type {HTMLElement} */ (_btn);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-item-id');
        if (!itemId) return;
        this.#toggleFavorite(itemId, btn);
      });
    });

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
    container.querySelectorAll('.inventory-row').forEach((/** @type {Element} */ row) => {
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
   * Render a single inventory item row.
   * @param {import("../db.js").Item} item - The item data to render.
   * @returns {string} HTML string for the row.
   */
  #renderItemRow(item) {
    const favClass = item.isEssential ? 'inventory-row-favorite--on' : 'inventory-row-favorite--off';
    const qtyText = item.defaultQty ? `${item.defaultQty} ${item.unitId || ''}`.trim() : '';
    // Show "One-time use" badge for items that are fully consumed in a single recipe
    const usageType = item.isOneTime ? 'One-time use' : '';
    const usageIconPath = item.isOneTime
      ? '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>'
      : '';

    return `
      <div class="inventory-row" data-item-id="${item.id}">
        <div class="inventory-row-info">
          <div class="inventory-row-name-row">
            <span class="inventory-row-name">${this.#escapeHtml(item.name)}</span>
            <button class="inventory-row-favorite ${favClass}" data-action="favorite" data-item-id="${item.id}" aria-label="${item.isEssential ? 'Remove from' : 'Add to'} favorites">
              <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </button>
          </div>
          <div class="inventory-row-meta">
            ${qtyText ? `<span class="inventory-row-qty">${this.#escapeHtml(qtyText)}</span>` : ''}
            ${usageType ? `<span class="inventory-row-usage">${usageIconPath} <span>${usageType}</span></span>` : ''}
          </div>
        </div>
        <button class="inventory-row-add-btn" data-action="add-to-list" data-item-id="${item.id}" aria-label="Add ${item.name} to list">
          <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03L21 4.96 19.25 4l-3.7 7H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2z"/></svg>
          <span class="inventory-row-add-label">Add to List</span>
        </button>
      </div>
    `;
  }

  /**
   * Toggle the essential/favorite state of an item.
   * @param {string} itemId - UUID of the item.
   * @param {HTMLElement} btn - The favorite button element.
   * @returns {Promise<void>}
   */
  async #toggleFavorite(itemId, btn) {
    try {
      const { getItemById, updateItem } = await import('../store/items.store.js');
      const item = await getItemById(itemId);
      if (!item) return;

      item.isEssential = !item.isEssential;
      await updateItem(item);

      // Toggle visual state
      const isOn = item.isEssential;
      btn.classList.toggle('inventory-row-favorite--on', isOn);
      btn.classList.toggle('inventory-row-favorite--off', !isOn);
      btn.setAttribute('aria-label', isOn ? 'Remove from favorites' : 'Add to favorites');

      // Update the usage type text in the meta row based on isOneTime (unchanged by this toggle)
      const row = btn.closest('.inventory-row');
      if (row) {
        const usageEl = row.querySelector('.inventory-row-usage');
        const meta = row.querySelector('.inventory-row-meta');
        if (usageEl) {
          usageEl.innerHTML = item.isOneTime
            ? '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> <span>One-time use</span>'
            : '';
        } else if (item.isOneTime && meta) {
          const usageEl2 = document.createElement('span');
          usageEl2.className = 'inventory-row-usage';
          usageEl2.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> <span>One-time use</span>';
          meta.appendChild(usageEl2);
        }
      }

      // Dispatch event so other components can react
      this.dispatchEvent(new CustomEvent('item-saved', { bubbles: true }));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  /**
   * Add an item to the active grocery list and show a toast.
   * @param {string} itemId - UUID of the item.
   * @returns {Promise<void>}
   */
  async #addItemToList(itemId) {
    try {
      // Import grocery store and add item to active list
      const { getItemById } = await import('../store/items.store.js');
      const item = await getItemById(itemId);
      if (!item) return;

      // Dispatch an event so grocery-list component can handle insertion
      this.dispatchEvent(new CustomEvent('add-to-grocery', {
        bubbles: true,
        detail: { item },
      }));

      // Show toast
      const toast = this.querySelector('#items-toast');
      if (toast) {
        toast.textContent = `Added ${item.name} to Grocery List`;
        toast.classList.add('items-toast--visible');
        setTimeout(() => {
          toast.classList.remove('items-toast--visible');
        }, 2000);
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
