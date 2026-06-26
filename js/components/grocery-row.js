// @ts-check
import { escapeHtml, formatQty } from '../utils/dom-utils.js';
import { getCategoryColor } from '../store/categories.store.js';
import './quantity-stepper.js';

/**
 * Grocery Row Web Component — single item row in the grocery list.
 * Business Logic: Displays one grocery item with quantity, name, optional
 * recipe link badge, and a circular check toggle. Uses light DOM so styles
 * come from shared CSS files (item-row.css + grocery-row.css).
 * The recipe badge shows the name of the first recipe that sourced this item,
 * resolved via a Dexie query on sourceRecipeIds.
 * Supports Edit Mode: on long press emits 'item-long-press' to trigger
 * edit mode at the list level. In edit mode, the checkbox is replaced by a
 * reusable <quantity-stepper> component and delete button.
 * @augments {HTMLElement}
 */
export class GroceryRow extends HTMLElement {
  /** @type {import("../store/grocery.store.js").GroceryItem | null} */
  _item = null;

  /** @type {boolean} */
  _editMode = false;

  /** @type {number | undefined} */
  _pressTimer = undefined;

  /** @type {string} Cached recipe label for the badge (e.g. "Pasta Bolognese") */
  _recipeLabel = '';

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Set the item data and re-render.
   * @param {import("../store/grocery.store.js").GroceryItem} item
   */
  set item(item) {
    this._item = item;
    this._recipeLabel = ''; // Clear cached label
    this._render();
    // Async fetch recipe name
    this._resolveRecipeLabel();
  }

  /**
   * @returns {import("../store/grocery.store.js").GroceryItem | null}
   */
  get item() {
    return this._item;
  }

  /**
   * Set edit mode state on this row.
   * @param {boolean} active
   */
  set editMode(active) {
    this._editMode = active;
    this._applyEditMode();
  }

  /**
   * @returns {boolean}
   */
  get editMode() {
    return this._editMode;
  }

  /** Called when element is added to the DOM. */
  connectedCallback() {
    this._render();
    this._resolveRecipeLabel();
  }

  /**
   * Async fetch recipe name from sourceRecipeIds and update the badge in light DOM.
   * Business Logic: Queries Dexie for the first recipe ID in sourceRecipeIds and
   * gets its title. If multiple recipes reference the same item, only the first
   * recipe name is shown (with "+N more" if additional recipes exist).
   * @returns {Promise<void>}
   */
  async _resolveRecipeLabel() {
    if (!this._item) return;

    /** @type {string[]} */
    let recipeIds;
    try {
      recipeIds = JSON.parse(this._item.sourceRecipeIds || '[]');
    } catch {
      recipeIds = [];
    }

    if (recipeIds.length === 0) return;

    try {
      const { db } = await import('../db.js');
      const recipe = await db.recipes.get(recipeIds[0]);
      if (recipe) {
        this._recipeLabel = recipe.title;
      } else {
        this._recipeLabel = 'Recipe';
      }

      // If there are additional recipes, append "+N more"
      if (recipeIds.length > 1) {
        this._recipeLabel += ` +${recipeIds.length - 1}`;
      }

      // Update the badge text in the DOM
      const badge = this.querySelector('.gr-row__recipe-link');
      if (badge) {
        // Keep the SVG icon, update the text
        const textNode = badge.childNodes[badge.childNodes.length - 1];
        if (textNode) {
          textNode.textContent = this._recipeLabel;
        }
      }
    } catch (err) {
      console.error('Failed to resolve recipe label:', err);
    }
  }

  /** Internal render — builds the row HTML. */
  _render() {
    if (!this._item) return;
    const item = this._item;

    // Parse recipe source IDs to check if item came from a recipe
    /** @type {string[]} */
    let recipeIds;
    try {
      recipeIds = JSON.parse(item.sourceRecipeIds || '[]');
    } catch {
      recipeIds = [];
    }
    const hasRecipe = recipeIds.length > 0;

    // Determine category accent color (left border)
    const categoryColor = getCategoryColor(item.categoryId || '');
    const unitLabel = item.unit || '';

    this.innerHTML = `
      <div class="gr-row" style="--accent-color: ${categoryColor}" data-item-id="${item.id}">
        <div class="gr-row__info">
          <div class="gr-row__info-top">
            <span class="gr-row__name">${escapeHtml(item.name)}</span>
          </div>
          <div class="gr-row__info-bottom">
            <span class="gr-row__qty">${formatQty(item.qty, unitLabel)}</span>
            ${hasRecipe ? `<span class="gr-row__recipe-link">
              <svg viewBox="0 0 24 24"><path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg>
              Recipe</span>` : ''}
          </div>
        </div>
        <!-- Standard controls (checkbox) -->
        <div class="gr-row__controls">
          <button class="gr-row__check" aria-label="${item.isChecked ? 'Uncheck' : 'Check'} ${escapeHtml(item.name)}">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </button>
        </div>
        <!-- Edit mode controls (quantity-stepper + delete) -->
        <div class="gr-row__edit-controls" style="display:none">
          <quantity-stepper class="gr-row__stepper" value="${item.qty}" min="1" max="99">
          </quantity-stepper>
          <button class="gr-row__delete-btn" aria-label="Delete item">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    `;

    // Apply checked state if item is already checked
    if (item.isChecked) {
      this._applyChecked(true);
    }

    // Apply edit mode state
    this._applyEditMode();

    // Set up event listeners
    this._setupListeners();
  }

