// @ts-check
/**
 * Item Editor Web Component — Add/Edit Item Side Drawer.
 * Business Logic: Provides a reusable form for creating a new item or editing
 * an existing one. Opens as a side drawer (position:fixed panel from the right).
 * When editing, pre-fills the form with the item's current data. Emits
 * `item-saved` or `item-deleted` custom events on success.
 * Renders the form inline inside `#item-editor-sheet`.
 * Follows the Stitch "Edit Item - Inventory Manager" drawer design spec.
 * @class
 */
export class ItemEditor extends HTMLElement {
  /** @type {import("../db.js").Item | null} */
  #currentItem = null;

  /** @type {string} */
  #mode = 'add'; // 'add' | 'edit'

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Get the side-drawer container element.
   * @returns {HTMLElement | null}
   */
  #getSheet() {
    return /** @type {HTMLElement | null} */ (document.getElementById('item-editor-sheet'));
  }

  /**
   * Called when element is added to the DOM.
   * Wires drawer-level buttons once using a data attribute guard.
   * @returns {void}
   */
  connectedCallback() {
    const sheet = this.#getSheet();
    if (!sheet || sheet.dataset.itemEditorWired) return;
    sheet.dataset.itemEditorWired = 'true';

    sheet.querySelector('#item-editor-save')?.addEventListener('click', () => {
      this.#handleSave();
    });
    sheet.querySelector('#item-editor-cancel')?.addEventListener('click', () => {
      sheet.style.display = 'none';
    });
    sheet.querySelector('#item-editor-close')?.addEventListener('click', () => {
      sheet.style.display = 'none';
    });
    sheet.querySelector('#item-editor-overlay')?.addEventListener('click', () => {
      sheet.style.display = 'none';
    });
  }

  /**
   * Render the form fields inside the component.
   * @returns {void}
   */
  renderForm() {
    const item = this.#currentItem;
    const title = this.#mode === 'add' ? 'New Item' : 'Edit Item';

    this.innerHTML = `
      <form class="ie-form" id="ie-form">
        <!-- Item Name -->
        <div class="ie-field">
          <label class="ie-label" for="ie-name">Item Name</label>
          <input class="ie-input" type="text" id="ie-name" placeholder="e.g. Whole Milk"
            value="${this.#escapeHtml(item?.name || '')}" autocomplete="off" />
        </div>

        <!-- Category + Unit Row -->
        <div class="ie-row">
          <div class="ie-field ie-field--half">
            <label class="ie-label" for="ie-category">Category</label>
            <div class="ie-select-wrap">
              <select class="ie-select" id="ie-category">
                <option value="">Select…</option>
              </select>
              <svg class="ie-select-chevron" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </div>
          </div>
          <div class="ie-field ie-field--half">
            <label class="ie-label" for="ie-unit">Unit</label>
            <div class="ie-select-wrap">
              <select class="ie-select" id="ie-unit">
                <option value="">Select…</option>
              </select>
              <svg class="ie-select-chevron" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </div>
          </div>
        </div>

        <!-- Quantity Stepper -->
        <div class="ie-field">
          <label class="ie-label" for="ie-qty">Default Quantity</label>
          <div class="ie-stepper">
            <button class="ie-stepper-btn" type="button" id="ie-qty-minus" aria-label="Decrease quantity">
              <svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
            </button>
            <input class="ie-stepper-input" type="number" id="ie-qty" value="${item?.defaultQty ?? 1}" min="1" step="1" />
            <button class="ie-stepper-btn" type="button" id="ie-qty-plus" aria-label="Increase quantity">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>
        </div>

        <!-- Toggles -->
        <div class="ie-toggles">
          <!-- One-time use Toggle (switch style) -->
          <label class="ie-toggle-row">
            <div class="ie-toggle-info">
              <span class="ie-toggle-label">One-time use</span>
              <span class="ie-toggle-sub">Remove after first shop</span>
            </div>
            <div class="ie-switch">
              <input type="checkbox" id="ie-one-time" ${item?.isOneTime ? 'checked' : ''} class="ie-switch-input" />
              <span class="ie-switch-track"></span>
            </div>
          </label>

          <!-- Weekly Essential Toggle (star button) -->
          <label class="ie-toggle-row">
            <div class="ie-toggle-info">
              <span class="ie-toggle-label">Weekly Essential</span>
              <span class="ie-toggle-sub">Auto-add to new lists</span>
            </div>
            <button class="ie-star-btn ${item?.isEssential ? 'ie-star-btn--on' : ''}" type="button" id="ie-essential" aria-label="Toggle essential">
              <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </button>
          </label>
        </div>

        <!-- Duplicate Item (edit mode only) -->
        ${this.#mode === 'edit' ? `
          <div class="ie-duplicate">
            <button class="ie-duplicate-btn" type="button" id="ie-duplicate-btn">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              Duplicate Item
            </button>
          </div>
        ` : ''}
      </form>
    `;

    // Populate dropdowns asynchronously
    this.#populateDropdowns(item);

    // Wire stepper buttons
    this.#wireStepper();

    // Wire essential star toggle
    this.#wireEssentialToggle();

    // Update drawer title
    const sheet = this.#getSheet();
    if (sheet) {
      const titleEl = sheet.querySelector('#item-editor-title');
      if (titleEl) titleEl.textContent = title;
    }
  }

  /**
   * Wire up the quantity stepper minus/plus buttons.
   * @returns {void}
   */
  #wireStepper() {
    const input = /** @type {HTMLInputElement | null} */ (this.querySelector('#ie-qty'));
    const minus = this.querySelector('#ie-qty-minus');
    const plus = this.querySelector('#ie-qty-plus');
    if (!input) return;

    minus?.addEventListener('click', () => {
      const val = parseInt(input.value, 10);
      if (val > 1) input.value = String(val - 1);
    });
    plus?.addEventListener('click', () => {
      const val = parseInt(input.value, 10);
      input.value = String(val + 1);
    });
  }

  /**
   * Wire the essential star toggle button.
   * @returns {void}
   */
  #wireEssentialToggle() {
    const btn = this.querySelector('#ie-essential');
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.classList.toggle('ie-star-btn--on');
    });
  }

  /**
   * Populate the category and unit select dropdowns from the database.
   * @param {import("../db.js").Item | null} item - Current item for preselection.
   * @returns {Promise<void>}
   */
  async #populateDropdowns(item) {
    try {
      const { db } = await import('../db.js');

      const catSelect = /** @type {HTMLSelectElement | null} */ (this.querySelector('#ie-category'));
      if (catSelect) {
        const categories = await db.categories.orderBy('name').toArray();
        const existingItems = await db.items.orderBy('categoryId').toArray();
        const existingCats = [...new Set(existingItems.map((/** @type {import("../db.js").Item} */ i) => i.categoryId).filter(Boolean))];
        const allCats = [...new Set([...categories.map((/** @type {import("../db.js").Category} */ c) => c.name), ...existingCats])].sort();

        allCats.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.toLowerCase();
          opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
          if (item?.categoryId === opt.value) opt.selected = true;
          catSelect.appendChild(opt);
        });
      }

      const unitSelect = /** @type {HTMLSelectElement | null} */ (this.querySelector('#ie-unit'));
      if (unitSelect) {
        const units = await db.units.orderBy('name').toArray();
        const defaultUnits = ['pcs', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup'];
        const allUnits = [...new Set([...units.map((/** @type {import("../db.js").Unit} */ u) => u.name), ...defaultUnits])].sort();

        allUnits.forEach((unit) => {
          const opt = document.createElement('option');
          opt.value = unit;
          opt.textContent = unit;
          if (item?.unitId === opt.value) opt.selected = true;
          unitSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Failed to populate dropdowns:', err);
    }
  }

  /**
   * Wire up event listeners for the delete and duplicate buttons.
   * Called each time the editor is opened.
   * @returns {void}
   */
  #wireListeners() {
    // Delete button (edit mode only, in drawer header)
    const sheet = this.#getSheet();
    if (sheet) {
      const deleteBtn = sheet.querySelector('#item-editor-delete-btn');
      if (deleteBtn) {
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', () => this.#handleDelete());
      }
    }

    // Duplicate button (edit mode only, in form)
    const dupBtn = this.querySelector('#ie-duplicate-btn');
    if (dupBtn) {
      dupBtn.addEventListener('click', () => this.#handleDuplicate());
    }
  }

  /**
   * Handle saving the item (create or update).
   * Disables the save button on first click to prevent duplicates,
   * re-enables on error.
   * @returns {Promise<void>}
   */
  async #handleSave() {
    const sheet = this.#getSheet();
    const saveBtn = sheet?.querySelector('#item-editor-save');
    if (!saveBtn || !sheet) return;

    // Disable immediately to prevent double-clicks
    (/** @type {HTMLButtonElement} */ (saveBtn)).disabled = true;

    const nameInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#ie-name'));
    const categorySelect = /** @type {HTMLSelectElement | null} */ (this.querySelector('#ie-category'));
    const qtyInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#ie-qty'));
    const unitSelect = /** @type {HTMLSelectElement | null} */ (this.querySelector('#ie-unit'));
    const oneTimeCheck = /** @type {HTMLInputElement | null} */ (this.querySelector('#ie-one-time'));
    const essentialBtn = this.querySelector('#ie-essential');

    if (!nameInput || !nameInput.value.trim()) {
      nameInput?.focus();
      (/** @type {HTMLButtonElement} */ (saveBtn)).disabled = false;
      return;
    }

    const name = nameInput.value.trim();
    const categoryId = categorySelect?.value || 'uncategorized';
    const defaultQty = qtyInput?.value ? parseInt(qtyInput.value, 10) : 1;
    const unitId = unitSelect?.value || 'pcs';
    const isOneTime = oneTimeCheck?.checked || false;
    const isEssential = essentialBtn?.classList.contains('ie-star-btn--on') || false;

    try {
      const { addItem, updateItem } = await import('../store/items.store.js');

      if (this.#mode === 'add') {
        await addItem({
          familyId: 'default',
          name,
          categoryId,
          unitId,
          defaultQty,
          isEssential,
          isOneTime,
        });
      } else if (this.#currentItem) {
        this.#currentItem.name = name;
        this.#currentItem.categoryId = categoryId;
        this.#currentItem.unitId = unitId;
        this.#currentItem.defaultQty = defaultQty;
        this.#currentItem.isEssential = isEssential;
        this.#currentItem.isOneTime = isOneTime;
        await updateItem(this.#currentItem);
      }

      // Close the drawer
      sheet.style.display = 'none';
      (/** @type {HTMLButtonElement} */ (saveBtn)).disabled = false;

      // Dispatch event so the items library can re-render
      this.dispatchEvent(new CustomEvent('item-saved', { bubbles: true }));
    } catch (err) {
      console.error('Failed to save item:', err);
      (/** @type {HTMLButtonElement} */ (saveBtn)).disabled = false;
    }
  }

  /**
   * Handle deleting the current item (edit mode only).
   * @returns {Promise<void>}
   */
  async #handleDelete() {
    if (!this.#currentItem) return;

    try {
      const { deleteItem } = await import('../store/items.store.js');
      await deleteItem(this.#currentItem.id);

      const sheet = this.#getSheet();
      if (sheet) sheet.style.display = 'none';

      this.dispatchEvent(new CustomEvent('item-deleted', { bubbles: true }));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  /**
   * Handle duplicating the current item (edit mode only).
   * Creates a new item with the same properties but a fresh UUID.
   * @returns {Promise<void>}
   */
  async #handleDuplicate() {
    if (!this.#currentItem) return;

    try {
      const { addItem } = await import('../store/items.store.js');
      const dup = { ...this.#currentItem };
      await addItem({
        familyId: dup.familyId,
        name: dup.name,
        categoryId: dup.categoryId,
        unitId: dup.unitId,
        defaultQty: dup.defaultQty,
        isEssential: dup.isEssential,
        isOneTime: dup.isOneTime,
      });

      this.dispatchEvent(new CustomEvent('item-saved', { bubbles: true }));
    } catch (err) {
      console.error('Failed to duplicate item:', err);
    }
  }

  /**
   * Open the editor for adding a new item.
   * @returns {void}
   */
  openAdd() {
    this.#mode = 'add';
    this.#currentItem = null;
    this.renderForm();
    this.#wireListeners();

    const sheet = this.#getSheet();
    if (!sheet) return;

    // Hide delete button in header for add mode
    const deleteBtn = sheet.querySelector('#item-editor-delete-btn');
    if (deleteBtn) (/** @type {HTMLElement} */ (deleteBtn)).style.display = 'none';

    sheet.style.display = 'flex';
  }

  /**
   * Open the editor for editing an existing item.
   * @param {import("../db.js").Item} item - The item to edit.
   * @returns {void}
   */
  openEdit(item) {
    this.#mode = 'edit';
    this.#currentItem = item;
    this.renderForm();
    this.#wireListeners();

    const sheet = this.#getSheet();
    if (!sheet) return;

    // Show delete button in header for edit mode
    const deleteBtn = sheet.querySelector('#item-editor-delete-btn');
    if (deleteBtn) (/** @type {HTMLElement} */ (deleteBtn)).style.display = 'flex';

    sheet.style.display = 'flex';
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

customElements.define('item-editor', ItemEditor);