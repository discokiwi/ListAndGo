// @ts-nocheck -- Dexie types unavailable at compile time; loaded via vendor file
/* global Dexie -- provided by <script> tag in index.html */
/**
 * Dexie database definition for List&GO.
 * Business Logic: Defines all IndexedDB tables with sync fields (family_id,
 * updatedAt, isSynced) for offline-first family sync. Every write sets
 * isSynced = 0 so the sync engine can push dirty records to PocketBase.
 * Dexie is loaded globally via <script> tag pointing to js/vendor/dexie.min.js.
 * @module
 */

/**
 * @typedef {object} Item
 * @property {string} id - UUID of the item.
 * @property {string} familyId - FK to family.
 * @property {string} name - Human-readable name.
 * @property {string} categoryId - Reference to a category.
 * @property {string} unitId - Free-text unit string (e.g. "grams", "pcs", custom).
 * @property {number} defaultQty - Default quantity for the item.
 * @property {boolean} isEssential - Whether the item appears in the Essentials quick-add sheet.
 * @property {boolean} isMultiUse - Whether the item is multi-use (e.g. pepper) vs single-use consumable (e.g. milk).
 * @property {string} updatedAt - ISO timestamp for sync conflict resolution.
 * @property {number} isSynced - 0 = dirty, 1 = synced.
 */

/**
 * @typedef {object} Category
 * @property {string} id - UUID of the category.
 * @property {string} familyId - FK to family.
 * @property {string} name - Display name.
 * @property {string} color - Hex color value for accent display.
 * @property {number} sortOrder - Display order (0-based index) for store layout sorting.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} RecipeCategory
 * @property {string} id - UUID of the recipe category.
 * @property {string} familyId - FK to family.
 * @property {string} name - Display name (e.g. "Pasta", "Salad").
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} Unit
 * @property {string} id - UUID of the unit.
 * @property {string} familyId - FK to family.
 * @property {string} name - Display name (e.g., "kg", "pcs").
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} Recipe
 * @property {string} id - UUID of the recipe.
 * @property {string} familyId - FK to family.
 * @property {string} title - Recipe title.
 * @property {string} recipeCategoryId - Reference to a recipe category.
 * @property {number} prepTime - Minutes required.
 * @property {number} servingsBase - Base portion (default 4).
 * @property {string} instructionsUrl - Optional external link.
 * @property {string} notes - Free-form notes.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} RecipeIngredient
 * @property {string} id - UUID.
 * @property {string} familyId - FK to family.
 * @property {string} recipeId - Owning recipe.
 * @property {string} itemId - Linked Item.
 * @property {number} quantity - Amount per servingsBase.
 * @property {string} unitId - Unit reference.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} GroceryList
 * @property {string} id - UUID of the list.
 * @property {string} familyId - FK to family.
 * @property {string} name - List name.
 * @property {boolean} isActive - The current shopping list.
 * @property {boolean} isArchived - Archived past lists.
 * @property {string} createdAt - ISO timestamp.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} GroceryItem
 * @property {string} id - UUID of the grocery entry.
 * @property {string} familyId - FK to family.
 * @property {string} listId - Owning list.
 * @property {string} itemId - Linked Item.
 * @property {string} name - Denormalized for offline display.
 * @property {string} categoryId - Denormalized for sort-by-store-layout.
 * @property {number} qty - Aggregated quantity.
 * @property {string} unit - Unit string.
 * @property {boolean} isChecked - In-cart state.
 * @property {string} sourceRecipeIds - JSON array of recipe IDs.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} MealPlan
 * @property {string} id - UUID of the plan entry.
 * @property {string} familyId - FK to family.
 * @property {string} date - YYYY-MM-DD.
 * @property {string} recipeId - Linked recipe.
 * @property {number} servingsTarget - Overrides recipe's servingsBase.
 * @property {boolean} isCooked - Marks recipe as done.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} StoreLayout
 * @property {string} id - UUID.
 * @property {string} familyId - FK to family.
 * @property {string} name - e.g. "Albert Heijn".
 * @property {string} categoryOrder - JSON array of category names.
 * @property {boolean} isActive - Currently active layout.
 * @property {string} updatedAt - ISO timestamp.
 * @property {number} isSynced - Dirty flag.
 */

