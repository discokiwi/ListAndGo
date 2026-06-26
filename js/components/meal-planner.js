// @ts-nocheck — Dexie types unavailable at compile time
/**
 * Meal Planner Web Component — flat list of planned recipes as cards.
 * Business Logic: Displays all meal plan entries as recipe cards with
 * "Add to Grocery List" and "Cooked" check-off actions. Uncooked cards
 * appear first; cooked cards are greyed out and moved below a divider.
 * Uses the existing .recipe-card CSS classes from recipe-card.css.
 * "Clear All" uses the reusable <confirm-dialog> component.
 * Supports Edit Mode: On long press of any uncooked card, all uncooked
 * cards enter edit mode — showing only the recipe name, a servings stepper,
 * and a delete button. A blur overlay covers other content; tapping the
 * overlay exits edit mode. Same pattern as the grocery list edit mode.
 * Design: Stitch "Meal Plan - Card-Styled Interactive Queue"
 *          Stitch "Meal Plan - Long-Press Edit Mode" / "plan edit mode"
 * @class
 */
import { escapeHtml } from '../utils/dom-utils.js';
import { getRecipeCategoryName } from '../store/recipe-categories.store.js';
import { STRINGS, t } from '../strings/i18n.js';
import './quantity-stepper.js';

/**
 * Meal Planner Web Component.
 * @class
 * @augments HTMLElement
 */
export class MealPlanner extends HTMLElement {
  /** @type {Array<{ mealPlan: import('../db.js').MealPlan, recipe: import('../db.js').Recipe | undefined }>} */
  _plans = [];
  /** @type {HTMLDivElement | null} */
  _container = null;
  /** @type {Set<string>} Track which meal plans have been added to grocery list */
  _addedToGrocery = new Set();
  /** @type {boolean} Whether edit mode is active */
  _editMode = false;
  /** @type {HTMLDivElement | null} The overlay element for edit mode */
  _overlayEl = null;
  /** @type {number | undefined} Timer handle for long-press detection */
  _pressTimer = undefined;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM.
   * Business Logic: Stamps the template, creates the edit mode overlay,
   * wires the Clear All button, and starts listening for meal-plan-changed
   * events and document clicks (to exit edit mode on outside tap).
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Stamp template content
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('meal-plan-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }

    this._container = /** @type {HTMLDivElement | null} */ (this.querySelector('#meal-plan-card-list'));

    // Create the edit mode overlay
    this._createEditOverlay();

    // Wire Clear All button
    const clearBtn = this.querySelector('#plan-clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this._handleClearAll());
    }

    // Listen for events that should trigger a re-render
    document.addEventListener('meal-plan-changed', () => {
      this._exitEditMode();
      this._loadPlans();
    });

    // Click outside the card list exits edit mode
    document.addEventListener('click', (e) => {
      if (!this._editMode) return;
      const cardList = /** @type {HTMLElement} */ (this._container);
      if (cardList && !cardList.contains(/** @type {Node} */ (e.target))) {
        this._exitEditMode();
      }
    });

    // Initial load
    await this._loadPlans();
  }

  /** Clean up on disconnect. */
  disconnectedCallback() {
    if (this._overlayEl && this._overlayEl.parentNode) {
      this._overlayEl.parentNode.removeChild(this._overlayEl);
    }
    this._exitEditMode();
  }

