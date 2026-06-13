// @ts-check
/**
 * Top Bar Web Component.
 * Business Logic: Displays a sticky top bar with the app title "List&GO"
 * on the left, and action buttons (notification bell with dot, settings gear)
 * on the right. The settings button fires a custom 'open-settings' event.
 * This component appears on all screens as the primary header.
 * @class
 */
export class TopBar extends HTMLElement {
  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM.
   * Renders the top bar HTML and attaches event listeners.
   * @returns {void}
   */
  connectedCallback() {
    // Prevent double render
    if (this.hasChildNodes()) return;

    this.innerHTML = `
      <header class="app-top-bar">
        <div class="app-top-bar__inner">
          <span class="app-top-bar__title">List&GO</span>
          <div class="app-top-bar__actions">
            <button class="app-top-bar__btn" id="top-bar-notif" aria-label="Notifications">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
              </svg>
              <span class="app-top-bar__notif-dot"></span>
            </button>
            <button class="app-top-bar__btn" id="top-bar-settings" aria-label="Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zm-7.14 1.56c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
    `;

    /** @type {HTMLElement|null} */
    const settingsBtn = this.querySelector('#top-bar-settings');
    settingsBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('open-settings', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('top-bar', TopBar);