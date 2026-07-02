// @ts-check
/**
 * Item store functions for List&GO.
 * Business Logic: Provides CRUD operations on the `items` table with sync fields
 * (workspaceId, updatedAt, isSynced) and seeds the store with default grocery items
 * on first run. The seed flow first seeds categories and units, then looks up their
 * UUIDs by name so items have proper foreign key references. Every write sets
 * isSynced = 0 so the sync engine can push changes.
 * @module
 */

import { db } from "../db.js";
import { seedCategories, getCategoryByName } from "./categories.store.js";

/**
 * @typedef {import("../db.js").Item} Item
 */

/**
 * Retrieve all items, sorted by name.
 * @returns {Promise<Item[]>} Array of items.
 */
export async function getAllItems() {
  return await db.items.orderBy('name').toArray();
}

/**
 * Get a single item by its UUID.
 * @param {string} id - UUID of the item.
 * @returns {Promise<Item | undefined>} The matching item or undefined.
 */
export async function getItemById(id) {
  return await db.items.get(id);
}

/**
 * Search items by name prefix (for autocomplete).
 * @param {string} query - The search string.
 * @returns {Promise<Item[]>} Matching items.
 */
export async function searchItems(query) {
  if (!query || query.length < 1) return /** @type {Item[]} */ ([]);
  return await db.items
    .filter((/** @type {Item} */ item) => item.name.toLowerCase().includes(query.toLowerCase()))
    .limit(20)
    .toArray();
}

/**
 * Get all essential items (for quick-add sheet).
 * @returns {Promise<Item[]>} Array of essential items.
 */
export async function getEssentialItems() {
  return await db.items.filter((/** @type {Item} */ item) => item.isEssential).toArray();
}

/**
 * Add a new item with sync fields.
 * @param {Omit<Item, "id" | "updatedAt" | "isSynced" | "isDeleted">} data - Item data without generated fields.
 * @returns {Promise<string>} The generated UUID of the new item.
 */
export async function addItem(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.items.add({
    id,
    updatedAt: now,
    isSynced: 0,
    isDeleted: 0,
    ...data,
  });
  return id;
}

/**
 * Update an existing item and mark it dirty for sync.
 * @param {Item} item - Full item object with id.
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
 * Map old string category IDs to new category UUIDs.
 * Also maps old unit UUIDs back to plain string names.
 * Business Logic: After category seeding, existing items may have old-format
 * categoryIds like "produce" or "dairy" instead of UUIDs. This migration
 * remaps them by looking up the category name from a hardcoded mapping.
 * @returns {Promise<void>}
 */
async function migrateOldCategoryIds() {
  // Map of old string IDs to category names
  /** @type {Record<string, string>} */
  const OLD_CATEGORY_MAP = {
    produce: 'Groenten & Fruit',
    dairy: 'Zuivel',
    bakery: 'Brood / Ontbijt',
    meat: 'Beenhouwerij',
    pantry: 'Droge Voeding',
    condiments: 'Droge Voeding',
    beverages: 'Drank',
    frozen: 'Diepvries',
  };

  // Check if any items use old-style category IDs (non-UUID)
  const items = await db.items.toArray();
  const oldItems = items.filter((/** @type {Item} */ i) => i.categoryId && i.categoryId.length < 36);
  if (oldItems.length === 0) return;

  const now = new Date().toISOString();

  for (const item of oldItems) {
    const oldId = item.categoryId.toLowerCase();
    const catName = OLD_CATEGORY_MAP[oldId] || null;
    if (!catName) {
      // Unknown old ID — just clear it
      await db.items.update(item.id, { categoryId: '', updatedAt: now, isSynced: 0 });
      continue;
    }
    const cat = await getCategoryByName(catName);
    if (cat) {
      await db.items.update(item.id, { categoryId: cat.id, updatedAt: now, isSynced: 0 });
    }
  }

  // Also migrate groceryItems which have denormalized categoryId
  const groceryItems = await db.groceryItems.toArray();
  const oldGroceryItems = groceryItems.filter((/** @type {import("../db.js").GroceryItem} */ gi) => gi.categoryId && gi.categoryId.length < 36);
  for (const gi of oldGroceryItems) {
    const oldId = gi.categoryId.toLowerCase();
    const catName = OLD_CATEGORY_MAP[oldId] || null;
    if (!catName) {
      await db.groceryItems.update(gi.id, { categoryId: '', updatedAt: now, isSynced: 0 });
      continue;
    }
    const cat = await getCategoryByName(catName);
    if (cat) {
      await db.groceryItems.update(gi.id, { categoryId: cat.id, updatedAt: now, isSynced: 0 });
    }
  }

  // Also migrate unit UUIDs to plain strings for items
  const itemsWithUnitUuids = items.filter((/** @type {Item} */ i) => i.unitId && i.unitId.length === 36);
  if (itemsWithUnitUuids.length > 0) {
    const units = await db.units.toArray();
    /** @type {Record<string, string>} */
    const unitMap = {};
    for (const u of units) {
      unitMap[u.id] = u.name;
    }
    const nowU = new Date().toISOString();
    for (const item of itemsWithUnitUuids) {
      const plainName = unitMap[item.unitId] || '';
      await db.items.update(item.id, { unitId: plainName, updatedAt: nowU, isSynced: 0 });
    }
  }

  // Also migrate groceryItem unit UUIDs to plain strings
  const groceryWithUnitUuids = groceryItems.filter((/** @type {import("../db.js").GroceryItem} */ gi) => gi.unit && gi.unit.length === 36);
  if (groceryWithUnitUuids.length > 0) {
    const units = await db.units.toArray();
    /** @type {Record<string, string>} */
    const unitMap = {};
    for (const u of units) {
      unitMap[u.id] = u.name;
    }
    const nowG = new Date().toISOString();
    for (const gi of groceryWithUnitUuids) {
      const plainName = unitMap[gi.unit] || '';
      await db.groceryItems.update(gi.id, { unit: plainName, updatedAt: nowG, isSynced: 0 });
    }
  }

  console.log(`Migrated ${oldItems.length} items and ${oldGroceryItems.length} grocery items from old category IDs`);
  console.log(`Migrated ${itemsWithUnitUuids.length} items and ${groceryWithUnitUuids.length} grocery items from old unit UUIDs`);
}

