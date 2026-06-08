// @ts-check
/**
 * Item store functions for List&GO.
 * Business Logic: Provides CRUD operations on the `items` table with sync fields
 * (familyId, updatedAt, isSynced) and seeds the store with default grocery items
 * on first run. Every write sets isSynced = 0 so the sync engine can push changes.
 *
 * @module
 */

import { db } from "../db.js";

/**
 * Retrieve all items, sorted by name.
 * @returns {Promise<import("../db.js").Item[]>} Array of items.
 */
export async function getAllItems() {
  return await db.items.orderBy('name').toArray();
}

/**
 * Get a single item by its UUID.
 * @param {string} id - UUID of the item.
 * @returns {Promise<import("../db.js").Item | undefined>} The matching item or undefined.
 */
export async function getItemById(id) {
  return await db.items.get(id);
}

/**
 * Search items by name prefix (for autocomplete).
 * @param {string} query - The search string.
 * @returns {Promise<import("../db.js").Item[]>} Matching items.
 */
export async function searchItems(query) {
  if (!query || query.length < 1) return /** @type {import("../db.js").Item[]} */ ([]);
  return await db.items
    .filter((/** @type {import("../db.js").Item} */ item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .limit(20)
    .toArray();
}

/**
 * Get all essential items (for quick-add sheet).
 * @returns {Promise<import("../db.js").Item[]>} Array of essential items.
 */
export async function getEssentialItems() {
  return await db.items.where('isEssential').equals(1).toArray();
}

/**
 * Add a new item with sync fields.
 * @param {Omit<import("../db.js").Item, "id" | "updatedAt" | "isSynced">} data - Item data without generated fields.
 * @returns {Promise<string>} The generated UUID of the new item.
 */
export async function addItem(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.items.add({
    id,
    updatedAt: now,
    isSynced: 0,
    ...data,
  });
  return id;
}

/**
 * Update an existing item and mark it dirty for sync.
 * @param {import("../db.js").Item} item - Full item object with id.
 * @returns {Promise<void>}
 */
export async function updateItem(item) {
  const now = new Date().toISOString();
  await db.items.put({
    ...item,
    updatedAt: now,
    isSynced: 0,
  });
}

/**
 * Delete an item by id.
 * @param {string} id - UUID of the item to delete.
 * @returns {Promise<void>}
 */
export async function deleteItem(id) {
  await db.items.delete(id);
}

/**
 * Seed the items table with a default catalogue if it is empty.
 * Runs once on application start.
 * @returns {Promise<void>}
 */
export async function seedItems() {
  const count = await db.items.count();
  if (count > 0) return;

  const familyId = 'default';
  const now = new Date().toISOString();
  const isSynced = 0;

  /** @type {import("../db.js").Item[]} */
  const defaultItems = [
    // Produce
    { id: crypto.randomUUID(), familyId, name: "Apple", categoryId: "produce", unitId: "pcs", defaultQty: 4, isEssential: true, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Banana", categoryId: "produce", unitId: "pcs", defaultQty: 6, isEssential: true, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Carrot", categoryId: "produce", unitId: "kg", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Lettuce", categoryId: "produce", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Tomato", categoryId: "produce", unitId: "pcs", defaultQty: 6, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Onion", categoryId: "produce", unitId: "kg", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Potato", categoryId: "produce", unitId: "kg", defaultQty: 2, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Garlic", categoryId: "produce", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    // Dairy
    { id: crypto.randomUUID(), familyId, name: "Milk", categoryId: "dairy", unitId: "l", defaultQty: 1, isEssential: true, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Butter", categoryId: "dairy", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Cheese", categoryId: "dairy", unitId: "g", defaultQty: 200, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Yogurt", categoryId: "dairy", unitId: "pcs", defaultQty: 4, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Eggs", categoryId: "dairy", unitId: "pcs", defaultQty: 12, isEssential: true, updatedAt: now, isSynced },
    // Bakery
    { id: crypto.randomUUID(), familyId, name: "Bread", categoryId: "bakery", unitId: "pcs", defaultQty: 1, isEssential: true, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Croissant", categoryId: "bakery", unitId: "pcs", defaultQty: 4, isEssential: false, updatedAt: now, isSynced },
    // Meat
    { id: crypto.randomUUID(), familyId, name: "Chicken Breast", categoryId: "meat", unitId: "g", defaultQty: 500, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Ground Beef", categoryId: "meat", unitId: "g", defaultQty: 500, isEssential: false, updatedAt: now, isSynced },
    // Pantry
    { id: crypto.randomUUID(), familyId, name: "Rice", categoryId: "pantry", unitId: "kg", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Pasta", categoryId: "pantry", unitId: "g", defaultQty: 500, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Olive Oil", categoryId: "pantry", unitId: "l", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    // Condiments
    { id: crypto.randomUUID(), familyId, name: "Salt", categoryId: "condiments", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Black Pepper", categoryId: "condiments", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    // Beverages
    { id: crypto.randomUUID(), familyId, name: "Orange Juice", categoryId: "beverages", unitId: "l", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Coffee", categoryId: "beverages", unitId: "pcs", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
    // Frozen
    { id: crypto.randomUUID(), familyId, name: "Frozen Peas", categoryId: "frozen", unitId: "g", defaultQty: 500, isEssential: false, updatedAt: now, isSynced },
    { id: crypto.randomUUID(), familyId, name: "Ice Cream", categoryId: "frozen", unitId: "l", defaultQty: 1, isEssential: false, updatedAt: now, isSynced },
  ];

  await db.items.bulkAdd(defaultItems);
  console.log(`Seeded ${defaultItems.length} default items`);
}

// Initialise seed on module load.
seedItems().catch((e) => console.error('Failed to seed items:', e));