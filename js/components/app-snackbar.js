// @ts-check
/**
 * App Snackbar Web Component — reusable notification bar.
 * Business Logic: Provides "added" confirmation (auto-dismiss 4s) and
 * "removed with Undo" (auto-dismiss 6s) patterns. Supports queuing so
 * only one snackbar is visible at a time. Used across multiple screens
 * (grocery list, items library, meal plan) for consistent UX.
 *
 * Usage:
 *   const snackbar = document.querySelector('app-snackbar');
 *   snackbar.show('Item added to list');  // simple confirmation
 *   snackbar.show('Item removed', { undo: true, onUndo: () => { ... } });
 *   snackbar.show('Item removed', {
 *     undo: true,
 *     duration: 8000,
 *     onUndo: () => addItemBack(),
 *   });
 * @augments {HTMLElement}
 */
export class AppSnackbar extends HTMLElement {
  /** @type {string | null} */
  _message = null;
  /** @type {(() => void) | null} */
  _onUndo = null;
  /** @type {number | undefined} */
  _timer = undefined;
  /** @type {boolean} */
  _visible = false;
  /** @type {boolean} */
  _entering = false;
  /** @type {{ message: string, undo: boolean, duration: number, onUndo: (() => void) | null }[]} */
  _queue = [];

  /** Construct the component. */
  constructor() {
    super();
  }

  /** Called when element is added to the DOM. */
  connectedCallback() {
    // No-op — CSS handles display and positioning via app-snackbar host selector.
  }

  /**
   * Show a snackbar notification.
   * Business Logic: If a snackbar is already visible, the request is queued.
   * Each snackbar auto-dismisses after the specified duration. If undo is
   * true, an "Undo" action button is shown that calls the provided callback.
   * @param {string} message - The message text to display.
   * @param {{ undo?: boolean, duration?: number, onUndo?: () => void }} [options] - Optional config.
   */
  show(message, options) {
    const { undo = false, duration = undo ? 6000 : 4000, onUndo = null } = options || {};

    if (this._visible || this._entering) {
      // Queue the request
      this._queue.push({ message, undo, duration, onUndo });
      return;
    }

    this._render(message, undo, onUndo, duration);
  }

  /**
   * Dismiss the current snackbar immediately.
   */
  dismiss() {
    this._dismissCurrent();
  }

  /**
   * Internal: render the snackbar into the DOM.
   * @param {string} message - The message text.
   * @param {boolean} undo - Whether to show an Undo button.
   * @param {(() => void) | null} onUndo - Callback for Undo action.
   * @param {number} duration - Auto-dismiss duration in ms.
   */
  _render(message, undo, onUndo, duration) {
    this._message = message;
    this._onUndo = onUndo;
    this._visible = true;
    this._entering = true;

    // Clear any existing content
    this.innerHTML = '';

    // Build the snackbar bar
    const bar = document.createElement('div');
    bar.className = 'snackbar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');

    // Check icon (always show for consistency)
    const icon = document.createElement('span');
    icon.className = 'snackbar__icon';
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
    bar.appendChild(icon);

    // Message
    const msgEl = document.createElement('span');
    msgEl.className = 'snackbar__message';
    msgEl.textContent = message;
    bar.appendChild(msgEl);

    // Undo button (if requested)
    if (undo && onUndo) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'snackbar__action';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleUndo();
      });
      bar.appendChild(undoBtn);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'snackbar__close';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    closeBtn.addEventListener('click', () => this._dismissCurrent());
    bar.appendChild(closeBtn);

    this.appendChild(bar);

    // After the next frame, mark entering as done (animation started)
    requestAnimationFrame(() => {
      this._entering = false;
    });

    // Set auto-dismiss timer
    this._timer = window.setTimeout(() => {
      this._dismissCurrent();
    }, duration);
  }

  /**
   * Handle Undo action.
   * Business Logic: Calls the registered onUndo callback, then dismisses
   * the snackbar. Does not fire the next queued item — lets the consumer
   * show a new snackbar (e.g. "Item restored") via a separate show() call.
   */
  _handleUndo() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    if (this._onUndo) {
      this._onUndo();
      this._onUndo = null;
    }
    this._dismissCurrent();
  }

  /**
   * Dismiss the current snackbar with exit animation, then show the next
   * queued item (if any).
   */
  _dismissCurrent() {
    if (!this._visible) return;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    this._visible = false;
    this._onUndo = null;

    const bar = this.querySelector('.snackbar');
    if (bar) {
      bar.classList.add('snackbar--exit');
      // Remove after animation completes
      bar.addEventListener('animationend', () => {
        this.innerHTML = '';
        this._processQueue();
      }, { once: true });
    } else {
      this._processQueue();
    }
  }

  /**
   * Process the next item in the queue.
   */
  _processQueue() {
    const next = this._queue.shift();
    if (next) {
      this._render(next.message, next.undo, next.onUndo, next.duration);
    }
  }
}

customElements.define('app-snackbar', AppSnackbar);