/**
 * Seed the items table with a default catalogue if it is empty.
 * Runs once on application start. First seeds categories and units,
 * then resolves UUIDs to build proper foreign key references.
 * Also migrates any old-format category IDs to the new UUID format.
 * @returns {Promise<void>}
 */
export async function seedItems() {
  // First ensure categories are seeded
  await seedCategories();

  // Migrate any old-format IDs before checking if items exist
  await migrateOldCategoryIds();

  const count = await db.items.count();
  if (count > 0) return;

  const workspaceId = 'default';
  const now = new Date().toISOString();

  // Resolve category UUIDs by name
  const catFruits = await getCategoryByName('Groenten & Fruit');
  const catButcher = await getCategoryByName('Beenhouwerij');
  const catDairy = await getCategoryByName('Zuivel');
  const catBakery = await getCategoryByName('Brood / Ontbijt');
  const catSnacks = await getCategoryByName('Snacks');
  const catPantry = await getCategoryByName('Droge Voeding');
  const catCanned = await getCategoryByName('Conserveren');
  const catFrozen = await getCategoryByName('Diepvries');
  const catDrinks = await getCategoryByName('Drank');
  const catNonFood = await getCategoryByName('Non-food');

  // Units are plain strings — no need to resolve UUIDs

  /** @type {Item[]} */
  const defaultItems = [
    // Groenten & Fruit
    { id: crypto.randomUUID(), workspaceId, name: "Appel", categoryId: catFruits?.id || '', unitId: 'stuks', defaultQty: 4, isEssential: true, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Banaan", categoryId: catFruits?.id || '', unitId: 'stuks', defaultQty: 6, isEssential: true, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Wortel", categoryId: catFruits?.id || '', unitId: 'kg', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Sla", categoryId: catFruits?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Tomaat", categoryId: catFruits?.id || '', unitId: 'stuks', defaultQty: 6, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Ui", categoryId: catFruits?.id || '', unitId: 'kg', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Aardappel", categoryId: catFruits?.id || '', unitId: 'kg', defaultQty: 2, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Knoflook", categoryId: catFruits?.id || '', unitId: 'stuks', defaultQty: 3, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Zuivel
    { id: crypto.randomUUID(), workspaceId, name: "Melk", categoryId: catDairy?.id || '', unitId: 'liter', defaultQty: 1, isEssential: true, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Boter", categoryId: catDairy?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Kaas", categoryId: catDairy?.id || '', unitId: 'gram', defaultQty: 200, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Yoghurt", categoryId: catDairy?.id || '', unitId: 'stuks', defaultQty: 4, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Eieren", categoryId: catDairy?.id || '', unitId: 'stuks', defaultQty: 12, isEssential: true, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Brood / Ontbijt
    { id: crypto.randomUUID(), workspaceId, name: "Brood", categoryId: catBakery?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: true, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Croissant", categoryId: catBakery?.id || '', unitId: 'stuks', defaultQty: 4, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Beenhouwerij
    { id: crypto.randomUUID(), workspaceId, name: "Kipfilet", categoryId: catButcher?.id || '', unitId: 'gram', defaultQty: 500, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Gehakt", categoryId: catButcher?.id || '', unitId: 'gram', defaultQty: 500, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Zalmfilet", categoryId: catButcher?.id || '', unitId: 'gram', defaultQty: 300, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Droge Voeding
    { id: crypto.randomUUID(), workspaceId, name: "Rijst", categoryId: catPantry?.id || '', unitId: 'kg', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Pasta", categoryId: catPantry?.id || '', unitId: 'gram', defaultQty: 500, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Olijfolie", categoryId: catPantry?.id || '', unitId: 'liter', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Zout", categoryId: catPantry?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Zwarte Peper", categoryId: catPantry?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Conserveren
    { id: crypto.randomUUID(), workspaceId, name: "Tomaten in Blik", categoryId: catCanned?.id || '', unitId: 'stuks', defaultQty: 2, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Diepvries
    { id: crypto.randomUUID(), workspaceId, name: "Diepvrieserwten", categoryId: catFrozen?.id || '', unitId: 'gram', defaultQty: 500, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Drank
    { id: crypto.randomUUID(), workspaceId, name: "Sinaasappelsap", categoryId: catDrinks?.id || '', unitId: 'liter', defaultQty: 1, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Koffie", categoryId: catDrinks?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: true, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Snacks
    { id: crypto.randomUUID(), workspaceId, name: "Chips", categoryId: catSnacks?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    // Non-food
    { id: crypto.randomUUID(), workspaceId, name: "Tandpasta", categoryId: catNonFood?.id || '', unitId: 'stuks', defaultQty: 1, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
    { id: crypto.randomUUID(), workspaceId, name: "Hondenvoer", categoryId: catNonFood?.id || '', unitId: 'kg', defaultQty: 2, isEssential: false, isMultiUse: false, updatedAt: now, isSynced: 0, isDeleted: 0 },
  ];

  await db.items.bulkAdd(defaultItems);
  console.log(`Seeded ${defaultItems.length} default items`);
}