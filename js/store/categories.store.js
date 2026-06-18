// @ts-check
/**
 * Categories store for List&GO.
 * Business Logic: Provides CRUD operations on the `categories` Dexie table
 * with sync fields (familyId, updatedAt, isSynced). Seeded on first run with
 * 13 default categories matching SPEC requirements. Exposes an in-memory cache
 * so UI components can look up category names and colors synchronously.
 * @module
 */

import { db } from "../db.js";

/**
 * @typedef {import("../db.js").Category} Category
 */

/**
 * In-memory category cache for synchronous lookups.
 * Business Logic: Components like grocery-row and items-library need to
 * resolve category names and colors synchronously during render. This cache
 * is populated on app start and refreshed whenever categories change.
 * @type {{ byId: Map<string, Category>, byName: Map<string, Category> }}
 */
export const categoryCache = {
  byId: new Map(),
  byName: new Map(),
};

/**
 * The 13 default categories with their assigned colors from the palette.
 * @type {{ name: string, color: string }[]}
 */
const DEFAULT_CATEGORIES = [
  { name: 'Fruits & Vegetables', color: '#2D6A4F' },
  { name: 'Meat', color: '#BC4749' },
  { name: 'Dairy', color: '#4895EF' },
  { name: 'Bakery', color: '#D4A373' },
  { name: 'Seafood', color: '#4CC9F0' },
  { name: 'Alcohol', color: '#8338EC' },
  { name: 'Snacks', color: '#FB8B24' },
  { name: 'Drinks', color: '#F72585' },
  { name: 'Canned Goods', color: '#7209B7' },
  { name: 'Non-food', color: '#7F5539' },
  { name: 'Pets', color: '#3F37C9' },
  { name: 'Personal Care', color: '#B5179E' },
  { name: 'Pantry', color: '#FFBE0B' },
];

/**
 * Get all categories sorted by sortOrder (ascending). Falls back to alphabetical
 * for any categories without a sortOrder value.
 * Business Logic: The sortOrder reflects the user's custom store layout order.
 * @returns {Promise<Category[]>} Array of categories sorted by their sortOrder.
 */
