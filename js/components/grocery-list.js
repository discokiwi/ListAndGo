// @ts-check
/* global Dexie -- loaded via CDN <script> tag in index.html */
import { escapeHtml } from '../utils/dom-utils.js';
import { getCategoryName, getAllCategories } from '../store/categories.store.js';
import { getEssentialItems } from '../store/items.store.js';
import { groceryCache } from '../store/grocery.store.js';
import { STRINGS, t } from '../strings/i18n.js';
import './search-autocomplete.js';
import './confirm-dialog.js';
import './content-dialog.js';

/**
 * @typedef {import("./search-autocomplete.js").SearchAutocomplete} SearchAutocomplete
 * @typedef {import("./content-dialog.js").ContentDialog} ContentDialog
 * @typedef {import("./grocery-row.js").GroceryRow} GroceryRow
 * @typedef {import("./confirm-dialog.js").ConfirmDialog} ConfirmDialog
 */

/**
 * Grocery List Web Component — full grocery list page with category grouping,
 * search, essentials quick-add, and clear-all functionality.
 * Business Logic: Uses Dexie's liveQuery() to reactively render the active
 * grocery list grouped by category. Unchecked items appear first in expandable
 * category sections; checked items move to a COMPLETED section at the bottom.
 * Supports Edit Mode: On long press of any item row, the list enters edit mode.
 * In edit mode, a blur overlay covers the screen background, and each row's
 * checkbox is replaced by a stepper and delete button. Clicking the overlay
 * exits edit mode.
 * @augments {HTMLElement}
 */
export class GroceryList extends HTMLElement {
  /** @type {string | null} */
  _activeListId = null;
  /** @type {import("../store/grocery.store.js").GroceryItem[]} */
  _items = [];
  /** @type {{ unsubscribe: () => void } | null} */
  _liveSubscription = null;
  /** @type {boolean} */
  _editMode = false;
  /** @type {HTMLDivElement | null} */
  _overlayEl = null;

  /** @type {SearchAutocomplete | null} */
  _searchComponent = null;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Renders from cache initially,
   * then fetches fresh data and subscribes to liveQuery for reactive updates.
   * Business Logic: Uses the shared in-memory cache from grocery.store.js for
   * synchronous render before the first await, preventing a flash of empty
   * state when the View Transitions API captures the DOM snapshot.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('grocery-list-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

    // Render dynamic template text
    this._renderTemplateText();

    // Create the edit mode overlay
    this._createEditOverlay();

    // Wire up event listeners
    this._setupEventListeners();

    // Synchronous render from store cache BEFORE any await
    if (groceryCache.listId && groceryCache.items.length > 0) {
      this._activeListId = groceryCache.listId;
      this._items = groceryCache.items;
      this._render();
    }

    // Wire up the search-autocomplete component
    this._setupSearchAutocomplete();

    // Start the reactive render loop
    await this._startReactiveRender();

    // Listen for language changes to re-render template text
    document.addEventListener('language-changed', () => {
      this._renderTemplateText();
      this._setupSearchAutocomplete();
      this._render();
    });
  }

  /** Clean up on disconnect. */
  disconnectedCallback() {
    if (this._liveSubscription) {
      try {
        this._liveSubscription.unsubscribe();
      } catch {
        // Ignore
      }
      this._liveSubscription = null;
    }
    if (this._overlayEl && this._overlayEl.parentNode) {
      this._overlayEl.parentNode.removeChild(this._overlayEl);
    }
    this._exitEditMode();
  }

