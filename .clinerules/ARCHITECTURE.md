# Architecture & Data Model — List&GO PWA

---

## 1. Technical Stack

| Layer | Technology | Rationale |
|---|---|---|
| **UI / View** | Vanilla HTML5, CSS3 (Nesting, Variables, Container Queries), ES Modules | Zero build step, 50-year browser compatibility |
| **Components** | Native Web Components (Custom Elements + `<template>`) | Encapsulated, reusable, no framework dependency |
| **Local DB** | Dexie.js (IndexedDB wrapper, loaded via ESM CDN import) | Async, transactional offline store |
| **Cloud / Auth** | PocketBase (self-hosted) | Lightweight REST + Realtime WebSocket, family sync |
| **Offline** | Service Worker + Background Sync API | Grocery list works 100% offline in the store |
| **Design Tokens** | Sourced from Stitch MCP (`Grocery List PWA Design` project) and written into `css/variables.css` | Single source of truth for all visual decisions |
| **Font** | Hanken Grotesk (Google Fonts) | Design system requirement; exceptional legibility |

> **Rule:** No frameworks. No build tools. The browser is the runtime. All JS is ESM loaded via `<script type="module">`.

---

## 2. The "Local-First" Data Loop

```
User Interaction
      │
      ▼
 ┌──────────────────────────────────┐
 │  UI Layer (Web Components)       │
 │  Dispatches domain events        │
 └──────────┬───────────────────────┘
            │  calls
            ▼
 ┌──────────────────────────────────┐
 │  Store API  (js/store/*.js)      │  ◄── single source of truth calls
 │  Pure functions, no side effects │
 └──────────┬───────────────────────┘
            │  writes to
            ▼
 ┌──────────────────────────────────┐
 │  Dexie.js  (IndexedDB)           │  ← instant, offline
 │  isSynced: false on every write  │
 └──────────┬───────────────────────┘
            │  observed by
            ▼
 ┌──────────────────────────────────┐
 │  Sync Engine  (js/sync.js)       │
 │  Background Sync API             │
 │  Pushes dirty records to         │
 │  PocketBase when online          │
 └──────────┬───────────────────────┘
            │  PocketBase Realtime SSE
            ▼
 ┌──────────────────────────────────┐
 │  Remote changes from other       │
 │  family members merge back into  │
 │  Dexie → triggers UI re-render   │
 └──────────────────────────────────┘
```

**Key rules of the loop:**
1. **Never wait for the network.** Every user action writes to Dexie first; the UI re-renders immediately.
2. **Conflict resolution:** Last-write-wins based on `updatedAt` timestamp. PocketBase is the authority on conflict resolution when two users edit the same record offline.
3. **Sync flag:** Every table has `isSynced: boolean`. The sync engine queries `where('isSynced').equals(0)` and pushes in batches.

---

## 3. Application Shell & Navigation

The app uses a **single-page shell** (`index.html`) with a sticky bottom navigation bar. Switching between the four main sections uses the **View Transitions API** (`document.startViewTransition()`), producing a native-app slide/fade feel.

### Four Main Sections (Bottom Nav Tabs)
| # | Tab | Icon | Route (hash) |
|---|---|---|---|
| 1 | **Grocery Lists** | Cart | `#/lists` |
| 2 | **Meal Plan** | Calendar | `#/plan` |
| 3 | **Recipes** | Book | `#/recipes` |
| 4 | **Items Library** | Leaf | `#/items` |
| *(Settings)* | *(Profile icon top-right)* | Gear | `#/settings` |

### Routing
- Hash-based SPA routing (`location.hash`), handled by `js/router.js`.
- Each route swaps the `<main>` content using `document.startViewTransition()`.
- The active tab in the bottom nav receives an `aria-current="page"` attribute.

---

## 4. File & Folder Structure

