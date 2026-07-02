// @ts-nocheck — Dexie types unavailable at compile time; db.js uses same pattern
/**
 * Recipes Store — CRUD for recipes + recipeIngredients.
 * Business Logic: Provides pure data access functions for the recipes and
 * recipeIngredients Dexie tables. Every write sets isSynced = 0 for the
 * sync engine. Recipes are always loaded together with their ingredients.
 * Includes a seed function that populates 3 example recipes referencing
 * the seed items from the items_library.
 * @module
 */
import { db } from '../db.js';
import { now } from '../utils/date-utils.js';

/**
 * @typedef {import('../db.js').Recipe} Recipe
 * @typedef {import('../db.js').RecipeIngredient} RecipeIngredient
 * @typedef {import('../db.js').Item} Item
 */

/**
 * Interface for a recipe with its ingredients joined.
 * @typedef {object} RecipeWithIngredients
 * @property {Recipe} recipe - The recipe metadata.
 * @property {RecipeIngredient[]} ingredients - The recipe ingredients.
 */

/**
 * Interface for creating/updating a recipe.
 * @typedef {object} RecipeInput
 * @property {string} [workspaceId] - Defaults to 'default'.
 * @property {string} title - Recipe title.
 * @property {string} recipeCategoryId - Recipe category reference.
 * @property {number} prepTime - Minutes.
 * @property {number} servingsBase - Base portion.
 * @property {string} [instructionsUrl] - External link.
 * @property {string} [notes] - Free-text notes.
 * @property {boolean} [isFavourite] - Whether it's starred as favourite.
 * @property {RecipeIngredientInput[]} ingredients - Ingredient list.
 */

/**
 * Interface for creating a recipe ingredient.
 * @typedef {object} RecipeIngredientInput
 * @property {string} itemId - FK to items_library.
 * @property {number} quantity - Amount per servingsBase.
 * @property {string} unitId - Unit reference.
 * @property {string} [name] - Denormalized name for display.
 */


/**
 * Get all recipes, ordered by title.
 * @returns {Promise<Recipe[]>}
 */
export async function getAllRecipes() {
  return db.recipes.orderBy('title').toArray();
}

/**
 * Search recipes by title or recipeCategoryId.
 * @param {string} query - Search string.
 * @returns {Promise<Recipe[]>}
 */
export async function searchRecipes(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return getAllRecipes();

  const all = await db.recipes.toArray();
  return all.filter((r) => {
    const titleMatch = r.title.toLowerCase().includes(trimmed);
    const catMatch = r.recipeCategoryId && r.recipeCategoryId.toLowerCase().includes(trimmed);
    return titleMatch || catMatch;
  });
}

/**
 * Get a single recipe by ID.
 * @param {string} id - Recipe UUID.
 * @returns {Promise<Recipe | undefined>}
 */
export async function getRecipeById(id) {
  return db.recipes.get(id);
}

/**
 * Get ingredients for a recipe.
 * @param {string} recipeId - Recipe UUID.
 * @returns {Promise<RecipeIngredient[]>}
 */
export async function getRecipeIngredients(recipeId) {
  return db.recipeIngredients.where('recipeId').equals(recipeId).toArray();
}

/**
 * Get a recipe with its ingredients joined.
 * @param {string} id - Recipe UUID.
 * @returns {Promise<RecipeWithIngredients | undefined>}
 */
export async function getRecipeWithIngredients(id) {
  const recipe = await db.recipes.get(id);
  if (!recipe) return undefined;
  const ingredients = await db.recipeIngredients.where('recipeId').equals(id).toArray();
  return { recipe, ingredients };
}

/**
 * Get multiple recipes with their ingredients.
 * @param {Recipe[]} recipes - The recipes to enrich.
 * @returns {Promise<RecipeWithIngredients[]>}
 */
export async function enrichRecipesWithIngredients(recipes) {
  const recipeIds = recipes.map((r) => r.id);
  const allIngredients = await db.recipeIngredients
    .where('recipeId')
    .anyOf(recipeIds)
    .toArray();

  const grouped = /** @type {{ [key: string]: RecipeIngredient[] }} */ ({});
  for (const ing of allIngredients) {
    if (!grouped[ing.recipeId]) grouped[ing.recipeId] = [];
    grouped[ing.recipeId].push(ing);
  }

  return recipes.map((recipe) => ({
    recipe,
    ingredients: grouped[recipe.id] || [],
  }));
}

