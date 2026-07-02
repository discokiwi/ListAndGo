// @ts-check
/**
 * Create Account Sheet Web Component — Bottom sheet dialog for creating a new account.
 * Business Logic: Renders a signup form in a <dialog> bottom sheet, matches the Stitch
 * "Create Account" design. Handles mock account creation via auth.store.js.
 * @module
 */

import { registerOverlay } from '../overlay-manager.js';
import { STRINGS, t } from '../strings/i18n.js';
import { createAccount } from '../store/auth.store.js';

/**
 * Create Account Sheet Web Component class.
 * @augments HTMLElement
 */
export class CreateAccountSheet extends HTMLElement {
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
   * Open the create account sheet dialog.
   * Business Logic: Shows the dialog and registers with the overlay manager.
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
        name: 'create-account-sheet',
      });
    }

    // Focus the name input
    const nameInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#create-name'));
    nameInput?.focus();
  }

  /**
   * Close the create account sheet dialog.
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
   * Business Logic: Validates inputs, calls auth.store createAccount(), and
   * dispatches a success event or shows an error.
   * @param {Event} e - Submit event.
   * @returns {Promise<void>}
   */
  async #handleSubmit(e) {
    e.preventDefault();
    if (!this.#form) return;

    const nameInput = /** @type {HTMLInputElement | null} */ (this.#form.querySelector('#create-name'));
    const emailInput = /** @type {HTMLInputElement | null} */ (this.#form.querySelector('#create-email'));
    const passwordInput = /** @type {HTMLInputElement | null} */ (this.#form.querySelector('#create-password'));

    const name = nameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    if (!name || !email || !password) {
      if (this.#errorEl) {
        this.#errorEl.textContent = t(STRINGS.auth.createAccountSheet.errorRequired);
        this.#errorEl.classList.remove('auth-error--hidden');
      }
      return;
    }

    // Disable submit button
    if (this.#submitBtn) (/** @type {HTMLButtonElement} */ (this.#submitBtn)).disabled = true;

    try {
      const user = await createAccount(name, email, password);
      this.close();

      // Show snackbar success
      const snackbar = /** @type {any} */ (document.querySelector('app-snackbar'));
      if (snackbar && typeof snackbar.show === 'function') {
        snackbar.show(t(STRINGS.auth.createAccountSheet.success, { name: user.name }));
      }
    } catch (err) {
      if (this.#errorEl) {
        this.#errorEl.textContent = err instanceof Error ? err.message : 'Account creation failed';
        this.#errorEl.classList.remove('auth-error--hidden');
      }
    } finally {
      if (this.#submitBtn) (/** @type {HTMLButtonElement} */ (this.#submitBtn)).disabled = false;
    }
  }

  /**
   * Switch to the login sheet.
   * Business Logic: Closes create account and opens login.
   * @returns {void}
   */
  #switchToLogin() {
    this.close();
    // Dispatch event to open login sheet
    this.dispatchEvent(new CustomEvent('open-login', { bubbles: true, composed: true }));
  }

  /** @returns {void} */
  connectedCallback() {
    if (this.hasChildNodes()) return;

    this.innerHTML = `
      <dialog class="bottom-sheet" id="create-account-dialog">
        <div class="bottom-sheet__content">
          <div class="bottom-sheet__handle"></div>
          <div class="bottom-sheet__header">
            <h2 class="bottom-sheet__title">${t(STRINGS.auth.createAccountSheet.title)}</h2>
            <button class="bottom-sheet__close" id="create-close" aria-label="${t(STRINGS.auth.createAccountSheet.cancel)}">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="bottom-sheet__body">
            <!-- Value Proposition -->
            <div class="auth-hero">
              <div class="auth-hero__icon">
                <span class="material-symbols-outlined">kitchen</span>
              </div>
              <h3 class="auth-hero__heading">${t(STRINGS.auth.createAccountSheet.subheading)}</h3>
              <p class="auth-hero__subtitle">${t(STRINGS.auth.createAccountSheet.subtitle)}</p>
            </div>

            <p class="auth-error auth-error--hidden" id="create-error"></p>
            <form class="auth-form" id="create-form" novalidate>
              <!-- Full Name -->
              <div class="auth-field">
                <label class="auth-label" for="create-name">${t(STRINGS.auth.createAccountSheet.nameLabel)}</label>
                <div class="auth-input-wrap">
                  <input class="auth-input" type="text" id="create-name" name="name"
                    placeholder="${t(STRINGS.auth.createAccountSheet.namePlaceholder)}" autocomplete="name" />
                  <span class="auth-input-icon material-symbols-outlined">person</span>
                </div>
              </div>
              <!-- Email -->
              <div class="auth-field">
                <label class="auth-label" for="create-email">${t(STRINGS.auth.createAccountSheet.emailLabel)}</label>
                <div class="auth-input-wrap">
                  <input class="auth-input" type="email" id="create-email" name="email"
                    placeholder="${t(STRINGS.auth.createAccountSheet.emailPlaceholder)}" autocomplete="email" />
                  <span class="auth-input-icon material-symbols-outlined">mail</span>
                </div>
              </div>
              <!-- Password -->
              <div class="auth-field">
                <label class="auth-label" for="create-password">${t(STRINGS.auth.createAccountSheet.passwordLabel)}</label>
                <div class="auth-input-wrap">
                  <input class="auth-input" type="password" id="create-password" name="password"
                    placeholder="${t(STRINGS.auth.createAccountSheet.passwordPlaceholder)}" autocomplete="new-password" />
                  <button class="auth-password-toggle" type="button" id="create-password-toggle" aria-label="Toggle password visibility">
                    <span class="material-symbols-outlined" id="create-password-icon">visibility_off</span>
                  </button>
                </div>
              </div>
              <!-- Submit -->
              <button class="auth-submit-btn" type="submit" id="create-submit">
                ${t(STRINGS.auth.createAccountSheet.createBtn)}
                <span class="material-symbols-outlined">${STRINGS.auth.createAccountSheet.createBtnIcon}</span>
              </button>
            </form>
            <!-- Switch to login -->
            <div class="auth-switch">
              <p class="auth-switch__text">${t(STRINGS.auth.createAccountSheet.haveAccount)}</p>
              <button class="auth-switch__link" id="create-to-login" type="button">${t(STRINGS.auth.createAccountSheet.loginLink)}</button>
            </div>
          </div>
        </div>
      </dialog>
    `;

    this.#dialog = this.querySelector('#create-account-dialog');
    this.#form = this.querySelector('#create-form');
    this.#submitBtn = this.querySelector('#create-submit');
    this.#errorEl = this.querySelector('#create-error');

    // Close button
    this.querySelector('#create-close')?.addEventListener('click', () => this.close());

    // Backdrop click
    this.#dialog?.addEventListener('click', (e) => {
      if (e.target === this.#dialog) this.close();
    });

    // Form submit
    this.#form?.addEventListener('submit', (e) => this.#handleSubmit(e));

    // Password visibility toggle
    this.querySelector('#create-password-toggle')?.addEventListener('click', () => {
      const pwInput = /** @type {HTMLInputElement | null} */ (this.querySelector('#create-password'));
      const icon = this.querySelector('#create-password-icon');
      if (pwInput && icon) {
        const isPassword = pwInput.type === 'password';
        pwInput.type = isPassword ? 'text' : 'password';
        icon.textContent = isPassword ? 'visibility' : 'visibility_off';
      }
    });

    // Switch to login
    this.querySelector('#create-to-login')?.addEventListener('click', () => this.#switchToLogin());
  }
}

customElements.define('create-account-sheet', CreateAccountSheet);