```
ListAndGo/
│
├── index.html                  # App shell: nav, <main>, <dialog> containers
├── manifest.webmanifest        # PWA manifest (name, icons, theme_color)
├── sw.js                       # Service Worker (Cache-First for shell, Network-First for API)
│
├── css/
│   ├── variables.css           # ALL design tokens from Stitch (colors, type, spacing, radii)
│   ├── base.css                # CSS reset, :root, body, typography defaults
│   ├── layout.css              # App shell layout (bottom nav, main area, thumb-zone grid)
│   └── components/
│       ├── grocery-row.css     # The thumb-zone grocery list item
│       ├── bottom-sheet.css    # <dialog> bottom-sheet styles
│       ├── recipe-card.css     # Recipe list card
│       ├── meal-day-slot.css   # Single day slot in meal planner
│       ├── badge.css           # Category badge pills
│       ├── fab.css             # Floating Action Button
│       └── inputs.css          # Form inputs, search, selects
│
├── js/
│   ├── app.js                  # Entry point: initialises router, db, sync, service worker
│   ├── router.js               # Hash-based router + View Transitions API
│   ├── db.js                   # Dexie.js schema definition + upgrade migrations
│   ├── sync.js                 # Background Sync engine (dirty-flag queue → PocketBase)
│   ├── pocketbase.js           # PocketBase SDK wrapper (auth, REST, Realtime subscription)
│   │
│   ├── store/                  # Domain store modules (pure business logic, no DOM)
│   │   ├── grocery.store.js    # CRUD + smart-merge for grocery items
│   │   ├── recipes.store.js    # CRUD for recipes + ingredient management
│   │   ├── mealplan.store.js   # CRUD + scaling + ingredient push to grocery
│   │   ├── items.store.js      # Items Library CRUD + essentials management
│   │   └── settings.store.js   # User/family settings, store layout, units
│   │
│   └── components/             # Native Web Components
│       ├── app-nav.js          # <app-nav> Bottom navigation bar
│       ├── grocery-list.js     # <grocery-list> Renders the active list
│       ├── grocery-row.js      # <grocery-row> Single item row with swipe & toggle
│       ├── add-item-sheet.js   # <add-item-sheet> Bottom sheet for adding items
│       ├── meal-planner.js     # <meal-planner> 7-day week view
│       ├── meal-day.js         # <meal-day> Single day column/row
│       ├── recipe-library.js   # <recipe-library> Search-first recipe list
│       ├── recipe-card.js      # <recipe-card> Card component
│       ├── recipe-editor.js    # <recipe-editor> Add/edit recipe bottom sheet
│       ├── recipe-detail.js    # <recipe-detail> Full recipe view
│       ├── items-library.js    # <items-library> Categorised items list
│       ├── item-editor.js      # <item-editor> Add/edit item drawer
│       ├── ingredient-picker.js# <ingredient-picker> Autocomplete search for ingredients
│       └── settings-panel.js   # <settings-panel> All settings sections
│
├── assets/
│   ├── icons/                  # SVG icons (inline-ready, geometric)
│   │   ├── cart.svg
│   │   ├── calendar.svg
│   │   ├── book.svg
│   │   ├── leaf.svg
│   │   ├── gear.svg
│   │   ├── check.svg
│   │   ├── trash.svg
│   │   └── plus.svg
│   └── icons/                  # PWA icon set (192x192, 512x512, maskable)
│       ├── icon-192.png
│       └── icon-512.png
│
├── docs/                       # Project documentation (not shipped)
│   ├── Design brief.md
│   ├── implme,tation plan.md
│   └── First prompt
│
├── SPECS.md
├── ARCHITECTURE.md             ← this file
└── AGENTS.md
```

---

## 5. Data Model (Dexie.js / IndexedDB)

> **Sync contract:** Every table includes `id` (UUID), `family_id`, `updatedAt` (ISO string), `isSynced` (0 | 1).

### 5.1 `items_library`
Master catalogue of all known ingredients/products. Shared across the family.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | `crypto.randomUUID()` |
| `family_id` | string | FK to family |
| `name` | string | Display name, searchable |
| `category` | string | e.g. "Produce", "Dairy" |
| `default_unit` | string | "grams" \| "ml" \| "pcs" \| custom |
| `default_qty` | number | Default quantity for the item |
| `is_one_time` | boolean | true = single-use (milk); false = multi-use (pepper) |
| `is_essential` | boolean | Appears in Essentials quick-add list |
| `updatedAt` | ISO string | For sync conflict resolution |
| `isSynced` | 0 \| 1 | Dirty flag |

**Indexes:** `[family_id+category]`, `name` (for autocomplete search)

---

### 5.2 `recipes`
User-created recipes with metadata.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `title` | string | |
| `category` | string | e.g. "Pasta", "Salad", "Soup" |
| `prep_time` | number | Minutes |
| `servings_base` | number | Base portion (default 4) |
| `instructions_url` | string | Optional external link |
| `notes` | string | Free-text notes |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `family_id`, `category`, `title` (for search)

---

### 5.3 `recipe_ingredients`
Join table linking a recipe to its required items with quantity.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `recipe_id` | UUID string | FK → `recipes.id` |
| `item_id` | UUID string | FK → `items_library.id` |
| `quantity` | number | Per `servings_base` persons |
| `unit` | string | Can override item default unit |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `recipe_id`, `item_id`

---

### 5.4 `grocery_lists`
A named grocery list. Multiple lists can coexist (e.g. "Weekly Shop", "Quick Top-Up").

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `name` | string | e.g. "Week 23 Shop" |
| `is_active` | boolean | The current shopping list |
| `is_archived` | boolean | Archived past lists |
| `created_at` | ISO string | |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `family_id`, `is_active`

