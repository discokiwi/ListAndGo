// @ts-check
/**
 * Quantity Stepper Web Component.
 * Business Logic: A reusable +/- stepper control for numeric values.
 * Used for recipe scaling settings and other numeric adjustments.
 * Fires a 'stepper-change' custom event with `{ value: number }` detail.
 * @class
 * @augments HTMLElement
 */
export class QuantityStepper extends HTMLElement {
  /** @type {number} */
  #value = 2;

  /** @type {number} */
  #min = 1;

  /** @type {number} */
  #max = 20;

  /** @type {HTMLElement | null} */
  #valueDisplay = null;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Get the current value.
   * @returns {number}
   */
  get value() {
    return this.#value;
  }

  /**
   * Set the current value, clamped between min and max.
   * @param {number} val
   */
  set value(val) {
    this.#value = Math.max(this.#min, Math.min(this.#max, val));
    this.setAttribute('value', String(this.#value));
    if (this.#valueDisplay) {
      this.#valueDisplay.textContent = `${this.#value}`;
    }
  }

  /**
   * Get the minimum value.
   * @returns {number}
   */
  get min() {
    return this.#min;
  }

  /**
   * Set the minimum value.
   * @param {number} val
   */
  set min(val) {
    this.#min = val;
    this.setAttribute('min', String(val));
  }

  /**
   * Get the maximum value.
   * @returns {number}
   */
  get max() {
    return this.#max;
  }

  /**
   * Set the maximum value.
   * @param {number} val
   */
  set max(val) {
    this.#max = val;
    this.setAttribute('max', String(val));
  }

  /**
   * Called when element is added to the DOM.
   * Parses attributes and renders the stepper.
   * @returns {void}
   */
  connectedCallback() {
    // Prevent double render: check if we already rendered the stepper
    if (this.querySelector('.quantity-stepper')) return;

    // Parse attributes
    if (this.hasAttribute('value')) {
      this.#value = Math.max(this.#min, Math.min(this.#max, parseInt(this.getAttribute('value') || '2', 10) || 2));
    }
    if (this.hasAttribute('min')) {
      this.#min = parseInt(this.getAttribute('min') || '1', 10) || 1;
    }
    if (this.hasAttribute('max')) {
      this.#max = parseInt(this.getAttribute('max') || '20', 10) || 20;
    }

    this.innerHTML = `
      <div class="quantity-stepper">
        <button class="quantity-stepper__btn" id="stepper-minus" aria-label="Decrease quantity">−</button>
        <span class="quantity-stepper__value" id="stepper-value">${this.#value}</span>
        <button class="quantity-stepper__btn" id="stepper-plus" aria-label="Increase quantity">+</button>
      </div>
    `;

    /** @type {HTMLElement | null} */
    const minusBtn = this.querySelector('#stepper-minus');
    /** @type {HTMLElement | null} */
    const plusBtn = this.querySelector('#stepper-plus');
    /** @type {HTMLElement | null} */
    const valueDisplay = this.querySelector('#stepper-value');
    if (valueDisplay) {
      this.#valueDisplay = valueDisplay;
    }

    minusBtn?.addEventListener('click', () => {
      if (this.#value > this.#min) {
        this.value = this.#value - 1;
        this.#dispatchChange();
      }
    });

    plusBtn?.addEventListener('click', () => {
      if (this.#value < this.#max) {
        this.value = this.#value + 1;
        this.#dispatchChange();
      }
    });
  }

  /**
   * Dispatch a 'stepper-change' custom event with the current value.
   * @returns {void}
   */
  #dispatchChange() {
    this.dispatchEvent(
      new CustomEvent('stepper-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.#value },
      })
    );
  }

  /**
   * Observe attributes for changes.
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['value', 'min', 'max'];
  }

  /**
   * React to attribute changes.
   * @param {string} name - The attribute name.
   * @param {string | null} oldVal - The old value.
   * @param {string | null} newVal - The new value.
   * @returns {void}
   */
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) {
      if (name === 'value') {
        const parsed = parseInt(newVal || '2', 10);
        this.value = isNaN(parsed) ? this.#value : parsed;
      } else if (name === 'min') {
        const parsed = parseInt(newVal || '1', 10);
        this.#min = isNaN(parsed) ? 1 : parsed;
        this.value = Math.max(this.#min, this.#value); // clamp
      } else if (name === 'max') {
        const parsed = parseInt(newVal || '20', 10);
        this.#max = isNaN(parsed) ? 20 : parsed;
        this.value = Math.min(this.#max, this.#value); // clamp
      }
    }
  }
}

customElements.define('quantity-stepper', QuantityStepper);