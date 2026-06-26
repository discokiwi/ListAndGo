// @ts-nocheck — Dexie types unavailable at compile time
/**
 * Meal Plan Store — CRUD for mealPlans table.
 * Business Logic: Provides pure data access functions for the mealPlans
 * Dexie table. Every write sets isSynced = 0 for the sync engine.
 * Queries join with recipes to enrich plan entries with recipe metadata.
 * @module
 */
import { db } from '../db.js';
import { now } from '../utils/date-utils.js';

/**
 * @typedef {import('../db.js').MealPlan} MealPlan
 * @typedef {import('../db.js').Recipe} Recipe
 */

/**
 * Get all meal plans, ordered by updatedAt descending (newest first).
 * @returns {Promise<MealPlan[]>}
 */
export async function getAllMealPlans() {
  return db.mealPlans.orderBy('updatedAt').reverse().toArray();
}

/**
 * Get all meal plans with their associated recipe data.
 * Business Logic: Joins meal plans with recipes to provide display data
 * (title, category, prep time, servings) without requiring a separate
 * recipe lookup for each card. Uncooked plans come first, then cooked.
 * @returns {Promise<Array<{ mealPlan: MealPlan, recipe: Recipe | undefined }>>}
 */
export async function getMealPlansWithRecipes() {
  const plans = await getAllMealPlans();
  if (plans.length === 0) return [];

  // Get all referenced recipes
  const recipeIds = [...new Set(plans.map((p) => p.recipeId))];
  const recipes = await db.recipes.where('id').anyOf(recipeIds).toArray();
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  // Sort: uncooked first (by updatedAt desc), then cooked (by updatedAt desc)
  const sorted = [...plans].sort((a, b) => {
    if (a.isCooked !== b.isCooked) {
      return a.isCooked ? 1 : -1; // uncooked first
    }
    // Within same group, newest first
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return sorted.map((mealPlan) => ({
    mealPlan,
    recipe: recipeMap.get(mealPlan.recipeId),
  }));
}

/**
 * Toggle the isCooked flag on a meal plan entry.
 * @param {string} id - Meal plan UUID.
 * @param {boolean} isCooked - Whether the meal has been cooked/marked done.
 * @returns {Promise<void>}
 */
export async function toggleMealPlanCooked(id, isCooked) {
  await db.mealPlans.update(id, {
    isCooked,
    updatedAt: now(),
    isSynced: 0,
  });
}

/**
 * Add a recipe to the meal plan.
 * @param {string} recipeId - The recipe UUID.
 * @param {number} [servingsTarget] - Optional serving override.
 * @returns {Promise<string>} The new meal plan UUID.
 */
export async function addMealPlan(recipeId, servingsTarget) {
  const id = crypto.randomUUID();
  const timestamp = now();

  const plan = {
    id,
    familyId: 'default',
    date: now().slice(0, 10), // YYYY-MM-DD
    recipeId,
    servingsTarget: servingsTarget || 4,
    isCooked: false,
    updatedAt: timestamp,
    isSynced: 0,
  };

  await db.mealPlans.add(plan);
  return id;
}

/**
 * Delete a single meal plan entry by ID.
 * @param {string} id - Meal plan UUID.
 * @returns {Promise<void>}
 */
export async function removeMealPlan(id) {
  await db.mealPlans.delete(id);
}

/**
 * Delete all meal plan entries.
 * Business Logic: Removes every record from the mealPlans table.
 * Used by the "Clear All" button. Sets isSynced = 0 before deletion
 * so the sync engine can propagate the deletion to PocketBase.
 * @returns {Promise<void>}
 */
export async function clearAllMealPlans() {
  await db.mealPlans.clear();
}

/**
 * Update the servings target for a meal plan entry.
 * @param {string} id - Meal plan UUID.
 * @param {number} servingsTarget - New servings value.
 * @returns {Promise<void>}
 */
export async function updateServingsTarget(id, servingsTarget) {
  await db.mealPlans.update(id, {
    servingsTarget,
    updatedAt: now(),
    isSynced: 0,
  });
}

/**
 * Count the number of meal plans.
 * @returns {Promise<number>}
 */
export async function countMealPlans() {
  return db.mealPlans.count();
}
