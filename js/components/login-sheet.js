// @ts-check
/**
 * Login Sheet Web Component — Bottom sheet dialog for logging in.
 * Business Logic: Renders a login form in a <dialog> bottom sheet, handles
 * mock authentication via auth.store.js, and emits 'login-success' on success.
 * @module
 */

import { registerOverlay } from '../overlay-manager.js';
import { STRINGS, t } from '../strings/i18n.js';
import { login } from '../store/auth.store.js';

/**
 * Login Sheet Web Component class.
 * @augments HTMLElement
 */
export class LoginSheet extends HTMLElement {
  /** @type {HTMLDialogElement | null} */
  #dialog = null;

  /** @type {(() => void) | null} */
  #closeToken = null;

  /** @type {HTMLFormElement | null} */
  #form = null;

  /** @type {HTMLButtonElement | null} */
  #submitBtn = null;

  /** @type {HTMLParagraphElement | null} */
  #errorEl = null;

  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Open the login sheet dialog.
   * Business Logic: Shows the dialog and registers with the overlay manager
   * so the device back button dismisses it.
   * @returns {void}
   */
  open() {
    const dialog = this.querySelector('dialog');
    if (!dialog) return;
    this.#dialog = dialog;
    dialog.showModal();

    // Register with overlay manager for back-button handling
    if (!this.#closeToken) {
      this.#closeToken = registerOverlay({
        /** Close the dialog when the overlay manager requests it (e.g. back button). */
        close: () => this.close(),
        name: 'login-sheet',
      });
    }

    // Focus the email input
    const emailInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#login-email'));
    emailInput?.focus();
  }

  /**
   * Close the login sheet dialog.
   * @returns {void}
   */
  close() {
    this.#closeToken?.();
    this.#closeToken = null;
    this.#dialog?.close();
    this.#errorEl?.classList.add('auth-error--hidden');
  }

  /**
   * Handle form submission.
   * Business Logic: Validates inputs, calls auth.store login(), and
   * dispatches a success event or shows an error.
   * @param {Event} e - Submit event.
   * @returns {Promise<void>}
   */
  async #handleSubmit(e) {
    e.preventDefault();
    if (!this.#form) return;

    const emailInput = /** @type {HTMLInputElement | null} */ (this.#form.querySelector('#login-email'));
    const passwordInput = /** @type {HTMLInputElement | null} */ (this.#form.querySelector('#login-password'));

    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    if (!email || !password) {
      if (this.#errorEl) {
        this.#errorEl.textContent = t(STRINGS.auth.loginSheet.errorRequired);
        this.#errorEl.classList.remove('auth-error--hidden');
      }
      return;
    }

    // Disable submit button
    if (this.#submitBtn) (/** @type {HTMLButtonElement} */ (this.#submitBtn)).disabled = true;

    try {
      const user = await login(email, password);
      this.close();

      // Show snackbar success
      const snackbar = /** @type {any} */ (document.querySelector('app-snackbar'));
      if (snackbar && typeof snackbar.show === 'function') {
        snackbar.show(t(STRINGS.auth.loginSheet.success, { name: user.name }));
      }
    } catch (err) {
      if (this.#errorEl) {
        this.#errorEl.textContent = err instanceof Error ? err.message : 'Login failed';
        this.#errorEl.classList.remove('auth-error--hidden');
      }
    } finally {
      if (this.#submitBtn) (/** @type {HTMLButtonElement} */ (this.#submitBtn)).disabled = false;
    }
  }

  /**
   * Switch to the create account sheet.
   * Business Logic: Closes login and opens create account, so the user
   * flows naturally between the two.
   * @returns {void}
   */
  #switchToCreateAccount() {
    this.close();
    // Dispatch event to open create account sheet
    this.dispatchEvent(new CustomEvent('open-create-account', { bubbles: true, composed: true }));
  }

  /** @returns {void} */
  connectedCallback() {
    if (this.hasChildNodes()) return;

    this.innerHTML = `
      <dialog class="bottom-sheet" id="login-dialog">
        <div class="bottom-sheet__content">
          <div class="bottom-sheet__handle"></div>
          <div class="bottom-sheet__header">
            <h2 class="bottom-sheet__title">${t(STRINGS.auth.loginSheet.title)}</h2>
            <button class="bottom-sheet__close" id="login-close" aria-label="${t(STRINGS.auth.loginSheet.cancel)}">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="bottom-sheet__body">
            <p class="auth-error auth-error--hidden" id="login-error"></p>
            <form class="auth-form" id="login-form" novalidate>
              <!-- Email -->
              <div class="auth-field">
                <label class="auth-label" for="login-email">${t(STRINGS.auth.loginSheet.emailLabel)}</label>
                <div class="auth-input-wrap">
                  <input class="auth-input" type="email" id="login-email" name="email"
                    placeholder="${t(STRINGS.auth.loginSheet.emailPlaceholder)}" autocomplete="email" />
                  <span class="auth-input-icon material-symbols-outlined">mail</span>
                </div>
              </div>
              <!-- Password -->
              <div class="auth-field">
                <label class="auth-label" for="login-password">${t(STRINGS.auth.loginSheet.passwordLabel)}</label>
                <div class="auth-input-wrap">
                  <input class="auth-input" type="password" id="login-password" name="password"
                    placeholder="${t(STRINGS.auth.loginSheet.passwordPlaceholder)}" autocomplete="current-password" />
                  <button class="auth-password-toggle" type="button" id="login-password-toggle" aria-label="Toggle password visibility">
                    <span class="material-symbols-outlined" id="login-password-icon">visibility_off</span>
                  </button>
                </div>
              </div>
              <!-- Submit -->
              <button class="auth-submit-btn" type="submit" id="login-submit">
                ${t(STRINGS.auth.loginSheet.loginBtn)}
                <span class="material-symbols-outlined">${STRINGS.auth.loginSheet.loginBtnIcon}</span>
              </button>
            </form>
            <!-- Switch to create account -->
            <div class="auth-switch">
              <p class="auth-switch__text">${t(STRINGS.auth.loginSheet.noAccount)}</p>
              <button class="auth-switch__link" id="login-to-create" type="button">${t(STRINGS.auth.loginSheet.createLink)}</button>
            </div>
          </div>
        </div>
      </dialog>
    `;

    this.#dialog = this.querySelector('#login-dialog');
    this.#form = this.querySelector('#login-form');
    this.#submitBtn = this.querySelector('#login-submit');
    this.#errorEl = this.querySelector('#login-error');

    // Close button
    this.querySelector('#login-close')?.addEventListener('click', () => this.close());

    // Backdrop click
    this.#dialog?.addEventListener('click', (e) => {
      if (e.target === this.#dialog) this.close();
    });

    // Form submit
    this.#form?.addEventListener('submit', (e) => this.#handleSubmit(e));

    // Password visibility toggle
    this.querySelector('#login-password-toggle')?.addEventListener('click', () => {
      const pwInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#login-password'));
      const icon = this.querySelector('#login-password-icon');
      if (pwInput && icon) {
        const isPassword = pwInput.type === 'password';
        pwInput.type = isPassword ? 'text' : 'password';
        icon.textContent = isPassword ? 'visibility' : 'visibility_off';
      }
    });

    // Switch to create account
    this.querySelector('#login-to-create')?.addEventListener('click', () => this.#switchToCreateAccount());
  }
}

customElements.define('login-sheet', LoginSheet);