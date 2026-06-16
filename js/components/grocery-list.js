// @ts-check
/* global Dexie -- loaded via CDN <script> tag in index.html */
import { escapeHtml } from '../utils/dom-utils.js';
import { groceryCache } from '../store/grocery.store.js';
import './search-autocomplete.js';

/**
 * @typedef {import("./search-autocomplete.js").SearchAutocomplete} SearchAutocomplete
 */

/** @type {Record<string, string>} */
const CATEGORY_LABELS = {
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
      autoComplete.setAttribute('placeholder', 'Add milk, eggs, bread...');
      autoComplete.className = 'search-bar__input';
      autoComplete.style.border = 'none';
      autoComplete.style.padding = '0';
      autoComplete.style.background = 'none';

      // Listen for item selection
      autoComplete.addEventListener('item-selected', (e) => {
        const detail = /** @type {CustomEvent} */ (e).detail;
        this._addSelectedIngredient(detail);
      });

      existingInput.replaceWith(autoComplete);
      this._searchComponent = autoComplete;
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
      const row = /** @type {import("./grocery-row.js").GroceryRow} */ (rowElements[i]);
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
    const label = isCompleted ? 'COMPLETED' : this._formatCategoryName(categoryId);
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
    return CATEGORY_LABELS[categoryId] || categoryId.toUpperCase();
  }

  /**
   * Open the essentials quick-add bottom sheet.
   * Business Logic: Shows items flagged isEssential in the library.
   * When "Done" is pressed, all selected essential items are added to the
   * grocery list with their default QTY.
   */
  async _openEssentialsSheet() {
    if (!this._activeListId) return;

    let sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('essentials-sheet'));

    if (!sheet) {
      sheet = this._createEssentialsSheet();
      document.body.appendChild(sheet);
    }

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
               data-name="${escapeHtml(item.name)}"
               data-category="${escapeHtml(item.categoryId)}"
               data-unit="${escapeHtml(item.unitId)}"
               data-qty="${item.defaultQty}">
            <label class="essentials-item__label">
              <input type="checkbox" class="essentials-item__checkbox" checked aria-label="Select ${escapeHtml(item.name)}">
              <span class="essentials-item__checkmark">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </span>
              <span class="essentials-item__info">
                <span class="essentials-item__name">${escapeHtml(item.name)}</span>
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
              itemId, name, categoryId, qty, unit,
            );
          }
        }
        dialog.close();
      });
    }

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
        snackbar.show('Item added to list');
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
   * with an "Undo" button. On undo, re-adds the item using the item data
   * captured from the in-memory _items array before deletion.
   * @param {{ id: string }} detail
   */
  async _handleItemDelete(detail) {
    // Capture item data from the in-memory array for potential undo
    const deletedItem = this._items.find((item) => item.id === detail.id);

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
          snackbar.show('Item restored');
        } catch (err) {
          console.error('Failed to restore item:', err);
        }
      };

      snackbar.show('Item removed', {
        undo: true,
        onUndo: handleUndo,
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
   */
  async _handleClearAll() {
    if (!this._activeListId) return;

    const confirmDialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('confirm-dialog'));
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMsg = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');

    if (confirmDialog && confirmTitle && confirmMsg && confirmOk && confirmCancel) {
      confirmTitle.textContent = 'Clear All Items';
      confirmMsg.textContent = 'This will remove all items (checked and unchecked) from your list. This cannot be undone.';
      confirmDialog.showModal();

      /**
       * Handle the OK button click — executes the clear-all action.
       * @returns {Promise<void>}
       */
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

      /**
       * Handle the Cancel button click — closes the confirm dialog.
       * @returns {void}
       */
      const handleCancel = () => {
        confirmDialog.close();
        confirmOk.removeEventListener('click', handleOk);
        confirmCancel.removeEventListener('click', handleCancel);
      };

      confirmOk.addEventListener('click', handleOk);
      confirmCancel.addEventListener('click', handleCancel);
    }
  }
}

customElements.define('grocery-list', GroceryList);