export async function getAllCategories() {
  const all = await db.categories.toArray();
  all.sort((/** @type {Category} */ a, /** @type {Category} */ b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
  return all;
}

/**
 * Get a single category by UUID.
 * @param {string} id - Category UUID.
 * @returns {Promise<Category | undefined>}
 */
export async function getCategoryById(id) {
  return await db.categories.get(id);
}

/**
 * Find a category by name (case-insensitive).
 * @param {string} name - The category name to find.
 * @returns {Promise<Category | undefined>}
 */
export async function getCategoryByName(name) {
  const lower = name.toLowerCase();
  return await db.categories
    .filter((/** @type {Category} */ c) => c.name.toLowerCase() === lower)
    .first();
}

/**
 * Refresh the in-memory category cache from Dexie.
 * Business Logic: Call this once on app init after seeding, and again
 * whenever categories are modified (add/edit/delete) so all components
 * see the latest names and colors synchronously.
 * @returns {Promise<void>}
 */
export async function refreshCategoryCache() {
  const all = await getAllCategories();
  categoryCache.byId.clear();
  categoryCache.byName.clear();
  for (const cat of all) {
    categoryCache.byId.set(cat.id, cat);
    categoryCache.byName.set(cat.name.toLowerCase(), cat);
  }
}

/**
 * Seed the default categories if the table is empty.
 * @returns {Promise<void>}
 */
export async function seedCategories() {
  const count = await db.categories.count();
  if (count === 0) {
    const familyId = 'default';
    const now = new Date().toISOString();

    /** @type {Category[]} */
    const defaultData = DEFAULT_CATEGORIES.map(({ name, color }, index) => ({
      id: crypto.randomUUID(),
      familyId,
      name,
      color,
      sortOrder: index,
      updatedAt: now,
      isSynced: 0,
    }));

    await db.categories.bulkAdd(defaultData);
    console.log(`Seeded ${defaultData.length} default categories`);
  }

  // Always refresh the cache so UI components can look up colors/names
  await refreshCategoryCache();
}

/**
 * Add a new category with sync fields.
 * Business Logic: New categories are assigned the next sequential sortOrder
 * so they appear at the end of the store layout order.
 * @param {string} name - Display name.
 * @param {string} color - Hex color value.
 * @returns {Promise<string>} The new category UUID.
 */
export async function addCategory(name, color) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Find the highest existing sortOrder so new categories appear at the end
  const all = await db.categories.toArray();
  const maxOrder = all.reduce(
    (/** @type {number} */ max, /** @type {Category} */ c) => Math.max(max, c.sortOrder ?? -1),
    -1,
  );
  await db.categories.add({
    id,
    familyId: 'default',
    name,
    color,
    sortOrder: maxOrder + 1,
    updatedAt: now,
    isSynced: 0,
  });
  await refreshCategoryCache();
  document.dispatchEvent(new CustomEvent('categories-changed'));
  return id;
}

/**
 * Update the sortOrder for all categories based on an ordered array of IDs.
 * Business Logic: Called when the user reorders categories via the Store Layout
 * settings panel. The order of IDs determines the new sortOrder values (0, 1, 2…).
 * @param {string[]} orderedIds - Category IDs in their desired display order.
 * @returns {Promise<void>}
 */
export async function updateCategoryOrder(orderedIds) {
  const now = new Date().toISOString();
  // Fetch all categories, update sortOrder, and bulk-put them back
  const all = await db.categories.toArray();
  for (let i = 0; i < orderedIds.length; i++) {
    const cat = all.find((/** @type {Category} */ c) => c.id === orderedIds[i]);
    if (cat) {
      cat.sortOrder = i;
      cat.updatedAt = now;
      // @ts-ignore – isSynced is 0|1 but IndexedDB stores it as number
      cat.isSynced = 0;
    }
  }
  await db.categories.bulkPut(/** @type {import("../db.js").Category[]} */ (all));
  await refreshCategoryCache();
  document.dispatchEvent(new CustomEvent('categories-changed'));
}

/**
 * Update an existing category (name, color, or both).
 * @param {string} id - Category UUID.
 * @param {Partial<Pick<Category, 'name' | 'color'>>} changes - Fields to update.
 * @returns {Promise<void>}
 */
export async function updateCategory(id, changes) {
  const now = new Date().toISOString();
  await db.categories.update(id, {
    ...changes,
    updatedAt: now,
    isSynced: 0,
  });
  await refreshCategoryCache();
  document.dispatchEvent(new CustomEvent('categories-changed'));
}

/**
 * Delete a category by UUID.
 * @param {string} id - Category UUID.
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  await db.categories.delete(id);
  await refreshCategoryCache();
  document.dispatchEvent(new CustomEvent('categories-changed'));
}

/**
 * Reset all categories to their default seeded state.
 * Business Logic: Used by the "Reset to Default" feature. Deletes all
 * existing categories then re-seeds the defaults.
 * @returns {Promise<void>}
 */
export async function resetCategories() {
  await db.categories.clear();
  await seedCategories();
}

/**
 * Get the display name for a category ID (sync from cache).
 * @param {string} categoryId - Category UUID.
 * @returns {string} Category name, or 'Other' if not found.
 */
export function getCategoryName(categoryId) {
  const cat = categoryCache.byId.get(categoryId);
  return cat ? cat.name : 'Other';
}

/**
 * Get the color for a category ID (sync from cache).
 * @param {string} categoryId - Category UUID.
 * @returns {string} CSS color value, or fallback.
 */
export function getCategoryColor(categoryId) {
  const cat = categoryCache.byId.get(categoryId);
  return cat ? cat.color : '#bfc9c1';
}