// @ts-check
/**
 * Shared DOM utility functions for List&GO.
 * Business Logic: Provides safe HTML escaping and quantity formatting used
 * across multiple components. Centralising these avoids code duplication
 * and ensures consistent formatting throughout the app.
 * @module
 */

/**
 * Escape HTML special characters for safe rendering.
 * Prevents XSS when injecting user-provided strings into innerHTML.
 * @param {string} str - The raw string to escape.
 * @returns {string} The escaped HTML string.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format quantity + unit for display in the UI.
 * Business Logic: Maps internal unit IDs to short display labels.
 * Round quantities omit decimal places for cleaner display.
 * @param {number} qty - The quantity value.
 * @param {string} unit - The unit ID (e.g. "pcs", "g", "ml").
 * @returns {string} Formatted string like "2 pcs" or "1.5 L".
 */
export function formatQty(qty, unit) {
  const unitMap = /** @type {Record<string, string>} */ ({
    'pcs': 'pcs',
    'g': 'g',
    'kg': 'kg',
    'l': 'L',
    'ml': 'ml',
    'tbsp': 'tbsp',
    'tsp': 'tsp',
    'cup': 'cup',
    'oz': 'oz',
    'lb': 'lb',
  });
  const unitLabel = unitMap[unit] || unit;
  const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
  return `${qtyStr} ${unitLabel}`;
}

/**
 * Format quantity for the stepper display (compact integer).
 * @param {number} qty - The quantity value.
 * @returns {string} The formatted quantity string.
 */
export function formatQtyForStepper(qty) {
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(1);
}

/**
 * Create a DOM element from an HTML string.
 * Business Logic: Provides a convenient way to parse HTML strings into
 * DOM elements without using innerHTML on existing elements (which would
 * execute scripts). Uses <template> for safe parsing.
 * @param {string} html - The HTML string to parse.
 * @returns {DocumentFragment} The parsed document fragment.
 */
export function htmlToFragment(html) {
  const tmpl = document.createElement('template');
  tmpl.innerHTML = html;
  return tmpl.content;
}