// @ts-check
/**
 * Grocery Row Web Component — single item row in the grocery list.
 * Business Logic: Displays one grocery item with quantity, name, optional
 * recipe link badge, and a circular check toggle. Supports swipe-to-delete
 * via touch events. Emits custom events so the parent <grocery-list> can
 * handle state changes without this component knowing the store.
 * Also supports Edit Mode: on long press emits 'item-long-press' to trigger
 * edit mode at the list level. In edit mode, the checkbox is replaced by a
 * stepper (qty +/-) and delete button.
 * @class
 * @augments {HTMLElement}
 */
export class GroceryRow extends HTMLElement {
  /** @type {ShadowRoot} */
  _shadow;

  /** @type {import("../store/grocery.store.js").GroceryItem | null} */
  _item = null;

  /** @type {boolean} */
  _editMode = false;

  /** @type {number} */
  _startX = 0;
  /** @type {number} */
  _currentX = 0;
  /** @type {boolean} */
  _swiping = false;
  /** @type {boolean} */
  _deleted = false;

  /** @type {HTMLDivElement | null} */
  _rowEl = null;
  /** @type {HTMLInputElement | null} */
  _checkboxEl = null;
  /** @type {HTMLDivElement | null} */
  _infoEl = null;
  /** @type {HTMLDivElement | null} */
  _standardControls = null;
  /** @type {HTMLDivElement | null} */
  _editControls = null;
  /** @type {HTMLButtonElement | null} */
  _deleteBtn = null;
  /** @type {HTMLElement | null} */
  _qtyDisplay = null;

  /** @type {number | undefined} */
  _pressTimer = undefined;

