// @ts-check
/**
 * Shared date/time utility functions for List&GO.
 * Business Logic: Centralises ISO timestamp generation and date formatting
 * used across multiple store modules and components. Avoids duplication of
 * the `now()` helper that was previously defined independently in
 * mealplan.store.js and recipes.store.js.
 * @module
 */

/**
 * Generate a fresh ISO timestamp string.
 * @returns {string} Current time as ISO 8601 string (e.g. "2026-06-25T21:30:00.000Z").
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Get today's date as a YYYY-MM-DD string.
 * @returns {string} Today's date in local timezone.
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}