// @ts-nocheck — Dexie types unavailable at compile time
/**
 * Recipe Detail Web Component — right-side drawer showing full recipe info.
 * Business Logic: Displays recipe metadata (category, prep time, servings,
 * source link, description) and a scaled ingredient list. Allows serving
 * adjustment. Opens as a right-side drawer overlay matching the Stitch
 * "Recipe Detail - View & Manage" design.
 * Uses shared drawer chrome from recipe-details-edit-drawer.css.
 * @class
 */
import { escapeHtml, formatQty } from '../utils/dom-utils.js';
import { registerOverlay } from '../overlay-manager.js';
import { getRecipeCategoryName } from '../store/recipe-categories.store.js';
import { STRINGS, t } from '../strings/i18n.js';

/**
 * Recipe Detail Web Component.
 * @class
 * @augments HTMLElement
 */
export class RecipeDetail extends HTMLElement {
  /** @type {string | null} */
  _currentRecipeId = null;
  /** @type {number} */
  _servings = 4;
  /** @type {number} */
  _baseServings = 4;
  /** @type {(() => void) | null} */
  _closeToken = null;
  /** @type {HTMLDivElement | null} */
  _drawer = null;
  /** @type {HTMLDivElement | null} */
  _backdrop = null;

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
      document.getElementById('recipe-detail-drawer')
    );
    this._backdrop = /** @type {HTMLDivElement | null} */ (
      document.getElementById('recipe-detail-backdrop')
    );

    if (!this._drawer || !this._backdrop) {
      this._renderDrawer();
      this._drawer = /** @type {HTMLDivElement | null} */ (
        document.getElementById('recipe-detail-drawer')
      );
      this._backdrop = /** @type {HTMLDivElement | null} */ (
        document.getElementById('recipe-detail-backdrop')
      );
    }

    // Listen for open-recipe-detail events from recipe-library
    document.addEventListener('open-recipe-detail', (e) => {
      const recipeId = e.detail?.recipeId;
      if (recipeId) this.open(recipeId);
    });

    // Close on backdrop click
    this._backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Listen for language changes to re-render if open
    document.addEventListener('language-changed', () => {
      if (this._currentRecipeId) {
        this._loadRecipe(this._currentRecipeId);
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
    backdrop.id = 'recipe-detail-backdrop';
    backdrop.className = 'rd-drawer__backdrop';
    shell.appendChild(backdrop);

    // Drawer container
    const drawer = document.createElement('div');
    drawer.id = 'recipe-detail-drawer';
    drawer.className = 'rd-drawer__container';
    drawer.innerHTML = `
      <header class="rd-drawer__top-bar">
        <button class="rd-drawer__close-btn" id="recipe-detail-close-btn" aria-label="${STRINGS.contentDialog.closeAria}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h1 class="rd-drawer__top-bar-title rd-drawer__top-bar-title--default">${STRINGS.recipeDetail.title}</h1>
        <button class="rd-drawer__edit-btn" id="recipe-detail-edit-btn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          ${STRINGS.recipeDetail.edit}
        </button>
      </header>
      <div class="rd-drawer__body" id="recipe-detail-body"></div>
    `;
    shell.appendChild(drawer);

    // Wire close button
    drawer.querySelector('#recipe-detail-close-btn')?.addEventListener('click', () => {
      this.close();
    });
  }

  /**
   * Open the detail drawer for a recipe.
   * @param {string} recipeId - The recipe UUID.
   * @returns {Promise<void>}
   */
  async open(recipeId) {
    this._currentRecipeId = recipeId;

    // Wire edit button — recreate to avoid duplicate listeners
    const editBtn = document.getElementById('recipe-detail-edit-btn');
    if (editBtn) {
      const newBtn = editBtn.cloneNode(true);
      editBtn.parentNode?.replaceChild(newBtn, editBtn);
      newBtn.addEventListener('click', () => {
        this.close();
        document.dispatchEvent(new CustomEvent('open-recipe-editor', {
          bubbles: true,
          detail: { mode: 'edit', recipeId },
        }));
      });
    }

    // Load and render
    await this._loadRecipe(recipeId);

    // Open with animation
    this._backdrop?.classList.add('rd-drawer__backdrop--open');
    this._drawer?.classList.add('rd-drawer__container--open');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Register with overlay manager for back-button handling
    this._closeToken = registerOverlay({
      /** Close the drawer when the overlay manager requests it (e.g. back button). */
      close: () => this.close(),
      name: 'recipe-detail',
    });
  }

  /**
   * Close the detail drawer and unregister from the overlay manager.
   * Business Logic: Called either directly (via close button) or by the
   * overlay manager when the back button is pressed. Unregisters first
   * so the overlay stack stays in sync.
   * @returns {void}
   */
  close() {
    // Unregister from overlay manager
    this._closeToken?.();
    this._closeToken = null;
    this._backdrop?.classList.remove('rd-drawer__backdrop--open');
    this._drawer?.classList.remove('rd-drawer__container--open');

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Load recipe data and render into the body.
   * @param {string} recipeId - The recipe UUID.
   * @returns {Promise<void>}
   */
  async _loadRecipe(recipeId) {
    const body = document.getElementById('recipe-detail-body');
    if (!body) return;

    try {
      const { getRecipeWithIngredients, enrichIngredients } = await import('../store/recipes.store.js');

      const result = await getRecipeWithIngredients(recipeId);
      if (!result) {
        body.innerHTML = `<div class="recipe-detail__empty"><p>${STRINGS.recipeDetail.notFound}</p></div>`;
        return;
      }

      const { recipe, ingredients } = result;
      const enriched = await enrichIngredients(ingredients);

      this._baseServings = recipe.servingsBase || 4;
      this._servings = this._baseServings;
      const scaleFactor = this._servings / this._baseServings;

      // Resolve recipe category UUID to display name via in-memory cache
      const categoryName = getRecipeCategoryName(recipe.recipeCategoryId);

      const title = escapeHtml(recipe.title);
      const notes = escapeHtml(recipe.notes || '');
      const prepTime = recipe.prepTime || 0;
      const sourceUrl = recipe.instructionsUrl || '';
      const sourceDisplay = sourceUrl ? new URL(sourceUrl).hostname : '';
      const ingredientCount = enriched.length;

      body.innerHTML = `
        <h2 class="recipe-detail__title">${title}</h2>

        ${notes ? `<p class="recipe-detail__description">"${notes}"</p>` : ''}

        <div class="recipe-detail__info-grid">
          <div class="recipe-detail__info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg>
            <div>
              <p class="recipe-detail__info-label">${STRINGS.recipeDetail.category}</p>
              <p class="recipe-detail__info-value">${escapeHtml(categoryName)}</p>
            </div>
          </div>
          <div class="recipe-detail__info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            <div>
              <p class="recipe-detail__info-label">${STRINGS.recipeDetail.prepTime}</p>
              <p class="recipe-detail__info-value">${prepTime} min</p>
            </div>
          </div>
          <div class="recipe-detail__info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            <div>
              <p class="recipe-detail__info-label">${STRINGS.recipeDetail.serves}</p>
              <p class="recipe-detail__servings-value">${t(STRINGS.recipeDetail.persons, { count: this._servings })}</p>
            </div>
          </div>
          ${sourceUrl ? `
          <div class="recipe-detail__info-item">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
            <div>
              <p class="recipe-detail__info-label">${STRINGS.recipeDetail.source}</p>
              <a class="recipe-detail__info-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceDisplay)}</a>
            </div>
          </div>
          ` : ''}
        </div>

        <div class="recipe-detail__section-header">
          <h3 class="recipe-detail__section-title">${STRINGS.recipeDetail.ingredients}</h3>
          <span class="recipe-detail__count-badge">${t(STRINGS.recipeDetail.items, { count: ingredientCount })}</span>
        </div>
        <div class="recipe-detail__ingredients" id="detail-ingredients-list">
          ${enriched.map((ing) => {
            const scaledQty = formatQty(Math.round(ing.quantity * scaleFactor * 10) / 10, ing.unitId);
            return `
              <div class="recipe-detail__ingredient">
                <div class="recipe-detail__ingredient-info">
                  <span class="recipe-detail__ingredient-name">${escapeHtml(ing.itemName)}</span>
                </div>
                <span class="recipe-detail__ingredient-qty">${scaledQty}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

      
    } catch (err) {
      console.error('Failed to load recipe detail:', err);
      body.innerHTML = `<div class="recipe-detail__empty"><p>${STRINGS.recipeDetail.loadError}</p></div>`;
    }
  }

  /**
   * @deprecated Servings adjustment removed from detail view.
   * Kept to avoid breaking subclass overrides. No-op.
   */
  _updateScaledQuantities() {
    // Servings are now read-only on the detail page.
  }
}

customElements.define('recipe-detail', RecipeDetail);