---

### 5.5 `grocery_items`
Line items within a grocery list.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `list_id` | UUID string | FK → `grocery_lists.id` |
| `item_id` | UUID string | FK → `items_library.id` |
| `name` | string | Denormalized for offline display |
| `category` | string | Denormalized for sort-by-store-layout |
| `qty` | number | Aggregated quantity |
| `unit` | string | |
| `is_checked` | boolean | In-cart state |
| `source_recipe_ids` | JSON string | Array of recipe IDs that contributed this item |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `[list_id+category]`, `item_id`

---

### 5.6 `meal_plans`
One record per recipe-slot per day. Multiple recipes can be planned for one day.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `date` | string | YYYY-MM-DD |
| `recipe_id` | UUID string | FK → `recipes.id` |
| `servings_target` | number | Overrides recipe's `servings_base` |
| `is_cooked` | boolean | Marks recipe as done / removed |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `[family_id+date]`, `recipe_id`

---

### 5.7 `store_layouts`
Ordered list of categories matching physical store aisle order.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | |
| `family_id` | string | |
| `name` | string | e.g. "Albert Heijn" |
| `category_order` | JSON string | Ordered array of category names |
| `is_active` | boolean | The currently active store layout |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |

**Indexes:** `family_id`

---

### 5.8 `settings` *(local only, not synced)*
App-level user preferences stored in Dexie but not pushed to PocketBase.

| Field | Type | Notes |
|---|---|---|
| `key` | string | e.g. "default_servings", "active_list_id" |
| `value` | string | JSON-serialised value |

---

## 6. Business Logic: "Smart Merge" (Core Algorithm)

When a recipe is added to the meal plan, the following algorithm runs in `mealplan.store.js`:

```
addRecipeToMealPlan(recipeId, date, servingsTarget):
  1. Load recipe + recipe_ingredients from Dexie
  2. scaleFactor = servingsTarget / recipe.servings_base
  3. For each ingredient in recipe_ingredients:
     a. scaledQty = ingredient.quantity * scaleFactor
     b. Find existing grocery_item in active list with same item_id
     c. IF exists:
          existing.qty += scaledQty
          existing.source_recipe_ids.push(recipeId)
          UPDATE existing record (isSynced = 0)
        ELSE:
          INSERT new grocery_item (isSynced = 0)
  4. Create meal_plan record (isSynced = 0)
  5. Return list of added/updated items for UI confirmation dialog
```

**Ingredient filter dialog:** Before step 3, if `ingredient.is_one_time = false`, it is shown to the user as unselected in a confirmation `<dialog>`. The user can opt-in to add multi-use ingredients.

**Remove recipe from meal plan:**
```
removeRecipeFromMealPlan(mealPlanId):
  1. Load meal_plan record
  2. For each grocery_item where source_recipe_ids contains mealPlanId:
     a. IF item.is_checked = true → skip (already in cart)
     b. ELSE IF source_recipe_ids.length === 1 → DELETE item
     c. ELSE → subtract scaled qty, remove recipeId from source_recipe_ids
  3. DELETE meal_plan record
```

---

## 7. Service Worker Strategy

File: `sw.js`

| Resource Type | Strategy | Rationale |
|---|---|---|
| App shell (`index.html`, `css/**`, `js/**`) | **Cache-First** | Instant load; updated on next SW install |
| Google Fonts | **Cache-First** (stale-while-revalidate) | Prevent FOUT offline |
| PocketBase API calls | **Network-First** with offline fallback | Fresh data when online |
| Background Sync | `sync` event fires when back online | Push dirty Dexie records |

**Precache manifest** is generated on first install by listing all shell assets. A new deploy bumps `CACHE_VERSION` constant in `sw.js`, triggering the `activate` event to clear old caches.

---

## 8. PocketBase Schema (Cloud Mirror)

PocketBase collections mirror the Dexie schema. All collection records include a `family_id` field and are protected by PocketBase rules that only allow read/write if `@request.auth.record.family_id = family_id`.

### Collections
- `items_library`
- `recipes`
- `recipe_ingredients`
- `grocery_lists`
- `grocery_items`
- `meal_plans`
- `store_layouts`
- `families` — id, name, invite_code
- `users` — id, email, name, family_id (relation)

### Realtime Subscriptions
`sync.js` subscribes to `grocery_items` and `meal_plans` collections via PocketBase SSE. Any change from another family member triggers a Dexie `put()` and a custom DOM event to re-render the affected component.

---

## 9. Authentication & Family Flow

