# List&GO — App Feature Overview

> **Purpose:** This document describes all functionality of the List&GO PWA, organized by screen. Each feature is described in a few lines (user story format: "As a user, I can…"). Use this as a release-notes-style reference for what the app does and what to verify during regression testing.

---

## Grocery List (`#/lists`)

The main shopping list screen, displayed on app launch. Shows the active grocery list grouped by category.

### F1. View active grocery list
**As a user**, I can see my current grocery list with items grouped by category in expandable sections. Unchecked items appear first (sorted by store layout category order), checked items move to a "COMPLETED" section at the bottom.  
*Implementation: `grocery-list.js` → `_render()`, `grocery.store.js` → `getGroceryItems()`*

### F2. Add item via search autocomplete
**As a user**, I can type in the search bar at the top, see matching items from the library in a dropdown, and tap one to add it to the list. The item is added with its default quantity. A snackbar confirms "Added [item] to Grocery List".  
*Implementation: `grocery-list.js` → `_setupSearchAutocomplete()`, `search-autocomplete.js`*

### F3. Create new item on the fly from search
**As a user**, when I search for an item that doesn't exist, I can tap "Create new item [query]" in the dropdown. This opens the item editor side drawer with the name pre-filled. After saving, the new item is automatically added to the grocery list.  
*Implementation: `grocery-list.js` → `_handleCreateAndAdd()`, `item-editor.js`*

### F4. Check/uncheck items (in-cart toggle)
**As a user**, I can tap the circular checkbox on any item row to mark it as "in cart". Checked items get greyed out and move to the bottom COMPLETED section. Un-checking restores them to their category. Items remain visible for reference.  
*Implementation: `grocery-row.js` → `_handleCheck()`, `grocery.store.js` → `toggleChecked()`*

### F5. Long-press enters edit mode
**As a user**, I can long-press (500ms) any item row to enter edit mode. The background gets a semi-transparent overlay, each row's checkbox is replaced by a quantity stepper and a delete button. Tapping the overlay exits edit mode.  
*Implementation: `grocery-list.js` → `_enterEditMode()` / `_exitEditMode()`, `grocery-row.js` → `_onRowPointerDown()`*

### F6. Adjust item quantity in edit mode
**As a user**, in edit mode I can use the `+`/`-` stepper on any row to change its quantity. The change is immediately saved to the database and reflected in the row's qty label.  
*Implementation: `grocery-row.js` → `_handleStepperChange()`, `grocery.store.js` → `updateQty()`*

### F7. Delete item in edit mode
**As a user**, in edit mode I can tap the trash icon on any row to delete it. The item is removed from Dexie, and a snackbar appears with "Removed [item]" and an Undo button (6s timeout). Tapping Undo re-adds the item to the list.  
*Implementation: `grocery-row.js` → `_handleDelete()`, `grocery-list.js` → `_handleItemDelete()`, `app-snackbar.js`*

### F8. Essentials quick-add ("EVERY WEEK")
**As a user**, I can tap the "EVERY WEEK" pill button above the list to open a bottom sheet showing all items flagged as essential. Each item is pre-checked. I can adjust selections and tap "Add Selected" to add them all to the list at once, each with its default quantity.  
*Implementation: `grocery-list.js` → `_openEssentialsSheet()`, `items.store.js` → `getEssentialItems()`*

### F9. Clear entire list ("CLEAR ALL")
**As a user**, I can tap the "CLEAR ALL" pill button to remove every item (checked and unchecked) from the list. A confirmation dialog appears: "Clear entire list?" with "Keep List" / "Clear List" options.  
*Implementation: `grocery-list.js` → `_handleClearAll()`, `confirm-dialog.js`*

### F10. Manually add essential items via "Add to List" in Items Library
**As a user** (on the Items screen), I can tap the "Add to List" button on any item row to add it directly to the active grocery list. A snackbar confirms the action.  
*Implementation: `items-library.js` → `#addItemToList()`, `grocery.store.js` → `addGroceryItem()`*

