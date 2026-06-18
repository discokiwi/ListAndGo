// @ts-check
/**
 * Settings Drawer Web Component.
 * Business Logic: A slide-in side drawer triggered by the top-bar settings gear icon.
 * Contains 4 tabbed sections (Account, Store, Recipe, Items) with reusable
 * sub-components for settings sections and rows. Provides a full settings UI
 * matching the Stitch design. Categories persisted to Dexie for family sync.
 * @module
 */

import { addCategory, updateCategory, deleteCategory, getAllCategories, updateCategoryOrder } from '../store/categories.store.js';

/**
 * The 14 category accent colors from design tokens.
 * @type {{ name: string, value: string }[]}
 */
const CATEGORY_COLORS_14 = [
  { name: 'Deep Forest Green', value: '#2D6A4F' },
  { name: 'Soft Cerulean Blue', value: '#4895EF' },
  { name: 'Warm Toasted Beige', value: '#D4A373' },
  { name: 'Muted Crimson Red', value: '#BC4749' },
  { name: 'Earthy Cinnamon Brown', value: '#7F5539' },
  { name: 'Bright Sky Blue', value: '#4CC9F0' },
  { name: 'Vibrant Berry Pink', value: '#F72585' },
  { name: 'Zesty Sunset Orange', value: '#FB8B24' },
  { name: 'Deep Royal Purple', value: '#7209B7' },
  { name: 'Rich Plum Magenta', value: '#B5179E' },
  { name: 'Bold Indigo Blue', value: '#3F37C9' },
  { name: 'Gentle Aquamarine', value: '#48BFE3' },
  { name: 'Bright Lavender Purple', value: '#8338EC' },
  { name: 'Golden Amber Yellow', value: '#FFBE0B' },
];

/**
 * Pick a random color from the palette.
 * @returns {string} Hex color value.
 */
function getRandomColor() {
  return CATEGORY_COLORS_14[Math.floor(Math.random() * CATEGORY_COLORS_14.length)].value;
}

/**
 * Settings Drawer Web Component class.
 * @augments HTMLElement
 */
export class SettingsDrawer extends HTMLElement {
  /** @type {boolean} */
  #isOpen = false;

  /** @type {HTMLDivElement | null} */
  #drawer = null;

  /** @type {HTMLDivElement | null} */
  #backdrop = null;

  /** @type {number} */
  #touchStartX = 0;

  /** @type {number} */
  #touchEndX = 0;

  /** @type {import("../db.js").Category[]} */
  #categories = [];
  /** @type {import("../db.js").Category[]} */
  #storeCategories = [];

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Open the settings drawer.
   * @returns {void}
   */
  open() {
    this.#isOpen = true;
    this.#updateDisplay();
    document.body.classList.add('settings-drawer-open');
    this.#loadData();
  }

  /**
   * Close the settings drawer.
   * @returns {void}
   */
  close() {
    this.#isOpen = false;
    this.#updateDisplay();
    document.body.classList.remove('settings-drawer-open');
  }