  /** Construct the component with a closed Shadow Root. */
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'closed' });
  }

  /**
   * Set the item data and re-render.
   * @param {import("../store/grocery.store.js").GroceryItem} item
   */
  set item(item) {
    this._item = item;
    this._render();
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
  }

  /** Internal render — stamps the row HTML from a template string. */
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
    const categoryColor = this._getCategoryColor(item.categoryId || '');

    this._shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }

        .row-wrapper {
          position: relative;
          overflow: hidden;
        }

        .delete-overlay {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-error, #ba1a1a);
          color: var(--color-on-error, #ffffff);
          border: none;
          cursor: pointer;
          transform: translateX(100%);
          transition: transform 0.2s ease;
          font: var(--font-badge-caps, 700 12px/1 'Hanken Grotesk', sans-serif);
          letter-spacing: 0.05em;
        }

        .delete-overlay--visible {
          transform: translateX(0);
        }

        .row {
          display: flex;
          align-items: center;
          gap: var(--spacing-base, 8px);
          min-height: var(--spacing-thumb-touch, 48px);
          padding: var(--spacing-base, 8px) 0;
          padding-left: var(--spacing-gutter, 16px);
          padding-right: var(--spacing-gutter, 16px);
          background: var(--color-surface-pure, #ffffff);
          border-bottom: 1px solid var(--color-outline-variant, #bfc9c1);
          border-left: 4px solid ${categoryColor};
          transition: opacity 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          z-index: 1;
          background-color: var(--color-surface-pure, #ffffff);
          touch-action: pan-y;
        }

        .row--checked {
          background-color: var(--color-surface-container-low, #f3f3f6);
          opacity: 0.6;
        }

        .row--edit-mode {
          background-color: var(--color-surface-pure, #ffffff);
          border-color: var(--color-outline-variant, #bfc9c1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          z-index: 100;
        }

        .info {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .name {
          font: var(--font-item-name, 600 18px/1.4 'Hanken Grotesk', sans-serif);
          color: var(--color-on-surface, #1a1c1e);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: color 0.2s ease;
        }

        .name--checked {
          color: var(--color-text-dimmed, #636e72);
          text-decoration: line-through;
        }

        .badge {
          font: var(--font-badge-caps, 700 12px/1 'Hanken Grotesk', sans-serif);
          font-size: 9px;
          padding: 1px 6px;
          border-radius: var(--radius-full, 9999px);
          background: var(--color-success-light, #d8e2dc);
          color: var(--color-on-secondary-fixed-variant, #3b4b38);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .info-bottom {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty {
          font: var(--font-unit-label, 400 14px/1.2 'Hanken Grotesk', sans-serif);
          color: var(--color-primary, #0f5238);
          white-space: nowrap;
        }

        .qty--checked {
          color: var(--color-text-dimmed, #636e72);
        }

        .recipe-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font: var(--font-badge-caps, 700 12px/1 'Hanken Grotesk', sans-serif);
          font-size: 11px;
          color: var(--color-primary, #0f5238);
          white-space: nowrap;
        }

        .recipe-link svg {
          width: 14px;
          height: 14px;
          fill: var(--color-primary, #0f5238);
        }

        /* Standard controls (check toggle) */
        .check {
          width: var(--spacing-thumb-touch, 48px);
          height: var(--spacing-thumb-touch, 48px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 2px solid var(--color-outline, #707973);
          border-radius: var(--radius-full, 9999px);
          background: transparent;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          padding: 0;
        }

        .check--checked {
          background: var(--color-primary, #0f5238);
          border-color: var(--color-primary, #0f5238);
        }

        .check svg {
          width: 20px;
          height: 20px;
          fill: transparent;
          transition: fill 0.2s ease;
        }

        .check--checked svg {
          fill: var(--color-on-primary, #ffffff);
        }

        /* Edit mode controls (stepper + delete) */
        .edit-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .edit-controls--hidden {
          display: none;
        }

        .stepper {
          display: flex;
          align-items: center;
          background: var(--color-surface-container-low, #f3f3f6);
          border-radius: var(--radius-full, 9999px);
          padding: 2px;
          gap: 4px;
          border: 1px solid var(--color-outline-variant, #bfc9c1);
        }

        .stepper-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full, 9999px);
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-on-surface, #1a1c1e);
          transition: background-color 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          padding: 0;
        }

        .stepper-btn:active {
          background-color: var(--color-secondary-container, #d3e5cb);
        }

        .stepper-btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        .stepper-value {
          font: var(--font-item-name, 600 18px/1.4 'Hanken Grotesk', sans-serif);
          font-weight: 700;
          font-size: 14px;
          min-width: 16px;
          text-align: center;
          color: var(--color-on-surface, #1a1c1e);
        }

        .delete-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: var(--radius-full, 9999px);
          cursor: pointer;
          color: var(--color-error, #ba1a1a);
          transition: background-color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          padding: 0;
        }

        .delete-btn:active {
          background-color: var(--color-error-container, #ffdad6);
        }

        .delete-btn svg {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }

        /* Standard controls wrapper */
        .standard-controls {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .standard-controls--hidden {
          display: none;
        }
      </style>

      <div class="row-wrapper">
        <button class="delete-overlay" part="delete-btn">DELETE</button>
        <div class="row" part="row">
          <div class="info">
            <div class="info-top">
              <span class="name">${this._escapeHtml(item.name)}</span>
              ${item.categoryId === 'produce' ? '<span class="badge">ORGANIC</span>' : ''}
            </div>
            <div class="info-bottom">
              <span class="qty">${this._formatQty(item.qty, item.unit)}</span>
              ${hasRecipe ? `<span class="recipe-link">
                <svg viewBox="0 0 24 24"><path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg>
                Recipe</span>` : ''}
            </div>
          </div>
          <!-- Standard controls (checkbox) -->
          <div class="standard-controls">
            <button class="check" part="check-btn">
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </button>
          </div>
          <!-- Edit mode controls (stepper + delete) -->
          <div class="edit-controls edit-controls--hidden">
            <div class="stepper">
              <button class="stepper-btn stepper-minus" aria-label="Decrease quantity">
                <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
              </button>
              <span class="stepper-value">${this._formatQtyForStepper(item.qty)}</span>
              <button class="stepper-btn stepper-plus" aria-label="Increase quantity">
                <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </button>
            </div>
            <button class="delete-btn" aria-label="Delete item">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this._rowEl = this._shadow.querySelector('.row');
    this._checkboxEl = this._shadow.querySelector('.check');
    this._infoEl = this._shadow.querySelector('.info');
    this._standardControls = this._shadow.querySelector('.standard-controls');
    this._editControls = this._shadow.querySelector('.edit-controls');
    this._deleteBtn = this._shadow.querySelector('.delete-btn');
    this._qtyDisplay = this._shadow.querySelector('.stepper-value');

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
    if (!this._rowEl || !this._checkboxEl) return;
    this._rowEl.classList.toggle('row--checked', checked);
    this._checkboxEl.classList.toggle('check--checked', checked);

    const nameEl = this._shadow.querySelector('.name');
    const qtyEl = this._shadow.querySelector('.qty');
    if (nameEl) nameEl.classList.toggle('name--checked', checked);
    if (qtyEl) qtyEl.classList.toggle('qty--checked', checked);
  }

  /**
   * Apply edit mode visual state — show/hide standard vs edit controls.
   */
  _applyEditMode() {
    if (!this._standardControls || !this._editControls || !this._rowEl) return;

    if (this._editMode) {
      this._standardControls.classList.add('standard-controls--hidden');
      this._editControls.classList.remove('edit-controls--hidden');
      this._rowEl.classList.add('row--edit-mode');
    } else {
      this._standardControls.classList.remove('standard-controls--hidden');
      this._editControls.classList.add('edit-controls--hidden');
      this._rowEl.classList.remove('row--edit-mode');
    }
  }

  /** Bind DOM event listeners. */
  _setupListeners() {
    const checkBtn = this._shadow.querySelector('.check');
    if (checkBtn) {
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleCheck();
      });
    }

    const deleteOverlayBtn = this._shadow.querySelector('.delete-overlay');
    if (deleteOverlayBtn) {
      deleteOverlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleDelete();
      });
    }

    // Edit mode delete button
    if (this._deleteBtn) {
      this._deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleDelete();
      });
    }

    // Stepper buttons
    const minusBtn = this._shadow.querySelector('.stepper-minus');
    const plusBtn = this._shadow.querySelector('.stepper-plus');
    if (minusBtn) {
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleStepperChange(-1);
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleStepperChange(1);
      });
    }

    // Long press for entering edit mode
    this.addEventListener('mousedown', (e) => this._onPointerDown(e));
    this.addEventListener('touchstart', (e) => this._onPointerDown(e), { passive: true });
    this.addEventListener('mouseup', () => this._cancelPress());
    this.addEventListener('mouseleave', () => this._cancelPress());
    this.addEventListener('touchend', () => this._cancelPress());
    this.addEventListener('touchmove', () => this._cancelPress());

    // Touch events for swipe-to-delete (only when NOT in edit mode)
    this.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: true });
    this.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: true });
    this.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
  }

  /**
   * Handle pointer down for long-press detection.
   * Business Logic: If not already in edit mode, starts a timer.
   * When the timer fires, dispatches 'item-long-press' to trigger edit mode
   * at the list level. The timer is cancelled on release/move.
   * @param {Event} e - Mouse or touch event.
   */
  _onPointerDown(e) {
    // Don't trigger if clicking child buttons
    if (e.target && /** @type {HTMLElement} */ (e.target).closest('button')) return;

    // Don't trigger long press if already in edit mode
    if (this._editMode) return;

    this._pressTimer = window.setTimeout(() => {
      this.dispatchEvent(new CustomEvent('item-long-press', {
        bubbles: true,
        composed: true,
        detail: { id: this._item ? this._item.id : null },
      }));
    }, 1500);
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
      composed: true,
      detail: { id: this._item.id, isChecked: newChecked },
    }));
  }

  /** Handle delete action. */
  _handleDelete() {
    if (!this._item) return;
    this.dispatchEvent(new CustomEvent('item-delete', {
      bubbles: true,
      composed: true,
      detail: { id: this._item.id },
    }));
  }

  /**
   * Handle stepper quantity change.
   * Business Logic: Adjusts the item quantity by ±1 (minimum 1).
   * Dispatches 'item-qty-change' so the parent list can update Dexie.
   * @param {number} delta - +1 or -1.
   */
  _handleStepperChange(delta) {
    if (!this._item) return;
    const newQty = Math.max(1, (this._item.qty || 1) + delta);
    this._item.qty = newQty;

    // Update stepper display
    if (this._qtyDisplay) {
      this._qtyDisplay.textContent = this._formatQtyForStepper(newQty);
    }

    // Update the small qty label in the info section
    const qtyEl = this._shadow.querySelector('.qty');
    if (qtyEl) {
      qtyEl.textContent = this._formatQty(newQty, this._item.unit);
    }

    this.dispatchEvent(new CustomEvent('item-qty-change', {
      bubbles: true,
      composed: true,
      detail: { id: this._item.id, qty: newQty },
    }));
  }

  /**
   * Touch start — record initial X position.
   * @param {TouchEvent} e
   */
  _onTouchStart(e) {
    this._startX = e.touches[0].clientX;
    this._currentX = this._startX;
    this._swiping = false;
  }

  /**
   * Touch move — calculate swipe distance.
   * @param {TouchEvent} e
   */
  _onTouchMove(e) {
    // Don't swipe in edit mode
    if (this._editMode) return;

    this._currentX = e.touches[0].clientX;
    const diff = this._startX - this._currentX;

    if (Math.abs(diff) > 10) {
      this._swiping = true;
    }

    if (this._swiping && diff > 0) {
      const deleteOverlay = /** @type {HTMLElement | null} */ (this._shadow.querySelector('.delete-overlay'));
      const row = /** @type {HTMLElement | null} */ (this._shadow.querySelector('.row'));
      if (deleteOverlay && row) {
        const swipeAmount = Math.min(diff, 72);
        row.style.transform = `translateX(-${swipeAmount}px)`;
        deleteOverlay.classList.toggle('delete-overlay--visible', swipeAmount >= 36);
      }
    }
  }

  /**
   * Touch end — commit or cancel swipe.
   * @param {TouchEvent} _e - Touch event (unused, we use stored coordinates).
   */
  _onTouchEnd(_e) {
    void _e; // Unused — we use stored touch coordinates
    if (!this._swiping) return;

    const diff = this._startX - this._currentX;
    const row = /** @type {HTMLElement | null} */ (this._shadow.querySelector('.row'));
    const deleteOverlay = /** @type {HTMLElement | null} */ (this._shadow.querySelector('.delete-overlay'));

    if (row) {
      row.style.transform = '';
    }

    if (diff > 36) {
      // Commit delete
      if (deleteOverlay) {
        deleteOverlay.classList.add('delete-overlay--visible');
      }
      this._handleDelete();
    } else {
      // Cancel swipe
      if (deleteOverlay) {
        deleteOverlay.classList.remove('delete-overlay--visible');
      }
    }

    this._swiping = false;
  }

  /**
   * Get the accent border color for a category.
   * @param {string} categoryId
   * @returns {string} CSS color value.
   */
  _getCategoryColor(categoryId) {
    /** @type {Record<string, string>} */
    const colors = {
      produce: 'var(--color-primary, #0f5238)',
      dairy: '#A8DADC',
      bakery: 'var(--color-secondary, #53634e)',
      meat: 'var(--color-tertiary, #713638)',
      pantry: 'var(--color-outline-variant, #bfc9c1)',
      condiments: 'var(--color-outline-variant, #bfc9c1)',
      beverages: 'var(--color-primary-fixed-dim, #95d4b3)',
      frozen: 'var(--color-secondary-fixed-dim, #baccb3)',
    };
    return colors[categoryId] || 'var(--color-outline-variant, #bfc9c1)';
  }

  /**
   * Escape HTML special characters for safe rendering.
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Format quantity + unit for display.
   * @param {number} qty
   * @param {string} unit
   * @returns {string}
   */
  _formatQty(qty, unit) {
    const unitMap = /** @type {Record<string, string>} */ ({
      'pcs': 'pcs',
      'g': 'g',
      'kg': 'kg',
      'l': 'L',
      'ml': 'ml',
    });
    const unitLabel = unitMap[unit] || unit;
    // If qty is a round number, omit decimals
    const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
    return `${qtyStr} ${unitLabel}`;
  }

  /**
   * Format quantity for the stepper display (integer only).
   * @param {number} qty
   * @returns {string}
   */
  _formatQtyForStepper(qty) {
    return Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
  }
}

customElements.define('grocery-row', GroceryRow);