### F11. Reactive list updates (liveQuery)
**As a user**, any change I make (check, delete, add) is reflected immediately in the UI without a manual refresh. The component subscribes to Dexie's liveQuery for reactive re-rendering.  
*Implementation: `grocery-list.js` → `_startReactiveRender()` using `Dexie.liveQuery()`*

### F12. Items from recipes show a "Recipe" badge
**As a user**, when an item was added to the list via a recipe (its `sourceRecipeIds` is non-empty), the row shows a small "Recipe" badge with a recipe icon next to the quantity.  
*Implementation: `grocery-row.js` → `_render()`, checking `sourceRecipeIds` JSON array*

---

## Meal Plan (`#/plan`)

Flat queue of planned recipes displayed as interactive recipe cards.

### F13. View all planned meals as cards
**As a user**, I can see all meals I've planned displayed as recipe cards. Each card shows: category badge, prep time, number of persons, recipe title, and description. Uncooked meals appear first; cooked meals are greyed out and moved below a "Cooked" divider.  
*Implementation: `meal-planner.js` → `_render()`, `_renderCard()`, `mealplan.store.js` → `getMealPlansWithRecipes()`*

### F14. Add recipe to plan (from Recipes tab)
**As a user**, I can tap the "Add to Plan" button on any recipe card in the Recipes tab. The recipe is immediately added to the meal plan and a snackbar confirms "Added [recipe] to Meal Plan".  
*Implementation: `app.js` → `add-recipe-to-plan` listener, `mealplan.store.js` → `addMealPlan()`*

### F15. Toggle ingredients on/off grocery list
**As a user**, on a meal plan card I can tap the cart button to toggle whether that recipe's ingredients are added to the grocery list. When active, the cart button fills with the primary color. Tapping again removes them.  
*Implementation: `meal-planner.js` → `_handleAddToGroceryList()`, `_addedToGrocery` Set*

### F16. Mark recipe as cooked
**As a user**, I can tap the check button on any meal plan card to mark a recipe as cooked. Cooked cards are greyed out (50% opacity, grayscale) and move below the "Cooked" divider. Tapping again unchecks and restores them to the uncooked section.  
*Implementation: `meal-planner.js` → `_toggleCooked()`, `mealplan.store.js` → `toggleMealPlanCooked()`*

### F17. Clear entire meal plan ("CLEAR ALL")
**As a user**, I can tap the "CLEAR ALL" pill button in the plan header to remove all planned meals. A confirmation dialog appears: "Clear entire meal plan?" with "Keep Plan" / "Clear Plan" options.  
*Implementation: `meal-planner.js` → `_handleClearAll()`, `confirm-dialog.js`*

### F18. Long-press enters edit mode (uncooked cards only)
**As a user**, I can long-press (500ms) any uncooked meal plan card to enter edit mode. All uncooked cards switch to a compact edit view showing only the recipe title, a persons icon + servings quantity stepper, and a delete button. Cooked cards remain greyed out and are blurred. A semi-transparent overlay covers the header and divider areas; tapping the overlay exits edit mode.  
*Implementation: `meal-planner.js` → `_enterEditMode()` / `_exitEditMode()`, `_onCardPointerDown()`, `_renderEditCard()`*

### F19. Adjust servings in edit mode
**As a user**, in edit mode I can use the `+`/`-` stepper on any card to change its servings target. The change is immediately saved to Dexie and a snackbar confirms "[Recipe] → [N] persons".  
*Implementation: `meal-planner.js` → `_handleServingsChange()`, `db.js` → direct `mealPlans.update()`*

