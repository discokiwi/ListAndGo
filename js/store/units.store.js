// @ts-check
/**
 * Units store for List&GO.
 * Business Logic: Provides CRUD operations on the `units` Dexie table
 * with sync fields (familyId, updatedAt, isSynced). Seeded on first run
 * with 5 default units. Unit names are not editable (per SPEC), but can
 * be deleted and re-added from settings.
 * @module
 */

import { db } from "../db.js";

/**
 * @typedef {import("../db.js").Unit} Unit
 */

/**
 * The 6 default units.
 * @type {string[]}
 */
const DEFAULT_UNITS = ['stuks', 'pak', 'gram', 'kg', 'ml', 'liter'];

/**
 * In-memory unit cache for synchronous name lookups.
 * Business Logic: Items store unitId as a UUID. UI components need to
 * resolve these UUIDs to human-readable unit names synchronously during
 * render. This cache is populated on app start.
 * @type {{ byId: Map<string, Unit> }}
 */
export const unitCache = {
  byId: new Map(),
};

/**
 * Get all units sorted by name.
 * @returns {Promise<Unit[]>} Array of units.
 */
export async function getAllUnits() {
  return await db.units.orderBy('name').toArray();
}

/**
 * Get a single unit by UUID.
 * @param {string} id - Unit UUID.
 * @returns {Promise<Unit | undefined>}
 */
export async function getUnitById(id) {
  return await db.units.get(id);
}

/**
 * Refresh the in-memory unit cache from Dexie.
 * Business Logic: Call this on app init after seeding so components
 * can resolve unit UUIDs to names synchronously.
 * @returns {Promise<void>}
 */
export async function refreshUnitCache() {
  const all = await getAllUnits();
  unitCache.byId.clear();
  for (const unit of all) {
    unitCache.byId.set(unit.id, unit);
  }
}

/**
 * Get the display name for a unit UUID (sync from cache).
 * @param {string} unitId - Unit UUID.
 * @returns {string} Unit name, or the raw ID if not found.
 */
export function getUnitName(unitId) {
  if (!unitId) return '';
  const unit = unitCache.byId.get(unitId);
  return unit ? unit.name : unitId;
}

/**
 * Seed the default units if the table is empty.
 * @returns {Promise<void>}
 */
export async function seedUnits() {
  const count = await db.units.count();
  if (count === 0) {
    const familyId = 'default';
    const now = new Date().toISOString();

    /** @type {Unit[]} */
    const defaultData = DEFAULT_UNITS.map((name) => ({
      id: crypto.randomUUID(),
      familyId,
      name,
      updatedAt: now,
      isSynced: 0,
    }));

    await db.units.bulkAdd(defaultData);
    console.log(`Seeded ${defaultData.length} default units`);
  }

  // Always refresh the cache
  await refreshUnitCache();
}

/**
 * Add a new unit with sync fields.
 * @param {string} name - Unit name.
 * @returns {Promise<string>} The new unit UUID.
 */
export async function addUnit(name) {
  // Check for duplicate (case-insensitive)
  const existing = await db.units
    .filter((/** @type {Unit} */ u) => u.name.toLowerCase() === name.toLowerCase())
    .first();
  if (existing) throw new Error(`Unit "${name}" already exists`);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.units.add({
    id,
    familyId: 'default',
    name,
    updatedAt: now,
    isSynced: 0,
  });
  return id;
}

/**
 * Delete a unit by UUID.
 * @param {string} id - Unit UUID.
 * @returns {Promise<void>}
 */
export async function deleteUnit(id) {
  await db.units.delete(id);
}

/**
 * Reset all units to their default seeded state.
 * Business Logic: Used by the "Reset to Default" feature.
 * @returns {Promise<void>}
 */
export async function resetUnits() {
  await db.units.clear();
  await seedUnits();
}