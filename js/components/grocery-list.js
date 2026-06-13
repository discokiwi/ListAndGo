// @ts-check
/* global Dexie -- loaded via CDN <script> tag in index.html */
/**
 * Grocery List Web Component — full grocery list page with category grouping,
 * search, essentials quick-add, and clear-all functionality.
 * Business Logic: Uses Dexie's liveQuery() to reactively render the active
 * grocery list grouped by category. Unchecked items appear first in expandable
 * category sections; checked items move to a COMPLETED section at the bottom.
 * The search bar opens an ingredient-picker sheet; the EVERY WEEK button opens
 * an essentials quick-add bottom sheet.
 * Supports Edit Mode: On long press of any item row, the list enters edit mode.
 * In edit mode, a blur overlay covers the screen background, and each row's
 * checkbox is replaced by a stepper and delete button. Clicking the overlay
 * exits edit mode.
 * @class
 * @augments {HTMLElement}
 */
export class GroceryList extends HTMLElement {
  /**
   * Static in-memory cache for the last known grocery list data.
   * Business Logic: Stores the list ID and items so that when the component
   * is re-added to the DOM (e.g. navigating tabs), connectedCallback() can
   * render synchronously from cache without any async imports, preventing
   * a flash of empty state captured by the View Transitions API.
   * @type {{ listId: string | null, items: import("../store/grocery.store.js").GroceryItem[] }}
   */
  static cache = { listId: null, items: [] };

  /** @type {string | null} */
  _activeListId = null;
  /** @type {import("../store/grocery.store.js").GroceryItem[]} */
  _items = [];
  /** @type {Promise<void> | null} */
  _renderPromise = null;
  /** @type {{ unsubscribe: () => void } | null} */
  _liveSubscription = null;
  /** @type {boolean} */
  _editMode = false;
  /** @type {HTMLDivElement | null} */
  _overlayEl = null;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Initialises the list and sets up
   * event delegation and a live query subscription.
   * Business Logic: Uses an in-memory cache for an immediate synchronous render
   * before the first `await`. This prevents a flash of empty state when the View
   * Transitions API captures the DOM snapshot synchronously during navigation.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Stamp the template content if present
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('grocery-list-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

    // Create the edit mode overlay and append it
    this._createEditOverlay();

    // Wire up static event listeners
    this._setupEventListeners();

    // Synchronous render from static cache BEFORE any await — View Transitions API
    // captures the DOM state synchronously after the callback returns. Reading from
    // the static cache is zero-cost (no imports, no await) and prevents the flash
    // of empty state. The cache is populated after every successful data fetch.
    const cache = GroceryList.cache;
    if (cache.listId && cache.items.length > 0) {
      this._activeListId = cache.listId;
      this._items = cache.items;
      this._render();
    }

    // Start the reactive render loop
    await this._startReactiveRender();
  }

  /** Clean up on disconnect — unsubscribe from liveQuery. */
  disconnectedCallback() {
    if (this._liveSubscription) {
      try {
        this._liveSubscription.unsubscribe();
      } catch {
        // Ignore unsubscribe errors
      }
      this._liveSubscription = null;
    }
    // Remove overlay if it exists
    if (this._overlayEl && this._overlayEl.parentNode) {
      this._overlayEl.parentNode.removeChild(this._overlayEl);
    }
    // Exit edit mode to clean up
    this._exitEditMode();
  }

  /** @type {HTMLInputElement | null} */
  _searchInput = null;
  /** @type {HTMLElement | null} */
  _searchDropdown = null;
  /** @type {number | undefined} */
  _searchDebounce = undefined;