  /**
   * Render dynamic text from STRINGS into the template.
   * Placeholders and text nodes that were hardcoded in index.html now get
   * their values from the active language bundle.
   * @returns {void}
   */
  _renderTemplateText() {
    const essentialsBtn = this.querySelector('#essentials-btn');
    if (essentialsBtn) {
      const textSpan = essentialsBtn.querySelector('.pill__text') || essentialsBtn.querySelector('span:not(.material-symbols-outlined)');
      if (textSpan) {
        textSpan.textContent = STRINGS.grocery.everyWeek;
      } else {
        // If no separate text span, append after existing content
        const textEl = document.createElement('span');
        textEl.textContent = STRINGS.grocery.everyWeek;
        essentialsBtn.appendChild(textEl);
      }
    }

    const clearBtn = this.querySelector('#clear-all-btn');
    if (clearBtn) {
      const textSpan = clearBtn.querySelector('.pill__text') || clearBtn.querySelector('span:not(.material-symbols-outlined)');
      if (textSpan) {
        textSpan.textContent = STRINGS.grocery.clearAll;
      } else {
        const textEl = document.createElement('span');
        textEl.textContent = STRINGS.grocery.clearAll;
        clearBtn.appendChild(textEl);
      }
    }
  }

  /**
   * Create the edit mode overlay element.
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
    overlay.addEventListener('touchstart', () => {}, { passive: true });
    this._overlayEl = overlay;
    this.appendChild(overlay);
  }

  /** Wire up event listeners for buttons and delegated events. */
  _setupEventListeners() {
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

    // Listen for item events from grocery-row
    this.addEventListener('item-checked', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemChecked(detail);
    });

