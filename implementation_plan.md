# List&GO — High-Level Implementation Plan

Each step delivers **a working, useful feature** in isolation.
Steps are ordered so later steps never block on unbuilt dependencies.

---

## Step 1 — PWA Shell & Design System
**Delivers:** An installable app with correct branding, bottom navigation, and tab switching.

- Fetch all design tokens from Stitch MCP → write `css/variables.css`
- Create `index.html` app shell: bottom nav, `<main>` swap area, all `<template>` tags
- Write `css/base.css`, `css/layout.css` (thumb-zone grid, safe-area insets)
- Implement `js/router.js` with hash-based routing + View Transitions API
- Create `<app-nav>` Web Component
- Add `manifest.webmanifest` + PWA icons → app is installable to home screen

**Why first:** Every other step depends on the shell, the tokens, and the router.
**Useful when done:** The app opens, looks right, and navigates between the four tabs.

---

## Step 2 — Local Database Foundation (Dexie.js)
**Delivers:** The data engine that powers every feature — defined once, never changed carelessly.

- Vendor or CDN-import Dexie.js
- Implement `js/db.js` with the full schema (all 8 tables, all indexes, version 1)
- Write `js/store/items.store.js` with CRUD + seed a starter items library (~50 common grocery items with categories and units)
- Build `<items-library>` + `<item-editor>` components: browse by category, add, edit, delete custom items, mark as essential
- Build `<ingredient-picker>` autocomplete component (used later by recipe editor)

**Why here:** Items Library is the root dependency — recipes reference items, grocery rows reference items. Getting this right early prevents painful migrations.
**Useful when done:** User has a browseable, searchable catalogue of ingredients they can manage.

---

## Step 3 — Grocery List (Manual Mode)
**Delivers:** The core in-store experience — fully usable as a standalone shopping list app.

- Implement `js/store/grocery.store.js`: create list, add item, check off, delete, update qty
- Build `<grocery-list>` and `<grocery-row>` components with the thumb-zone layout
- Implement category grouping with `<details>`/`<summary>` collapsible sections
- Implement "mark in cart" behaviour (greyed out, moved to bottom, stays visible)
- Implement manual item search via `<ingredient-picker>` with autocomplete
- Implement the **Essentials quick-add** sheet (items flagged `is_essential` in the library)
- Implement multiple lists: create, switch active, delete

**Why here:** No recipe or meal plan data needed. Immediately useful as a grocery list tool.
**Useful when done:** User can build a shopping list by hand and use it in the supermarket.

---

## Step 4 — Recipe Library
**Delivers:** A personal recipe book — add, browse, and search your recipe collection.

- Implement `js/store/recipes.store.js`: CRUD for recipes + recipe_ingredients
- Build `<recipe-library>` (search-first list) and `<recipe-card>` components
- Build `<recipe-editor>` bottom sheet: name, category, prep time, servings, URL, notes, ingredient list with `<ingredient-picker>` for each line
- Build `<recipe-detail>` view: ingredient list, scale servings, link to source
- Implement "add to grocery list" button on recipe detail (without meal plan — direct add)

**Why here:** Depends on Items Library (Step 2). Recipes are needed before Meal Plan (Step 5) can exist.
**Useful when done:** User has a full recipe book and can instantly push a recipe's ingredients to the grocery list.

---

## Step 5 — Meal Planner & Smart Merge
**Delivers:** The killer feature — plan the week, and the grocery list builds itself.

- Implement `js/store/mealplan.store.js` with the Smart Merge algorithm (scale qty, aggregate, one-time vs multi-use filter dialog)
- Build `<meal-planner>` 7-day view and `<meal-day>` slot component
- Implement "add recipe to day" via `<recipe-library>` bottom sheet
- Implement ingredient confirmation `<dialog>`: pre-select one-time items, let user opt-in multi-use items
- Implement "mark as cooked / remove from plan" → reverse-merge removes un-checked items from grocery list
- Wire the `source_recipe_ids` display on grocery rows ("Part of: Pasta Bolognese")

**Why here:** Depends on both Recipes (Step 4) and Grocery List (Step 3).
**Useful when done:** The app's core value proposition works end-to-end.

---

## Step 6 — Settings
**Delivers:** User control over the app's behaviour and store layout.

