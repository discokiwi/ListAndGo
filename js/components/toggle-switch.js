// @ts-check
/**
 * Toggle Switch Web Component.
 * Business Logic: A reusable, accessible toggle switch (custom checkbox)
 * that renders as a pill-shaped toggle. Uses Shadow DOM for style isolation.
 * Fires a 'toggle-change' custom event with `{ checked: boolean }` detail.
 * @class
 * @augments HTMLElement
 */
export class ToggleSwitch extends HTMLElement {
  /** @type {boolean} */
  #checked = false;

  /** @type {HTMLInputElement | null} */
  #input = null;

  /** Construct the component and attach Shadow DOM. */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#checked = this.hasAttribute('checked');
  }

  /**
   * Get the current checked state.
   * @returns {boolean}
   */
  get checked() {
    return this.#checked;
  }

  /**
   * Set the checked state and update the UI.
   * @param {boolean} val
   */
  set checked(val) {
    this.#checked = val;
    if (this.#input) {
      this.#input.checked = val;
    }
    this._updateAttribute();
  }

  /**
   * Sync the `checked` attribute with the internal state.
   * @returns {void}
   */
  _updateAttribute() {
    if (this.#checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  /**
   * Called when element is added to the DOM.
   * Renders the toggle HTML and attaches event listeners.
   * @returns {void}
   */
  connectedCallback() {
    // Prevent double render
    if (this.shadowRoot?.hasChildNodes()) return;

    const tmpl = document.createElement('template');
    tmpl.innerHTML = `
      <style>
        :host {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          min-width: 48px;
          min-height: 48px;
          justify-content: center;
        }
        .toggle-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .toggle-track {
          width: 44px;
          height: 24px;
          background: var(--color-surface-container-highest, #e2e2e5);
          border-radius: 9999px;
          transition: background 0.2s ease;
          position: relative;
        }
        .toggle-thumb {
          position: absolute;
          left: 3px;
          top: 3px;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: var(--color-on-surface-variant, #404943);
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .toggle-input:checked ~ .toggle-track {
          background: var(--color-primary, #0f5238);
        }
        .toggle-input:checked ~ .toggle-track .toggle-thumb {
          transform: translateX(20px);
          background: var(--color-on-primary, #ffffff);
        }
      </style>
      <label class="toggle-label">
        <input type="checkbox" class="toggle-input" aria-label="Toggle" />
        <div class="toggle-track">
          <div class="toggle-thumb"></div>
        </div>
      </label>
    `;

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(tmpl.content.cloneNode(true));

      /** @type {HTMLInputElement | null} */
      const input = this.shadowRoot.querySelector('.toggle-input');
      if (input) {
        this.#input = input;
        input.checked = this.#checked;

        input.addEventListener('change', () => {
          this.#checked = input.checked;
          this._updateAttribute();
          this.dispatchEvent(
            new CustomEvent('toggle-change', {
              bubbles: true,
              composed: true,
              detail: { checked: this.#checked },
            })
          );
        });
      }
    }
  }

  /**
   * Observe the `checked` attribute for changes.
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['checked'];
  }

  /**
   * React to attribute changes.
   * @param {string} name - The attribute name.
   * @param {string | null} oldVal - The old value.
   * @param {string | null} newVal - The new value.
   * @returns {void}
   */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'checked' && oldVal !== newVal) {
      this.#checked = newVal !== null;
      if (this.#input) {
        this.#input.checked = this.#checked;
      }
    }
  }
}

customElements.define('toggle-switch', ToggleSwitch);