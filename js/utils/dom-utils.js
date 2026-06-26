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
 * Business Logic: Maps stored unit IDs to short display labels.
 * Round quantities omit decimal places for cleaner display.
 * @param {number} qty - The quantity value.
 * @param {string} unit - The unit ID (e.g. "pcs", "grams", "ml").
 * @returns {string} Formatted string like "2 pcs" or "1.5 L".
 */
export function formatQty(qty, unit) {
  const unitMap = /** @type {Record<string, string>} */ ({
    'pcs': 'pcs',
    'grams': 'g',
    'kg': 'kg',
    'Litres': 'L',
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

/**
 * Open the item editor in add mode with an optional pre-filled name.
 * Business Logic: Shared by grocery-list and recipe-editor components.
 * Dynamically imports the item-editor component, finds or creates an
 * <item-editor> element inside the #item-editor-sheet body, and opens
 * it in add mode with the given query pre-filled. After the user saves,
 * the item-saved listener in the calling component can auto-add the item.
 * @param {string} [prefillName] - Optional name to pre-fill in the item name field.
 * @returns {Promise<void>}
 */
export async function openItemEditorForCreate(prefillName) {
  try {
    const sheet = /** @type {HTMLElement | null} */ (document.getElementById('item-editor-sheet'));
    if (!sheet) return;

    // Ensure item-editor component is loaded
    await import('../components/item-editor.js');

    // Find or create <item-editor> inside the sheet body
    const body = sheet.querySelector('#item-editor-body');
    if (!body) return;

    // @ts-ignore — ItemEditor type unavailable at runtime
    let editor = /** @type {any} */ (body.querySelector('item-editor'));
    if (!editor) {
      editor = document.createElement('item-editor');
      body.appendChild(editor);
    }

    editor.openAdd(prefillName || '');
  } catch (err) {
    console.error('Failed to open item editor:', err);
  }
}

/**
 * Get the <app-snackbar> element for showing notifications.
 * Business Logic: Centralises the document.querySelector('app-snackbar')
 * pattern that is repeated across multiple components, reducing duplication
 * and ensuring consistent null-handling.
 * @returns {import("../components/app-snackbar.js").AppSnackbar | null}
 */
export function getSnackbar() {
  return /** @type {import("../components/app-snackbar.js").AppSnackbar | null} */ (
    document.querySelector('app-snackbar')
  );
}