/**
 * Get recipes by recipe category.
 * @param {string} recipeCategoryId - Recipe category reference.
 * @returns {Promise<Recipe[]>}
 */
export async function getRecipesByCategory(recipeCategoryId) {
  return db.recipes.where('recipeCategoryId').equals(recipeCategoryId).toArray();
}

/**
 * Get recipes under a prep time threshold.
 * @param {number} maxMinutes - Maximum prep time.
 * @returns {Promise<Recipe[]>}
 */
export async function getRecipesUnderTime(maxMinutes) {
  const all = await db.recipes.toArray();
  return all.filter((r) => r.prepTime <= maxMinutes);
}

/**
 * Get recent recipes by updatedAt timestamp.
 * @param {number} [limit] - Max number to return.
 * @returns {Promise<Recipe[]>}
 */
export async function getRecentRecipes(limit = 20) {
  return db.recipes
    .orderBy('updatedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get favourite recipes.
 * @returns {Promise<Recipe[]>}
 */
export async function getFavouriteRecipes() {
  // isFavourite is a dynamic field – query all and filter
  const all = await db.recipes.toArray();
  return all.filter((r) => /** @type {any} */ (r).isFavourite === true);
}

/**
 * Add a new recipe with its ingredients.
 * Business Logic: Recipe and ingredients are inserted in a single
 * transaction. Each write sets isSynced = 0 for the sync engine.
 * @param {RecipeInput} input - The recipe data.
 * @returns {Promise<string>} The new recipe ID.
 */
export async function addRecipe(input) {
  const id = crypto.randomUUID();
  const timestamp = now();

  const recipe = {
    id,
    workspaceId: input.workspaceId || 'default',
    title: input.title,
    recipeCategoryId: input.recipeCategoryId || 'uncategorized',
    prepTime: input.prepTime || 0,
    servingsBase: input.servingsBase || 4,
    instructionsUrl: input.instructionsUrl || '',
    notes: input.notes || '',
    updatedAt: timestamp,
    isSynced: 0,
  };

  // Conditionally add isFavourite if provided
  if (input.isFavourite !== undefined) {
    /** @type {any} */ (recipe).isFavourite = input.isFavourite;
  }

  await db.transaction('rw', db.recipes, db.recipeIngredients, async () => {
    await db.recipes.add(/** @type {Recipe} */ (recipe));

    if (input.ingredients && input.ingredients.length > 0) {
      const ingredients = input.ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId || 'default',
        recipeId: id,
        itemId: ing.itemId,
        quantity: ing.quantity || 1,
        unitId: ing.unitId || 'pcs',
        updatedAt: timestamp,
        isSynced: 0,
      }));
      await db.recipeIngredients.bulkAdd(ingredients);
    }
  });

  return id;
}

/**
 * Update a recipe's metadata.
 * @param {string} id - Recipe UUID.
 * @param {Partial<RecipeInput>} data - Fields to update.
 * @returns {Promise<void>}
 */
export async function updateRecipe(id, data) {
  const timestamp = now();
  const updates = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.recipeCategoryId !== undefined && { recipeCategoryId: data.recipeCategoryId }),
    ...(data.prepTime !== undefined && { prepTime: data.prepTime }),
    ...(data.servingsBase !== undefined && { servingsBase: data.servingsBase }),
    ...(data.instructionsUrl !== undefined && { instructionsUrl: data.instructionsUrl }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.isFavourite !== undefined && { isFavourite: data.isFavourite }),
    updatedAt: timestamp,
    isSynced: 0,
  };

  await db.recipes.update(id, updates);
}

/**
 * Replace a recipe's ingredient list.
 * Business Logic: Deletes all existing ingredients for the recipe,
 * then inserts the new list in one transaction.
 * @param {string} recipeId - Recipe UUID.
 * @param {RecipeIngredientInput[]} ingredients - New ingredient list.
 * @returns {Promise<void>}
 */
