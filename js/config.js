// @ts-check
/**
 * Application configuration for List&GO.
 * Business Logic: Centralises all configuration constants so PocketBase URL,
 * database name, and other settings can be changed in one place.
 * @module
 */

/**
 * Application configuration constants.
 * @type {Readonly<{
 *   POCKETBASE_URL: string,
 *   DB_NAME: string,
 * }>}
 */
export const config = Object.freeze({
  /** Base URL for the PocketBase server. */
  POCKETBASE_URL: 'http://141.148.233.82:8090',
  /** Name of the IndexedDB database used by Dexie. */
  DB_NAME: 'listandgo-db',
});