- Implement `js/store/settings.store.js`
- Build `<settings-panel>` with sections:
  - **Store Layout:** drag-and-drop (or ordered list) to set aisle category order — grocery list re-sorts live
  - **Units:** manage the list of available units
  - **Item Categories:** add/rename/reorder item categories
  - **Recipe Categories:** add/rename recipe categories
  - **Default Servings:** set the fallback portion count for meal planning

**Why here:** Depends on all data stores being defined (Steps 2–5). Settings reference categories and units that already exist.
**Useful when done:** User can tune the grocery list order to match their actual supermarket.

---

## Step 7 — Offline & PWA (Service Worker)
**Delivers:** The grocery list works with zero connectivity — the phone can be in airplane mode.

- Implement `sw.js`: Cache-First for the app shell, fonts, and Dexie/ESM imports
- Precache all shell assets on install; bump `CACHE_VERSION` to invalidate on update
- Implement Background Sync queue: any write while offline registers a `sync` tag; `sync.js` flushes dirty records when back online
- Add install prompt handling and "Add to Home Screen" nudge in the UI
- Add offline indicator banner in the app shell

**Why here:** The shell and all data logic must be complete before a Service Worker can reliably cache them. Placing this before cloud sync means the sync queue architecture is in place and ready.
**Useful when done:** User installs the app and uses it in the supermarket without any network dependency.

---

## Step 8 — PocketBase Backend & Auth
**Delivers:** User accounts — personal data is persisted to the cloud and survives device loss.

- Set up PocketBase instance (self-hosted or cloud); define all collections mirroring the Dexie schema
- Write `js/pocketbase.js` wrapper (auth, REST CRUD, token refresh)
- Build auth screens: Login, Register (creates user + family), wrapped in a `<dialog>`
- Implement auth guard: if no valid token in `localStorage`, show login; otherwise load cached data
- Implement family creation: first user auto-creates a `families` record

**Why here:** Auth has no dependency on other features — it is a vertical slice. Keeping it after offline (Step 7) means the app already works before it asks the user to log in.
**Useful when done:** User's data is safe in the cloud and accessible on a new device after login.

---

## Step 9 — Family Sync & Realtime
**Delivers:** Shared lists — multiple family members see changes in real time.

- Implement `js/sync.js` full sync engine: on login, pull remote records into Dexie; on reconnect, flush the dirty queue
- Implement conflict resolution: last-write-wins on `updatedAt`; merge `source_recipe_ids` arrays
- Subscribe to PocketBase Realtime SSE for `grocery_items` and `meal_plans`; on remote change, `put()` into Dexie and fire a render event
- Build Family Settings section: view members, generate invite code, share via **Web Share API** (`navigator.share`)
- Implement Join flow: enter invite code on registration → join existing family

**Why here:** Requires PocketBase (Step 8) and the sync queue scaffolding from offline (Step 7).
**Useful when done:** Partner adds an item on their phone and it appears on yours within seconds.

---

## Step 10 — Polish, Performance & Progressive Enhancement
**Delivers:** A premium, production-grade feel across all devices and edge cases.

- Add **Vibration API** feedback on item check-off (`navigator.vibrate(40)`)
- Implement **list archive** — archive completed grocery lists; view past lists read-only
- Add **View Transition** named animations between recipe detail and library (hero element transition)
- Implement `content-visibility: auto` on long grocery lists for paint performance
- Add empty states for all views (no recipes, no items, no plan)
- Add error boundaries: if Dexie fails, show a recovery message; if PocketBase is unreachable, show offline banner
- Full accessibility pass: ARIA roles, keyboard navigation, focus traps in `<dialog>`, minimum contrast verification against Stitch tokens
- Lighthouse audit: target 100 PWA, ≥ 90 Performance, ≥ 90 Accessibility

**Why last:** Polish is most effective once all features are stable and interactions are real.
**Useful when done:** The app feels as good as a native app and passes quality gates.

---

## Dependency Graph

```
Step 1 (Shell)
    └── Step 2 (Database + Items Library)
            ├── Step 3 (Grocery List — manual)
            │       └── Step 5 (Meal Plan + Smart Merge) ◄─┐
            └── Step 4 (Recipe Library) ────────────────────┘
                        (both 3 & 4 needed for Step 5)

Step 2–5 complete
    └── Step 6 (Settings)

Step 1–6 complete
    └── Step 7 (Service Worker + Offline)
            └── Step 8 (PocketBase + Auth)
                    └── Step 9 (Family Sync + Realtime)

Step 1–9 complete
    └── Step 10 (Polish)
```