export async function replaceRecipeIngredients(recipeId, ingredients) {
  const timestamp = now();

  await db.transaction('rw', db.recipeIngredients, async () => {
    await db.recipeIngredients.where('recipeId').equals(recipeId).delete();

    if (ingredients.length > 0) {
      const newIngredients = ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        workspaceId: 'default',
        recipeId,
        itemId: ing.itemId,
        quantity: ing.quantity || 1,
        unitId: ing.unitId || 'pcs',
        updatedAt: timestamp,
        isSynced: 0,
      }));
      await db.recipeIngredients.bulkAdd(newIngredients);
    }
  });
}

/**
 * Delete a recipe and all its ingredients.
 * @param {string} id - Recipe UUID.
 * @returns {Promise<void>}
 */
export async function deleteRecipe(id) {
  await db.transaction('rw', db.recipes, db.recipeIngredients, async () => {
    await db.recipeIngredients.where('recipeId').equals(id).delete();
    await db.recipes.delete(id);
  });
}

/**
 * Resolve ingredient item details (name, category, isMultiUse) by joining with items_library.
 * Business Logic: Adds display data from the items_library to each recipe ingredient.
 * This allows the UI to show item names, category colors, and multi-use status without
 * requiring a separate lookup for each ingredient.
 * @param {RecipeIngredient[]} ingredients - The ingredients to enhance with item data.
 * @returns {Promise<Array<RecipeIngredient & { itemName: string; categoryId: string; isMultiUse: boolean }>>}
 */
export async function enrichIngredients(ingredients) {
  if (ingredients.length === 0) return [];

  const itemIds = [...new Set(ingredients.map((i) => i.itemId))];
  const items = await db.items.where('id').anyOf(itemIds).toArray();
  const itemMap = new Map(items.map((i) => [i.id, i]));

  return ingredients.map((ing) => {
    const item = itemMap.get(ing.itemId);
    return {
      ...ing,
      itemName: item?.name || 'Unknown Item',
      categoryId: item?.categoryId || 'uncategorized',
      isMultiUse: item?.isMultiUse ?? false,
    };
  });
}

/**
 * Seed 3 example recipes that use only items from the seed items_library.
 * Business Logic: Runs once on first app start after items are seeded.
 * Resolves item and recipe category UUIDs dynamically so the recipes always
 * reference the correct IDs regardless of seeding order.
 * @returns {Promise<void>}
 */