### F20. Delete meal plan entry in edit mode
**As a user**, in edit mode I can tap the trash icon on any card to delete that meal plan entry. The card is removed from Dexie, edit mode exits, and a snackbar appears with "Removed [Recipe] from Plan" and an Undo button (6s timeout). Tapping Undo re-adds the meal plan via `addMealPlan()` with the original recipe ID and servings target.  
*Implementation: `meal-planner.js` → `_handleDelete()`, `mealplan.store.js` → `removeMealPlan()`, `app-snackbar.js`*

---

## Recipes (`#/recipes`)

Recipe library with search, filter chips, and card-based list.

### F21. View all recipes as cards
**As a user**, I can see all my recipes displayed as cards showing: recipe category badge, prep time, favourite badge (if starred), title, description/notes (truncated to 80 chars), and ingredient count.  
*Implementation: `recipe-library.js` → `_renderCards()`, `recipes.store.js` → `getAllRecipes()`*

### F22. Search recipes by title or category
**As a user**, I can type in the search bar to filter recipes by title or category (debounced 200ms). Empty state shows "No recipes matching [query]".  
*Implementation: `recipe-library.js` → `_onSearchInput()`, `recipes.store.js` → `searchRecipes()`*

### F23. Filter recipes by chip
**As a user**, I can tap filter chips to narrow the list:
- **All** — shows all recipes
- **Favourites** — shows only starred/favourite recipes
- **30 min** — shows recipes with prep time ≤ 30 minutes
- **Recent** — shows the 20 most recently updated recipes  
*Implementation: `recipe-library.js` → `_setActiveFilter()`, `recipes.store.js` → `getFavouriteRecipes()`, `getRecipesUnderTime()`, `getRecentRecipes()`*

### F24. Add new recipe ("+ New" or FAB)
**As a user**, I can tap the "+ New" button in the header or the floating action button to open the recipe editor in add mode.  
*Implementation: `recipe-library.js` → `_openEditor('add')`, `recipe-editor.js`*

### F25. View recipe detail (tap card)
**As a user**, I can tap any recipe card to open a right-side drawer showing full recipe details: title, description, category, prep time, servings, source link (with hostname), ingredient list with scaled quantities.  
*Implementation: `recipe-library.js` → `_openDetail()`, `recipe-detail.js`*

### F26. Add recipe to meal plan (card button)
**As a user**, I can tap the calendar icon button on any recipe card to trigger an "add to plan" action. The button shows a brief check animation (2s), then dispatches an `add-recipe-to-plan` event.  
*Implementation: `recipe-library.js` → `_handleAddToPlan()`*

### F27. Edit recipe (from detail drawer)
**As a user**, viewing a recipe detail, I can tap the "Edit" button in the drawer header to open the recipe editor in edit mode with all fields pre-filled.  
*Implementation: `recipe-detail.js` → `open()` edit button wiring, `recipe-editor.js` → `_loadAndOpen()`*

### F28. Create/edit recipe form
**As a user**, in the recipe editor I can fill in: recipe name (required), description, category (dropdown from recipe categories), prep time (minutes), servings, source URL, and a dynamic list of ingredients. Each ingredient row shows name, quantity (editable), unit, and a delete button.  
*Implementation: `recipe-editor.js` → `_renderForm()`, `_populateCategories()`*

### F29. Add ingredients to recipe via search autocomplete
**As a user**, while editing a recipe, I can search for ingredients in the permanent search bar below the ingredients header. Selecting an existing item adds it as a new ingredient row.  
*Implementation: `recipe-editor.js` → `_setupIngredientSearch()`, `search-autocomplete.js`*

### F30. Create new ingredient on the fly from recipe editor
**As a user**, while editing a recipe, if I search for an ingredient that doesn't exist, I can tap "Create new item [query]" to open the item editor. After saving, the new item is automatically added as a recipe ingredient.  
*Implementation: `recipe-editor.js` → `_openItemEditorForCreate()`, `_addSavedItemAsIngredient()`*

