// @ts-check
/**
 * Search Autocomplete Web Component — reusable search field with dropdown.
 * Business Logic: Provides a debounced search input that queries the items
 * library and shows a dropdown of matching results. Supports both inline use
 * (within a search bar) and dialog use (within an ingredient picker).
 * Emits 'item-selected' when the user picks a result, and 'create-custom'
 * when the user wants to add a new item not found in search.
 * @class
 * @augments {HTMLElement}
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

  /**
   * Search function injected by the parent component.
   * @type {((query: string) => Promise<import("../db.js").Item[]>) | null}
   */
  searchFn = null;

  /**
   * Function to load recent/initial items when input is focused (optional).
   * @type {((query: string) => Promise<import("../db.js").Item[]>) | null}
   */
  recentFn = null;

  /** @type {string} */
  _placeholder = 'Search...';
  /** @type {number} */
  _debounceMs = 150;

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
   * Perform the search query and render results.
   * @param {string} query - The search string.
   */
  async _performSearch(query) {
    if (query === this._lastQuery) return;
    this._lastQuery = query;

    if (!this._dropdown) return;

    try {
      const fn = this.searchFn || (await this._getDefaultSearchFn());
      const results = await fn(query);

      if (results.length === 0) {
        this._dropdown.innerHTML = `
          <div class="search-autocomplete__empty">No items found</div>
        `;
      } else {
        this._dropdown.innerHTML = results.map((item) => `
          <button class="search-autocomplete__item"
                  data-item-id="${item.id}"
                  data-name="${this._escapeHtml(item.name)}"
                  data-category="${this._escapeHtml(item.categoryId)}"
                  data-unit="${this._escapeHtml(item.unitId)}"
                  data-qty="${item.defaultQty}">
            <span class="search-autocomplete__item-name">${this._escapeHtml(item.name)}</span>
            <span class="search-autocomplete__item-meta">${item.categoryId} · ${item.defaultQty} ${item.unitId}</span>
          </button>
        `).join('');
      }

      this._dropdown.style.display = 'block';
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  /**
   * Get the default search function from the items store.
   * @returns {Promise<(query: string) => Promise<import("../db.js").Item[]>>}
   */
  async _getDefaultSearchFn() {
    const { searchItems } = await import('../store/items.store.js');
    return searchItems;
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
      this._hideDropdown();
      this.dispatchEvent(new CustomEvent('create-custom', {
        bubbles: true,
        composed: true,
        detail: {},
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

  /**
   * Escape HTML special characters.
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('search-autocomplete', SearchAutocomplete);