export async function seedRecipes() {
  /**
   * Look up an item by name (case-insensitive) and return its ID.
   * @param {string} name - The item name to find.
   * @returns {Promise<string | null>} The item UUID or null if not found.
   */
  async function resolveItemId(name) {
    const item = await db.items
      .filter((/** @type {Item} */ i) => i.name.toLowerCase() === name.toLowerCase())
      .first();
    return item ? item.id : null;
  }

  /**
   * Look up a recipe category by name (case-insensitive) and return its ID.
   * @param {string} name - The recipe category name to find.
   * @returns {Promise<string | null>} The recipe category UUID or null if not found.
   */
  async function resolveRecipeCategoryId(name) {
    const cat = await db.recipeCategories
      .filter((/** @type {import('../db.js').RecipeCategory} */ c) => c.name.toLowerCase() === name.toLowerCase())
      .first();
    return cat ? cat.id : null;
  }
  const count = await db.recipes.count();
  if (count > 0) return;

  const workspaceId = 'default';
  const timestamp = now();

  // Resolve all item IDs by name from the seeded items_library
  const groundBeef = await resolveItemId('Ground Beef');
  const cannedTomatoes = await resolveItemId('Canned Tomatoes');
  const onion = await resolveItemId('Onion');
  const garlic = await resolveItemId('Garlic');
  const pasta = await resolveItemId('Pasta');
  const oliveOil = await resolveItemId('Olive Oil');
  const salt = await resolveItemId('Salt');
  const blackPepper = await resolveItemId('Black Pepper');
  const chickenBreast = await resolveItemId('Chicken Breast');
  const lettuce = await resolveItemId('Lettuce');
  const tomato = await resolveItemId('Tomato');
  const salmonFillet = await resolveItemId('Salmon Fillet');
  const rice = await resolveItemId('Rice');
  const frozenPeas = await resolveItemId('Frozen Peas');
  const butter = await resolveItemId('Butter');

  // Resolve recipe category IDs by name (from the recipeCategories table)
  const catPasta = await resolveRecipeCategoryId('Pasta');
  const catSalad = await resolveRecipeCategoryId('Salad');
  const catGrill = await resolveRecipeCategoryId('Grill');

  // Helper to build an ingredient item reference
  /**
   * @param {string | null} itemId - Resolved item UUID.
   * @param {number} quantity - Amount per serving base.
   * @param {string} unit - Unit string.
   * @returns {{ itemId: string; quantity: number; unitId: string }}
   */
  const ing = (itemId, quantity, unit) => ({
    itemId: itemId || 'missing',
    quantity,
    unitId: unit,
  });

  /** @type {Array<{ title: string; recipeCategoryId: string | null; prepTime: number; servingsBase: number; instructionsUrl: string; notes: string; isFavourite: boolean; ingredients: ReturnType<typeof ing>[] }>} */
  const recipeData = [
    {
      title: 'Pasta Bolognese',
      recipeCategoryId: catPasta,
      prepTime: 35,
      servingsBase: 4,
      instructionsUrl: 'https://www.bbcgoodfood.com/recipes/best-spaghetti-bolognese',
      notes: 'A rich, hearty Italian classic. Serve with freshly grated Parmesan.',
      isFavourite: true,
      ingredients: [
        ing(groundBeef, 500, 'grams'),
        ing(cannedTomatoes, 2, 'pcs'),
        ing(onion, 1, 'kg'),
        ing(garlic, 3, 'pcs'),
        ing(pasta, 400, 'grams'),
        ing(oliveOil, 2, 'Litres'),
        ing(salt, 1, 'pcs'),
        ing(blackPepper, 1, 'pcs'),
      ],
    },
    {
      title: 'Grilled Chicken Salad',
      recipeCategoryId: catSalad,
      prepTime: 20,
      servingsBase: 2,
      instructionsUrl: 'https://www.bbcgoodfood.com/recipes/grilled-chicken-salad',
      notes: 'Light and fresh — perfect for a quick lunch. Add croutons for extra crunch.',
      isFavourite: false,
      ingredients: [
        ing(chickenBreast, 300, 'grams'),
        ing(lettuce, 1, 'pcs'),
        ing(tomato, 3, 'pcs'),
        ing(oliveOil, 2, 'Litres'),
        ing(salt, 1, 'pcs'),
        ing(blackPepper, 1, 'pcs'),
      ],
    },
    {
      title: 'Salmon with Rice & Peas',
      recipeCategoryId: catGrill,
      prepTime: 25,
      servingsBase: 2,
      instructionsUrl: 'https://www.bbcgoodfood.com/recipes/salmon-rice-peas',
      notes: 'A one-pan wonder. Flake the salmon and stir through the rice before serving.',
      isFavourite: true,
      ingredients: [
        ing(salmonFillet, 400, 'grams'),
        ing(rice, 300, 'grams'),
        ing(frozenPeas, 150, 'grams'),
        ing(butter, 1, 'pcs'),
        ing(salt, 1, 'pcs'),
        ing(blackPepper, 1, 'pcs'),
      ],
    },
  ];

  await db.transaction('rw', db.recipes, db.recipeIngredients, async () => {
    for (const r of recipeData) {
      const recipeId = crypto.randomUUID();

      const recipe = {
        id: recipeId,
        workspaceId,
        title: r.title,
        recipeCategoryId: r.recipeCategoryId || 'uncategorized',
        prepTime: r.prepTime,
        servingsBase: r.servingsBase,
        instructionsUrl: r.instructionsUrl,
        notes: r.notes,
        updatedAt: timestamp,
        isSynced: 0,
      };

      // Add isFavourite as a dynamic field
      if (r.isFavourite !== undefined) {
        /** @type {any} */ (recipe).isFavourite = r.isFavourite;
      }

      await db.recipes.add(recipe);

      if (r.ingredients.length > 0) {
        const ingredients = r.ingredients.map((ingData) => ({
          id: crypto.randomUUID(),
          workspaceId,
          recipeId,
          itemId: ingData.itemId,
          quantity: ingData.quantity,
          unitId: ingData.unitId,
          updatedAt: timestamp,
          isSynced: 0,
        }));
        await db.recipeIngredients.bulkAdd(ingredients);
      }
    }
  });

  console.log(`Seeded ${recipeData.length} example recipes`);
}
