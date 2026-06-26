// @ts-check
import { registerOverlay } from '../overlay-manager.js';

/**
 * Confirm Dialog Web Component — centered modal with heading, message, and two buttons.
 * Business Logic: Provides a reusable, accessible confirmation dialog pattern using the
 * native <dialog> element with custom styling. The primary button can be "danger" or
 * "primary" variant. Fires 'dialog-confirm' and 'dialog-cancel' Custom Events on the
 * host element so parent components can listen declaratively.
 *
 * Usage:
 *   <confirm-dialog
 *     heading="Clear entire list?"
 *     message="This will remove all items."
 *     confirm-label="Clear List"
 *     confirm-variant="danger"
 *     cancel-label="Keep List"
 *   ></confirm-dialog>
 *
 *   // Show/hide:
 *   const dlg = document.querySelector('confirm-dialog');
 *   dlg.show();  // calls dialog.showModal()
 *   dlg.hide();  // calls dialog.close()
 *
 *   // Listen for result:
 *   dlg.addEventListener('dialog-confirm', (e) => { /* user confirmed * / });
 *   dlg.addEventListener('dialog-cancel', (e) => { /* user cancelled * / });
 */
export class ConfirmDialog extends HTMLElement {
  /** @type {HTMLDialogElement | null} */
  _dialog = null;
  /** @type {HTMLButtonElement | null} */
  _confirmBtn = null;
  /** @type {HTMLButtonElement | null} */
  _cancelBtn = null;
  /**
   * Overlay close token for back-button handling.
   * @type {(() => void) | null}
   */
  _closeToken = null;

  /** Observed attributes for reactive updates. */
  static get observedAttributes() {
    return ['heading', 'message', 'confirm-label', 'confirm-variant', 'cancel-label'];
  }

  /** Creates a confirm-dialog component with Shadow DOM encapsulation. */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * Render the dialog into the shadow DOM and wire button/backdrop events.
   * Business Logic: Uses Shadow DOM to encapsulate styles and structure so
   * the dialog is self-contained without leaking global styles or conflicts.
   * @returns {void}
   */
  connectedCallback() {
    this._render();
    this._dialog = /** @type {HTMLDialogElement | null} */ (this.shadowRoot?.getElementById('dialog'));
    this._confirmBtn = /** @type {HTMLButtonElement | null} */ (this.shadowRoot?.getElementById('confirm-btn'));
    this._cancelBtn = /** @type {HTMLButtonElement | null} */ (this.shadowRoot?.getElementById('cancel-btn'));

    // Wire button events
    this._confirmBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dialog-confirm', { bubbles: true, composed: true }));
      this.hide();
    });

    this._cancelBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dialog-cancel', { bubbles: true, composed: true }));
      this.hide();
    });

    // Close on backdrop click (click outside dialog content)
    this._dialog?.addEventListener('click', (e) => {
      if (e.target === this._dialog) {
        this.dispatchEvent(new CustomEvent('dialog-cancel', { bubbles: true, composed: true }));
        this.hide();
      }
    });

    // Close on Escape key
    this._dialog?.addEventListener('cancel', () => {
      this.dispatchEvent(new CustomEvent('dialog-cancel', { bubbles: true, composed: true }));
    });
  }

  /**
   * Re-render the dialog when observed attributes (heading, message, labels) change.
   * Business Logic: Ensures the dialog UI reflects updated attribute values without
   * requiring a manual re-render call from the parent component.
   * @returns {void}
   */
  attributeChangedCallback() {
    if (this.shadowRoot?.hasChildNodes()) {
      this._render();
    }
  }

  /**
   * Get an attribute value or fall back to default.
   * @param {string} attr - The attribute name.
   * @param {string} fallback - Default value.
   * @returns {string}
   */
  _attr(attr, fallback) {
    return this.getAttribute(attr) || fallback;
  }

  /**
   * Open the dialog modally.
   * @returns {void}
   */
  show() {
    this._dialog?.showModal();
    this._closeToken = registerOverlay({
      /** Close function called by the overlay manager. */
      close: () => this.hide(),
      name: 'confirm-dialog',
    });
  }

  /**
   * Close the dialog.
   * @returns {void}
   */
  hide() {
    this._dialog?.close();
    this._closeToken?.();
  }

  /**
   * Render the dialog HTML template into the shadow root.
   * Business Logic: Inline styles use design tokens from CSS custom properties
   * so they inherit the global theme without needing an external stylesheet link.
   * @returns {void}
   */
  _render() {
    const heading = this._attr('heading', 'Confirm');
    const message = this._attr('message', 'Are you sure?');
    const confirmLabel = this._attr('confirm-label', 'OK');
    const confirmVariant = this._attr('confirm-variant', 'primary');
    const cancelLabel = this._attr('cancel-label', 'Cancel');
    const iconVariant = confirmVariant === 'danger' ? 'danger' : 'info';

    const iconSvg = confirmVariant === 'danger'
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: contents; }
        dialog {
          border: none;
          padding: 0;
          max-width: 380px;
          width: calc(100% - 32px);
          border-radius: 1.5rem;
          background: var(--color-surface-pure, #ffffff);
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          overflow: visible;
          margin: auto;
        }
        dialog::backdrop {
          background: color-mix(in srgb, var(--color-on-surface, #1a1c1e) 40%, transparent);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .content {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 24px;
        }
        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }
        .icon--danger {
          background: var(--color-error-container, #ffdad6);
          color: var(--color-error, #ba1a1a);
        }
        .icon--info {
          background: var(--color-secondary-container, #d3e5cb);
          color: var(--color-secondary, #53634e);
        }
        h2 {
          font: var(--font-headline-md, 600 24px/1.3 'Hanken Grotesk', sans-serif);
          color: var(--color-on-surface, #1a1c1e);
          margin: 0;
        }
        p {
          font: var(--font-body-reg, 400 16px/1.4 'Hanken Grotesk', sans-serif);
          color: var(--color-on-surface-variant, #404943);
          margin: 0;
          line-height: 1.5;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 0.5rem;
          font: var(--font-item-name, 600 18px/1.4 'Hanken Grotesk', sans-serif);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          -webkit-tap-highlight-color: transparent;
        }
        button:active { transform: scale(0.98); }
        .btn--danger {
          background: var(--color-error, #ba1a1a);
          color: var(--color-on-error, #ffffff);
        }
        .btn--primary {
          background: var(--color-primary, #0f5238);
          color: var(--color-on-primary, #ffffff);
        }
        .btn--cancel {
          background: var(--color-surface-container, #eeeef0);
          color: var(--color-on-surface-variant, #404943);
        }
        .btn--cancel:hover {
          background: var(--color-surface-container-high, #e8e8ea);
        }
      </style>
      <dialog id="dialog">
        <div class="content">
          <div class="icon icon--${iconVariant}">${iconSvg}</div>
          <h2 id="heading">${heading}</h2>
          <p id="message">${message}</p>
          <div class="actions">
            <button id="confirm-btn" class="btn--${confirmVariant}">${confirmLabel}</button>
            <button id="cancel-btn" class="btn--cancel">${cancelLabel}</button>
          </div>
        </div>
      </dialog>
    `;
  }
}

customElements.define('confirm-dialog', ConfirmDialog);