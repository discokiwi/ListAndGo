// @ts-check
/**
 * Grocery list store functions for List&GO.
 * Business Logic: Provides CRUD operations on grocery lists and grocery items
 * with the sync contract (isSynced = 0 on every write). The "active list" is
 * the single shopping list that the meal planner writes to. Items are sorted
 * by category for store-layout grouping and by checked status so that
 * un-checked items appear before checked ones.
 * @module
 */

import { db } from "../db.js";

/**
 * @typedef {import("../db.js").GroceryList} GroceryList
 * @typedef {import("../db.js").GroceryItem} GroceryItem
 * @typedef {import("../db.js").Item} Item
 */

const DEFAULT_LIST_NAME = 'Weekly Shop';

/**
 * In-memory cache for the active list ID and its items.
 * Business Logic: When the grocery-list component is destroyed and recreated
 * (e.g. navigating tabs), the cache prevents a flash of empty state by
 * providing synchronous access to the last known data. The cache is updated
 * on every write operation.
 */
/** @type {{ listId: string | null, items: import("../db.js").GroceryItem[] }} */
export const groceryCache = {
  listId: null,
  items: [],
};

/**
 * Get the active grocery list, creating one if none exists.
 * Business Logic: The app must always have an active list to add items to.
 * If no list is marked isActive, a new default list is created.
 * @returns {Promise<GroceryList>} The active list.
 */
