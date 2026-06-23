// @ts-nocheck — Dexie types unavailable at compile time
/**
 * Recipe Editor Web Component — right-side drawer for adding/editing recipes.
 * Business Logic: Full recipe form with dynamic ingredient rows. Ingredients
 * are searched from the items_library via autocomplete. New items can be
 * created on the fly via the item-editor side drawer. Emits 'recipe-saved'
 * and 'recipe-deleted' events.
 * Uses shared drawer chrome from recipe-details-edit-drawer.css.
 * Design: Stitch "Recipe Editor - Manage & Edit"
 * @class
 */
import { escapeHtml } from '../utils/dom-utils.js';
import './search-autocomplete.js';

/**
 * Recipe Editor Web Component.
 * @class
 * @augments HTMLElement
 */
export class RecipeEditor extends HTMLElement {
  /** @type {string | null} */
  _currentRecipeId = null;
  /** @type {'add' | 'edit'} */
  _mode = 'add';
  /** @type {HTMLDivElement | null} */
  _drawer = null;
  /** @type {HTMLDivElement | null} */
  _backdrop = null;
  /** @type {Array<{itemId: string, name: string, qty: number, unitId: string}>} */
  _ingredients = [];
  /** @type {string} */
  _pendingCreateQuery = '';

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM.
   * @returns {void}
   */
  connectedCallback() {
    // Find or create the drawer + backdrop
    this._drawer = /** @type {HTMLDivElement | null} */ (
      document.getElementById('recipe-editor-drawer')
    );
    this._backdrop = /** @type {HTMLDivElement | null} */ (
      document.getElementById('recipe-editor-backdrop')
    );

    if (!this._drawer || !this._backdrop) {
      this._renderDrawer();
      this._drawer = /** @type {HTMLDivElement | null} */ (
        document.getElementById('recipe-editor-drawer')
      );
      this._backdrop = /** @type {HTMLDivElement | null} */ (
        document.getElementById('recipe-editor-backdrop')
      );
    }

    // Listen for open-recipe-editor events
    document.addEventListener('open-recipe-editor', (e) => {
      const { mode, recipeId } = e.detail || {};
      this._mode = mode || 'add';
      this._currentRecipeId = recipeId || null;

      if (mode === 'edit' && recipeId) {
        this._loadAndOpen(recipeId);
      } else {
        this.open('add');
      }
    });

    // Close on backdrop click
    this._backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._drawer?.classList.contains('rd-drawer__container--open')) {
        this.close();
      }
    });

    // Delegate ingredient delete events
    document.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.recipe-editor__ingredient-delete');
      if (deleteBtn) {
        const index = parseInt(deleteBtn.getAttribute('data-index') || '-1', 10);
        if (index >= 0) this._removeIngredient(index);
      }
    });

    // Listen for item-saved (when creating a new item from ingredient search)
    document.addEventListener('item-saved', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      if (detail && detail.itemId && this._pendingCreateQuery) {
        // The drawer is open and we were waiting for a new item to be created
        this._pendingCreateQuery = ''; // Reset before async lookup

        // Look up the saved item and add it as an ingredient
        this._addSavedItemAsIngredient(detail.itemId);
      }
    });
  }

  /**
   * Render the drawer DOM structure if it doesn't exist.
   * @returns {void}
   */
  _renderDrawer() {
    const shell = document.querySelector('.app-shell');
    if (!shell) return;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'recipe-editor-backdrop';
    backdrop.className = 'rd-drawer__backdrop';
    shell.appendChild(backdrop);

    // Drawer container
    const drawer = document.createElement('div');
    drawer.id = 'recipe-editor-drawer';
    drawer.className = 'rd-drawer__container';
    drawer.innerHTML = `
      <header class="rd-drawer__top-bar">
        <button class="rd-drawer__close-btn" id="recipe-editor-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h1 class="rd-drawer__top-bar-title rd-drawer__top-bar-title--primary" id="recipe-editor-title">Add Recipe</h1>
        <div class="rd-drawer__top-actions">
          <button class="rd-drawer__delete-btn" id="recipe-editor-delete-btn" style="display:none">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Delete
          </button>
          <button class="rd-drawer__save-btn" id="recipe-editor-save-btn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Save
          </button>
        </div>
      </header>
      <div class="rd-drawer__body" id="recipe-editor-body"></div>
    `;
    shell.appendChild(drawer);

    // Wire close button
    drawer.querySelector('#recipe-editor-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    // Wire save button
    drawer.querySelector('#recipe-editor-save-btn')?.addEventListener('click', () => {
      this._handleSave();
    });

    // Wire delete button
    drawer.querySelector('#recipe-editor-delete-btn')?.addEventListener('click', () => {
      this._handleDelete();
    });
  }

  /**
   * Open the editor in a given mode.
   * @param {'add' | 'edit'} mode - The editor mode.
   * @returns {Promise<void>}
   */
  async open(mode) {
    this._mode = mode;
    this._ingredients = [];
    this._renderForm(null);
    this._updateTopBar();

    // Open with animation
    this._backdrop?.classList.add('rd-drawer__backdrop--open');
    this._drawer?.classList.add('rd-drawer__container--open');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the editor.
   * @returns {void}
   */
  close() {
    this._backdrop?.classList.remove('rd-drawer__backdrop--open');
    this._drawer?.classList.remove('rd-drawer__container--open');

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Load a recipe and open in edit mode.
   * @param {string} recipeId - The recipe UUID.
   * @returns {Promise<void>}
   */
  async _loadAndOpen(recipeId) {
    try {
      const { getRecipeWithIngredients, enrichIngredients } = await import('../store/recipes.store.js');
      const result = await getRecipeWithIngredients(recipeId);

      if (!result) {
        console.error('Recipe not found:', recipeId);
        this.open('add');
        return;
      }

      const { recipe, ingredients } = result;
      const enriched = await enrichIngredients(ingredients);
      this._ingredients = enriched.map((ing) => ({
        itemId: ing.itemId,
        name: ing.itemName,
        qty: ing.quantity,
        unitId: ing.unitId,
      }));

      this._renderForm(recipe);
      this._updateTopBar();

      // Open with animation
      this._backdrop?.classList.add('rd-drawer__backdrop--open');
      this._drawer?.classList.add('rd-drawer__container--open');

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } catch (err) {
      console.error('Failed to load recipe for editing:', err);
      this.open('add');
    }
  }

  /**
   * Update the top bar title and delete button visibility based on mode.
   * @returns {void}
   */
  _updateTopBar() {
    const titleEl = document.getElementById('recipe-editor-title');
    if (titleEl) {
      titleEl.textContent = this._mode === 'add' ? 'Add Recipe' : 'Edit Recipe';
    }

    const deleteBtn = document.getElementById('recipe-editor-delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = this._mode === 'edit' ? 'flex' : 'none';
    }
  }

  /**
   * Render the full form into the editor body.
   * @param {import('../db.js').Recipe | null} recipe - The recipe to edit, or null for add.
   * @returns {void}
   */
  _renderForm(recipe) {
    const body = document.getElementById('recipe-editor-body');
    if (!body) return;

    const title = recipe?.title || '';
    const description = recipe?.notes || '';
    const prepTime = recipe?.prepTime || 0;
    const servingsBase = recipe?.servingsBase || 4;
    const instructionsUrl = recipe?.instructionsUrl || '';

    const ingredientRows = this._ingredients.map((ing, i) => `
      <div class="recipe-editor__ingredient-row">
        <span class="recipe-editor__ingredient-name">${escapeHtml(ing.name)}</span>
        <input class="recipe-editor__ingredient-qty" type="text" value="${ing.qty}" data-ingredient-qty="${i}" />
        <span class="recipe-editor__ingredient-unit">${escapeHtml(ing.unitId)}</span>
        <button class="recipe-editor__ingredient-delete" data-index="${i}" aria-label="Remove ingredient">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="recipe-editor__form">
        <!-- Title -->
        <div class="recipe-editor__field">
          <label class="recipe-editor__label">Recipe Name</label>
          <input class="recipe-editor__input recipe-editor__input--title" id="re-name" type="text" value="${escapeHtml(title)}" placeholder="Recipe name" autocomplete="off" />
        </div>

        <!-- Description -->
        <div class="recipe-editor__field">
          <label class="recipe-editor__label">Description</label>
          <textarea class="recipe-editor__textarea" id="re-description" placeholder="Brief description...">${escapeHtml(description)}</textarea>
        </div>

        <!-- Info Grid -->
        <div class="recipe-editor__info-grid">
          <div class="recipe-editor__info-box">
            <label class="recipe-editor__label">Category</label>
            <select id="re-category">
              <option value="">Select…</option>
            </select>
          </div>
          <div class="recipe-editor__info-box">
            <label class="recipe-editor__label">Prep Time (min)</label>
            <input type="number" id="re-prep-time" value="${prepTime}" min="0" step="1" />
          </div>
          <div class="recipe-editor__info-box">
            <label class="recipe-editor__label">Serves</label>
            <input type="number" id="re-servings" value="${servingsBase}" min="1" max="20" step="1" />
          </div>
          <div class="recipe-editor__info-box">
            <label class="recipe-editor__label">Source URL</label>
            <input type="url" id="re-url" value="${escapeHtml(instructionsUrl)}" placeholder="https://..." autocomplete="off" />
          </div>
        </div>

        <!-- Ingredients -->
        <div class="recipe-editor__ingredients-header">
          <h3 class="recipe-editor__ingredients-title">Ingredients</h3>
          <span class="recipe-editor__count-badge" id="re-ingredient-count">${this._ingredients.length} Items</span>
        </div>

        <!-- Ingredient Search Bar (between header and list) -->
        <div class="recipe-editor__ingredient-search" id="re-ingredient-search"></div>

        <div id="re-ingredients-list">
          ${ingredientRows}
        </div>
      </div>
    `;

    // Populate category dropdown
    this._populateCategories(recipe);

    // Wire the permanent search-autocomplete
    this._setupIngredientSearch();

    // Wire ingredient qty inputs
    body.querySelectorAll('[data-ingredient-qty]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.getAttribute('data-ingredient-qty'), 10);
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && this._ingredients[idx]) {
          this._ingredients[idx].qty = val;
        }
      });
    });
  }

  /**
   * Populate the category dropdown from the DB.
   * @param {import('../db.js').Recipe | null} recipe - Current recipe for preselection.
   * @returns {Promise<void>}
   */
  async _populateCategories(recipe) {
    try {
      const { db } = await import('../db.js');
      const select = document.getElementById('re-category');
      if (!select) return;

      select.innerHTML = '<option value="">Select…</option>';
      const categories = await db.recipeCategories.orderBy('name').toArray();
      categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        if (recipe && recipe.recipeCategoryId === cat.id) opt.selected = true;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load recipe categories:', err);
    }
  }

  /**
   * Set up the permanent ingredient search bar using search-autocomplete.
   * Business Logic: The search-autocomplete is always visible between the
   * ingredients list and the form bottom. Selecting an existing item or
   * creating a new one adds it to the ingredients list — same pattern as
   * the grocery list searchbar.
   * @returns {void}
   */
  _setupIngredientSearch() {
    const searchContainer = document.getElementById('re-ingredient-search');
    if (!searchContainer) return;

    // Clear any previous search-autocomplete
    searchContainer.innerHTML = '';

    const autoComplete = document.createElement('search-autocomplete');
    autoComplete.setAttribute('placeholder', 'Add ingredient...');
    autoComplete.className = 'search-bar__input';
    autoComplete.style.border = 'none';
    autoComplete.style.padding = '0';
    autoComplete.style.background = 'none';

    // Listen for item selection
    autoComplete.addEventListener('item-selected', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._addIngredient({
        itemId: detail.itemId,
        name: detail.name,
        qty: detail.qty || 1,
        unitId: detail.unit || 'pcs',
      });
      autoComplete.clear();
    });

    // Listen for "Create new item"
    autoComplete.addEventListener('create-custom', (e) => {
      const detail = /** @type {CustomEvent} */ (e).detail;
      this._pendingCreateQuery = detail.query || '';
      this._openItemEditorForCreate(this._pendingCreateQuery);
    });

    searchContainer.appendChild(autoComplete);
  }

  /**
   * Open the item editor to create a new item on the fly, with pre-filled name.
   * Business Logic: Dynamically imports the item-editor component, finds or
   * creates the element inside the #item-editor-sheet body, and opens it in
   * add mode with the search query pre-filled. After the user saves, the
   * item-saved listener in connectedCallback() auto-adds the new item as
   * a recipe ingredient — same pattern as the grocery list searchbar.
   * @param {string} query - The search query to pre-fill.
   * @returns {Promise<void>}
   */
  async _openItemEditorForCreate(query) {
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
      console.error('Failed to open item editor from ingredient search:', err);
    }
  }

  /**
   * Add an ingredient to the list and re-render.
   * @param {{itemId: string, name: string, qty: number, unitId: string}} ingredient - The ingredient data.
   * @returns {void}
   */
  _addIngredient(ingredient) {
    this._ingredients.push(ingredient);
    this._reRenderIngredients();
  }

  /**
   * Remove an ingredient from the list and re-render.
   * @param {number} index - The index to remove.
   * @returns {void}
   */
  _removeIngredient(index) {
    this._ingredients.splice(index, 1);
    this._reRenderIngredients();
  }

  /**
   * Re-render just the ingredients list section.
   * @returns {void}
   */
  _reRenderIngredients() {
    const list = document.getElementById('re-ingredients-list');
    const countBadge = document.getElementById('re-ingredient-count');
    if (countBadge) {
      countBadge.textContent = `${this._ingredients.length} Items`;
    }
    if (!list) return;

    list.innerHTML = this._ingredients.map((ing, i) => `
      <div class="recipe-editor__ingredient-row">
        <span class="recipe-editor__ingredient-name">${escapeHtml(ing.name)}</span>
        <input class="recipe-editor__ingredient-qty" type="text" value="${ing.qty}" data-ingredient-qty="${i}" />
        <span class="recipe-editor__ingredient-unit">${escapeHtml(ing.unitId)}</span>
        <button class="recipe-editor__ingredient-delete" data-index="${i}" aria-label="Remove ingredient">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    `).join('');

    // Wire qty inputs
    list.querySelectorAll('[data-ingredient-qty]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.getAttribute('data-ingredient-qty'), 10);
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && this._ingredients[idx]) {
          this._ingredients[idx].qty = val;
        }
      });
    });
  }

  /**
   * After a new item is saved via the item editor, add it as an ingredient
   * to the recipe.
   * @param {string} itemId - The saved item's UUID.
   * @returns {Promise<void>}
   */
  async _addSavedItemAsIngredient(itemId) {
    try {
      const { getItemById } = await import('../store/items.store.js');
      const item = await getItemById(itemId);
      if (!item) return;

      this._addIngredient({
        itemId: item.id,
        name: item.name,
        qty: item.defaultQty || 1,
        unitId: item.unitId || 'pcs',
      });
    } catch (err) {
      console.error('Failed to add saved item as ingredient:', err);
    }
  }

  /**
   * Handle saving the recipe.
   * @returns {Promise<void>}
   */
  async _handleSave() {
    const saveBtn = document.getElementById('recipe-editor-save-btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
      const nameInput = document.getElementById('re-name');
      const descInput = document.getElementById('re-description');
      const categorySelect = document.getElementById('re-category');
      const prepTimeInput = document.getElementById('re-prep-time');
      const servingsInput = document.getElementById('re-servings');
      const urlInput = document.getElementById('re-url');

      if (!nameInput || !nameInput.value.trim()) {
        nameInput?.focus();
        if (saveBtn) saveBtn.disabled = false;
        return;
      }

      const title = nameInput.value.trim();
      const notes = descInput?.value?.trim() || '';
      const recipeCategoryId = categorySelect?.value || 'uncategorized';
      const prepTime = parseInt(prepTimeInput?.value || '0', 10);
      const servingsBase = parseInt(servingsInput?.value || '4', 10);
      const instructionsUrl = urlInput?.value?.trim() || '';

      const ingredients = this._ingredients.map((ing) => ({
        itemId: ing.itemId,
        quantity: ing.qty,
        unitId: ing.unitId,
      }));

      const { addRecipe, updateRecipe, replaceRecipeIngredients } = await import('../store/recipes.store.js');

      if (this._mode === 'add') {
        await addRecipe({
          title,
          notes,
          recipeCategoryId,
          prepTime,
          servingsBase,
          instructionsUrl,
          ingredients,
        });
      } else if (this._currentRecipeId) {
        await updateRecipe(this._currentRecipeId, {
          title,
          notes,
          recipeCategoryId,
          prepTime,
          servingsBase,
          instructionsUrl,
        });
        await replaceRecipeIngredients(this._currentRecipeId, ingredients);
      }

      this.close();

      // Dispatch event so recipe-library re-renders
      document.dispatchEvent(new CustomEvent('recipe-saved', { bubbles: true }));
    } catch (err) {
      console.error('Failed to save recipe:', err);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  /**
   * Handle deleting the current recipe.
   * @returns {Promise<void>}
   */
  async _handleDelete() {
    if (!this._currentRecipeId) return;

    try {
      const { deleteRecipe } = await import('../store/recipes.store.js');
      await deleteRecipe(this._currentRecipeId);

      this.close();

      document.dispatchEvent(new CustomEvent('recipe-saved', { bubbles: true }));
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  }
}

customElements.define('recipe-editor', RecipeEditor);