  /**
   * Create the edit mode overlay element.
   * Business Logic: The overlay sits behind the meal plan cards but covers
   * other content (header, nav, etc.) with a semi-transparent backdrop.
   * Clicking it exits edit mode. Same pattern as the grocery list overlay.
   * @returns {void}
   */
  _createEditOverlay() {
    if (this._overlayEl) return;
    const overlay = document.createElement('div');
    overlay.className = 'meal-plan-edit-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this._exitEditMode();
    });
    overlay.addEventListener('touchstart', () => {}, { passive: true });
    this._overlayEl = overlay;
    this.appendChild(overlay);
  }

  /**
   * Enter edit mode for all uncooked meal plan cards.
   * Business Logic: Sets body class for blur effect, shows the overlay,
   * and re-renders all uncooked cards in edit mode. Provides haptic feedback.
   * @returns {void}
   */
  _enterEditMode() {
    if (this._editMode) return;
    this._editMode = true;

    document.body.classList.add('edit-mode');

    if (this._overlayEl) {
      this._overlayEl.classList.add('meal-plan-edit-overlay--visible');
    }

    // Re-render to show edit mode cards
    this._render();

    if (window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  }

  /** Exit edit mode and restore normal card view. */
  _exitEditMode() {
    if (!this._editMode) return;
    this._editMode = false;

    document.body.classList.remove('edit-mode');

    if (this._overlayEl) {
      this._overlayEl.classList.remove('meal-plan-edit-overlay--visible');
    }

    // Re-render to restore normal cards
    this._render();
  }

  /**
   * Load meal plans from the store and render.
   * @returns {Promise<void>}
   */
  async _loadPlans() {
    if (!this._container) return;

    try {
      const { getMealPlansWithRecipes } = await import('../store/mealplan.store.js');
      this._plans = await getMealPlansWithRecipes();
      this._render();
    } catch (err) {
      console.error('Failed to load meal plans:', err);
      if (this._container) {
        this._container.innerHTML = `
          <div class="plan-empty">
            <svg class="plan-empty__icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>Could not load meal plans. Please try again.</p>
          </div>`;
      }
    }
  }

  /**
   * Render all meal plan cards into the container.
   * Uncooked cards first, then a divider, then cooked cards.
   * In edit mode, uncooked cards render the edit mode variant.
   * @returns {void}
   */
  _render() {
    if (!this._container) return;

    if (this._plans.length === 0) {
      this._container.innerHTML = `
        <div class="plan-empty">
          <svg class="plan-empty__icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
          </svg>
          <p>No meals planned yet. Add recipes from the Recipes tab.</p>
        </div>
      `;
      return;
    }

    // Split into uncooked and cooked
    const uncooked = this._plans.filter((p) => !p.mealPlan.isCooked);
    const cooked = this._plans.filter((p) => p.mealPlan.isCooked);

    // Build HTML
    let html = '';

    // Uncooked cards — render in edit mode if active
    html += uncooked.map(({ mealPlan, recipe }) => {
      if (this._editMode) {
        return this._renderEditCard(mealPlan, recipe);
      }
      return this._renderCard(mealPlan, recipe, false);
    }).join('');

    // Divider if both groups exist
    if (uncooked.length > 0 && cooked.length > 0) {
      html += `<div class="plan-divider">Cooked</div>`;
    }

    // Cooked cards (greyed out) — never in edit mode
    html += cooked.map(({ mealPlan, recipe }) => this._renderCard(mealPlan, recipe, true)).join('');

    this._container.innerHTML = html;

    // Wire event listeners
    this._wireCardEvents();
    if (this._editMode) {
      this._wireEditEvents();
    }
  }

  /**
   * Render a single meal plan card in edit mode.
   * Business Logic: Shows only the recipe title, a servings quantity stepper,
   * and a delete button. Used when the list is in edit mode on uncooked cards.
   * @param {import('../db.js').MealPlan} mealPlan - The meal plan entry.
   * @param {import('../db.js').Recipe | undefined} recipe - The associated recipe.
   * @returns {string} HTML string for the edit-mode card.
   */
  _renderEditCard(mealPlan, recipe) {
    if (!recipe) {
      return `
        <div class="recipe-card recipe-card--plan recipe-card--plan-edit" data-plan-id="${mealPlan.id}">
          <div class="recipe-card__body">
            <p class="recipe-card__description">Recipe deleted</p>
          </div>
        </div>
      `;
    }

    const title = escapeHtml(recipe.title);
    const servings = mealPlan.servingsTarget || recipe.servingsBase || 4;

    return `
      <div class="recipe-card recipe-card--plan recipe-card--plan-edit" data-plan-id="${mealPlan.id}" data-recipe-id="${recipe.id}">
        <div class="recipe-card__body">
          <h3 class="recipe-card__title">${title}</h3>
          <div class="recipe-card__edit-actions">
            <div class="plan-edit-servings">
              <span class="plan-edit-servings__icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              </span>
              <quantity-stepper class="plan-edit-stepper" value="${servings}" min="1" max="20">
              </quantity-stepper>
            </div>
            <button class="plan-delete-btn" data-delete-plan="${mealPlan.id}" aria-label="Delete meal plan">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single meal plan card.
   * @param {import('../db.js').MealPlan} mealPlan - The meal plan entry.
   * @param {import('../db.js').Recipe | undefined} recipe - The associated recipe.
   * @param {boolean} isCooked - Whether this card is cooked/greyed out.
   * @returns {string} HTML string for the card.
   */
  _renderCard(mealPlan, recipe, isCooked) {
    if (!recipe) {
      // Recipe might have been deleted — show a placeholder
      return `
        <div class="recipe-card recipe-card--plan${isCooked ? ' recipe-card--cooked' : ''}" data-plan-id="${mealPlan.id}">
          <div class="recipe-card__body">
            <p class="recipe-card__description">Recipe deleted</p>
          </div>
        </div>
      `;
    }

    const categoryLabel = escapeHtml(getRecipeCategoryName(recipe.recipeCategoryId));
    const title = escapeHtml(recipe.title);
    const notes = escapeHtml(recipe.notes || recipe.title);
    const prepTime = recipe.prepTime || 0;
    const servings = mealPlan.servingsTarget || recipe.servingsBase || 4;
    const isAddedToGrocery = this._addedToGrocery.has(mealPlan.id);

    return `
      <div class="recipe-card recipe-card--plan${isCooked ? ' recipe-card--cooked' : ''}" data-plan-id="${mealPlan.id}" data-recipe-id="${recipe.id}">
        <div class="recipe-card__body">
          <div class="recipe-card__meta">
            <span class="recipe-card__badge">${categoryLabel}</span>
            <span class="recipe-card__time">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              ${prepTime}m
            </span>
            <span class="plan-servings">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              ${servings} persons
            </span>
          </div>
          <h3 class="recipe-card__title">${title}</h3>
          <p class="recipe-card__description">${notes.length > 80 ? notes.slice(0, 80) + '…' : notes}</p>
        </div>
        <div class="recipe-card__actions">
          <button class="plan-add-grocery-btn${isAddedToGrocery ? ' plan-add-grocery-btn--added' : ''}" data-add-grocery="${mealPlan.id}" aria-label="Toggle grocery list"${isCooked ? ' disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03L21 4.96 19.25 4l-3.7 7H8.53L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2z"/></svg>
          </button>
          <button class="plan-check-btn${isCooked ? ' plan-check-btn--cooked' : ''}" data-check-off="${mealPlan.id}" aria-label="${isCooked ? 'Unmark as cooked' : 'Mark as cooked'}">
            ${isCooked
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
            }
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Wire event listeners for card action buttons and long-press.
   * @returns {void}
   */
  _wireCardEvents() {
    if (!this._container) return;

    // "Add to Grocery List" buttons
    const addBtns = this._container.querySelectorAll('[data-add-grocery]');
    addBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealPlanId = btn.getAttribute('data-add-grocery');
        if (mealPlanId) this._handleAddToGroceryList(mealPlanId);
      });
    });

    // Check-off buttons
    const checkBtns = this._container.querySelectorAll('[data-check-off]');
    checkBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealPlanId = btn.getAttribute('data-check-off');
        if (mealPlanId) this._toggleCooked(mealPlanId);
      });
    });

    // Click on card body opens the recipe detail drawer
    const allCards = this._container.querySelectorAll('.recipe-card--plan[data-recipe-id]');
    allCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        // Ignore clicks on buttons or their children
        if (/** @type {HTMLElement} */ (e.target).closest('button')) return;
        // Ignore clicks in edit mode
        if (this._editMode) return;
        const recipeId = card.getAttribute('data-recipe-id');
        if (recipeId) {
          document.dispatchEvent(new CustomEvent('open-recipe-detail', {
            bubbles: true,
            detail: { recipeId },
          }));
        }
      });
    });

    // Long-press on card body to enter edit mode (only on non-cooked, non-edit cards)
    const cards = this._container.querySelectorAll('.recipe-card--plan:not(.recipe-card--cooked):not(.recipe-card--plan-edit)');
    cards.forEach((card) => {
      card.addEventListener('mousedown', (e) => this._onCardPointerDown(e));
      card.addEventListener('touchstart', (e) => this._onCardPointerDown(e), { passive: true });
      card.addEventListener('mouseup', () => this._cancelPress());
      card.addEventListener('mouseleave', () => this._cancelPress());
      card.addEventListener('touchend', () => this._cancelPress());
      card.addEventListener('touchmove', () => this._cancelPress());
    });
  }

  /**
   * Wire event listeners specific to edit mode (delete buttons, steppers).
   * @returns {void}
   */
  _wireEditEvents() {
    if (!this._container) return;

    // Delete buttons
    const deleteBtns = this._container.querySelectorAll('[data-delete-plan]');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealPlanId = btn.getAttribute('data-delete-plan');
        if (mealPlanId) this._handleDelete(mealPlanId);
      });
    });

    // Servings stepper changes
    const steppers = this._container.querySelectorAll('.plan-edit-stepper');
    steppers.forEach((stepper) => {
      stepper.addEventListener('stepper-change', (e) => {
        e.stopPropagation();
        const detail = /** @type {CustomEvent} */ (e).detail;
        const card = stepper.closest('.recipe-card--plan-edit');
        if (card) {
          const mealPlanId = card.getAttribute('data-plan-id');
          if (mealPlanId) {
            this._handleServingsChange(mealPlanId, detail.value);
          }
        }
      });
    });
  }

  /**
   * Handle pointer down for long-press detection on a card.
   * Business Logic: Starts a 500ms timer. When the timer fires, enters edit
   * mode for all uncooked cards. The timer is cancelled on release/move.
   * @param {Event} e - Mouse or touch event.
   * @returns {void}
   */
  _onCardPointerDown(e) {
    if (this._editMode) return;
    // Don't trigger if the target is a button
    if (e.target && /** @type {HTMLElement} */ (e.target).closest('button')) return;

    this._pressTimer = window.setTimeout(() => {
      this._enterEditMode();
    }, 500);
  }

  /** Cancel the long-press timer. */
  _cancelPress() {
    if (this._pressTimer) {
      clearTimeout(this._pressTimer);
      this._pressTimer = undefined;
    }
  }

  /**
   * Handle "Add to Grocery List" button click — shows ingredient confirmation modal.
   * Business Logic: When toggled on, shows a modal listing all recipe ingredients.
   * Single-use (non-multi-use) ingredients are listed first and checked by default.
   * Multi-use ingredients are listed below and unchecked by default.
   * On confirm, selected items are added to the active grocery list with the
   * recipe ID stored in sourceRecipeIds for later removal.
   * When toggled off, items sourced from this recipe are removed from the list.
   * @param {string} mealPlanId - The meal plan UUID.
   * @returns {Promise<void>}
   */
  async _handleAddToGroceryList(mealPlanId) {
    // Find the plan entry
    const plan = this._plans.find((p) => p.mealPlan.id === mealPlanId);
    if (!plan || !plan.recipe) return;

    /** @type {import('./app-snackbar.js').AppSnackbar | null} */
    const snackbar = document.querySelector('app-snackbar');

    if (this._addedToGrocery.has(mealPlanId)) {
      // Remove from grocery list — call store function directly
      try {
        const { removeItemsByRecipeId } = await import('../store/grocery.store.js');
        await removeItemsByRecipeId(plan.recipe.id);
        this._addedToGrocery.delete(mealPlanId);
        if (snackbar) {
          snackbar.show(t(STRINGS.mealPlan.removeFromGrocery, { name: plan.recipe.title }));
        }
      } catch (err) {
        console.error('Failed to remove items from grocery list:', err);
        return;
      }
    } else {
      // Show ingredient confirmation modal
      const confirmed = await this._showIngredientModal(plan.recipe.id, plan.recipe.title);
      if (!confirmed) return; // User cancelled

      this._addedToGrocery.add(mealPlanId);
      if (snackbar) {
        snackbar.show(t(STRINGS.mealPlan.addedToGrocery, { name: plan.recipe.title }));
      }
    }

    // Update the button visual immediately
    const btn = this._container?.querySelector(`[data-add-grocery="${mealPlanId}"]`);
    if (btn) {
      btn.classList.toggle('plan-add-grocery-btn--added', this._addedToGrocery.has(mealPlanId));
    }
  }

  /**
   * Show the ingredient confirmation modal and return whether the user confirmed.
   * Business Logic: Loads the recipe with ingredients from Dexie, enriches them
   * with item data (name, category, unit, isMultiUse), and renders a modal with
   * two sections. Single-use ingredients are pre-checked, multi-use are not.
   * The modal uses the existing <content-dialog> pattern for consistency.
   * @param {string} recipeId - The recipe UUID.
   * @param {string} recipeTitle - The recipe title for the modal header.
   * @returns {Promise<boolean>} Whether the user confirmed the selection.
   */
  async _showIngredientModal(recipeId, recipeTitle) {
    // Import required store functions
    const { getRecipeWithIngredients, enrichIngredients } = await import('../store/recipes.store.js');
    const { getOrCreateActiveList, addGroceryItem } = await import('../store/grocery.store.js');

    // Get the recipe with its ingredients enriched with item data
    const recipeWithIngredients = await getRecipeWithIngredients(recipeId);
    if (!recipeWithIngredients) return false;

    const enrichedIngredients = await enrichIngredients(recipeWithIngredients.ingredients);
    if (enrichedIngredients.length === 0) {
      // No ingredients — just confirm adding
      await getOrCreateActiveList();
      return true;
    }

    // Split into single-use and multi-use
    const singleUse = enrichedIngredients.filter((ing) => ing.isMultiUse === false);
    const multiUse = enrichedIngredients.filter((ing) => ing.isMultiUse === true);

    // Get the active list
    const activeList = await getOrCreateActiveList();

    /**
     * Build the body content HTML for the ingredient list.
     * @returns {HTMLDivElement} The body div element.
     */
    function buildBodyContent() {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'recipe-ingredient-body';

      // Single-use section
      if (singleUse.length > 0) {
        const section = document.createElement('div');
        section.className = 'recipe-ingredient-section';
        section.innerHTML = `<div class="recipe-ingredient-section__label">Ingredients (single-use)</div>`;
        section.innerHTML += singleUse.map((ing) => `
          <label class="ingredient-item" data-item-id="${ing.itemId}"
               data-name="${escapeHtml(ing.itemName)}"
               data-category="${escapeHtml(ing.categoryId)}"
               data-unit="${escapeHtml(ing.unitId)}"
               data-qty="${ing.quantity}">
            <div class="ingredient-item__info">
              <span class="ingredient-item__name">${escapeHtml(ing.itemName)}</span>
              <span class="ingredient-item__meta">${ing.quantity} ${ing.unitId}</span>
            </div>
            <div class="ingredient-item__check-wrapper">
              <input type="checkbox" class="ingredient-item__checkbox" checked aria-label="Select ${escapeHtml(ing.itemName)}">
              <span class="ingredient-item__check-visual">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </span>
            </div>
          </label>
        `).join('');
        bodyEl.appendChild(section);
      }

      // Multi-use section
      if (multiUse.length > 0) {
        const section = document.createElement('div');
        section.className = 'recipe-ingredient-section';
        section.innerHTML = `<div class="recipe-ingredient-section__label recipe-ingredient-section__label--multi">Ingredients (multi-use)</div>`;
        section.innerHTML += multiUse.map((ing) => `
          <label class="ingredient-item" data-item-id="${ing.itemId}"
               data-name="${escapeHtml(ing.itemName)}"
               data-category="${escapeHtml(ing.categoryId)}"
               data-unit="${escapeHtml(ing.unitId)}"
               data-qty="${ing.quantity}">
            <div class="ingredient-item__info">
              <span class="ingredient-item__name">${escapeHtml(ing.itemName)}</span>
              <span class="ingredient-item__meta">${ing.quantity} ${ing.unitId}</span>
            </div>
            <div class="ingredient-item__check-wrapper">
              <input type="checkbox" class="ingredient-item__checkbox" aria-label="Select ${escapeHtml(ing.itemName)}">
              <span class="ingredient-item__check-visual">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </span>
            </div>
          </label>
        `).join('');
        bodyEl.appendChild(section);
      }
      return bodyEl;
    }

    // Create or reuse the ingredient confirmation dialog
    let dlg = /** @type {HTMLElement | null} */ (document.getElementById('recipe-ingredient-dialog'));

    if (!dlg) {
      // First creation: build all content BEFORE appending to DOM so that
      // content-dialog's connectedCallback() can distribute children correctly
      dlg = document.createElement('content-dialog');
      dlg.id = 'recipe-ingredient-dialog';
      dlg.setAttribute('heading', `Add ${escapeHtml(recipeTitle)}`);
      dlg.setAttribute('subtitle', 'Select ingredients to add to your grocery list.');

      // Add body content (no slot — goes into body)
      dlg.appendChild(buildBodyContent());

      // Add Cancel button (slot="actions" — goes into footer)
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'recipe-ingredient-cancel';
      cancelBtn.className = 'content-dialog__btn content-dialog__btn--secondary';
      cancelBtn.slot = 'actions';
      cancelBtn.textContent = 'Cancel';
      dlg.appendChild(cancelBtn);

      // Add Add Selected button (slot="actions" — goes into footer)
      const addBtn = document.createElement('button');
      addBtn.id = 'recipe-ingredient-add';
      addBtn.className = 'content-dialog__btn content-dialog__btn--primary';
      addBtn.slot = 'actions';
      addBtn.textContent = 'Add Selected';
      dlg.appendChild(addBtn);

      // NOW append to DOM — connectedCallback() will distribute the children
      document.body.appendChild(dlg);
    } else {
      // Dialog already exists — update heading, body, and reuse action buttons
      dlg.setAttribute('heading', `Add ${escapeHtml(recipeTitle)}`);
      dlg.setAttribute('subtitle', 'Select ingredients to add to your grocery list.');

      // Replace body content inside the content-dialog__body slot
      const bodySlot = /** @type {HTMLElement | null} */ (dlg.querySelector('.content-dialog__body'));
      if (bodySlot) {
        bodySlot.innerHTML = '';
        bodySlot.appendChild(buildBodyContent());
      }
    }

    // Get references to the action buttons (they already exist in the dialog)
    const cancelBtn = /** @type {HTMLElement | null} */ (dlg.querySelector('#recipe-ingredient-cancel'));
    const addBtn = /** @type {HTMLElement | null} */ (dlg.querySelector('#recipe-ingredient-add'));

    // Get the body content for later reference in the Promise callback
    const bodySlot = /** @type {HTMLElement | null} */ (dlg.querySelector('.content-dialog__body'));
    const body = /** @type {HTMLElement | null} */ (bodySlot ? bodySlot.querySelector('.recipe-ingredient-body') : null);

    // Return a promise that resolves when the user confirms or cancels
    return new Promise((resolve) => {
      /** Handle cancel action. */
      const onCancel = () => {
        cleanup();
        dlg?.hide();
        resolve(false);
      };

      /** Handle add action — collects checked ingredients and adds to grocery list. */
      const onAdd = async () => {
        cleanup();
        dlg?.hide();

        // Collect checked ingredients and add them to the grocery list
        const checkedItems = /** @type {HTMLElement[]} */ (Array.from(body.querySelectorAll('.ingredient-item')))
          .filter((el) => {
            const checkbox = /** @type {HTMLInputElement | null} */ (el.querySelector('.ingredient-item__checkbox'));
            return checkbox && checkbox.checked;
          });

        try {
          for (const itemEl of checkedItems) {
            const itemId = itemEl.getAttribute('data-item-id') || '';
            const name = itemEl.getAttribute('data-name') || '';
            const categoryId = itemEl.getAttribute('data-category') || '';
            const unit = itemEl.getAttribute('data-unit') || '';
            const qty = parseFloat(itemEl.getAttribute('data-qty') || '1');
            // Use the recipe's recipeId as the source (from the recipe itself, not mealPlanId)
            await addGroceryItem(
              activeList.id,
              itemId, name, categoryId, qty, unit,
              recipeId, // Store recipeId so we can remove later
            );
          }
        } catch (err) {
          console.error('Failed to add ingredients to grocery list:', err);
          resolve(false);
          return;
        }

        resolve(true);
      };

      /** @type {() => void} */
      const cleanup = () => {
        cancelBtn?.removeEventListener('click', onCancel);
        addBtn?.removeEventListener('click', onAdd);
        dlg?.removeEventListener('dialog-close', onDialogClose);
        dlg?.removeEventListener('click', onBackdropClick);
      };

      /** Handle dialog close via escape/backdrop. */
      const onDialogClose = () => {
        onCancel();
      };

      /** @param {MouseEvent} e */
      const onBackdropClick = (e) => {
        if (e.target === dlg?.querySelector('dialog')) {
          onCancel();
        }
      };

      cancelBtn.addEventListener('click', onCancel);
      addBtn.addEventListener('click', onAdd);
      dlg.addEventListener('dialog-close', onDialogClose);
      dlg.addEventListener('click', onBackdropClick);

      // Show the dialog
      dlg.show();
    });
  }

  /**
   * Toggle the cooked state of a meal plan entry.
   * Business Logic: Does NOT remove grocery items — only marks the meal as cooked.
   * @param {string} mealPlanId - The meal plan UUID.
   * @returns {Promise<void>}
   */
  async _toggleCooked(mealPlanId) {
    const plan = this._plans.find((p) => p.mealPlan.id === mealPlanId);
    if (!plan) return;

    try {
      const { toggleMealPlanCooked } = await import('../store/mealplan.store.js');
      await toggleMealPlanCooked(mealPlanId, !plan.mealPlan.isCooked);

      // Re-load and re-render
      await this._loadPlans();
    } catch (err) {
      console.error('Failed to toggle meal plan cooked state:', err);
    }
  }

  /**
   * Handle the CLEAR ALL button — confirm then delete all meal plans and their grocery items.
   * Business Logic: Uses the reusable <confirm-dialog> component with a danger
   * variant — same pattern as the grocery list clear all.
   * On confirm, removes all meal plans and all recipe-sourced grocery items.
   * @returns {void}
   */
  _handleClearAll() {
    // Create or reuse the confirm dialog
    let confirmDlg = /** @type {any} */ (
      document.getElementById('plan-clear-all-dialog')
    );

    if (!confirmDlg) {
      confirmDlg = document.createElement('confirm-dialog');
      confirmDlg.id = 'plan-clear-all-dialog';
      confirmDlg.setAttribute('heading', 'Clear entire meal plan?');
      confirmDlg.setAttribute('message', 'This will remove all planned meals and their ingredients from the grocery list. This cannot be undone.');
      confirmDlg.setAttribute('confirm-label', 'Clear Plan');
      confirmDlg.setAttribute('confirm-variant', 'danger');
      confirmDlg.setAttribute('cancel-label', 'Keep Plan');
      document.body.appendChild(confirmDlg);

      // One-time event listener for confirm
      confirmDlg.addEventListener('dialog-confirm', async () => {
        try {
          const { clearAllMealPlans } = await import('../store/mealplan.store.js');
          const { removeAllRecipeItems } = await import('../store/grocery.store.js');
          await removeAllRecipeItems();
          await clearAllMealPlans();
          await this._loadPlans();

          const snackbar = /** @type {import('./app-snackbar.js').AppSnackbar | null} */ (
            document.querySelector('app-snackbar')
          );
          if (snackbar) {
            snackbar.show(t(STRINGS.mealPlan.clearSnackbar));
          }
        } catch (err) {
          console.error('Failed to clear meal plans:', err);
        }
      });
    }

    confirmDlg.show();
  }

  /**
   * Handle delete of a meal plan entry in edit mode.
   * Business Logic: Removes the meal plan from Dexie, removes its items from
   * the grocery list, exits edit mode, and re-renders the list. Shows a
   * snackbar with an Undo button — same pattern as grocery list item delete.
   * On undo, re-adds the meal plan entry using the captured data.
   * @param {string} mealPlanId - The meal plan UUID to delete.
   * @returns {Promise<void>}
   */
  async _handleDelete(mealPlanId) {
    const plan = this._plans.find((p) => p.mealPlan.id === mealPlanId);
    if (!plan) return;

    // Capture a shallow copy before the async delete
    const deletedPlan = { mealPlan: { ...plan.mealPlan }, recipe: plan.recipe ? { ...plan.recipe } : null };
    const recipeTitle = plan.recipe ? plan.recipe.title : 'Meal';
    const recipeId = plan.recipe ? plan.recipe.id : null;

    try {
      const { removeMealPlan } = await import('../store/mealplan.store.js');
      await removeMealPlan(mealPlanId);

      // Remove grocery items sourced from this recipe
      if (recipeId) {
        const { removeItemsByRecipeId } = await import('../store/grocery.store.js');
        await removeItemsByRecipeId(recipeId);
      }

      // Exit edit mode
      this._exitEditMode();

      // Show snackbar with undo
      const snackbar = /** @type {import('./app-snackbar.js').AppSnackbar | null} */ (
        document.querySelector('app-snackbar')
      );

      if (snackbar) {
        /**
         * Re-add the deleted meal plan after undo.
         * Business Logic: Uses captured deletedPlan data to re-insert
         * the meal plan into Dexie via addMealPlan, then shows confirmation.
         * Note: Does NOT re-add the ingredients to the grocery list — the user
         * would need to press "Add to Grocery List" again.
         * @returns {Promise<void>}
         */
        const handleUndo = async () => {
          try {
            const { addMealPlan } = await import('../store/mealplan.store.js');
            await addMealPlan(
              deletedPlan.mealPlan.recipeId,
              deletedPlan.mealPlan.servingsTarget,
            );
            snackbar.show(t(STRINGS.mealPlan.restoredToPlan, { name: recipeTitle }));
          } catch (err) {
            console.error('Failed to restore meal plan:', err);
          }
        };

        snackbar.show(t(STRINGS.mealPlan.removedFromPlan, { name: recipeTitle }), {
          undo: true,
          onUndo: handleUndo,
          type: 'removed',
        });
      }

      // Re-load to refresh data
      await this._loadPlans();
    } catch (err) {
      console.error('Failed to remove meal plan:', err);
    }
  }

  /**
   * Handle servings change from the quantity stepper in edit mode.
   * Business Logic: Updates the meal plan's servingsTarget in Dexie
   * and dispatches a snackbar to confirm the change.
   * @param {string} mealPlanId - The meal plan UUID.
   * @param {number} newServings - The new servings value.
   * @returns {Promise<void>}
   */
  async _handleServingsChange(mealPlanId, newServings) {
    const plan = this._plans.find((p) => p.mealPlan.id === mealPlanId);
    if (!plan) return;

    try {
      const { updateServingsTarget } = await import('../store/mealplan.store.js');
      await updateServingsTarget(mealPlanId, newServings);

      // Update the in-memory data
      plan.mealPlan.servingsTarget = newServings;

      /** @type {import('./app-snackbar.js').AppSnackbar | null} */
      const snackbar = document.querySelector('app-snackbar');
      if (snackbar) {
        const recipeTitle = plan.recipe ? plan.recipe.title : 'Meal';
        snackbar.show(t(STRINGS.mealPlan.servingsUpdate, { name: recipeTitle, count: newServings }));
      }
    } catch (err) {
      console.error('Failed to update servings:', err);
    }
  }
}

customElements.define('meal-planner', MealPlanner);