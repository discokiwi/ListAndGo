// @ts-nocheck -- PocketBase types unavailable; loaded via global UMD vendor script
/* global PocketBase -- provided by <script> tag pointing to js/vendor/pocketbase.umd.js */
/**
 * PocketBase client wrapper for List&GO.
 * Business Logic: Provides a singleton PocketBase client instance and auth
 * functions (login, createAccount, logout, isAuthenticated, autoRefresh).
 * The auth token is automatically persisted to localStorage by PB's built-in
 * authStore. In Phase 1, only auth endpoints are used — sync comes in Phase 2.
 * @module
 */

import { config } from './config.js';

/**
 * Singleton PocketBase client instance.
 * Initialised lazily on first call to getClient().
 * @type {import('pocketbase').default | null}
 */
let _client = null;

/**
 * Get or create the singleton PocketBase client instance.
 * Business Logic: A single client is shared across the app to maintain
 * the auth token and avoid re-initialising the SDK. Created lazily so the
 * app boots without needing the server to be available.
 * @returns {import('pocketbase').default}
 */
function getClient() {
  if (!_client) {
    _client = new PocketBase(config.POCKETBASE_URL);
  }
  return _client;
}

/**
 * Log in with email and password.
 * Business Logic: Authenticates against PocketBase. The SDK automatically
 * stores the auth token in localStorage via its built-in authStore.
 * @param {string} email - User email.
 * @param {string} password - User password.
 * @returns {Promise<import('pocketbase').default['authStore']['record']>} The authenticated user record.
 * @throws {Error} If authentication fails.
 */
export async function login(email, password) {
  const pb = getClient();
  const authData = await pb.collection('users').authWithPassword(email, password);
  return authData.record;
}

/**
 * Create a new user account and automatically log in.
 * Business Logic: Creates a new user in PocketBase, which triggers automatic
 * login (PB's authWithPassword flow). The token is persisted by the SDK.
 * @param {string} email - User email.
 * @param {string} password - User password.
 * @param {string} name - Display name.
 * @returns {Promise<import('pocketbase').default['authStore']['record']>} The new user record.
 * @throws {Error} If account creation fails.
 */
export async function createAccount(email, password, name) {
  const pb = getClient();

  // Create the user record in PocketBase, then log in automatically
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
  });

  // Authenticate with the new credentials
  return await login(email, password);
}

/**
 * Log out the current user.
 * Business Logic: Clears the auth token from the SDK's authStore and
 * from localStorage. After this, the app is in guest mode.
 * @returns {void}
 */
export function logout() {
  const pb = getClient();
  pb.authStore.clear();
}

/**
 * Check whether a valid auth token exists.
 * Business Logic: Returns true if an auth token is stored in localStorage
 * and has not expired. Does NOT validate against the server — for a quick
 * check use autoRefresh().
 * @returns {boolean}
 */
export function isAuthenticated() {
  const pb = getClient();
  return pb.authStore.isValid;
}

/**
 * Get the currently authenticated user record.
 * Business Logic: PocketBase stores the authenticated model in authStore.model.
 * The .record property does not exist on the auth store — only on the
 * auth response object. This returns the stored model.
 * @returns {object | null} The user record, or null if not authenticated.
 */
export function getUser() {
  const pb = getClient();
  return pb.authStore.model || null;
}

/**
 * Attempt to refresh the auth token on app boot.
 * Business Logic: Called on every app start. If a stored token exists,
 * tries to refresh it with the server. If the server is unreachable
 * (offline), the stored token is used as-is for the session.
 * @returns {Promise<boolean>} True if the token is valid after refresh.
 */
export async function autoRefresh() {
  const pb = getClient();
  if (!pb.authStore.isValid) return false;

  try {
    // Try to refresh the token with the server
    await pb.collection('users').authRefresh();
    return true;
  } catch {
    // Server unreachable — keep the cached token for this session
    return pb.authStore.isValid;
  }
}