  /**
   * Create the edit mode overlay element and append it to the document body.
   * Business Logic: The overlay sits behind the grocery list rows but covers
   * all other content (search bar, nav, etc.) with a semi-transparent backdrop.
   * Clicking it exits edit mode without affecting the list items.
   */
  _createEditOverlay() {
    if (this._overlayEl) return;
    const overlay = document.createElement('div');
    overlay.className = 'edit-mode-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this._exitEditMode();
    });
    overlay.addEventListener('touchstart', () => {
      // Allow touch to pass through to the items container but still close on
      // tapping the background
      // Intentionally empty — touch events pass through to list items
    }, { passive: true });
    this._overlayEl = overlay;
    // Append to this component so it's scoped within the list
    this.appendChild(overlay);
  }

  /** Wire up event listeners for search, buttons, and ingredient selection. */
  _setupEventListeners() {
    // Search input — inline autocomplete dropdown
    this._searchInput = this.querySelector('#grocery-search');
    this._searchDropdown = this.querySelector('#grocery-search-dropdown');

    if (this._searchInput && this._searchDropdown) {
      this._searchInput.addEventListener('input', () => this._onSearchInput());
      this._searchInput.addEventListener('blur', () => {
        // Delay hiding so click on dropdown result registers
        setTimeout(() => this._hideSearchDropdown(), 200);
      });
      this._searchInput.addEventListener('focus', () => {
        if (this._searchInput && this._searchInput.value.trim().length > 0) {
          this._onSearchInput();
        }
      });

      // Click on dropdown background closes it
      this._searchDropdown.addEventListener('mousedown', (e) => e.preventDefault());
      this._searchDropdown.addEventListener('click', (e) => this._onDropdownClick(e));
    }

    // Essentials button
    const essentialsBtn = this.querySelector('#essentials-btn');
    if (essentialsBtn) {
      essentialsBtn.addEventListener('click', () => this._openEssentialsSheet());
    }

    // Clear all button
    const clearBtn = this.querySelector('#clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this._handleClearAll());
    }

    // Listen for item-checked events from grocery-row
    this.addEventListener('item-checked', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemChecked(detail);
    });

    // Listen for item-delete events from grocery-row
    this.addEventListener('item-delete', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemDelete(detail);
    });

    // Listen for item-qty-change events from grocery-row (edit mode stepper)
    this.addEventListener('item-qty-change', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemQtyChange(detail);
    });

    // Listen for item-long-press events from grocery-row (enter edit mode)
    this.addEventListener('item-long-press', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._enterEditMode(detail);
    });
  }

  /** Handle search input with debounce — queries items library and shows inline dropdown. */
  _onSearchInput() {
    if (!this._searchInput) return;
    const query = this._searchInput.value.trim();

    if (this._searchDebounce) {
      clearTimeout(this._searchDebounce);
    }

    if (query.length === 0) {
      this._hideSearchDropdown();
      return;
    }

    this._searchDebounce = window.setTimeout(() => {
      this._performSearch(query);
    }, 150);
  }

  /**
   * Query the items store and render inline dropdown.
   * @param {string} query - The search string.
   */
  async _performSearch(query) {
    if (!this._searchDropdown) return;

    try {
      const { searchItems } = await import('../store/items.store.js');
      const results = await searchItems(query);

      if (results.length === 0) {
        this._searchDropdown.innerHTML = `
          <div class="search-bar__dropdown-empty">No items found</div>
        `;
      } else {
        this._searchDropdown.innerHTML = results.map((item) => `
          <button class="search-bar__dropdown-item"
                  data-item-id="${item.id}"
                  data-name="${this._escapeHtml(item.name)}"
                  data-category="${this._escapeHtml(item.categoryId)}"
                  data-unit="${this._escapeHtml(item.unitId)}"
                  data-qty="${item.defaultQty}">
            <span class="search-bar__dropdown-item-name">${this._escapeHtml(item.name)}</span>
            <span class="search-bar__dropdown-item-meta">${item.categoryId} · ${item.defaultQty} ${item.unitId}</span>
          </button>
        `).join('');
      }

      this._searchDropdown.style.display = 'block';
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  /** Hide the inline search dropdown. */
  _hideSearchDropdown() {
    if (this._searchDropdown) {
      this._searchDropdown.style.display = 'none';
    }
  }

  /**
   * Handle click on a dropdown result item.
   * @param {Event} e - The click event.
   */
  _onDropdownClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const itemEl = /** @type {HTMLElement | null} */ (target.closest('.search-bar__dropdown-item'));
    if (!itemEl) return;

    const itemId = itemEl.getAttribute('data-item-id') || '';
    const name = itemEl.getAttribute('data-name') || '';
    const categoryId = itemEl.getAttribute('data-category') || '';
    const unit = itemEl.getAttribute('data-unit') || '';
    const qty = parseFloat(itemEl.getAttribute('data-qty') || '1');

    // Add to grocery list
    this._addSelectedIngredient({ itemId, name, categoryId, unit, qty });

    // Clear search and hide dropdown
    if (this._searchInput) {
      this._searchInput.value = '';
    }
    this._hideSearchDropdown();
  }

  /**
   * Enter edit mode for the grocery list.
   * Business Logic: When an item is long-pressed, all rows enter edit mode.
   * The checkbox controls are replaced by stepper + delete controls.
   * An overlay blurs the background content. Clicking the overlay or pressing
   * the Escape key exits edit mode.
   * @param {{ id: string | null }} _detail - The item that was long-pressed.
   */
  _enterEditMode(_detail) {
    void _detail; // detail kept for future use (e.g. scroll-to-item)
    if (this._editMode) return;
    this._editMode = true;

    // Add body class for global blur effect
    document.body.classList.add('edit-mode');

    // Show overlay
    if (this._overlayEl) {
      this._overlayEl.classList.add('edit-mode-overlay--visible');
    }

    // Propagate edit mode to all grocery-row elements
    this._propagateEditMode(true);

    // Vibrate to provide haptic feedback
    if (window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  }

  /**
   * Exit edit mode.
   */
  _exitEditMode() {
    if (!this._editMode) return;
    this._editMode = false;

    // Remove body class
    document.body.classList.remove('edit-mode');

    // Hide overlay
    if (this._overlayEl) {
      this._overlayEl.classList.remove('edit-mode-overlay--visible');
    }

    // Propagate edit mode off to all grocery-row elements
    this._propagateEditMode(false);
  }

  /**
   * Set edit mode on all <grocery-row> children.
   * @param {boolean} active
   */
  _propagateEditMode(active) {
    const rowElements = this.querySelectorAll('grocery-row');
    for (let i = 0; i < rowElements.length; i++) {
      const row = /** @type {import("./grocery-row.js").GroceryRow} */ (rowElements[i]);
      if (typeof row.editMode !== 'undefined') {
        row.editMode = active;
      }
    }
  }

  /**
   * Start a live query that re-renders the list whenever Dexie data changes.
   * Business Logic: Gets the active list, fetches items, and sets up a Dexie
   * liveQuery for reactive updates. Updates the static cache after every fetch
   * so the component can render synchronously from cache on re-connect.
   * @returns {Promise<void>}
   */
  async _startReactiveRender() {
    const { getOrCreateActiveList, getGroceryItems } = await import('../store/grocery.store.js');

    // Phase 1: Get the active list (async)
    try {
      const list = await getOrCreateActiveList();
      this._activeListId = list.id;
    } catch (err) {
      console.error('Failed to get active list:', err);
      return;
    }

    // Phase 2: Fetch fresh items from Dexie
    try {
      const items = await getGroceryItems(/** @type {string} */ (this._activeListId));
      this._items = items;
      // Update the static cache so the next mount can render synchronously
      GroceryList.cache.listId = this._activeListId;
      GroceryList.cache.items = items;
    } catch (err) {
      console.error('Failed to load initial items:', err);
    }

    // Phase 3: Re-render with fresh data
    this._render();

    // Phase 4: Set up Dexie liveQuery for reactive updates
    try {
      /**
       * Handle new items from the live query subscription.
       * @param {import("../store/grocery.store.js").GroceryItem[]} items
       */
      const onNext = (items) => {
        this._items = items;
        // Update static cache on every change
        GroceryList.cache.items = items;
        this._render();
      };
      /**
       * Handle live query errors.
       * @param {Error} err
       */
      const onError = (err) => {
        console.error('Live query error:', err);
      };
      // @ts-ignore -- Dexie is a global loaded via CDN script tag in index.html
      const subscription = Dexie.liveQuery(() => getGroceryItems(/** @type {string} */ (this._activeListId)))
        .subscribe({ next: onNext, error: onError });
      this._liveSubscription = /** @type {{ unsubscribe: () => void }} */ (subscription);
    } catch (err) {
      // Fallback: manual poll on each interaction
      console.warn('liveQuery not available, using fallback:', err);
    }
  }

  /**
   * Main render: builds the category-grouped HTML and inserts it into the container.
   * Business Logic: Items are grouped by categoryId. Checked items are separated
   * into a COMPLETED section at the bottom. Each category becomes a <details open>
   * element. Within each group, items are rendered as <grocery-row> elements.
   * After rendering, edit mode state is re-applied to all rows.
   */
  _render() {
    const container = this.querySelector('#grocery-list-container');
    if (!container) return;

    if (this._items.length === 0) {
      container.innerHTML = `
        <div class="page-empty">
          <p>Your grocery list is empty. Add items or plan meals to get started.</p>
        </div>
      `;
      return;
    }

    // Separate unchecked and checked items
    /** @type {import("../store/grocery.store.js").GroceryItem[]} */
    const unchecked = [];
    /** @type {import("../store/grocery.store.js").GroceryItem[]} */
    const checked = [];

    for (const item of this._items) {
      if (item.isChecked) {
        checked.push(item);
      } else {
        unchecked.push(item);
      }
    }

    // Group unchecked items by category
    /** @type {Map<string, import("../store/grocery.store.js").GroceryItem[]>} */
    const groups = new Map();
    for (const item of unchecked) {
      const cat = item.categoryId || 'other';
      const group = groups.get(cat);
      if (group) {
        group.push(item);
      } else {
        groups.set(cat, [item]);
      }
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(groups.keys()).sort();

    // Build category sections HTML
    const categoryHtml = sortedCategories.map((cat) => {
      const items = groups.get(cat) || [];
      return this._buildCategorySection(cat, items, false);
    }).join('');

    // Build COMPLETED section if there are checked items
    const completedHtml = checked.length > 0
      ? this._buildCategorySection('COMPLETED', checked, true)
      : '';

    container.innerHTML = `
      <div class="grocery-sections">
        ${categoryHtml}
        ${completedHtml}
      </div>
    `;

    // Now replace the static HTML placeholders with actual <grocery-row> components
    const containerEl = /** @type {HTMLElement} */ (container);
    this._upgradeRowsToComponents(containerEl, unchecked, false);
    if (checked.length > 0) {
      this._upgradeRowsToComponents(containerEl, checked, true);
    }

    // Re-apply edit mode state to any newly created rows
    if (this._editMode) {
      this._propagateEditMode(true);
    }
  }

  /**
   * Build a single category section as a <details> element.
   * Business Logic: Each category is a collapsible section with a header containing
   * the category label (with item count), a horizontal divider line, and a chevron.
   * This matches the Stitch "Inventory Manager - Categorized List View" design pattern
   * used on the Items Library screen for visual consistency.
   * @param {string} categoryId - The category identifier (displayed as label).
   * @param {import("../store/grocery.store.js").GroceryItem[]} items - Items in this category.
   * @param {boolean} isCompleted - Whether this is the COMPLETED section.
   * @returns {string} HTML string for the section.
   */
  _buildCategorySection(categoryId, items, isCompleted) {
    const label = isCompleted ? 'COMPLETED' : this._formatCategoryName(categoryId);
    const count = items.length;
    const openAttr = 'open';
    const catClass = isCompleted ? 'category-section category-section--completed' : 'category-section';

    // Build placeholder rows — these will be upgraded to <grocery-row> elements
    const rowsHtml = items.map((item) => `
      <div class="grocery-row-placeholder" data-item-id="${item.id}"></div>
    `).join('');

    return `
      <details class="${catClass}" ${openAttr}>
        <summary>
          <div class="category-section__header">
            <span class="category-section__label">${label} (${count})</span>
            <span class="category-section__divider"></span>
            <span class="category-section__chevron">
              <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </span>
          </div>
        </summary>
        <div class="category-section__items">
          ${rowsHtml}
        </div>
      </details>
    `;
  }

  /**
   * Replace placeholder divs with actual <grocery-row> web components.
   * @param {HTMLElement} container - The container element.
   * @param {import("../store/grocery.store.js").GroceryItem[]} items - Item data.
   * @param {boolean} isCompleted - Whether these are completed items.
   */
  _upgradeRowsToComponents(container, items, isCompleted) {
    // isCompleted kept for future extension (checked section styles)
    void isCompleted;
    for (const item of items) {
      const placeholder = container.querySelector(`[data-item-id="${item.id}"]`);
      if (!placeholder) continue;

      const row = /** @type {any} */ (document.createElement('grocery-row'));
      row.item = item;
      placeholder.replaceWith(row);
    }
  }

  /**
   * Format a categoryId into a human-readable label.
   * @param {string} categoryId - The category ID.
   * @returns {string} Formatted category name.
   */
  _formatCategoryName(categoryId) {
    /** @type {Record<string, string>} */
    const labels = {
      produce: 'PRODUCE',
      dairy: 'DAIRY',
      bakery: 'BAKERY',
      meat: 'MEAT',
      pantry: 'PANTRY',
      condiments: 'CONDIMENTS',
      beverages: 'BEVERAGES',
      frozen: 'FROZEN',
      other: 'OTHER',
    };
    return labels[categoryId] || categoryId.toUpperCase();
  }

  /**
   * Open the ingredient picker bottom sheet dialog.
   */
  _openIngredientPicker() {
    const sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('ingredient-picker-sheet'));
    if (sheet && !sheet.open) {
      sheet.showModal();
      // Focus the search input after a brief delay
      setTimeout(() => {
        const searchInput = sheet.querySelector('#ingredient-search');
        if (searchInput) {
          (/** @type {HTMLInputElement} */ (searchInput)).focus();
        }
      }, 100);
    }
  }

  /**
   * Open the essentials quick-add bottom sheet.
   * Business Logic: Shows items flagged isEssential in the library.
   * When "Done" is pressed, all essential items are added to the grocery list
   * with their default QTY. This avoids the need to manually add each one.
   */
  async _openEssentialsSheet() {
    if (!this._activeListId) return;

    // Find or create the essentials sheet dialog
    let sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('essentials-sheet'));

    // If the essentials sheet doesn't exist yet, create it dynamically
    if (!sheet) {
      sheet = this._createEssentialsSheet();
      document.body.appendChild(sheet);
    }

    // Load essential items from Dexie directly
    try {
      const { db } = await import('../db.js');
      /** @type {import("../db.js").Item[]} */
      const allItems = await db.items.toArray();
      // @ts-ignore – isEssential may be boolean, number, or string in IndexedDB
      const essentials = allItems.filter((item) => item.isEssential);
      const body = /** @type {HTMLElement | null} */ (sheet.querySelector('.essentials-body'));
      if (!body) return;

      if (essentials.length === 0) {
        body.innerHTML = '<p class="essentials-empty">No essential items yet. Add some in Items Library.</p>';
      } else {
        body.innerHTML = essentials.map((item) => `
          <div class="essentials-item" data-item-id="${item.id}"
               data-name="${this._escapeHtml(item.name)}"
               data-category="${this._escapeHtml(item.categoryId)}"
               data-unit="${this._escapeHtml(item.unitId)}"
               data-qty="${item.defaultQty}">
            <label class="essentials-item__label">
              <input type="checkbox" class="essentials-item__checkbox" checked aria-label="Select ${this._escapeHtml(item.name)}">
              <span class="essentials-item__checkmark">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </span>
              <span class="essentials-item__info">
                <span class="essentials-item__name">${this._escapeHtml(item.name)}</span>
                <span class="essentials-item__meta">${item.defaultQty} ${item.unitId}</span>
              </span>
            </label>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Failed to load essentials:', err);
    }

    if (!sheet.open) {
      sheet.showModal();
    }
  }

  /**
   * Create the essentials bottom sheet dialog element.
   * @returns {HTMLDialogElement} The created dialog.
   */
  _createEssentialsSheet() {
    const dialog = document.createElement('dialog');
    dialog.id = 'essentials-sheet';
    dialog.className = 'bottom-sheet';
    dialog.innerHTML = `
      <div class="bottom-sheet__content">
        <div class="bottom-sheet__handle"></div>
        <div class="bottom-sheet__header">
          <h2 class="bottom-sheet__title">Every Week (Essentials)</h2>
          <button class="bottom-sheet__close" id="essentials-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="bottom-sheet__body essentials-body">
          <!-- Rendered dynamically -->
        </div>
        <div class="bottom-sheet__actions">
          <button class="btn btn--primary" id="essentials-done">Add to List</button>
        </div>
      </div>
    `;

    dialog.querySelector('#essentials-close')?.addEventListener('click', () => dialog.close());

    // Done — add all checked essential items to the grocery list
    const doneBtn = dialog.querySelector('#essentials-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', async () => {
        const body = /** @type {HTMLElement | null} */ (dialog.querySelector('.essentials-body'));
        if (!body) { dialog.close(); return; }

        const checkedItems = /** @type {HTMLElement[]} */ (Array.from(body.querySelectorAll('.essentials-item')))
          .filter((el) => {
            const checkbox = /** @type {HTMLInputElement | null} */ (el.querySelector('.essentials-item__checkbox'));
            return checkbox && checkbox.checked;
          });

        if (checkedItems.length > 0 && this._activeListId) {
          const { addGroceryItem } = await import('../store/grocery.store.js');
          for (const itemEl of checkedItems) {
            const itemId = itemEl.getAttribute('data-item-id') || '';
            const name = itemEl.getAttribute('data-name') || '';
            const categoryId = itemEl.getAttribute('data-category') || '';
            const unit = itemEl.getAttribute('data-unit') || '';
            const qty = parseFloat(itemEl.getAttribute('data-qty') || '1');
            await addGroceryItem(
              /** @type {string} */ (this._activeListId),
              itemId,
              name,
              categoryId,
              qty,
              unit,
            );
          }
        }
        dialog.close();
      });
    }

    return dialog;
  }

  /**
   * Add an essential item to the grocery list with default QTY.
   * @param {HTMLElement} itemEl - The essentials item element with data attributes.
   */
  async _addEssentialItem(itemEl) {
    if (!this._activeListId) return;

    const itemId = itemEl.getAttribute('data-item-id') || '';
    const name = itemEl.getAttribute('data-name') || '';
    const categoryId = itemEl.getAttribute('data-category') || '';
    const unit = itemEl.getAttribute('data-unit') || '';
    const qty = parseFloat(itemEl.getAttribute('data-qty') || '1');

    try {
      const { addGroceryItem } = await import('../store/grocery.store.js');
      await addGroceryItem(this._activeListId, itemId, name, categoryId, qty, unit);
    } catch (err) {
      console.error('Failed to add essential item:', err);
    }
  }

  /**
   * Handle ingredient selected from the picker — add it to the grocery list.
   * @param {{ itemId: string, name: string, categoryId: string, unit: string, qty: number }} detail
   */
  async _addSelectedIngredient(detail) {
    if (!this._activeListId) return;

    try {
      const { addGroceryItem } = await import('../store/grocery.store.js');
      await addGroceryItem(
        this._activeListId,
        detail.itemId,
        detail.name,
        detail.categoryId,
        detail.qty,
        detail.unit,
      );
    } catch (err) {
      console.error('Failed to add ingredient:', err);
    }
  }

  /**
   * Handle item checked/unchecked event from a grocery-row.
   * @param {{ id: string, isChecked: boolean }} detail
   */
  async _handleItemChecked(detail) {
    try {
      const { toggleChecked } = await import('../store/grocery.store.js');
      await toggleChecked(detail.id, detail.isChecked);
    } catch (err) {
      console.error('Failed to toggle checked state:', err);
    }
  }

  /**
   * Handle item delete event from a grocery-row.
   * @param {{ id: string }} detail
   */
  async _handleItemDelete(detail) {
    try {
      const { removeItem } = await import('../store/grocery.store.js');
      await removeItem(detail.id);
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  }

  /**
   * Handle item quantity change event from a grocery-row (stepper in edit mode).
   * @param {{ id: string, qty: number }} detail
   */
  async _handleItemQtyChange(detail) {
    try {
      const { updateQty } = await import('../store/grocery.store.js');
      await updateQty(detail.id, detail.qty);
    } catch (err) {
      console.error('Failed to update item quantity:', err);
    }
  }

  /**
   * Handle the CLEAR ALL button — confirm then delete all items.
   */
  async _handleClearAll() {
    if (!this._activeListId) return;

    // Use the existing confirm dialog
    const confirmDialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('confirm-dialog'));
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMsg = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');

    if (confirmDialog && confirmTitle && confirmMsg && confirmOk && confirmCancel) {
      confirmTitle.textContent = 'Clear All Items';
      confirmMsg.textContent = 'This will remove all items (checked and unchecked) from your list. This cannot be undone.';
      confirmDialog.showModal();

      /** Handle confirm OK — clear all items and close dialog. */
      const handleOk = async () => {
        try {
          const { clearAllItems } = await import('../store/grocery.store.js');
          await clearAllItems(/** @type {string} */ (this._activeListId));
        } catch (err) {
          console.error('Failed to clear items:', err);
        }
        confirmDialog.close();
        confirmOk.removeEventListener('click', handleOk);
        confirmCancel.removeEventListener('click', handleCancel);
      };

      /** Handle confirm cancel — close dialog without changes. */
      const handleCancel = () => {
        confirmDialog.close();
        confirmOk.removeEventListener('click', handleOk);
        confirmCancel.removeEventListener('click', handleCancel);
      };

      confirmOk.addEventListener('click', handleOk);
      confirmCancel.addEventListener('click', handleCancel);
    }
  }

  /**
   * Escape HTML special characters.
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('grocery-list', GroceryList);