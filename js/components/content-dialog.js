// @ts-check
/**
 * Content Dialog Web Component — bottom-sheet with header, scrollable body, and action footer.
 * Business Logic: Provides a reusable bottom-sheet pattern using the native <dialog> element.
 * Uses light DOM so global CSS from bottom-sheet.css and content-dialog.css applies directly.
 * Children are distributed into body/actions areas: elements with slot="actions" go to the
 * footer, all other children go to the scrollable body.
 *
 * Usage:
 *   <content-dialog heading="Weekly Essentials">
 *     <div><!-- custom body content --></div>
 *     <button slot="actions">Cancel</button>
 *     <button slot="actions">Add Selected</button>
 *   </content-dialog>
 *
 *   // Show/hide:
 *   const dlg = document.querySelector('content-dialog');
 *   dlg.show();
 *   dlg.hide();
 *
 *   // Listen for close (backdrop/esc/cancel/close-btn):
 *   dlg.addEventListener('dialog-close', (e) => { /* user dismissed * / });
 *
 *   // Listen for confirmed (primary action was clicked):
 *   dlg.addEventListener('dialog-confirmed', (e) => { /* user confirmed * / });
 */
import { registerOverlay } from '../overlay-manager.js';

/**
 * Content Dialog Web Component — bottom-sheet with header, scrollable body, and action footer.
 * Provides a reusable bottom-sheet pattern using the native <dialog> element.
 * Registers itself with the overlay manager for back-button interception.
 * @class
 * @augments HTMLElement
 */
export class ContentDialog extends HTMLElement {
  /** @type {HTMLDialogElement | null} */
  _dialog = null;
  /** @type {HTMLElement | null} */
  _closeBtn = null;
  /** @type {HTMLElement | null} */
  _bodySlot = null;
  /** @type {HTMLElement | null} */
  _actionsSlot = null;
  /** @type {(() => void) | null} */
  _closeToken = null;

  /** Observed attributes for reactive updates. */
  static get observedAttributes() {
    return ['heading', 'subtitle'];
  }

  /** Creates a content-dialog component. Uses light DOM for global CSS compatibility. */
  constructor() {
    super();
  }

  /**
   * Render the dialog into light DOM and wire events.
   * Business Logic: Saves any existing child elements before rendering the template,
   * then distributes them into the body/actions containers after render.
   * @returns {void}
   */
  connectedCallback() {
    // Save children before _render() clears innerHTML
    const savedChildren = Array.from(this.children);

    this._render();
    this._dialog = /** @type {HTMLDialogElement | null} */ (this.querySelector('#content-dialog-dialog'));
    this._closeBtn = /** @type {HTMLElement | null} */ (this.querySelector('#content-dialog-close'));
    this._bodySlot = /** @type {HTMLElement | null} */ (this.querySelector('.content-dialog__body'));
    this._actionsSlot = /** @type {HTMLElement | null} */ (this.querySelector('.content-dialog__actions'));

    // Distribute saved children into body/actions
    this._distributeChildren(savedChildren);

    // Close button
    this._closeBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dialog-close', { bubbles: true }));
      this.hide();
    });

    // Close on backdrop click
    this._dialog?.addEventListener('click', (e) => {
      if (e.target === this._dialog) {
        this.dispatchEvent(new CustomEvent('dialog-close', { bubbles: true }));
        this.hide();
      }
    });

    // Close on Escape (native dialog cancel event) — also unregister overlay
    this._dialog?.addEventListener('cancel', () => {
      this.dispatchEvent(new CustomEvent('dialog-close', { bubbles: true }));
      this._closeToken?.();
      this._closeToken = null;
    });

    // Listen for native close event (programmatic close) to clean up overlay
    this._dialog?.addEventListener('close', () => {
      this._closeToken?.();
      this._closeToken = null;
    });
  }

  /**
   * Update the heading and subtitle text when attributes change.
   * @returns {void}
   */
  attributeChangedCallback() {
    const heading = this.getAttribute('heading') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const titleEl = this.querySelector('.content-dialog__title');
    const subtitleEl = this.querySelector('.content-dialog__subtitle');
    if (titleEl) titleEl.textContent = heading;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  /**
   * Distribute light DOM children into body and actions containers.
   * Business Logic: Children with slot="actions" go into the actions footer;
   * all other children go into the scrollable body.
   * @param {Element[]} children - The children to distribute.
   * @returns {void}
   */
  _distributeChildren(children) {
    if (!this._bodySlot || !this._actionsSlot) return;

    for (const child of children) {
      if (child.getAttribute('slot') === 'actions') {
        child.removeAttribute('slot');
        this._actionsSlot.appendChild(child);
      } else {
        this._bodySlot.appendChild(child);
      }
    }
  }

  /**
   * Open the dialog modally and register with the overlay manager.
   * Business Logic: The native <dialog> element handles its own Escape key and
   * backdrop click, but we need to register with the overlay manager so the
   * device back button also closes the dialog.
   * @returns {void}
   */
  show() {
    this._dialog?.showModal();

    // Register with overlay manager for back-button handling
    this._closeToken = registerOverlay({
      /** Close the dialog when the overlay manager requests it (e.g. back button). */
      close: () => this.hide(),
      name: 'content-dialog',
    });
  }

  /**
   * Close the dialog and unregister from the overlay manager.
   * Business Logic: Closing a dialog may happen programmatically or via the
   * overlay manager's close callback. Unregisters from the overlay stack so
   * the back button doesn't target a no-longer-visible dialog.
   * @returns {void}
   */
  hide() {
    this._dialog?.close();
    this._closeToken?.();
    this._closeToken = null;
  }

  /**
   * Render the bottom-sheet HTML into light DOM.
   * Business Logic: Uses classes from content-dialog.css for all styling.
   * The dialog structure matches the Stitch "Weekly Essentials Dialog" design:
   * - Handle bar at top
   * - Header with title, subtitle, close button
   * - Scrollable body
   * - Fixed footer with action buttons
   * @returns {void}
   */
  _render() {
    const heading = this.getAttribute('heading') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    this.innerHTML = `
      <dialog class="content-dialog" id="content-dialog-dialog">
        <div class="content-dialog__content">
          <div class="content-dialog__header">
            <div class="content-dialog__header-top">
              <h2 class="content-dialog__title">${heading}</h2>
              <button class="content-dialog__close" id="content-dialog-close" aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <p class="content-dialog__subtitle">${subtitle}</p>
          </div>
          <div class="content-dialog__body"></div>
          <div class="content-dialog__actions"></div>
        </div>
      </dialog>
    `;
  }
}

customElements.define('content-dialog', ContentDialog);