// @ts-check
/**
 * English translations for List&GO.
 * Business Logic: All user-facing text in one place so a second language
 * can be added by copying this file and translating the values.
 * @module
 */

/** @type {{ [key: string]: any }} */
const STRINGS_EN = {
  // App shell / navigation
  app: {
    title: "List&GO – Grocery & Meal Planner",
    description: "A local‑first, offline‑first PWA for managing grocery lists and meal planning.",
  },
  nav: {
    lists: "Lists",
    plan: "Plan",
    recipes: "Recipes",
    items: "Items",
  },

  // Grocery List
  grocery: {
    pageTitle: "Grocery List",
    emptyState: "Your grocery list is empty. Add items or plan meals to get started.",
    completed: "COMPLETED",
    everyWeek: "EVERY WEEK",
    clearAll: "CLEAR ALL",
    searchPlaceholder: "Add milk, eggs, bread...",
    essentialsHeading: "Weekly Essentials",
    essentialsSubtitle: "Quickly add items you buy every week.",
    essentialsEmpty: "No essential items yet. Add some in Items Library.",
    cancel: "Cancel",
    addSelected: "Add Selected",
    addedToGroceryList: "Added {name} to Grocery List",
    removed: "Removed {name}",
    restored: "Restored {name}",
    clearAllHeading: "Clear entire list?",
    clearAllMessage: "This will remove all items (checked and unchecked) from your list. This cannot be undone.",
    clearAllConfirm: "Clear List",
    clearAllCancel: "Keep List",
    deleteItemAria: "Delete item",
  },

  // Settings
  settings: {
    title: "Settings",
    tabs: { account: "ACCOUNT", store: "STORE", recipe: "RECIPE", items: "ITEMS" },
    account: {
      heading: "Account Management",
      update: "UPDATE",
      delete: "DELETE",
      familyHeading: "Family & Household",
      invite: "INVITE MEMBER",
      admin: "Administrator",
      member: "Member",
      moreOptions: "More options",
      resetHeading: "Reset",
      resetDescription: "Reset all data to factory defaults",
      resetBtn: "RESET TO DEFAULTS",
      language: "Language",
    },
    store: {
      heading: "Store Layout",
      categoryOrder: "Category Order",
      moveUp: "Move {name} up",
      moveDown: "Move {name} down",
      dragToReorder: "Drag to reorder",
    },
    recipe: {
      heading: "Recipe Defaults",
      defaultPersons: "Default number of persons",
      categoriesHeading: "Recipe Categories",
      addPlaceholder: "Add Recipe Category",
      addAria: "Add recipe category",
      renamePrompt: "Rename category:",
      deleteConfirm: "Delete this recipe category?",
    },
    items: {
      categoriesHeading: "Item Categories",
      colorPickerAria: "Change color for {name}",
      deleteAria: "Delete category",
      deleteRecipeAria: "Delete recipe category",
      addPlaceholder: "Add Category",
      addAria: "Add category",
    },
    resetConfirm: "Reset all data to factory defaults? This cannot be undone.",
    resetSnackbar: "Data reset to defaults",
    saveAll: "Save All Changes",
    close: "Close settings",
  },

  // Recipe Detail
  recipeDetail: {
    title: "Recipe Details",
    edit: "Edit",
    category: "Category",
    prepTime: "Prep Time",
    serves: "Serves",
    source: "Source",
    ingredients: "Ingredients",
    items: "{count} Items",
    persons: "{count} persons",
    notFound: "Recipe not found.",
    loadError: "Failed to load recipe details.",
  },

  // Recipe Editor
  recipeEditor: {
    addTitle: "Add Recipe",
    editTitle: "Edit Recipe",
    save: "Save",
    delete: "Delete",
    form: {
      name: "Recipe Name",
      namePlaceholder: "Recipe name",
      description: "Description",
      descriptionPlaceholder: "Brief description...",
      category: "Category",
      categorySelect: "Select…",
      prepTime: "Prep Time (min)",
      serves: "Serves",
      sourceUrl: "Source URL",
      sourcePlaceholder: "https://...",
      ingredients: "Ingredients",
      addIngredientPlaceholder: "Add ingredient...",
      removeAria: "Remove ingredient",
      items: "{count} Items",
    },
  },

  // Meal Planner
  mealPlan: {
    pageTitle: "Meal Plan",
    clearAll: "CLEAR ALL",
    cookedDivider: "Cooked",
    recipeDeleted: "Recipe deleted",
    emptyState: "No meals planned yet. Add recipes from the Recipes tab.",
    loadError: "Could not load meal plans. Please try again.",
    clearAllHeading: "Clear entire meal plan?",
    clearAllMessage: "This will remove all planned meals and their ingredients from the grocery list. This cannot be undone.",
    clearAllConfirm: "Clear Plan",
    clearAllCancel: "Keep Plan",
    clearSnackbar: "Meal plan cleared",
    addToGrocery: "Add to grocery list",
    removeFromGrocery: "Removed {name} from Grocery List",
    addedToGrocery: "Added {name} to Grocery List",
    removedFromPlan: "Removed {name} from Plan",
    restoredToPlan: "Restored {name}",
    servingsUpdate: "{name} → {count} persons",
    ingredientModal: {
      heading: "Add {name}",
      subtitle: "Select ingredients to add to your grocery list.",
      singleUse: "Ingredients (single-use)",
      multiUse: "Ingredients (multi-use)",
      cancel: "Cancel",
      addSelected: "Add Selected",
    },
    markCooked: "Mark as cooked",
    unmarkCooked: "Unmark as cooked",
    toggleGrocery: "Toggle grocery list",
    deleteAria: "Delete meal plan",
  },

  // Items Library
  itemsLibrary: {
    pageTitle: "Item list",
    searchPlaceholder: "Search ingredients or categories...",
    essentials: "ESSENTIALS",
    emptyState: "No items yet. Tap \"+ New\" to add your first item.",
    loadError: "Could not load items. Is the database ready?",
    noMatch: "No items match your search or filter.",
    addedToGroceryList: "Added {name} to Grocery List",
    multiUse: "Multi-use",
    addToList: "Add {name} to list",
    toast: "Added to Grocery List",
  },

  // Item Editor
  itemEditor: {
    addTitle: "New Item",
    editTitle: "Edit Item",
    save: "Save Changes",
    cancel: "Cancel",
    delete: "DELETE ITEM",
    duplicate: "Duplicate Item",
    toggleEssentialAria: "Toggle essential",
    decreaseQtyAria: "Decrease quantity",
    increaseQtyAria: "Increase quantity",
    form: {
      name: "Item Name",
      namePlaceholder: "e.g. Whole Milk",
      category: "Category",
      categorySelect: "Select…",
      unit: "Unit",
      unitPlaceholder: "grams, pcs, ml…",
      otherUnit: "Other…",
      defaultQty: "Default Quantity",
      isEssential: "Weekly Essential",
      isEssentialHelp: "Auto-add to new lists",
      isMultiUse: "Multi-use",
      isMultiUseHelp: "Lasts beyond one meal",
    },
    saved: "{name} saved",
  },

  // Confirm Dialog
  confirmDialog: {
    defaultConfirm: "Confirm",
    defaultCancel: "Cancel",
  },

  // Content Dialog
  contentDialog: {
    closeAria: "Close",
  },

  // Snackbar
  snackbar: {
    undo: "Undo",
  },

  // Top Bar
  topBar: {
    settingsAria: "Open settings",
  },

  // Router / page titles
  pageTitles: {
    lists: "Grocery List",
    plan: "Meal Plan",
    recipes: "Recipes",
    items: "Item List",
    settings: "Settings",
  },

  // General / shared
  general: {
    new: "+ New",
    close: "Close",
  },

  // Color names for category color picker in settings
  colorNames: {
    "#2D6A4F": "Deep Forest Green",
    "#4895EF": "Soft Cerulean Blue",
    "#D4A373": "Warm Toasted Beige",
    "#BC4749": "Muted Crimson Red",
    "#7F5539": "Earthy Cinnamon Brown",
    "#4CC9F0": "Bright Sky Blue",
    "#F72585": "Vibrant Berry Pink",
    "#FB8B24": "Zesty Sunset Orange",
    "#7209B7": "Deep Royal Purple",
    "#B5179E": "Rich Plum Magenta",
    "#3F37C9": "Bold Indigo Blue",
    "#48BFE3": "Gentle Aquamarine",
    "#8338EC": "Bright Lavender Purple",
    "#FFBE0B": "Golden Amber Yellow",
  },
};

export default STRINGS_EN;