  /**
   * Toggle the drawer open/closed.
   * @returns {void}
   */
  toggle() {
    if (this.#isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** @returns {void} */
  #updateDisplay() {
    if (this.#drawer) {
      this.#drawer.classList.toggle('settings-drawer--open', this.#isOpen);
    }
    if (this.#backdrop) {
      this.#backdrop.classList.toggle('settings-drawer__backdrop--open', this.#isOpen);
    }
  }

  /**
   * @param {string} tabName
   * @returns {void}
   */
  #switchTab(tabName) {
    const tabs = this.querySelectorAll('.settings-tabs__btn');
    tabs.forEach((btn) => {
      const tab = btn.getAttribute('data-tab');
      if (tab === tabName) {
        btn.classList.add('settings-tabs__btn--active');
      } else {
        btn.classList.remove('settings-tabs__btn--active');
      }
    });

    const panels = this.querySelectorAll('.settings-tabpanel');
    panels.forEach((panel) => {
      const panelTab = panel.getAttribute('data-panel');
      if (panelTab === tabName) {
        panel.classList.remove('settings-tabpanel--hidden');
      } else {
        panel.classList.add('settings-tabpanel--hidden');
      }
    });
  }

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  #handleKeydown(e) {
    if (e.key === 'Escape' && this.#isOpen) {
      this.close();
    }
  }

  /**
   * @param {TouchEvent} e
   * @returns {void}
   */
  #handleTouchStart(e) {
    this.#touchStartX = e.changedTouches[0].screenX;
  }

  /**
   * @param {TouchEvent} e
   * @returns {void}
   */
  #handleTouchEnd(e) {
    this.#touchEndX = e.changedTouches[0].screenX;
    if (this.#touchEndX > this.#touchStartX + 100) {
      this.close();
    }
  }

  /** @returns {Promise<void>} */
  async #loadData() {
    try {
      this.#categories = await getAllCategories();
      this.#storeCategories = [...this.#categories];
      this.#populateCategoriesList();
      this.#populateStoreList();
      this.#wireItemsTabInteractions();
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  }

  /** @returns {void} */
  connectedCallback() {
    if (this.hasChildNodes()) return;

    this.innerHTML = `
      <div class="settings-drawer__backdrop" id="drawer-backdrop"></div>
      <aside class="settings-drawer" id="settings-drawer-panel">
        <header class="settings-drawer__header">
          <button class="settings-drawer__close" id="drawer-close" aria-label="Close settings">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <h2 class="settings-drawer__title">Settings</h2>
          <div class="settings-drawer__header-spacer"></div>
        </header>
        <nav class="settings-tabs">
          <button class="settings-tabs__btn settings-tabs__btn--active" data-tab="account">ACCOUNT</button>
          <button class="settings-tabs__btn" data-tab="store">STORE</button>
          <button class="settings-tabs__btn" data-tab="recipe">RECIPE</button>
          <button class="settings-tabs__btn" data-tab="items">ITEMS</button>
        </nav>
        <div class="settings-drawer__body">
          <div class="settings-tabpanel" data-panel="account">
            <section>
              <h3 class="settings-section__heading">Account Management</h3>
              <div class="settings-section__card">
                <div class="settings-row settings-row--profile">
                  <div class="settings-profile">
                    <div class="settings-profile__avatar">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-on-surface-variant)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                    <div class="settings-profile__info">
                      <p class="settings-profile__name">Sarah Jenkins</p>
                      <p class="settings-profile__email">sarah.j@kitchen-manager.com</p>
                    </div>
                  </div>
                </div>
                <div class="settings-btn-group">
                  <button class="btn btn--primary">UPDATE</button>
                  <button class="btn btn--danger">DELETE</button>
                </div>
              </div>
            </section>
            <section>
              <h3 class="settings-section__heading">Family & Household</h3>
              <div class="settings-section__card">
                <div class="settings-family-row">
                  <div class="settings-family-info">
                    <svg class="settings-family-icon" width="24" height="24" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <div class="settings-family-detail">
                      <span class="settings-family-name">Mark Jenkins</span>
                      <span class="settings-family-role">Administrator</span>
                    </div>
                  </div>
                  <button class="settings-family-more" aria-label="More options"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
                </div>
                <div class="settings-family-row">
                  <div class="settings-family-info">
                    <svg class="settings-family-icon" width="24" height="24" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <div class="settings-family-detail">
                      <span class="settings-family-name">Olivia Jenkins</span>
                      <span class="settings-family-role">Member</span>
                    </div>
                  </div>
                  <button class="settings-family-more" aria-label="More options"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></button>
                </div>
                <button class="settings-invite-btn"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> INVITE MEMBER</button>
              </div>
            </section>
            <section>
              <h3 class="settings-section__heading">Reset</h3>
              <div class="settings-section__card">
                <div class="settings-row">
                  <span class="settings-row__label">Reset all data to factory defaults</span>
                </div>
                <div class="settings-btn-group">
                  <button class="btn btn--danger" id="reset-defaults-btn">RESET TO DEFAULTS</button>
                </div>
              </div>
            </section>
          </div>

          <div class="settings-tabpanel settings-tabpanel--hidden" data-panel="store">
            <section>
              <h3 class="settings-section__heading">Store Layout</h3>
              <div class="settings-section__card">
                <div class="settings-layout-info">
                  <span class="settings-layout-info__label">Category Order</span>
                  <svg class="settings-layout-info__icon" width="16" height="16" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <div id="settings-store-categories-list"><!-- Populated by JS --></div>
              </div>
            </section>
          </div>

          <div class="settings-tabpanel settings-tabpanel--hidden" data-panel="recipe">
            <section>
              <h3 class="settings-section__heading">Recipe Defaults</h3>
              <div class="settings-section__card">
                <div class="settings-row">
                  <span class="settings-row__label">Default number of persons</span>
                  <quantity-stepper value="2" min="1" max="20"></quantity-stepper>
                </div>
              </div>
            </section>
          </div>

          <div class="settings-tabpanel settings-tabpanel--hidden" data-panel="items">
            <!-- Item Categories Section only — units removed -->
            <section>
              <h3 class="settings-section__heading">Item Categories</h3>
              <div class="settings-categories-card" id="settings-categories-card">
                <div id="settings-categories-list"><!-- Populated by JS --></div>
                <div class="settings-add-row" id="settings-category-add-row">
                  <input class="settings-add-row__input" id="settings-add-category-input" type="text" placeholder="Add Category" autocomplete="off" />
                  <button class="settings-add-row__btn--icon-only" id="settings-add-category-btn" aria-label="Add category">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
        <footer class="settings-drawer__footer">
          <button class="settings-drawer__save-btn" id="drawer-save-btn">Save All Changes</button>
        </footer>
      </aside>
    `;

    this.#drawer = this.querySelector('#settings-drawer-panel');
    this.#backdrop = this.querySelector('#drawer-backdrop');

    this.querySelector('#drawer-close')?.addEventListener('click', () => this.close());
    this.#backdrop?.addEventListener('click', () => this.close());

    this.querySelectorAll('.settings-tabs__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.#switchTab(tab);
      });
    });

    this.querySelector('#drawer-save-btn')?.addEventListener('click', () => {
      this.#saveStoreLayout();
      this.dispatchEvent(new CustomEvent('settings-save', { bubbles: true, composed: true, detail: { action: 'save' } }));
      this.close();
    });

    this.querySelector('#reset-defaults-btn')?.addEventListener('click', () => this.#handleResetDefaults());

    document.addEventListener('keydown', (e) => this.#handleKeydown(e));
    if (this.#drawer) {
      this.#drawer.addEventListener('touchstart', (e) => this.#handleTouchStart(e), false);
      this.#drawer.addEventListener('touchend', (e) => this.#handleTouchEnd(e), false);
    }
    document.addEventListener('open-settings', () => { this.open(); });
  }

  /** @returns {Promise<void>} */
  async #handleResetDefaults() {
    if (!confirm('Reset all data to factory defaults? This cannot be undone.')) return;
    try {
      const { db } = await import('../db.js');
      const { seedCategories } = await import('../store/categories.store.js');
      const { seedItems } = await import('../store/items.store.js');
      const { loadCategoryColorCache } = await import('../utils/category-colors.js');

      await db.items.clear();
      await db.categories.clear();
      await db.units?.clear();
      await db.recipes.clear();
      await db.recipeIngredients.clear();
      await db.groceryLists.clear();
      await db.groceryItems.clear();
      await db.mealPlans.clear();
      await db.storeLayouts.clear();
      await db.settings.clear();

      await seedCategories();
      await seedItems();
      await loadCategoryColorCache();
      await this.#loadData();
      document.dispatchEvent(new CustomEvent('categories-changed'));

      const snackbar = /** @type {any} */ (document.querySelector('app-snackbar'));
      if (snackbar && typeof snackbar.show === 'function') snackbar.show('Data reset to defaults');
    } catch (err) {
      console.error('Failed to reset defaults:', err);
    }
  }

  /** @returns {void} */
  #populateCategoriesList() {
    const list = this.querySelector('#settings-categories-list');
    if (!list) return;
    list.innerHTML = this.#categories.map((cat) => `
      <div class="settings-category-row" style="border-left-color: ${cat.color}" data-category-id="${cat.id}">
        <span class="settings-category-color-wrap">
          <button class="settings-category-row__dot" data-action="edit-category-color" data-category-id="${cat.id}" style="background: ${cat.color}" aria-label="Change color for ${cat.name}"></button>
          <div class="settings-color-picker settings-color-picker--cat" id="color-picker-${cat.id}">
            <div class="settings-color-picker__grid">
              ${CATEGORY_COLORS_14.map((c) => `
                <button class="settings-color-picker__swatch" data-color="${c.value}" style="background: ${c.value}" aria-label="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </span>
        <span class="settings-category-row__name" data-action="edit-category-name" data-category-id="${cat.id}">${cat.name}</span>
        <button class="settings-category-row__delete" data-action="delete-category" data-category-id="${cat.id}" aria-label="Delete category">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `).join('');
  }

  /** @returns {void} */
  #wireItemsTabInteractions() {
    const addCatBtn = this.querySelector('#settings-add-category-btn');
    const addCatInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#settings-add-category-input'));
    if (addCatBtn) {
      const newCatBtn = addCatBtn.cloneNode(true);
      addCatBtn.parentNode?.replaceChild(newCatBtn, addCatBtn);
      newCatBtn.addEventListener('click', async () => {
        if (!addCatInput) return;
        const name = addCatInput.value.trim();
        if (!name) return;
        try {
          await addCategory(name, getRandomColor());
          addCatInput.value = '';
          await this.#loadData();
        } catch (err) {
          console.error('Failed to add category:', err);
        }
      });
    }
    addCatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = this.querySelector('#settings-add-category-btn');
        if (btn) (/** @type {HTMLButtonElement} */ (btn)).click();
      }
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.settings-color-picker--open').forEach((p) => p.classList.remove('settings-color-picker--open'));
    }, { once: false });

    this.#wireCategoryInteractions();
  }

  /** @returns {void} */
  #wireCategoryInteractions() {
    this.querySelectorAll('[data-action="delete-category"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const catId = btn.getAttribute('data-category-id');
        if (!catId) return;
        try {
          await deleteCategory(catId);
          await this.#loadData();
        } catch (err) {
          console.error('Failed to delete category:', err);
        }
      });
    });

    this.querySelectorAll('[data-action="edit-category-color"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.getAttribute('data-category-id');
        if (!catId) return;
        const wrap = btn.closest('.settings-category-color-wrap');
        if (!wrap) return;
        const picker = wrap.querySelector('.settings-color-picker--cat');
        if (!picker) return;

        document.querySelectorAll('.settings-color-picker--open').forEach((p) => {
          if (p !== picker) p.classList.remove('settings-color-picker--open');
        });
        picker.classList.toggle('settings-color-picker--open');

        picker.querySelectorAll('.settings-color-picker__swatch').forEach((swatch) => {
          swatch.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const color = swatch.getAttribute('data-color');
            if (!color || !catId) return;
            try {
              await updateCategory(catId, { color });
              await this.#loadData();
            } catch (err) {
              console.error('Failed to update category color:', err);
            }
          });
        });
      });
    });

    this.querySelectorAll('[data-action="edit-category-name"]').forEach((nameEl) => {
      nameEl.addEventListener('click', () => {
        const catId = nameEl.getAttribute('data-category-id');
        if (!catId) return;
        const currentName = nameEl.textContent || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'settings-category-row__edit-input';
        input.value = currentName;
        input.autocomplete = 'off';
        nameEl.replaceWith(input);
        input.focus();
        input.select();

        /** @param {boolean} save */
        const finishEditing = async (save) => {
          const newName = input.value.trim();
          const span = document.createElement('span');
          span.className = 'settings-category-row__name';
          span.setAttribute('data-action', 'edit-category-name');
          span.setAttribute('data-category-id', catId);
          span.textContent = save && newName ? newName : currentName;
          input.replaceWith(span);
          if (this.isConnected) this.#wireCategoryInteractions();
          if (save && newName && newName !== currentName) {
            try {
              await updateCategory(catId, { name: newName });
              await this.#loadData();
            } catch (err) {
              console.error('Failed to update category name:', err);
            }
          }
        };

        input.addEventListener('blur', () => finishEditing(true));
        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
          if (ke.key === 'Escape') { ke.preventDefault(); finishEditing(false); }
        });
      });
    });
  }

  /** @returns {void} */
  #populateStoreList() {
    const list = this.querySelector('#settings-store-categories-list');
    if (!list) return;
    list.innerHTML = this.#storeCategories.map((cat, index) => {
      const isFirst = index === 0;
      const isLast = index === this.#storeCategories.length - 1;
      return `
        <div class="settings-layout-row" data-category-id="${cat.id}" draggable="true">
          <span class="settings-layout-row__drag" aria-label="Drag to reorder">
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/></svg>
          </span>
          <span class="settings-layout-row__color" style="background: ${cat.color}"></span>
          <span class="settings-layout-row__name">${this.#escapeHtml(cat.name)}</span>
          <span class="settings-layout-row__arrows">
            <button class="settings-layout-row__arrow" data-action="store-move-up" data-category-id="${cat.id}" ${isFirst ? 'disabled' : ''} aria-label="Move ${cat.name} up">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
            </button>
            <button class="settings-layout-row__arrow" data-action="store-move-down" data-category-id="${cat.id}" ${isLast ? 'disabled' : ''} aria-label="Move ${cat.name} down">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
            </button>
          </span>
        </div>
      `;
    }).join('');

    // Wire up drag-and-drop handlers
    /** @type {string | null} */
    let draggedId = null;

    const rows = list.querySelectorAll('.settings-layout-row');
    rows.forEach((row) => {
      // Drag start
      row.addEventListener('dragstart', (e) => {
        draggedId = row.getAttribute('data-category-id');
        row.classList.add('settings-layout-row--dragging');
        // @ts-ignore – dataTransfer exists on DragEvent
        e.dataTransfer?.setData('text/plain', draggedId || '');
        // @ts-ignore
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      });

      // Drag over — prevent default to allow drop
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        // @ts-ignore
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const catId = row.getAttribute('data-category-id');
        if (catId && catId !== draggedId) {
          row.classList.add('settings-layout-row--drag-over');
        }
      });

      // Drag enter
      row.addEventListener('dragenter', (e) => {
        e.preventDefault();
        const catId = row.getAttribute('data-category-id');
        if (catId && catId !== draggedId) {
          row.classList.add('settings-layout-row--drag-over');
        }
      });

      // Drag leave
      row.addEventListener('dragleave', () => {
        row.classList.remove('settings-layout-row--drag-over');
      });

      // Drop — move the dragged item before the drop target
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('settings-layout-row--drag-over');
        if (!draggedId) return;

        const targetId = row.getAttribute('data-category-id');
        if (!targetId || targetId === draggedId) return;

        const fromIdx = this.#storeCategories.findIndex((c) => c.id === draggedId);
        const toIdx = this.#storeCategories.findIndex((c) => c.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return;

        // Remove the dragged item from its current position
        const [moved] = this.#storeCategories.splice(fromIdx, 1);
        // Insert at target position (adjust for shifted index)
        const insertAt = toIdx > fromIdx ? toIdx : toIdx;
        this.#storeCategories.splice(insertAt, 0, moved);
        this.#populateStoreList();
      });

      // Drag end — clean up
      row.addEventListener('dragend', () => {
        draggedId = null;
        list.querySelectorAll('.settings-layout-row').forEach((r) => {
          r.classList.remove('settings-layout-row--dragging', 'settings-layout-row--drag-over');
        });
      });
    });

    // Wire up move buttons
    list.querySelectorAll('[data-action="store-move-up"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-category-id');
        if (!catId) return;
        const idx = this.#storeCategories.findIndex((c) => c.id === catId);
        if (idx <= 0) return;
        const temp = this.#storeCategories[idx - 1];
        this.#storeCategories[idx - 1] = this.#storeCategories[idx];
        this.#storeCategories[idx] = temp;
        this.#populateStoreList();
      });
    });

    list.querySelectorAll('[data-action="store-move-down"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-category-id');
        if (!catId) return;
        const idx = this.#storeCategories.findIndex((c) => c.id === catId);
        if (idx < 0 || idx >= this.#storeCategories.length - 1) return;
        const temp = this.#storeCategories[idx + 1];
        this.#storeCategories[idx + 1] = this.#storeCategories[idx];
        this.#storeCategories[idx] = temp;
        this.#populateStoreList();
      });
    });
  }

  /** @returns {Promise<void>} */
  async #saveStoreLayout() {
    try {
      const orderedIds = this.#storeCategories.map((c) => c.id);
      await updateCategoryOrder(orderedIds);
    } catch (err) {
      console.error('Failed to save store layout:', err);
    }
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

customElements.define('settings-panel', SettingsDrawer);