/**
 * @typedef {object} Setting
 * @property {string} key - e.g. "default_servings".
 * @property {string} value - JSON-serialized value.
 */

/**
 * Dexie database for List&GO.
 * @class
 * @augments Dexie
 * @property {Dexie.Table<Item, string>} items - The items collection.
 * @property {Dexie.Table<Category, string>} categories - The categories collection.
 * @property {Dexie.Table<RecipeCategory, string>} recipeCategories - The recipe categories collection.
 * @property {Dexie.Table<Unit, string>} units - The units collection.
 * @property {Dexie.Table<Recipe, string>} recipes - The recipes collection.
 * @property {Dexie.Table<RecipeIngredient, string>} recipeIngredients - The recipe ingredients collection.
 * @property {Dexie.Table<GroceryList, string>} groceryLists - The grocery lists collection.
 * @property {Dexie.Table<GroceryItem, string>} groceryItems - The grocery items collection.
 * @property {Dexie.Table<MealPlan, string>} mealPlans - The meal plans collection.
 * @property {Dexie.Table<StoreLayout, string>} storeLayouts - The store layouts collection.
 * @property {Dexie.Table<Setting, string>} settings - The settings collection.
 */
export class ListAndGoDB extends Dexie {
  /** @returns {Dexie.Table<Item, string>} The items collection. */
  get items() { return this.table('items'); }

  /** @returns {Dexie.Table<Category, string>} The categories collection. */
  get categories() { return this.table('categories'); }

  /** @returns {Dexie.Table<RecipeCategory, string>} The recipe categories collection. */
  get recipeCategories() { return this.table('recipeCategories'); }

  /** @returns {Dexie.Table<Unit, string>} The units collection. */
  get units() { return this.table('units'); }

  /** @returns {Dexie.Table<Recipe, string>} The recipes collection. */
  get recipes() { return this.table('recipes'); }

  /** @returns {Dexie.Table<RecipeIngredient, string>} The recipe ingredients collection. */
  get recipeIngredients() { return this.table('recipeIngredients'); }

  /** @returns {Dexie.Table<GroceryList, string>} The grocery lists collection. */
  get groceryLists() { return this.table('groceryLists'); }

  /** @returns {Dexie.Table<GroceryItem, string>} The grocery items collection. */
  get groceryItems() { return this.table('groceryItems'); }

  /** @returns {Dexie.Table<MealPlan, string>} The meal plans collection. */
  get mealPlans() { return this.table('mealPlans'); }

  /** @returns {Dexie.Table<StoreLayout, string>} The store layouts collection. */
  get storeLayouts() { return this.table('storeLayouts'); }

  /** @returns {Dexie.Table<Setting, string>} The settings collection. */
  get settings() { return this.table('settings'); }

  /** Initialize the database schema with versioning. */
  constructor() {
    super('listandgo-db');
    this.version(1).stores({
      items: 'id, familyId, name, categoryId, isEssential, isMultiUse, updatedAt, isSynced',
      categories: 'id, familyId, name, updatedAt, isSynced',
      units: 'id, familyId, name, updatedAt, isSynced',
      recipes: 'id, familyId, title, categoryId, prepTime, servingsBase, updatedAt, isSynced',
      recipeIngredients: 'id, familyId, recipeId, itemId, unitId, updatedAt, isSynced',
      groceryLists: 'id, familyId, name, isActive, isArchived, createdAt, updatedAt, isSynced',
      groceryItems: 'id, familyId, [listId+itemId], listId, itemId, name, categoryId, isChecked, updatedAt, isSynced',
      mealPlans: 'id, familyId, date, recipeId, isCooked, updatedAt, isSynced',
      storeLayouts: 'id, familyId, name, isActive, updatedAt, isSynced',
      settings: 'key, value',
    });
    // Version 2: Add recipeCategories table, rename recipes.categoryId → recipeCategoryId
    this.version(2).stores({
      recipeCategories: 'id, familyId, name, updatedAt, isSynced',
      recipes: 'id, familyId, title, recipeCategoryId, prepTime, servingsBase, updatedAt, isSynced',
    });
  }
}

/** @type {ListAndGoDB} */
export const db = new ListAndGoDB();