1. **Register** → creates a PocketBase `users` record + a new `families` record. User becomes family admin.
2. **Invite** → admin generates a short `invite_code` stored on `families`. Shareable via Web Share API.
3. **Join** → new user registers and enters `invite_code` → their `family_id` is set to the existing family.
4. **Auth tokens** → stored in `localStorage`. Refreshed automatically by `pocketbase.js` wrapper.
5. **Offline auth** → If no network, the app checks `localStorage` for a valid (non-expired) token and loads cached Dexie data. No login screen is shown for cached sessions.

---

## 10. Component Architecture

All components are **native Custom Elements** (`customElements.define()`). They:
- Use a `<template id="...">` tag in `index.html` for their HTML structure.
- Encapsulate styles via Shadow DOM **only** where isolation is needed (e.g. `<grocery-row>`). Shared styles live in global CSS.
- Communicate via **Custom Events** bubbling upward, not by calling each other directly.
- Re-render by calling a `render()` method that diffs the DOM with the new Dexie query result.

### Key Component Interactions
```
<app-nav>  ──── fires 'route-change' ────►  router.js
                                                │
                                          swaps <main>
                                          via View Transitions
                                                │
                                    ┌───────────┴───────────┐
                              <grocery-list>          <meal-planner>
                                    │                       │
                              <grocery-row>           <meal-day>
                                    │
                              fires 'item-checked'
                                    │
                              grocery.store.js → Dexie → sync.js
```

---

## 11. CSS Architecture

All CSS is authored using native **CSS Nesting** and **CSS Custom Properties** (no preprocessor).

### Layer Order (imported in `index.html`)
```html
<link rel="stylesheet" href="css/variables.css">   <!-- tokens -->
<link rel="stylesheet" href="css/base.css">         <!-- reset + typography -->
<link rel="stylesheet" href="css/layout.css">       <!-- shell grid -->
<link rel="stylesheet" href="css/components/...">   <!-- per-component -->
```

### Design Token Source
All tokens are populated from the **Stitch MCP `Grocery List PWA Design`** project (`designTheme.designMd`). Key token categories:

| Token group | Example variable |
|---|---|
| Colors | `--color-primary: #0f5238` |
| Surface tiers | `--color-surface-pure: #ffffff` |
| Typography | `--font-item-name: 600 18px/1.4 'Hanken Grotesk'` |
| Spacing | `--spacing-thumb-touch: 48px` |
| Radii | `--radius-md: 0.75rem` |
| Shadows | `--shadow-card: 0 4px 20px rgba(0,0,0,0.05)` |

### Thumb-Zone Rule
On mobile (`max-width: 768px`), the bottom navigation bar is `56px` tall with `env(safe-area-inset-bottom)` padding. The main scroll area ends `56px` from the bottom. The FAB (Floating Action Button) is anchored `76px` from the bottom right, within thumb reach.

---

## 12. Offline Grocery List — Critical Path

The grocery list must be **100% functional offline**. This is non-negotiable (SPEC requirement).

**What works offline:**
- View active grocery list (served from Dexie)
- Check items in/out of cart
- Delete items
- Manually add items (from cached items_library)

**What requires connectivity:**
- Syncing changes to other family members
- Adding new recipes/items that don't exist in the local cache
- Authentication for new sessions

**Sync queue:** When offline, all writes set `isSynced = 0`. The SW registers a `sync` tag (`'grocery-sync'`). When connectivity returns, the browser fires the `sync` event and `sync.js` flushes the queue to PocketBase.

---

## 13. Open Architectural Questions

> These must be resolved before implementation begins.

1. **PocketBase hosting:** Self-hosted (user's own server / VPS) or managed PocketBase Cloud? This affects the `POCKETBASE_URL` config and the CI/deployment story.

2. **Multi-list behavior:** The SPEC says "can create multiple grocery lists." Should there be one **active** list that the meal planner always writes to, or should the user choose a target list when adding a recipe to the plan?

3. **Store layout sorting:** The SPEC mentions sorting by store layout. Should this be a drag-and-drop reorder UI in Settings, or a simple numbered/ordered list input?

4. **Servings default:** The SPEC says "default number of persons" is a setting. When a recipe is added to the meal plan, should the app (a) always use the default, (b) always ask, or (c) use the default but allow a quick tap to change?

5. **Essentials / weekly staples:** The SPEC describes a "shortcut to add items you buy every week" with a preset QTY. Should these be a separate section in the grocery list UI (e.g. a collapsed `<details>` block at the top), or simply tagged items in the library that appear in a dedicated quick-add sheet?

6. **Dexie.js loading:** Load Dexie via ESM CDN import (`https://esm.sh/dexie`) or vendor it locally in `js/vendor/dexie.js`? Local vendoring is more resilient for offline-first but requires a one-time manual download.
