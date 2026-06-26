// @ts-check
/**
 * Search Autocomplete Web Component — reusable search field with dropdown.
 * Business Logic: Provides a debounced search input that queries the items
 * library and shows a dropdown of matching results. Supports both inline use
 * (within a search bar) and dialog use (within an ingredient picker).
 * Emits 'item-selected' when the user picks a result, and 'create-custom'
 * when the user wants to add a new item not found in search.
 * The "Create new item" option always appears as the first suggestion when
 * the user has typed a query, regardless of whether there are matching results.
 * @module
 */
import { getCategoryName } from '../store/categories.store.js';
import { escapeHtml } from '../utils/dom-utils.js';

/**
 * Search Autocomplete Web Component — reusable search field with dropdown.
 * Business Logic: Provides a debounced search input that queries the items
 * library and shows a dropdown of matching results.
 * @class
 * @augments HTMLElement
 */
export class SearchAutocomplete extends HTMLElement {
  /** @type {HTMLInputElement | null} */
  _input = null;
  /** @type {HTMLDivElement | null} */
  _dropdown = null;
  /** @type {number | undefined} */
  _debounceTimer = undefined;
  /** @type {string} */
  _lastQuery = '';

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Set the placeholder text for the search input.
   * @param {string} value
   */
  set placeholder(value) {
    this._placeholder = value;
    if (this._input) {
      this._input.placeholder = value;
    }
  }

  /**
   * Set the debounce delay in milliseconds.
   * @param {number} ms
   */
  set debounceMs(ms) {
    this._debounceMs = ms;
  }

  /**
   * Called when element is added to the DOM.
   * @returns {void}
   */
  connectedCallback() {
    this._input = this.querySelector('.search-autocomplete__input');
    this._dropdown = this.querySelector('.search-autocomplete__dropdown');

    if (!this._input || !this._dropdown) {
      // If template wasn't stamped, render from scratch
      this._render();
      this._input = this.querySelector('.search-autocomplete__input');
      this._dropdown = this.querySelector('.search-autocomplete__dropdown');
    }

    if (this._input) {
      this._input.placeholder = this.getAttribute('placeholder') || this._placeholder;
      this._input.addEventListener('input', () => this._onInput());
      this._input.addEventListener('focus', () => this._onFocus());
      this._input.addEventListener('blur', () => {
        setTimeout(() => this._hideDropdown(), 200);
      });
    }

    if (this._dropdown) {
      this._dropdown.addEventListener('mousedown', (e) => e.preventDefault());
      this._dropdown.addEventListener('click', (e) => this._onDropdownClick(e));
    }
  }

  /** Render the component's inner HTML if no template was used. */
  _render() {
    this.innerHTML = `
      <div class="search-autocomplete">
        <input type="search"
               class="search-autocomplete__input"
               placeholder="${this._placeholder}"
               autocomplete="off" />
        <div class="search-autocomplete__dropdown" style="display:none"></div>
      </div>
    `;
  }

  /** Handle input changes with debounce. */
  _onInput() {
    if (!this._input) return;
    const query = this._input.value.trim();

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    if (query.length === 0) {
      this._hideDropdown();
      return;
    }

    this._debounceTimer = window.setTimeout(() => {
      this._performSearch(query);
    }, this._debounceMs);
  }

  /** Handle focus — show recent items if input is empty. */
  _onFocus() {
    if (this._input && this._input.value.trim().length > 0) {
      this._performSearch(this._input.value.trim());
    }
  }

  /**
   * Build the "Create new item" button HTML.
   * Business Logic: Always shown as the first suggestion so users can add
   * items not yet in the library. Styled with + prefix and accent color.
   * @param {string} query - The current search query.
   * @returns {string} HTML for the create button.
   */
  _buildCreateItemHtml(query) {
    return `
      <button class="search-autocomplete__custom" data-create-item="${escapeHtml(query)}">
        <span class="search-autocomplete__custom-icon">+</span>
        <span class="search-autocomplete__custom-label">Create new item "${escapeHtml(query)}"</span>
      </button>
    `;
  }

  /**
   * Perform the search query and render results.
   * Business Logic: Always renders the "Create new item" button as the first
   * item when there is a non-empty query, followed by any matching results.
   * @param {string} query - The search string.
   */
  async _performSearch(query) {
    if (query === this._lastQuery) return;
    this._lastQuery = query;

    if (!this._dropdown) return;

    try {
      const { searchItems } = await import('../store/items.store.js');
      const results = await searchItems(query);

      // Always show "Create new item" as the first item when query is non-empty
      const createBtnHtml = this._buildCreateItemHtml(query);

      if (results.length === 0) {
        this._dropdown.innerHTML = createBtnHtml;
      } else {
        const resultsHtml = results.map((item) => {
          const catName = getCategoryName(item.categoryId);
          return `
          <button class="search-autocomplete__item"
                  data-item-id="${item.id}"
                   data-name="${escapeHtml(item.name)}"
                   data-category="${escapeHtml(item.categoryId)}"
                   data-unit="${escapeHtml(item.unitId)}"
                  data-qty="${item.defaultQty}">
            <div class="search-autocomplete__item-content">
              <span class="search-autocomplete__item-name">${escapeHtml(item.name)}</span>
              <span class="search-autocomplete__item-meta">${catName} · ${item.defaultQty} ${item.unitId}</span>
            </div>
          </button>
        `}).join('');

        this._dropdown.innerHTML = createBtnHtml + resultsHtml;
      }

      this._dropdown.style.display = 'block';
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  /** Hide the dropdown. */
  _hideDropdown() {
    if (this._dropdown) {
      this._dropdown.style.display = 'none';
    }
  }

  /**
   * Handle click on a dropdown result or custom-add button.
   * @param {Event} e - The click event.
   */
  _onDropdownClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const itemEl = target.closest('.search-autocomplete__item');
    const customEl = target.closest('.search-autocomplete__custom');

    if (itemEl) {
      const itemId = itemEl.getAttribute('data-item-id') || '';
      const name = itemEl.getAttribute('data-name') || '';
      const categoryId = itemEl.getAttribute('data-category') || '';
      const unit = itemEl.getAttribute('data-unit') || '';
      const qty = parseFloat(itemEl.getAttribute('data-qty') || '1');

      this._hideDropdown();
      if (this._input) this._input.value = '';

      this.dispatchEvent(new CustomEvent('item-selected', {
        bubbles: true,
        composed: true,
        detail: { itemId, name, categoryId, unit, qty },
      }));
    }

    if (customEl) {
      const query = this._input?.value?.trim() || '';
      this._hideDropdown();
      // Don't clear input — let consumer decide when to clear
      this.dispatchEvent(new CustomEvent('create-custom', {
        bubbles: true,
        composed: true,
        detail: { query },
      }));
    }
  }

  /**
   * Clear the search input and hide the dropdown.
   * @returns {void}
   */
  clear() {
    if (this._input) this._input.value = '';
    this._lastQuery = '';
    this._hideDropdown();
  }

  /**
   * Focus the search input.
   * @returns {void}
   */
  focusInput() {
    if (this._input) {
      this._input.focus();
    }
  }

}

customElements.define('search-autocomplete', SearchAutocomplete);