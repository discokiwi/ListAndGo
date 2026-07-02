// @ts-check
/**
 * Auth Store for List&GO.
 * Business Logic: Manages authentication state by wrapping PocketBase auth
 * functions. Provides the same exported interface as before (getUser, isLoggedIn,
 * login, createAccount, logout) so all existing UI components work without changes.
 * Dispatches 'auth-changed' custom events on state change so UI components can react.
 * On startup, checks for a stored PocketBase auth token to restore the session.
 * @module
 */

import { login as pbLogin, createAccount as pbCreateAccount, logout as pbLogout, isAuthenticated, getUser as pbGetUser, autoRefresh } from '../pocketbase.js';

/**
 * Key used by the old mock auth system. Cleared on first boot with real PB auth.
 * @type {string}
 */
const OLD_MOCK_STORAGE_KEY = 'listandgo_auth';

/**
 * Clear any leftover mock auth data from localStorage.
 * Business Logic: On first load after migrating to real PocketBase auth,
 * remove the old mock user token so it doesn't interfere.
 * @returns {void}
 */
function clearOldMockAuth() {
  try {
    localStorage.removeItem(OLD_MOCK_STORAGE_KEY);
  } catch { /* ignore */ }
}

// Clear old mock data on module load
clearOldMockAuth();

/**
 * @typedef {object} User
 * @property {string} id - User ID (UUID)
 * @property {string} name - Display name
 * @property {string} email - Email address
 */

/**
 * Dispatch an 'auth-changed' event on the document.
 * Business Logic: Components like settings-panel listen for this event
 * to re-render when login state changes.
 * @returns {void}
 */
function dispatchAuthChange() {
  document.dispatchEvent(new CustomEvent('auth-changed', { bubbles: true }));
}

/**
 * Map a PocketBase user record to the app's User shape.
 * @param {{ id?: string, name?: string, email?: string } | null} record - PocketBase auth store record.
 * @returns {User | null}
 */
function mapUser(record) {
  if (!record) return null;
  return {
    id: record.id || '',
    name: record.name || (record.email ? record.email.split('@')[0] : '') || 'User',
    email: record.email || '',
  };
}

/**
 * Get the currently logged-in user.
 * @returns {User | null}
 */
export function getUser() {
  return mapUser(pbGetUser());
}

/**
 * Check whether the user is logged in.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return isAuthenticated();
}

/**
 * Log in with email and password via PocketBase.
 * Business Logic: Authenticates against the PocketBase server. The SDK
 * automatically persists the auth token in localStorage.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 * @throws {Error} If authentication fails.
 */
export async function login(email, password) {
  const record = await pbLogin(email, password);
  const user = mapUser(record);
  dispatchAuthChange();
  return user;
}

/**
 * Create a new account via PocketBase and automatically log in.
 * Business Logic: Creates a new user in PocketBase and logs in automatically.
 * Extracts the real validation error from PocketBase's ClientResponseError
 * so the user sees "Password too short" instead of "Something went wrong."
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 * @throws {Error} If account creation fails.
 */
export async function createAccount(name, email, password) {
  try {
    const record = await pbCreateAccount(email, password, name);
    const user = mapUser(record);
    dispatchAuthChange();
    return user;
  } catch (err) {
    // Extract the most meaningful validation error message from PocketBase
    const pbErr = /** @type {{ response?: { data?: Record<string, { message?: string }> } }} */ (err);
    if (pbErr && pbErr.response && pbErr.response.data) {
      const messages = Object.values(pbErr.response.data).map((v) => v.message).filter(Boolean);
      if (messages.length > 0) {
        throw new Error(messages[0]);
      }
    }
    throw err;
  }
}

/**
 * Log out the current user.
 * Business Logic: Clears the PB auth token from the SDK and localStorage.
 * @returns {void}
 */
export function logout() {
  pbLogout();
  dispatchAuthChange();
}

/**
 * Attempt to restore a previous auth session on app boot.
 * Business Logic: Called from app.js on startup. If a stored PB token exists,
 * tries to refresh it with the server. Returns true if the session is valid.
 * @returns {Promise<boolean>}
 */
export async function tryAutoRefresh() {
  const valid = await autoRefresh();
  if (valid) {
    dispatchAuthChange();
  }
  return valid;
}