  /**
   * Apply visual checked/unchecked state to the row.
   * @param {boolean} checked
   */
  _applyChecked(checked) {
    const row = this.querySelector('.gr-row');
    const checkBtn = this.querySelector('.gr-row__check');
    const nameEl = this.querySelector('.gr-row__name');
    const qtyEl = this.querySelector('.gr-row__qty');
    if (row) row.classList.toggle('gr-row--checked', checked);
    if (checkBtn) checkBtn.classList.toggle('gr-row__check--checked', checked);
    if (nameEl) nameEl.classList.toggle('gr-row__name--checked', checked);
    if (qtyEl) qtyEl.classList.toggle('gr-row__qty--checked', checked);
  }

  /**
   * Apply edit mode visual state — show/hide standard vs edit controls.
   */
  _applyEditMode() {
    const controls = this.querySelector('.gr-row__controls');
    const editControls = this.querySelector('.gr-row__edit-controls');
    const row = this.querySelector('.gr-row');
    if (!controls || !editControls || !row) return;

    if (this._editMode) {
      (/** @type {HTMLElement} */ (controls)).style.display = 'none';
      (/** @type {HTMLElement} */ (editControls)).style.display = 'flex';
      row.classList.add('gr-row--edit-mode');
    } else {
      (/** @type {HTMLElement} */ (controls)).style.display = '';
      (/** @type {HTMLElement} */ (editControls)).style.display = 'none';
      row.classList.remove('gr-row--edit-mode');
    }
  }

  /** Bind DOM event listeners. */
  _setupListeners() {
    const checkBtn = this.querySelector('.gr-row__check');
    if (checkBtn) {
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleCheck();
      });
    }

    const deleteBtn = this.querySelector('.gr-row__delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleDelete();
      });
    }

    // Listen for stepper changes on the quantity-stepper component
    const stepper = this.querySelector('.gr-row__stepper');
    if (stepper) {
      stepper.addEventListener('stepper-change', (e) => {
        e.stopPropagation();
        const detail = /** @type {CustomEvent} */ (e).detail;
        this._handleStepperChange(detail.value);
      });
    }

    // Long press for entering edit mode
    const row = this.querySelector('.gr-row');
    if (row) {
      row.addEventListener('mousedown', (e) => this._onRowPointerDown(e));
      row.addEventListener('touchstart', (e) => this._onRowPointerDown(e), { passive: true });
      row.addEventListener('mouseup', () => this._cancelPress());
      row.addEventListener('mouseleave', () => this._cancelPress());
      row.addEventListener('touchend', () => this._cancelPress());
      row.addEventListener('touchmove', () => this._cancelPress());
    }
  }

  /**
   * Handle pointer down for long-press detection on the row body.
   * Business Logic: If not already in edit mode and the target is NOT a button
   * (checkbox, stepper, delete, etc.), starts a 500ms timer. When the timer
   * fires, dispatches 'item-long-press' to trigger edit mode at the list level.
   * The timer is cancelled on release/move.
   * @param {Event} e - Mouse or touch event.
   */
  _onRowPointerDown(e) {
    if (this._editMode) return;
    if (e.target && /** @type {HTMLElement} */ (e.target).closest('button')) return;

    this._pressTimer = window.setTimeout(() => {
      this.dispatchEvent(new CustomEvent('item-long-press', {
        bubbles: true,
        detail: { id: this._item ? this._item.id : null },
      }));
    }, 500);
  }

  /** Cancel the long-press timer. */
  _cancelPress() {
    if (this._pressTimer) {
      clearTimeout(this._pressTimer);
      this._pressTimer = undefined;
    }
  }

  /** Handle check toggle. */
  _handleCheck() {
    if (!this._item) return;
    const newChecked = !this._item.isChecked;
    this._item.isChecked = newChecked;
    this._applyChecked(newChecked);

    this.dispatchEvent(new CustomEvent('item-checked', {
      bubbles: true,
      detail: { id: this._item.id, isChecked: newChecked },
    }));
  }

  /** Handle delete action. */
  _handleDelete() {
    if (!this._item) return;
    this.dispatchEvent(new CustomEvent('item-delete', {
      bubbles: true,
      detail: { id: this._item.id },
    }));
  }

  /**
   * Handle quantity-stepper value change.
   * Business Logic: Called when the <quantity-stepper> component fires a
   * 'stepper-change' event. Updates the in-memory item data and dispatches
   * 'item-qty-change' so the parent list can update Dexie.
   * @param {number} newQty - The new quantity value from the stepper.
   */
  _handleStepperChange(newQty) {
    if (!this._item) return;
    this._item.qty = newQty;

    // Update the small qty label in the info section
    const qtyEl = this.querySelector('.gr-row__qty');
    if (qtyEl) {
      const unitLabel = this._item.unit || '';
      qtyEl.textContent = formatQty(newQty, unitLabel);
    }

    this.dispatchEvent(new CustomEvent('item-qty-change', {
      bubbles: true,
      detail: { id: this._item.id, qty: newQty },
    }));
  }
}

customElements.define('grocery-row', GroceryRow);