// @ts-check
import { escapeHtml } from '../utils/dom-utils.js';

/**
 * Ingredient Picker Web Component — autocomplete search bottom sheet.
 * Business Logic: Provides a searchable list of items from the Items Library
 * for adding items to the grocery list. The user types to filter, then taps
 * a result to fire an 'ingredient-selected' event. The component works with
 * the existing <dialog id="ingredient-picker-sheet"> from index.html.
 * @class
 * @augments {HTMLElement}
 */
export class IngredientPicker extends HTMLElement {
  /** @type {HTMLInputElement | null} */
  _searchInput = null;
  /** @type {HTMLDivElement | null} */
  _resultsContainer = null;
  /** @type {number | undefined} */
  _debounceTimer = undefined;
  /** @type {AbortController | null} */
  _abortController = null;
  /** @type {string} */
  _lastQuery = '';

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Finds the search input and results
   * container within the sheet, wires up events.
   * @returns {void}
   */
  connectedCallback() {
    // Find elements within the ingredient-picker-sheet dialog
    const sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('ingredient-picker-sheet'));
    if (!sheet) return;

    this._searchInput = /** @type {HTMLInputElement | null} */ (sheet.querySelector('#ingredient-search'));
    this._resultsContainer = /** @type {HTMLDivElement | null} */ (sheet.querySelector('#ingredient-results'));

    if (!this._searchInput || !this._resultsContainer) return;

    this._searchInput.addEventListener('input', () => this._onSearchInput());
    this._searchInput.addEventListener('focus', () => this._loadRecent());

    // Listen for sheet open/close to manage focus
    sheet.addEventListener('close', () => this._onSheetClose());

    // Delegate click events on results container
    this._resultsContainer.addEventListener('click', (e) => this._onResultClick(e));

    // Close button
    const closeBtn = sheet.querySelector('#ingredient-picker-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => sheet.close());
    }
  }

  /** Handle search input changes with debounce. */
  _onSearchInput() {
    if (!this._searchInput) return;
    const query = this._searchInput.value.trim();

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    if (query.length === 0) {
      this._loadRecent();
      return;
    }

    this._debounceTimer = window.setTimeout(() => {
      this._performSearch(query);
    }, 200);
  }

  /**
   * Perform the actual search query against the items store.
   * @param {string} query - The search string.
   */
  async _performSearch(query) {
    if (query === this._lastQuery) return;
    this._lastQuery = query;

    if (!this._resultsContainer) return;

    try {
      // Dynamically import items store to avoid circular deps
      const { searchItems } = await import('../store/items.store.js');
      const results = await searchItems(query);

      this._renderResults(results, query);
    } catch (err) {
      console.error('Ingredient search failed:', err);
      this._resultsContainer.innerHTML = '<div class="picker-error">Search unavailable</div>';
    }
  }

  /** Load recent/essential items when search field is focused empty. */
  async _loadRecent() {
    if (!this._resultsContainer) return;
    this._lastQuery = '';
    this._abortController?.abort();

    try {
      const { getEssentialItems, getAllItems } = await import('../store/items.store.js');
      const essentials = await getEssentialItems();
      const all = await getAllItems();

      if (this._searchInput && this._searchInput.value.trim().length > 0) return;

      if (essentials.length > 0) {
        this._renderResults(essentials, '', true);
      } else if (all.length > 0) {
        this._renderResults(all.slice(0, 20), '', true);
      } else {
        this._resultsContainer.innerHTML = `
          <div class="picker-empty">
            <p>No items in library yet. Add ingredients in the Items tab first.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load recent items:', err);
    }
  }

  /**
   * Render search results into the results container.
   * @param {import("../db.js").Item[]} items - Items to display.
   * @param {string} _query - The search query (unused but kept for context).
   * @param {boolean} isRecent - Whether these are recent/essential items.
   */
  _renderResults(items, _query, isRecent = false) {
    if (!this._resultsContainer) return;

    if (items.length === 0) {
      this._resultsContainer.innerHTML = `
        <div class="picker-empty">
          <p>No results found. Try a different search.</p>
          <button class="picker-add-custom" data-custom="true">+ Add custom item</button>
        </div>
      `;
      return;
    }

    const header = isRecent
      ? '<div class="picker-header">Quick add — Essentials</div>'
      : '';

    const itemsHtml = items.map((item) => `
      <button class="picker-result" data-item-id="${item.id}"
              data-name="${escapeHtml(item.name)}"
              data-category="${escapeHtml(item.categoryId)}"
              data-unit="${escapeHtml(item.unitId)}"
              data-qty="${item.defaultQty}">
        <span class="picker-result__name">${escapeHtml(item.name)}</span>
        <span class="picker-result__meta">${item.categoryId} · ${item.defaultQty} ${item.unitId}</span>
      </button>
    `).join('');

    this._resultsContainer.innerHTML = `
      ${header}
      <div class="picker-results-list">
        ${itemsHtml}
      </div>
      <button class="picker-add-custom" data-custom="true">+ Can't find it? Add custom item</button>
    `;
  }

  /**
   * Handle click on a result row or the custom-add button.
   * @param {Event} e - The click event.
   */
  _onResultClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const resultBtn = target.closest('.picker-result');
    const customBtn = target.closest('.picker-add-custom');

    if (resultBtn) {
      const id = resultBtn.getAttribute('data-item-id') || '';
      const name = resultBtn.getAttribute('data-name') || '';
      const categoryId = resultBtn.getAttribute('data-category') || '';
      const unit = resultBtn.getAttribute('data-unit') || '';
      const qty = parseFloat(resultBtn.getAttribute('data-qty') || '1');

      // Close the sheet
      const sheet = /** @type {HTMLDialogElement | null} */ (document.getElementById('ingredient-picker-sheet'));
      if (sheet) sheet.close();

      this.dispatchEvent(new CustomEvent('ingredient-selected', {
        bubbles: true,
        composed: true,
        detail: { itemId: id, name, categoryId, unit, qty },
      }));
    }

    if (customBtn) {
      this.dispatchEvent(new CustomEvent('ingredient-custom', {
        bubbles: true,
        composed: true,
        detail: {},
      }));
    }
  }

  /** Reset the picker state when the sheet is closed. */
  _onSheetClose() {
    if (this._searchInput) {
      this._searchInput.value = '';
    }
    this._lastQuery = '';
    if (this._resultsContainer) {
      this._resultsContainer.innerHTML = '';
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
  }

}

customElements.define('ingredient-picker', IngredientPicker);