// @ts-check
/**
 * Category Color Utility — dynamic lookup from Dexie-backed cache.
 * Business Logic: Provides synchronous access to category colors via the
 * in-memory cache populated from the `categories` Dexie table. This replaces
 * the old hardcoded map so users can edit category colors in settings and
 * see them reflected immediately in the UI.
 * @module
 */

import { categoryCache, refreshCategoryCache } from '../store/categories.store.js';

/**
 * Load the category color cache from Dexie.
 * Business Logic: Call this once on app init after seeding, and again
 * whenever categories change (add/edit/delete/rename).
 * @returns {Promise<void>}
 */
export async function loadCategoryColorCache() {
  await refreshCategoryCache();
}

/**
 * Get the accent color for a given category ID from the in-memory cache.
 * @param {string} categoryId - The category UUID.
 * @returns {string} CSS color value, or a fallback neutral color.
 */
export function getCategoryColor(categoryId) {
  if (!categoryId) return '#bfc9c1';
  const cat = categoryCache.byId.get(categoryId);
  return cat ? cat.color : '#bfc9c1';
}

/**
 * Get a mapping of category IDs to their display names.
 * @returns {Record<string, string>} Map of category ID -> name.
 */
export function getCategoryLabels() {
  /** @type {Record<string, string>} */
  const labels = {};
  for (const [id, cat] of categoryCache.byId) {
    labels[id] = cat.name;
  }
  return labels;
}