### F31. Delete recipe
**As a user**, when editing a recipe, I can tap the "Delete" button in the drawer header to delete the recipe and all its ingredients from the database. The drawer closes and the recipe list refreshes.  
*Implementation: `recipe-editor.js` → `_handleDelete()`, `recipes.store.js` → `deleteRecipe()`*

### F32. Duplicate item (in item editor, not recipe editor)
**As a user**, when editing an item in the Items Library, I can tap "Duplicate Item" to create a copy with the same properties.  
*Implementation: `item-editor.js` → `#handleDuplicate()`*

---

## Items Library (`#/items`)

Master catalogue of all ingredients/products with search, essential filter, and direct add-to-list.

### F33. View all items grouped by category
**As a user**, I can see the complete item catalogue grouped by category in expandable sections. Items are sorted by store layout order (categories) then alphabetically. Each row shows: item name, default quantity + unit, multi-use badge with refresh icon, and a decorative star for essential items. A category color accent border is shown on each row.  
*Implementation: `items-library.js` → `#renderItems()`, `items.store.js` → `getAllItems()`*

### F34. Search items by name or category
**As a user**, I can type in the search bar to filter items by name or by category name. Matches update in real-time as I type.  
*Implementation: `items-library.js` → `#wireListeners()`, `#applyFilters()`*

### F35. Filter essentials only
**As a user**, I can tap the "ESSENTIALS" pill button to toggle visibility of essential items only. The pill shows filled/outlined state to indicate active/inactive.  
*Implementation: `items-library.js` → `#wireListeners()` essentials toggle, `#applyFilters()`*

### F36. Add item to grocery list directly
**As a user**, I can tap the cart icon button on any item row to add it directly to the active grocery list with its default quantity and unit. A snackbar confirms "Added [item] to Grocery List".  
*Implementation: `items-library.js` → `#addItemToList()`, `grocery.store.js` → `addGroceryItem()`*

### F37. Edit item (tap row)
**As a user**, I can tap any item row to open the item editor side drawer in edit mode, pre-filled with the item's current data.  
*Implementation: `items-library.js` → `#openItemEditor()`, `item-editor.js`*

### F38. Create new item (FAB)
**As a user**, I can tap the floating action button (+) to open the item editor in add mode with empty fields.  
*Implementation: `items-library.js` → `#openItemEditor()`, `item-editor.js`*

### F39. Item editor form fields
**As a user**, when adding/editing an item I can set: name, category (dropdown from categories), unit (dropdown of common units + "Other…" custom text input), default quantity (stepper with +/- buttons), multi-use toggle (switch), and weekly essential toggle (star button).  
*Implementation: `item-editor.js` → `renderForm()`, `#populateDropdowns()`, `#wireStepper()`, `#wireEssentialToggle()`*

### F40. Delete item
**As a user**, when editing an item, I can tap "DELETE ITEM" in the drawer header. The item is removed from the database and the items library re-renders.  
*Implementation: `item-editor.js` → `#handleDelete()`, `items.store.js` → `deleteItem()`*

### F41. Continuous search with "Create new item" prompt
**As a user**, when searching in either the grocery list or recipe editor, the search dropdown always shows "Create new item [query]" as the first option, allowing me to add items not yet in the library.  
*Implementation: `search-autocomplete.js` → `_buildCreateItemHtml()`, `_performSearch()`*

---

## Settings (Right-side Drawer)

Opened by tapping the gear icon in the top bar. A slide-in drawer with 4 tabbed sections.

### F42. Open settings drawer
**As a user**, I can tap the gear icon in the top bar to open the settings drawer sliding in from the right. Tapping the backdrop or the back arrow closes it. Swiping right >100px when at the drawer's left edge also closes it.  
*Implementation: `settings-panel.js` → `open()`/`close()`, `#handleTouchEnd()`, `top-bar.js` → settings button fires `open-settings` event*