export async function getOrCreateActiveList() {
  /** @type {GroceryList | undefined} */
  let list = await db.groceryLists.filter((/** @type {import("../db.js").GroceryList} */ l) => l.isActive).first();
  if (list) {
    // Update cache
    groceryCache.listId = list.id;
    return list;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const workspaceId = 'default';
  list = {
    id,
    workspaceId,
    name: DEFAULT_LIST_NAME,
    isActive: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    isSynced: 0,
    isDeleted: 0,
  };
  await db.groceryLists.add(list);
  return list;
}

/**
 * Get all items for a given list, sorted by checked status then by completion time.
 * Business Logic: Unchecked items appear first (organised by category for store-layout
 * grouping), followed by checked items moved to the COMPLETED section at the bottom.
 * Within the checked group, items are ordered by updatedAt descending so the most
 * recently completed item appears highest in the COMPLETED section.
 * @param {string} listId - The grocery list UUID.
 * @returns {Promise<GroceryItem[]>} Sorted grocery items.
 */
export async function getGroceryItems(listId) {
  const items = await db.groceryItems
    .where('listId').equals(listId)
    .toArray();

  // Sort: unchecked first (by category), then checked (by completion time, most recent first)
  items.sort((/** @type {GroceryItem} */ a, /** @type {GroceryItem} */ b) => {
    if (a.isChecked !== b.isChecked) {
      return a.isChecked ? 1 : -1;
    }
    // Both checked: order by completion time, most recent first ("last completed is highest")
    if (a.isChecked) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    // Both unchecked: order by category for store-layout grouping
    return (a.categoryId || '').localeCompare(b.categoryId || '');
  });

  return items;
}

/**
 * Get all items for a given list grouped by category.
 * Business Logic: The UI renders each category as a collapsible <details> section.
 * This returns a Map keyed by categoryId with arrays of items.
 * @param {string} listId - The grocery list UUID.
 * @returns {Promise<Map<string, GroceryItem[]>>} Items grouped by category.
 */
export async function getGroceryItemsByCategory(listId) {
  const items = await getGroceryItems(listId);
  /** @type {Map<string, GroceryItem[]>} */
  const grouped = new Map();

  for (const item of items) {
    const cat = item.categoryId || 'other';
    const group = grouped.get(cat);
    if (group) {
      group.push(item);
    } else {
      grouped.set(cat, [item]);
    }
  }

  return grouped;
}

/**
 * Add a single grocery item to a list, or increase its qty if it already exists.
 * Business Logic: Each item can only appear once on the grocery list. When a user
 * manually adds an item or a recipe pushes ingredients, this function first checks
 * if an item with the same itemId already exists in the list. If it does, the qty
 * is incremented and the sourceRecipeIds are merged instead of creating a duplicate.
 * @param {string} listId - The grocery list UUID.
 * @param {string} itemId - The library item UUID.
 * @param {string} name - Denormalized item name for offline display.
 * @param {string} categoryId - Denormalized category for grouping.
 * @param {number} qty - Quantity to add.
 * @param {string} unit - Unit string.
 * @param {string} [recipeId] - Optional recipe UUID to store in sourceRecipeIds.
 * @returns {Promise<string>} The grocery item UUID (existing or new).
 */
export async function addGroceryItem(listId, itemId, name, categoryId, qty, unit, recipeId) {
  // Check if an item with the same itemId already exists in the list
  const existing = await db.groceryItems
    .where({ listId, itemId })
    .first();

  if (existing) {
    // Item exists — increment qty and merge sourceRecipeIds
    const now = new Date().toISOString();
    const newQty = (existing.qty || 0) + qty;
    
    // Merge recipeId into existing sourceRecipeIds
    /** @type {string[]} */
    let existingSourceIds;
    try {
      existingSourceIds = JSON.parse(existing.sourceRecipeIds || '[]');
    } catch {
      existingSourceIds = [];
    }
    if (recipeId && !existingSourceIds.includes(recipeId)) {
      existingSourceIds.push(recipeId);
    }
    
    await db.groceryItems.update(existing.id, {
      qty: newQty,
      sourceRecipeIds: JSON.stringify(existingSourceIds),
      updatedAt: now,
      isSynced: 0,
    });
    return existing.id;
  }

  // No existing item — create new
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const workspaceId = 'default';

  await db.groceryItems.add({
    id,
    workspaceId,
    listId,
    itemId,
    name,
    categoryId,
    qty,
    unit,
    isChecked: false,
    sourceRecipeIds: recipeId ? JSON.stringify([recipeId]) : '[]',
    updatedAt: now,
    isSynced: 0,
  });

  return id;
}

/**
 * Update the quantity of an existing grocery item.
 * Business Logic: The user may need to adjust how much of an item they need
 * directly in the grocery list (e.g. increase milk from 1L to 2L).
 * @param {string} id - The grocery item UUID.
 * @param {number} qty - The new quantity.
 * @returns {Promise<void>}
 */
export async function updateQty(id, qty) {
  const now = new Date().toISOString();
  await db.groceryItems.update(id, {
    qty,
    updatedAt: now,
    isSynced: 0,
  });
}

/**
 * Toggle the checked (in-cart) state of an item.
 * Business Logic: When the user checks an item, it gets greyed out and moves
 * to the COMPLETED section at the bottom of the list. Un-checking restores it
 * to its original position. The item remains visible for reference even when
 * marked in cart, per SPEC requirement.
 * @param {string} id - The grocery item UUID.
 * @param {boolean} isChecked - The new checked state.
 * @returns {Promise<void>}
 */
export async function toggleChecked(id, isChecked) {
  const now = new Date().toISOString();
  await db.groceryItems.update(id, {
    isChecked,
    updatedAt: now,
    isSynced: 0,
  });
}

/**
 * Delete a single grocery item from the list.
 * Business Logic: Removes the item entirely from the grocery list.
 * This is called from swipe-to-delete or a delete button.
 * @param {string} id - The grocery item UUID.
 * @returns {Promise<void>}
 */
export async function removeItem(id) {
  await db.groceryItems.delete(id);
}

/**
 * Delete all items from a grocery list (both checked and unchecked).
 * Business Logic: The "CLEAR ALL" button should reset the list entirely,
 * removing every item so the user can start fresh.
 * @param {string} listId - The grocery list UUID.
 * @returns {Promise<void>}
 */
export async function clearAllItems(listId) {
  const items = await db.groceryItems
    .where('listId').equals(listId)
    .primaryKeys();

  if (items.length > 0) {
    await db.groceryItems.bulkDelete(items);
  }
}

/**
 * Add an essential item from the library to the grocery list with its
 * default quantity and unit.
 * Business Logic: The Essentials quick-add sheet shows items flagged
 * isEssential in the library. One tap adds them with their preset QTY.
 * @param {string} listId - The grocery list UUID.
 * @param {Item} item - The library item (must have defaultQty, unitId).
 * @returns {Promise<string>} The new grocery item UUID.
 */
export async function addEssentialItemToGrocery(listId, item) {
  return addGroceryItem(
    listId,
    item.id,
    item.name,
    item.categoryId,
    item.defaultQty,
    item.unitId,
  );
}

/**
 * Parse sourceRecipeIds from a grocery item's JSON string field.
 * @param {GroceryItem} item - The grocery item.
 * @returns {string[]} Array of recipe UUIDs.
 */
function parseSourceIds(item) {
  try {
    return JSON.parse(item.sourceRecipeIds || '[]');
  } catch {
    return [];
  }
}

/**
 * Remove grocery items that are only sourced from a given recipe ID.
 * Business Logic: When a recipe is removed from the meal plan or its
 * "Add to Grocery List" toggle is turned off, we need to clean up.
 * If a grocery item has only this recipeId in its sourceRecipeIds,
 * the item is deleted entirely. If the item is also sourced from
 * other recipes, we just remove this recipeId from the array.
 * Uses Dexie's filter() for indexed querying instead of loading
 * the entire table into memory.
 * @param {string} recipeId - The recipe UUID to remove.
 * @returns {Promise<void>}
 */
export async function removeItemsByRecipeId(recipeId) {
  // Use Dexie's filter to only load items with non-empty sourceRecipeIds
  const items = await db.groceryItems
    .filter((/** @type {GroceryItem} */ item) => item.sourceRecipeIds && item.sourceRecipeIds !== '[]')
    .toArray();
  
  for (const item of items) {
    const sourceIds = parseSourceIds(item);
    if (!sourceIds.includes(recipeId)) continue;
    
    if (sourceIds.length === 1) {
      // Only this recipe references it — delete entirely
      await db.groceryItems.delete(item.id);
    } else {
      // Remove this recipeId from the array
      const updatedSourceIds = sourceIds.filter((id) => id !== recipeId);
      const now = new Date().toISOString();
      await db.groceryItems.update(item.id, {
        sourceRecipeIds: JSON.stringify(updatedSourceIds),
        updatedAt: now,
        isSynced: 0,
      });
    }
  }
}

/**
 * Remove all grocery items that have any recipe source (non-empty sourceRecipeIds).
 * Business Logic: Used when the user clears all meal plans, to also clean up
 * all recipe-originated items from the grocery list.
 * Uses Dexie's filter() to only load items with recipe sources.
 * @returns {Promise<void>}
 */
export async function removeAllRecipeItems() {
  // Only fetch items that have non-empty sourceRecipeIds
  const items = await db.groceryItems
    .filter((/** @type {GroceryItem} */ item) => item.sourceRecipeIds && item.sourceRecipeIds !== '[]')
    .toArray();

  const ids = items.map((/** @type {GroceryItem} */ item) => item.id);
  if (ids.length > 0) {
    await db.groceryItems.bulkDelete(ids);
  }
}

/**
 * Archive the active list and create a new one.
 * Business Logic: When the user archives a list, it is marked as archived
 * and a new empty active list is created for the next shop.
 * @returns {Promise<GroceryList>} The new active list.
 */
export async function archiveActiveList() {
  const current = await getOrCreateActiveList();
  const now = new Date().toISOString();

  await db.groceryLists.update(current.id, {
    isActive: false,
    isArchived: true,
    updatedAt: now,
    isSynced: 0,
  });

  return getOrCreateActiveList();
}