    this.addEventListener('item-delete', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemDelete(detail);
    });

    this.addEventListener('item-qty-change', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._handleItemQtyChange(detail);
    });

    this.addEventListener('item-long-press', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._enterEditMode(detail);
    });
  }

  /** Wire up the search-autocomplete component in the search bar. */
  _setupSearchAutocomplete() {
    const searchWrapper = this.querySelector('.search-bar__input-wrapper');
    if (!searchWrapper) return;

    // Replace the static input with a <search-autocomplete> component
    const existingInput = searchWrapper.querySelector('#grocery-search');
    const existingDropdown = searchWrapper.querySelector('#grocery-search-dropdown');
    if (existingDropdown) existingDropdown.remove();

    if (existingInput) {
      const autoComplete = /** @type {SearchAutocomplete} */ (document.createElement('search-autocomplete'));
      autoComplete.setAttribute('placeholder', STRINGS.grocery.searchPlaceholder);
      autoComplete.className = 'search-bar__input';
      autoComplete.style.border = 'none';
      autoComplete.style.padding = '0';
      autoComplete.style.background = 'none';

      // Listen for item selection
      autoComplete.addEventListener('item-selected', (e) => {
        const detail = /** @type {CustomEvent} */ (e).detail;
        this._addSelectedIngredient(detail);
      });

      // Listen for "Create new item" — open the item editor with the search query pre-filled
      autoComplete.addEventListener('create-custom', (e) => {
        const detail = /** @type {CustomEvent} */ (e).detail;
        const query = detail.query || '';
        this._handleCreateAndAdd(query);
      });

      existingInput.replaceWith(autoComplete);
      this._searchComponent = autoComplete;
    }

    // Listen for item-saved events — used by create-and-add flow
    document.addEventListener('item-saved', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      if (detail && detail.itemId && this._activeListId) {
        // Look up the saved item to get full details (category, unit, etc.)
        this._addSavedItemToGroceryList(detail.itemId);
      }
    });
  }

  /**
   * Handle "Create new item" from search — open item editor with pre-filled name.
   * Business Logic: Dynamically imports and instantiates the item-editor component
   * inside the #item-editor-sheet side drawer, then opens it with the query pre-filled.
   * After saving, the item-saved listener will auto-add to the grocery list.
   * @param {string} query - The search query to pre-fill.
   * @returns {Promise<void>}
   */
  async _handleCreateAndAdd(query) {
    try {
      const sheet = /** @type {HTMLElement | null} */ (document.getElementById('item-editor-sheet'));
      if (!sheet) return;

      // Ensure item-editor component is loaded
      await import('./item-editor.js');

      // Find or create <item-editor> inside the sheet body
      const body = sheet.querySelector('#item-editor-body');
      if (!body) return;

      // @ts-ignore — ItemEditor type unavailable at runtime
      let editor = /** @type {any} */ (body.querySelector('item-editor'));
      if (!editor) {
        editor = document.createElement('item-editor');
        body.appendChild(editor);
      }

      editor.openAdd(query);
    } catch (err) {
      console.error('Failed to open item editor from search:', err);
    }
  }

  /**
   * After a new item is saved via the item editor, add it to the active grocery list.
   * Fetches the full item from the store to get category/unit data.
   * @param {string} itemId - The saved item's UUID.
   * @returns {Promise<void>}
   */
  async _addSavedItemToGroceryList(itemId) {
    if (!this._activeListId) return;

    try {
      const { getItemById } = await import('../store/items.store.js');
      const item = await getItemById(itemId);
      if (!item) return;

      const { addGroceryItem } = await import('../store/grocery.store.js');
      await addGroceryItem(
        this._activeListId,
        item.id,
        item.name,
        item.categoryId || 'other',
        item.defaultQty || 1,
        item.unitId || 'pcs',
      );

      const snackbar = this._getSnackbar();
      if (snackbar) {
        snackbar.show(t(STRINGS.grocery.addedToGroceryList, { name: item.name }));
      }

      // Clear the search component
      if (this._searchComponent) {
        this._searchComponent.clear();
      }
    } catch (err) {
      console.error('Failed to add saved item to grocery list:', err);
    }
  }

  /**
   * Enter edit mode for the grocery list.
   * @param {{ id: string | null }} _detail - The item that was long-pressed.
   */
  _enterEditMode(_detail) {
    void _detail;
    if (this._editMode) return;
    this._editMode = true;

    document.body.classList.add('edit-mode');

    if (this._overlayEl) {
      this._overlayEl.classList.add('edit-mode-overlay--visible');
    }

    this._propagateEditMode(true);

    if (window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  }

  /** Exit edit mode. */
  _exitEditMode() {
    if (!this._editMode) return;
    this._editMode = false;

    document.body.classList.remove('edit-mode');

    if (this._overlayEl) {
      this._overlayEl.classList.remove('edit-mode-overlay--visible');
    }

    this._propagateEditMode(false);
  }

  /**
   * Set edit mode on all <grocery-row> children.
   * @param {boolean} active
   */
  _propagateEditMode(active) {
    const rowElements = this.querySelectorAll('grocery-row');
    for (let i = 0; i < rowElements.length; i++) {
      const row = /** @type {GroceryRow} */ (rowElements[i]);
      if (typeof row.editMode !== 'undefined') {
        row.editMode = active;
      }
    }
  }

  /**
   * Start a live query that re-renders the list whenever Dexie data changes.
   * Business Logic: Gets the active list, fetches items, and sets up a Dexie
   * liveQuery for reactive updates. Updates the shared store cache after every
   * fetch so components can render synchronously from cache on re-connect.
   * @returns {Promise<void>}
   */
  async _startReactiveRender() {
    const { getOrCreateActiveList, getGroceryItems } = await import('../store/grocery.store.js');

    try {
      const list = await getOrCreateActiveList();
      this._activeListId = list.id;
    } catch (err) {
      console.error('Failed to get active list:', err);
      return;
    }

    try {
      const items = await getGroceryItems(/** @type {string} */ (this._activeListId));
      this._items = items;
      groceryCache.listId = this._activeListId;
      groceryCache.items = items;
    } catch (err) {
      console.error('Failed to load initial items:', err);
    }

    this._render();

    // Set up Dexie liveQuery for reactive updates
    try {
      /** @param {import("../store/grocery.store.js").GroceryItem[]} items */
      const onNext = (items) => {
        this._items = items;
        groceryCache.items = items;
        this._render();
      };
      /** @param {Error} err */
      const onError = (err) => {
        console.error('Live query error:', err);
      };
      // @ts-ignore -- Dexie global
      const subscription = Dexie.liveQuery(() => getGroceryItems(/** @type {string} */ (this._activeListId)))
        .subscribe({ next: onNext, error: onError });
      this._liveSubscription = /** @type {{ unsubscribe: () => void }} */ (subscription);
    } catch (err) {
      console.warn('liveQuery not available, using fallback:', err);
    }
  }

  /**
   * Main render: builds the category-grouped HTML and inserts it.
   * Business Logic: Items are grouped by categoryId. Checked items are separated
   * into a COMPLETED section at the bottom. Each category becomes a <details open>
   * element. Within each group, items are rendered as <grocery-row> elements.
   * Categories are sorted by the user's store layout order (sortOrder from
   * categories.store.js), falling back to alphabetical if the fetch fails.
   * Note: The liveQuery callback calls _render() synchronously, so we catch
   * errors gracefully and fall back to alphabetical sort.
   */
  async _render() {
    const container = this.querySelector('#grocery-list-container');
    if (!container) return;

    if (this._items.length === 0) {
      container.innerHTML = `
        <div class="page-empty">
          <p>${STRINGS.grocery.emptyState}</p>
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

    // Sort categories by store layout order (sortOrder from categories store)
    // Business Logic: The user sets the order in Settings → Store Layout.
    // If categories haven't been loaded yet, fall back to alphabetical sort.
    let sortedCategories = Array.from(groups.keys());
    try {
      const allCats = await getAllCategories();
      /** @type {Map<string, number>} */
      const orderMap = new Map();
      allCats.forEach((cat) => { orderMap.set(cat.id, cat.sortOrder ?? 999); });
      sortedCategories.sort((a, b) => {
        const orderA = orderMap.get(a) ?? 999;
        const orderB = orderMap.get(b) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });
    } catch {
      // Fallback to alphabetical if category fetch fails
      sortedCategories.sort();
    }

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

    // Replace static HTML placeholders with actual <grocery-row> components
    const containerEl = /** @type {HTMLElement} */ (container);
    this._upgradeRowsToComponents(containerEl, unchecked, false);
    if (checked.length > 0) {
      this._upgradeRowsToComponents(containerEl, checked, true);
    }

    // Re-apply edit mode state
    if (this._editMode) {
      this._propagateEditMode(true);
    }
  }

  /**
   * Build a single category section as a <details> element.
   * @param {string} categoryId - The category identifier.
   * @param {import("../store/grocery.store.js").GroceryItem[]} items - Items in this category.
   * @param {boolean} isCompleted - Whether this is the COMPLETED section.
   * @returns {string} HTML string for the section.
   */
  _buildCategorySection(categoryId, items, isCompleted) {
    const label = isCompleted ? STRINGS.grocery.completed : this._formatCategoryName(categoryId);
    const count = items.length;
    const openAttr = 'open';
    const catClass = isCompleted ? 'category-section category-section--completed' : 'category-section';

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
   * @param {boolean} _isCompleted - Whether these are completed items.
   */
  _upgradeRowsToComponents(container, items, _isCompleted) {
    void _isCompleted;
    for (const item of items) {
      const placeholder = container.querySelector(`[data-item-id="${item.id}"]`);
      if (!placeholder) continue;

      const row = /** @type {GroceryRow} */ (document.createElement('grocery-row'));
      row.item = item;
      placeholder.replaceWith(row);
    }
  }

  /**
   * Format a categoryId into a human-readable label.
   * @param {string} categoryId - The category UUID.
   * @returns {string} Formatted category name.
   */
  _formatCategoryName(categoryId) {
    return getCategoryName(categoryId).toUpperCase();
  }

  /**
   * Open the essentials quick-add bottom sheet.
   * Business Logic: Shows items flagged isEssential in the library.
   * When "Add to List" is pressed, all selected essential items are added to the
   * grocery list with their default QTY. Uses the reusable <content-dialog> component
   * with a slot-based body for the essentials checklist.
   */
  async _openEssentialsSheet() {
    if (!this._activeListId) return;

    // Create or reuse the content dialog
    let sheetDlg = /** @type {ContentDialog | null} */ (
      document.getElementById('essentials-dialog')
    );

    if (!sheetDlg) {
      sheetDlg = this._createEssentialsSheet();
      document.body.appendChild(sheetDlg);
    }

    // Refresh the body content with latest essentials from items store
    const body = /** @type {HTMLElement | null} */ (sheetDlg.querySelector('.essentials-body'));
    if (!body) return;

    try {
      const essentials = await getEssentialItems();

      if (essentials.length === 0) {
        body.innerHTML = `<p class="essentials-empty">${STRINGS.grocery.essentialsEmpty}</p>`;
      } else {
        // Stitch design: card-style rows with circular checkbox on the right
        body.innerHTML = essentials.map((item) => `
          <label class="essentials-item" data-item-id="${item.id}"
               data-name="${escapeHtml(item.name)}"
               data-category="${escapeHtml(item.categoryId)}"
               data-unit="${escapeHtml(item.unitId)}"
               data-qty="${item.defaultQty}">
            <div class="essentials-item__info">
              <span class="essentials-item__name">${escapeHtml(item.name)}</span>
              <span class="essentials-item__meta">${escapeHtml(getCategoryName(item.categoryId))} • ${item.defaultQty} ${item.unitId}</span>
            </div>
            <div class="essentials-item__check-wrapper">
              <input type="checkbox" class="essentials-item__checkbox" checked aria-label="${t(STRINGS.grocery.addSelected)} ${escapeHtml(item.name)}">
              <span class="essentials-item__check-visual">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </span>
            </div>
          </label>
        `).join('');
      }
    } catch (err) {
      console.error('Failed to load essentials:', err);
    }

    // Show the dialog
    sheetDlg.show();
  }

  /**
   * Create the essentials bottom sheet using <content-dialog> component.
   * Matches the Stitch "Weekly Essentials Dialog" design:
   * - Header with title "Weekly Essentials" + subtitle + close button
   * - Card-style items with circular checkboxes on the right
   * - Two-button footer: Cancel (secondary) + Add Selected (primary)
   * @returns {ContentDialog}
   */
  _createEssentialsSheet() {
    const dialog = /** @type {ContentDialog} */ (document.createElement('content-dialog'));
    dialog.id = 'essentials-dialog';
    dialog.setAttribute('heading', STRINGS.grocery.essentialsHeading);
    dialog.setAttribute('subtitle', STRINGS.grocery.essentialsSubtitle);

    // Body content container
    const body = document.createElement('div');
    body.className = 'essentials-items essentials-body';
    dialog.appendChild(body);

    // Cancel button (slotted into actions)
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'content-dialog__btn content-dialog__btn--secondary';
    cancelBtn.slot = 'actions';
    cancelBtn.textContent = STRINGS.grocery.cancel;
    dialog.appendChild(cancelBtn);

    // Add Selected button (slotted into actions)
    const addBtn = document.createElement('button');
    addBtn.className = 'content-dialog__btn content-dialog__btn--primary';
    addBtn.slot = 'actions';
    addBtn.textContent = STRINGS.grocery.addSelected;
    dialog.appendChild(addBtn);

    // Wire cancel button
    cancelBtn.addEventListener('click', () => {
      dialog.hide();
    });

    // Wire the add button click: collect checked items and add them to grocery list
    addBtn.addEventListener('click', async () => {
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
            itemId, name, categoryId, qty, unit,
          );
        }
      }
      dialog.hide();
    });

    return dialog;
  }

  /**
   * Helper to get the <app-snackbar> element for showing notifications.
   * @returns {import("./app-snackbar.js").AppSnackbar | null}
   */
  _getSnackbar() {
    return /** @type {import("./app-snackbar.js").AppSnackbar | null} */ (document.querySelector('app-snackbar'));
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
        this._activeListId, detail.itemId, detail.name,
        detail.categoryId, detail.qty, detail.unit,
      );
      const snackbar = this._getSnackbar();
      if (snackbar) {
        snackbar.show(t(STRINGS.grocery.addedToGroceryList, { name: detail.name }));
      }
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
   * Business Logic: Removes the item from Dexie, then shows a snackbar
   * with an "Undo" button. On undo, re-adds the item using a shallow copy
   * of the item data captured before the async deletion.
   * @param {{ id: string }} detail
   */
  async _handleItemDelete(detail) {
    // Capture a shallow copy before the async delete to protect against
    // _items being mutated by the liveQuery callback during the delete
    const sourceItem = this._items.find((item) => item.id === detail.id);
    /** @type {import("../store/grocery.store.js").GroceryItem | null} */
    const deletedItem = sourceItem ? { ...sourceItem } : null;

    try {
      const { removeItem } = await import('../store/grocery.store.js');
      await removeItem(detail.id);
    } catch (err) {
      console.error('Failed to remove item:', err);
      return;
    }

    const snackbar = this._getSnackbar();
    if (!snackbar) return;

    if (deletedItem) {
      /**
       * Re-add the deleted item to the grocery list after undo.
       * Business Logic: Uses the captured deletedItem data to re-insert
       * the item into Dexie via addGroceryItem, then shows confirmation.
       * @returns {Promise<void>}
       */
      const handleUndo = async () => {
        try {
          const { addGroceryItem } = await import('../store/grocery.store.js');
          await addGroceryItem(
            /** @type {string} */ (this._activeListId),
            deletedItem.itemId,
            deletedItem.name,
            deletedItem.categoryId || 'other',
            deletedItem.qty,
            deletedItem.unit,
          );
          snackbar.show(t(STRINGS.grocery.restored, { name: deletedItem.name }));
        } catch (err) {
          console.error('Failed to restore item:', err);
        }
      };

      snackbar.show(t(STRINGS.grocery.removed, { name: deletedItem.name }), {
        undo: true,
        onUndo: handleUndo,
        type: 'removed',
      });
    }
  }

  /**
   * Handle item quantity change event from a grocery-row.
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
   * Business Logic: Uses the reusable <confirm-dialog> component with a danger
   * variant. Show the dialog, listen for confirm/cancel events, and clear all
   * items on confirmation. The dialog is created once and cached.
   */
  async _handleClearAll() {
    if (!this._activeListId) return;

    // Create or reuse the confirm dialog
    let confirmDlg = /** @type {any} */ (
      document.getElementById('clear-all-dialog')
    );

    if (!confirmDlg) {
      confirmDlg = /** @type {any} */ (document.createElement('confirm-dialog'));
      confirmDlg.id = 'clear-all-dialog';
      confirmDlg.setAttribute('heading', STRINGS.grocery.clearAllHeading);
      confirmDlg.setAttribute('message', STRINGS.grocery.clearAllMessage);
      confirmDlg.setAttribute('confirm-label', STRINGS.grocery.clearAllConfirm);
      confirmDlg.setAttribute('confirm-variant', 'danger');
      confirmDlg.setAttribute('cancel-label', STRINGS.grocery.clearAllCancel);
      document.body.appendChild(confirmDlg);

      // One-time event listener for confirm
      confirmDlg.addEventListener('dialog-confirm', async () => {
        try {
          const { clearAllItems } = await import('../store/grocery.store.js');
          await clearAllItems(/** @type {string} */ (this._activeListId));
        } catch (err) {
          console.error('Failed to clear items:', err);
        }
      });
    }

    confirmDlg.show();
  }
}

customElements.define('grocery-list', GroceryList);