### F43. Account tab (static mockup)
**As a user**, I can view the Account tab with: a profile card showing name and email, Update/Delete buttons, a Family & Household section with member rows (Mark Jenkins - Administrator, Olivia Jenkins - Member) each with a more-options menu, an "INVITE MEMBER" button, and a "RESET TO DEFAULTS" button at the bottom.  
*Implementation: `settings-panel.js` → Account tabpanel HTML (static mockup data)*

### F44. Reset all data to factory defaults
**As a user**, I can tap "RESET TO DEFAULTS" in the Account tab. After a browser confirm dialog, all Dexie tables are cleared and re-seeded with default categories, recipe categories, and items. A snackbar confirms "Data reset to defaults".  
*Implementation: `settings-panel.js` → `#handleResetDefaults()`*

### F45. Store Layout tab — reorder categories
**As a user**, I can go to the Store tab to see all grocery categories listed in their current order. I can reorder them by: (a) dragging rows by the drag handle (HTML5 drag-and-drop), or (b) tapping the up/down arrow buttons. The new order is saved when I tap "Save All Changes".  
*Implementation: `settings-panel.js` → `#populateStoreList()`, `#saveStoreLayout()`, `categories.store.js` → `updateCategoryOrder()`*

### F46. Recipe tab — default servings
**As a user**, in the Recipe tab I can use a quantity stepper to set the default number of persons for recipes.  
*Implementation: `settings-panel.js` → Recipe tab, `<quantity-stepper>` with default value 2*

### F47. Recipe tab — manage recipe categories
**As a user**, in the Recipe tab I can: view all recipe categories in a list, add new categories via text input + button, rename categories by clicking the name (inline input), and delete categories (with confirm dialog).  
*Implementation: `settings-panel.js` → `#populateRecipeCategoriesList()`, `#wireRecipeTabInteractions()`, `recipe-categories.store.js`*

### F48. Items tab — manage item categories
**As a user**, in the Items tab I can: view all item categories with their color dots, add new categories (random color assigned), rename categories inline by clicking the name, change category color via a 14-color picker popup, and delete categories.  
*Implementation: `settings-panel.js` → `#populateCategoriesList()`, `#wireItemsTabInteractions()`, `#wireCategoryInteractions()`, `categories.store.js`*

### F49. Save All Changes button
**As a user**, after modifying the store layout, I can tap "Save All Changes" in the footer. This persists the category order to Dexie, dispatches a `categories-changed` event so all components refresh, and closes the drawer.  
*Implementation: `settings-panel.js` → `#saveStoreLayout()`, drawer save button*

---

## Top Bar (Global)

### F50. App title display
**As a user**, I see the "List&GO" title in the top bar on all screens.  
*Implementation: `top-bar.js`*

### F51. Open settings from top bar
**As a user**, I can tap the gear icon in the top bar to open the settings drawer.  
*Implementation: `top-bar.js` → settings button fires `open-settings` event, `settings-panel.js` listens*

### F52. Notification bell (visual placeholder)
**As a user**, I can see a notification bell icon with a red dot in the top bar. (No functional behavior implemented yet.)  
*Implementation: `top-bar.js` — button exists without event handler*

---

## Bottom Navigation

### F53. Four-tab bottom navigation
**As a user**, I can switch between Grocery Lists, Meal Plan, Recipes, and Items using the sticky bottom nav bar. The active tab gets `aria-current="page"` for accessibility.  
*Implementation: `index.html` nav, `router.js` → `updateActiveNav()`*

### F54. View Transitions API for tab switches
**As a user**, when switching tabs, the content animates smoothly using the View Transitions API (fallback to instant swap if unsupported).  
*Implementation: `router.js` → `navigate()`, `document.startViewTransition()`*

### F55. Component caching preserves state
**As a user**, when I switch away from a tab and back, the component retains its state (e.g., search query, scroll position, loaded data). Components are created once and reused.  
*Implementation: `router.js` → `componentCache`, `resolveComponent()`*

