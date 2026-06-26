// @ts-nocheck — Dexie types unavailable at compile time
/**
 * Recipe Library Web Component — search-first recipe list with filters.
 * Business Logic: Displays all recipes as cards with category badges,
 * prep time, description. Supports search (by title or category label),
 * filter chips (All, Favourites, 30 min, Recent), and "Add to Plan"
 * action. Tapping a card opens the recipe detail bottom sheet.
 * Design: Stitch "Recipes - Mobile Library with Wrapped Filters"
 * @module
 */
import { escapeHtml } from '../utils/dom-utils.js';
import { getRecipeCategoryName } from '../store/recipe-categories.store.js';

/**
 * Recipe Library Web Component.
 * @class
 * @augments HTMLElement
 */
export class RecipeLibrary extends HTMLElement {
  /** @type {HTMLDivElement | null} */
  _container = null;
  /** @type {HTMLInputElement | null} */
  _searchInput = null;
  /** @type {string} */
  _activeFilter = 'all';
  /** @type {string} */
  _searchQuery = '';
  /** @type {AbortController | null} */
  _abortController = null;
  /** @type {number | undefined} */
  _debounceTimer = undefined;
  /** @type {HTMLElement | null} */
  _fab = null;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Stamp template content
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('recipes-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

    // Hide the original template's search bar if present — we render our own
    this._renderHeader();
    this._container = /** @type {HTMLDivElement | null} */ (this.querySelector('#recipe-library-container'));
    this._searchInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#recipe-search-input'));
    this._fab = this.querySelector('#recipe-add-fab');

    if (this._container) {
      this._container.classList.add('recipe-card-list');
    }

    // Wire search
    this._searchInput?.addEventListener('input', () => this._onSearchInput());

    // Wire filter chips
    const chipContainer = this.querySelector('#recipe-filter-chips');
    if (chipContainer) {
      chipContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (chip) {
          const filter = chip.getAttribute('data-filter') || 'all';
          this._setActiveFilter(filter);
        }
      });
    }

    // Wire FAB
    this._fab?.addEventListener('click', () => this._openEditor('add'));

    // Wire "+ New" button in header
    const addBtn = this.querySelector('#add-recipe-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._openEditor('add'));
    }

    // Listen for recipe-saved events to refresh
    document.addEventListener('recipe-saved', () => {
      this._loadRecipes();
    });

    // Initial load
    await this._loadRecipes();
  }

  /**
   * Render the search bar and filter chips into the container.
   * @returns {void}
   */
  _renderHeader() {
    const container = this.querySelector('#recipe-library-container');
    if (!container) return;

    // Insert search + filters before the container if header area exists,
    // otherwise create a header wrapper
    const existingHeader = this.querySelector('.recipes-header');
    if (existingHeader) return;

    const header = document.createElement('div');
    header.className = 'recipes-header';
    header.innerHTML = `
      <div class="search-bar">
        <div class="search-bar__input-wrapper">
          <svg class="search-bar__icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input class="search-bar__input" id="recipe-search-input" type="search" placeholder="Search recipes..." autocomplete="off" />
        </div>
        <div class="search-bar__pills" id="recipe-filter-chips">
          <button class="recipe-filter-chip recipe-filter-chip--active" data-filter="all">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
            All
          </button>
          <button class="recipe-filter-chip" data-filter="favourites">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            Favourites
          </button>
          <button class="recipe-filter-chip" data-filter="30min">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            30 min
          </button>
          <button class="recipe-filter-chip" data-filter="recent">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            Recent
          </button>
        </div>
      </div>
    `;

    container.parentNode?.insertBefore(header, container);
  }

  /**
   * Handle search input with debounce.
   * @returns {void}
   */
  _onSearchInput() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = window.setTimeout(() => {
      this._searchQuery = this._searchInput?.value.trim() || '';
      this._loadRecipes();
    }, 200);
  }

  /**
   * Set the active filter and reload recipes.
   * @param {string} filter - Filter key: 'all' | 'favourites' | '30min' | 'recent'.
   * @returns {void}
   */
  _setActiveFilter(filter) {
    this._activeFilter = filter;

    // Update chip styles
    const chips = this.querySelectorAll('[data-filter]');
    chips.forEach((chip) => {
      const isActive = chip.getAttribute('data-filter') === filter;
      chip.classList.toggle('recipe-filter-chip--active', isActive);
    });

    this._loadRecipes();
  }

  /**
   * Load recipes from the store based on active filter and search query.
   * @returns {Promise<void>}
   */
  async _loadRecipes() {
    if (!this._container) return;

    try {
      const {
        getAllRecipes,
        searchRecipes,
        getFavouriteRecipes,
        getRecipesUnderTime,
        getRecentRecipes,
        enrichRecipesWithIngredients,
      } = await import('../store/recipes.store.js');

      /** @type {import('../db.js').Recipe[]} */
      let recipes = [];

      // Apply filter
      switch (this._activeFilter) {
        case 'favourites':
          recipes = await getFavouriteRecipes();
          break;
        case '30min':
          recipes = await getRecipesUnderTime(30);
          break;
        case 'recent':
          recipes = await getRecentRecipes(20);
          break;
        default:
          recipes = await getAllRecipes();
          break;
      }

      // Apply search query
      if (this._searchQuery) {
        recipes = (await searchRecipes(this._searchQuery)).filter((r) =>
          recipes.some((fr) => fr.id === r.id)
        );
      }

      // Enrich with ingredient count
      const enriched = await enrichRecipesWithIngredients(recipes);

      this._renderCards(enriched);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      this._container.innerHTML = `<div class="recipe-empty"><svg class="recipe-empty__icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><p>Could not load recipes. Please try again.</p></div>`;
    }
  }

  /**
   * Render recipe cards into the container.
   * @param {Array<{recipe: import('../db.js').Recipe, ingredients: import('../db.js').RecipeIngredient[]}>} enriched - Recipes with ingredients.
   * @returns {void}
   */
  _renderCards(enriched) {
    if (!this._container) return;

    if (enriched.length === 0) {
      const msg = this._searchQuery
        ? `No recipes matching "${escapeHtml(this._searchQuery)}"`
        : 'No recipes yet. Tap "+" to add your first recipe.';
      this._container.innerHTML = `
        <div class="recipe-empty">
          <svg class="recipe-empty__icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
          </svg>
          <p>${msg}</p>
        </div>
      `;
      return;
    }

    // Render all recipe cards
    this._container.innerHTML = enriched
      .map(({ recipe, ingredients }) => {
        const categoryLabel = escapeHtml(getRecipeCategoryName(recipe.recipeCategoryId));
        const title = escapeHtml(recipe.title);
        const notes = escapeHtml(recipe.notes || recipe.title);
        const prepTime = recipe.prepTime || 0;
        const ingredientCount = ingredients.length;
        const isFavourite = recipe.isFavourite;

        return `
          <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-card__body">
              <div class="recipe-card__meta">
                <span class="recipe-card__badge">${categoryLabel}</span>
                <span class="recipe-card__time">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                  ${prepTime}m
                </span>
              </div>
              <h3 class="recipe-card__title">${title}</h3>
              <p class="recipe-card__description">${notes.length > 80 ? notes.slice(0, 80) + '…' : notes} · ${ingredientCount} ingredients</p>
            </div>
            <button class="recipe-card__fav-btn${isFavourite ? ' recipe-card__fav-btn--active' : ''}" data-fav-toggle="${recipe.id}" aria-label="${isFavourite ? 'Remove from favourites' : 'Add to favourites'}">
              <svg viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <button class="recipe-card__add-btn" data-add-to-plan="${recipe.id}" aria-label="Add to Plan">
              <span class="material-symbols-outlined recipe-card__add-icon">calendar_add_on</span>
            </button>
          </div>
        `;
      })
      .join('');

    // Wire card click → open detail
    const cards = this._container.querySelectorAll('.recipe-card');
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        // Don't open detail if clicking "Add to Plan" or favourite button
        if (e.target.closest('.recipe-card__add-btn')) return;
        if (e.target.closest('.recipe-card__fav-btn')) return;
        const recipeId = card.getAttribute('data-recipe-id');
        if (recipeId) this._openDetail(recipeId);
      });
    });

    // Wire "Add to Plan" buttons
    const addBtns = this._container.querySelectorAll('[data-add-to-plan]');
    addBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recipeId = btn.getAttribute('data-add-to-plan');
        if (recipeId) this._handleAddToPlan(btn, recipeId);
      });
    });

    // Wire Favourite toggle buttons
    const favBtns = this._container.querySelectorAll('[data-fav-toggle]');
    favBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recipeId = btn.getAttribute('data-fav-toggle');
        if (recipeId) this._handleFavToggle(btn, recipeId);
      });
    });
  }

  /**
   * Open the recipe detail bottom sheet for a recipe.
   * @param {string} recipeId - The recipe UUID.
   * @returns {void}
   */
  _openDetail(recipeId) {
    // Dispatch event to open detail — the recipe-detail component listens for this
    this.dispatchEvent(new CustomEvent('open-recipe-detail', {
      bubbles: true,
      composed: true,
      detail: { recipeId },
    }));
  }

  /**
   * Open the recipe editor for adding or editing.
   * @param {'add' | 'edit'} mode - The editor mode.
   * @param {string} [recipeId] - The recipe UUID (for edit mode).
   * @returns {void}
   */
  _openEditor(mode, recipeId) {
    this.dispatchEvent(new CustomEvent('open-recipe-editor', {
      bubbles: true,
      composed: true,
      detail: { mode, recipeId },
    }));
  }

  /**
   * Handle the "Add to Plan" button click with visual feedback.
   * Business Logic: Adds the recipe to the meal plan database via the store,
   * dispatches an event so the meal planner tab can re-render, and provides
   * optimistic visual feedback on the button.
   * @param {HTMLElement} btn - The clicked button element.
   * @param {string} _recipeId - The recipe UUID.
   * @returns {Promise<void>}
   */
  async _handleAddToPlan(btn, _recipeId) {
    // Add to meal plan database
    try {
      const { addMealPlan } = await import('../store/mealplan.store.js');
      await addMealPlan(_recipeId);

      // Dispatch event so the meal planner tab re-renders
      document.dispatchEvent(new CustomEvent('meal-plan-changed', {
        bubbles: true,
        composed: true,
      }));
    } catch (err) {
      console.error('Failed to add recipe to plan:', err);
      return;
    }

    // Visual feedback
    btn.classList.add('recipe-card__add-btn--added');
    const icon = /** @type {HTMLElement | null} */ (btn.querySelector('.recipe-card__add-icon'));
    if (icon) {
      icon.textContent = 'check_circle';
      icon.style.fontVariationSettings = "'FILL' 1";
    }

    setTimeout(() => {
      btn.classList.remove('recipe-card__add-btn--added');
      if (icon) {
        icon.textContent = 'calendar_add_on';
        icon.style.fontVariationSettings = "'FILL' 1";
      }
    }, 2000);
  }

  /**
   * Handle Favourite toggle button click.
   * Business Logic: Toggles the isFavourite flag on a recipe in the store.
   * Updates the button visual state immediately (optimistic UI) and refreshes
   * the list if currently on the 'favourites' filter so removed items disappear.
   * @param {HTMLElement} btn - The heart button element.
   * @param {string} recipeId - The recipe UUID.
   * @returns {Promise<void>}
   */
  async _handleFavToggle(btn, recipeId) {
    const isCurrentlyActive = btn.classList.contains('recipe-card__fav-btn--active');
    const newFav = !isCurrentlyActive;

    // Optimistic UI update
    btn.classList.toggle('recipe-card__fav-btn--active', newFav);
    btn.setAttribute('aria-label', newFav ? 'Remove from favourites' : 'Add to favourites');

    try {
      const { updateRecipe } = await import('../store/recipes.store.js');
      await updateRecipe(recipeId, { isFavourite: newFav });

      // Dispatch a custom event so other parts of the app can react
      this.dispatchEvent(new CustomEvent('recipe-favourited', {
        bubbles: true,
        composed: true,
        detail: { recipeId, isFavourite: newFav },
      }));

      // If on the 'favourites' filter and the recipe was unfavourited, reload
      if (this._activeFilter === 'favourites' && !newFav) {
        this._loadRecipes();
      }
    } catch (err) {
      // Revert optimistic update on failure
      btn.classList.toggle('recipe-card__fav-btn--active', isCurrentlyActive);
      btn.setAttribute('aria-label', isCurrentlyActive ? 'Remove from favourites' : 'Add to favourites');
      console.error('Failed to toggle favourite:', err);
    }
  }
}

customElements.define('recipe-library', RecipeLibrary);