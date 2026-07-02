// @ts-check
/**
 * Recipe Categories store for List&GO.
 * Business Logic: Provides CRUD operations on the `recipeCategories` Dexie table
 * with sync fields (workspaceId, updatedAt, isSynced). Seeded on first run with
 * 12 default recipe-type labels (e.g. "Pasta", "Salad"). Exposes an in-memory
 * cache so UI components can look up recipe category names synchronously.
 * Separated from the `categories` table which holds grocery-department categories.
 * @module
 */

import { db } from "../db.js";

/**
 * @typedef {import("../db.js").RecipeCategory} RecipeCategory
 */

/**
 * In-memory recipe category cache for synchronous lookups.
 * @type {{ byId: Map<string, RecipeCategory>, byName: Map<string, RecipeCategory> }}
 */
export const recipeCategoryCache = {
  byId: new Map(),
  byName: new Map(),
};

/**
 * The 12 default recipe categories — meal-type labels rather than grocery departments.
 * @type {{ name: string }[]}
 */
const DEFAULT_RECIPE_CATEGORIES = [
  { name: 'Pasta' },
  { name: 'Salad' },
  { name: 'Soup' },
  { name: 'Stir-fry' },
  { name: 'Bake' },
  { name: 'Breakfast' },
  { name: 'Dessert' },
  { name: 'Grill' },
  { name: 'One-Pot' },
  { name: 'Appetizer' },
  { name: 'Side' },
  { name: 'Quick' },
];

/**
 * Get all recipe categories sorted by name.
 * Business Logic: The sort order is alphabetical for recipe categories
 * since there is no store-layout concept for recipe types.
 * @returns {Promise<RecipeCategory[]>} Array of recipe categories.
 */
export async function getAllRecipeCategories() {
  const all = await db.recipeCategories.orderBy('name').toArray();
  return all;
}

/**
 * Get a single recipe category by UUID.
 * @param {string} id - Recipe category UUID.
 * @returns {Promise<RecipeCategory | undefined>}
 */
export async function getRecipeCategoryById(id) {
  return await db.recipeCategories.get(id);
}

/**
 * Refresh the in-memory recipe category cache from Dexie.
 * Business Logic: Call this once on app init after seeding, and again
 * whenever recipe categories are modified so components see the latest
 * names synchronously.
 * @returns {Promise<void>}
 */
export async function refreshRecipeCategoryCache() {
  const all = await getAllRecipeCategories();
  recipeCategoryCache.byId.clear();
  recipeCategoryCache.byName.clear();
  for (const cat of all) {
    recipeCategoryCache.byId.set(cat.id, cat);
    recipeCategoryCache.byName.set(cat.name.toLowerCase(), cat);
  }
}

/**
 * Seed the default recipe categories if the table is empty.
 * @returns {Promise<void>}
 */
export async function seedRecipeCategories() {
  const count = await db.recipeCategories.count();
  if (count === 0) {
    const workspaceId = 'default';
    const now = new Date().toISOString();

    /** @type {RecipeCategory[]} */
    const defaultData = DEFAULT_RECIPE_CATEGORIES.map(({ name }) => ({
      id: crypto.randomUUID(),
      workspaceId,
      name,
      updatedAt: now,
      isSynced: 0,
      isDeleted: 0,
    }));

    await db.recipeCategories.bulkAdd(defaultData);
    console.log(`Seeded ${defaultData.length} default recipe categories`);
  }

  // Always refresh the cache so UI components can look up names
  await refreshRecipeCategoryCache();
}

/**
 * Add a new recipe category with sync fields.
 * @param {string} name - Display name (e.g. "Asian", "Mexican").
 * @returns {Promise<string>} The new recipe category UUID.
 */
export async function addRecipeCategory(name) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.recipeCategories.add({
    id,
    workspaceId: 'default',
    name,
    updatedAt: now,
    isSynced: 0,
  });
  await refreshRecipeCategoryCache();
  document.dispatchEvent(new CustomEvent('recipe-categories-changed'));
  return id;
}

/**
 * Update an existing recipe category name.
 * @param {string} id - Recipe category UUID.
 * @param {string} name - New display name.
 * @returns {Promise<void>}
 */
export async function updateRecipeCategory(id, name) {
  const now = new Date().toISOString();
  await db.recipeCategories.update(id, {
    name,
    updatedAt: now,
    isSynced: 0,
  });
  await refreshRecipeCategoryCache();
  document.dispatchEvent(new CustomEvent('recipe-categories-changed'));
}

/**
 * Delete a recipe category by UUID.
 * @param {string} id - Recipe category UUID.
 * @returns {Promise<void>}
 */
export async function deleteRecipeCategory(id) {
  await db.recipeCategories.delete(id);
  await refreshRecipeCategoryCache();
  document.dispatchEvent(new CustomEvent('recipe-categories-changed'));
}

/**
 * Get the display name for a recipe category ID (sync from cache).
 * @param {string} recipeCategoryId - Recipe category UUID.
 * @returns {string} Recipe category name, or 'Uncategorized' if not found.
 */
export function getRecipeCategoryName(recipeCategoryId) {
  const cat = recipeCategoryCache.byId.get(recipeCategoryId);
  return cat ? cat.name : 'Uncategorized';
}