---

## Cross-Cutting / Infrastructure

### F56. Offline-first with Dexie (IndexedDB)
**As a user**, all data is stored locally in the browser's IndexedDB via Dexie.js. The app works fully offline for viewing and editing the grocery list.  
*Implementation: `db.js` → `ListAndGoDB` with 11 tables, all store modules write to Dexie*

### F57. Service Worker for offline support
**As a user**, the app registers a service worker (`sw.js`) on load, enabling offline-first caching and potential Background Sync for future multi-user sync.  
*Implementation: `app.js` → `registerServiceWorker()`, `sw.js`*

### F58. Seed data on first run
**As a user**, the first time I open the app, it automatically populates: 13 default item categories (with colors), 12 default recipe categories, 5 default units (grams, ml, pcs, kg, Litres), 25+ default grocery items across categories, and 3 example recipes (Pasta Bolognese, Grilled Chicken Salad, Salmon with Rice & Peas) with full ingredient lists.  
*Implementation: `app.js` → `initDatabase()`, `categories.store.js` → `seedCategories()`, `recipe-categories.store.js` → `seedRecipeCategories()`, `items.store.js` → `seedItems()`, `recipes.store.js` → `seedRecipes()`*

### F59. Active grocery list auto-creation
**As a user**, the app always has an active grocery list. If none exists, a default "Weekly Shop" list is created on first access.  
*Implementation: `grocery.store.js` → `getOrCreateActiveList()`*

### F60. Snackbar notification system
**As a user**, I see snackbar notifications for: adding items, removing items (with Undo), restoring items, and data reset. Snackbars auto-dismiss (4s for added, 6s for removed) and support queuing.  
*Implementation: `app-snackbar.js` (global component instantiated in index.html)*

### F61. Category color accent system
**As a user**, I see a colored left border on every item row matching its category color (both in grocery list and items library). Categories have 14 predefined colors managed in settings.  
*Implementation: `categories.store.js` → `categoryCache`, `grocery-row.js` → `getCategoryColor()`, CSS `--accent-color` variable*

### F62. Category name/color lookup cache
**As a user**, category names and colors are loaded into an in-memory cache on app start so rendering is synchronous (no async database lookups during View Transitions).  
*Implementation: `categories.store.js` → `refreshCategoryCache()`, `categoryCache`*

### F63. Escape HTML to prevent XSS
**As a user**, all user-generated content displayed in the UI is HTML-escaped to prevent cross-site scripting attacks.  
*Implementation: `dom-utils.js` → `escapeHtml()`, used consistently in all components*

### F64. Input sanitization for quantities
**As a user**, quantities are formatted consistently using `formatQty()` which handles decimal rounding and unit suffix display.  
*Implementation: `dom-utils.js` → `formatQty()`

---

## Known Gaps / Not Yet Implemented

- **Smart Merge (Recipe → Grocery List):** The ARCHITECTURE.md §6 describes the core algorithm for adding recipe ingredients to the grocery list when a recipe is added to the meal plan. The `add-recipe-to-plan` event is dispatched from `recipe-library.js` but no listener processes it yet.
- **PocketBase sync:** The architecture defines `sync.js` and `pocketbase.js` for family sync, but these modules are not yet created. All data is currently local-only (isSynced is always set to 0).
- **Multi-list support:** The `groceryLists` table supports multiple lists and archiving, but the UI only shows the active list. No list switcher or archive viewer exists.
- **Store layout assignment:** The store layout category order exists as a setting but is not user-facing beyond the Settings → Store tab reorder UI.
- **Notification bell:** The bell icon in the top bar has no functional behavior.
- **Account/Family settings:** The Account tab displays mockup data. No real authentication, family invite, or profile management exists.
- **Serving adjustment in recipe detail:** The `_updateScaledQuantities()` method is intentionally deprecated (no-op). The detail view shows ingredients at the recipe's base serving size only.