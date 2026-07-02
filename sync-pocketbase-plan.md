# PocketBase Sync Implementation Plan — List&GO

> Plan to add PocketBase-powered cloud sync so multiple family members can share grocery lists, recipes, items, and meal plans.

---

## v1 MVP: One Workspace, No Switching, Guests Are Local

- **Guest:** Purely local Dexie. No cloud at all. Seeded with default data.
- **Authenticated:** One workspace. Can share with family via invite code. Full sync.
- **Create account:** Local data pushed to PocketBase at that moment.

---

## Phased Approach — Each Phase is Testable

The implementation is split into 3 phases. Each phase ends with something you can run and verify before moving to the next.

---

# Phase 1: Account Auth

**Goal:** Create an account, log in, log out, session persists across restarts.

**Test after this phase:** App → settings → Create Account → log out → log back in → close app → reopen → still logged in.

### Step 1.1 — Update Dexie Schema

**File: `js/db.js`**
- Rename `familyId` → `workspaceId` in all table definitions
- Add `workspaces` table with index: `id`
- Add `isDeleted` field (0 | 1) to all synced tables
- Bump Dexie version

### Step 1.2 — Create Config

**File: `js/config.js`**
```js
export const config = {
  POCKETBASE_URL: 'http://141.148.233.82:8090/',
  DB_NAME: 'listandgo-db',
};
```

### Step 1.3 — Create PocketBase Wrapper (Auth Only)

**File: `js/pocketbase.js`**

Minimum needed for Phase 1:

| Function | What it does |
|---|---|
| `login(email, password)` | Authenticate with PocketBase, store token in localStorage |
| `createAccount(email, password, name)` | Register new user with PocketBase |
| `logout()` | Clear token from localStorage |
| `isAuthenticated()` | Returns `true` if a valid token exists in localStorage |
| `autoRefresh()` | On app boot, try to refresh the token. Returns `true` if still valid. |

- Load PocketBase JS SDK via `<script>` tag in `index.html`.
- Singleton client instance using `config.POCKETBASE_URL`.

### Step 1.4 — Update App Boot

**File: `js/app.js`**
- On app start: check if auth token exists in localStorage
  - If yes → call `autoRefresh()` → if successful, set authenticated mode
  - If no → stay in guest mode
- The sync engine is NOT started yet in Phase 1

### Step 1.5 — Auth UI Dialogs

**Login Dialog:**
- Email + password + submit button
- "Create Account" link → switches to register dialog
- On success: close dialog, store auth state

**Create Account Dialog:**
- Name + email + password + submit button
- On success: close dialog, store auth state

### Step 1.6 — Update Settings Panel

**File: `js/components/settings-panel.js`**

**Guest view:**
- "Create Account" button → opens Create Account dialog

**Authenticated view:**
- Show user's name and email (from PocketBase auth store)
- "Logout" button → clears token, resets to guest mode

---

### ✅ Phase 1 is testable now

```
Open app → settings → Create Account → enter details → account created → logged in
Close app → reopen → still logged in (token auto-refreshed)
Settings → Logout → back to guest mode
Settings → Login → enter credentials → logged in again
```

---

# Phase 2: Sync Engine

**Goal:** Create account → local data syncs to cloud → log in on another device → data appears.

**Test after this phase:** Device A: create account → data in PocketBase. Device B: same account → data appears.

### Step 2.1 — Workspace Creation on Signup

**File: `js/pocketbase.js`**

When `createAccount()` runs:
1. PocketBase creates the user record (already works from Phase 1)
2. A workspace record is created in PocketBase (collection: `workspaces`)
3. A `workspace_members` record is created (user_id = new user, role = `'admin'`)
4. **All local Dexie data is pushed** to PocketBase under this workspace's ID
5. An invite code is generated on the workspace record

New functions:

| Function | What it does |
|---|---|
| `getMyWorkspace()` | Query `workspace_members WHERE user_id = me`, return the workspace |
| `getCurrentWorkspaceId()` | Returns the workspace ID from the loaded workspace |

### Step 2.2 — Create Sync Engine

**File: `js/sync.js`**

**Push (runs when authenticated):**
- On a timer (every 2 minutes) and when coming online:
  - For each table, query `where('isSynced').equals(0)`
  - Push dirty records to PocketBase via REST API
  - On success → mark `isSynced: 1`

**Pull (runs on first load after login):**
- Fetch all records for the workspace from PocketBase
- Write to Dexie with `isSynced: 1`
- Conflict: compare `updatedAt`, server wins

**Soft delete handling:**
- Records with `isDeleted = 1` are pulled into Dexie (so they don't reappear)
- All UI queries filter `where('isDeleted').equals(0)`

### Step 2.3 — Wire Sync into App

**File: `js/app.js`**
- After successful login → call `getMyWorkspace()` → start sync engine
- Start periodic timer for push
- On app boot (already authenticated) → load workspace → start sync

### Step 2.4 — Update Setting Panel

- **Authenticated view:** Shows workspace name
- Still no invite code UI yet (that's Phase 3)

---

### ✅ Phase 2 is testable now

```
Device A: Guest → add items, recipes → Create Account → data synced to cloud
Device B: Login with same account → all data appears
Device A: Add item → Device B: refresh → sees it (push + pull works)
```

---

# Phase 3: Sharing

**Goal:** Share invite code → other person joins → both see same data in realtime.

**Test after this phase:** Account A: copy invite code → Account B: join → add item on A → appears on B instantly.

### Step 3.1 — Invite Code Display

**File: `js/pocketbase.js`**

| Function | What it does |
|---|---|
| `getInviteCode()` | Fetch the workspace's `shareCode` from PocketBase |

**File: `js/components/settings-panel.js`**

**Admin view:**
- Shows workspace name
- Shows invite code with a "Copy" button and Web Share API button
- Label: "Share this code with family members to join your workspace"

**Member view:**
- Shows workspace name
- Shows invite code (read-only, no copy/share button)

### Step 3.2 — Join Workspace

**File: `js/pocketbase.js`**

| Function | What it does |
|---|---|
| `joinWorkspace(shareCode)` | Find workspace by shareCode → create `workspace_members` record (role = `'member'`) → pull all workspace data into Dexie |

**File: `js/components/settings-panel.js`**

- "Join Workspace" button (visible when authenticated)
- Opens a small dialog: "Enter invite code" + text input + submit
- On success: workspace data pulled into Dexie, UI updates, workspace name shown in settings

### Step 3.3 — Realtime Subscriptions

**File: `js/pocketbase.js`** (or `js/sync.js`)

- Subscribe to all synced collections via PocketBase SSE
- Filter: `workspaceId = '{workspaceId}'`
- On incoming change → Dexie `put()` the record → dispatch `data-changed` CustomEvent on `document`
- Components listen for `data-changed` and re-render
- Subscriptions start after login, stop on logout

### Step 3.4 — Leave Workspace

**File: `js/pocketbase.js`**
| Function | What it does |
|---|---|
| `leaveWorkspace()` | Remove user's `workspace_members` record, clear workspace data from Dexie |

**File: `js/components/settings-panel.js`**
- "Leave Workspace" button (visible to members only)
- Admin cannot leave (no transfer ownership in v1)

---

### ✅ Phase 3 is testable now

```
Account A (admin): Create workspace → copy invite code from settings
Account B (new account): Settings → Join Workspace → enter code → workspace data appears
Account A: Add item to grocery list → Account B: sees it instantly (realtime)
Account B: Check item → Account A: sees checked state
Account B: Leave workspace → data removed from local Dexie
```

---

## Data Model

### Schema Change: `familyId` → `workspaceId`

| Table | Key field |
|---|---|
| `items` | `workspaceId` |
| `categories` | `workspaceId` |
| `recipeCategories` | `workspaceId` |
| `units` | `workspaceId` |
| `recipes` | `workspaceId` |
| `recipeIngredients` | `workspaceId` |
| `groceryLists` | `workspaceId` |
| `groceryItems` | `workspaceId` |
| `mealPlans` | `workspaceId` |
| `storeLayouts` | `workspaceId` |

### New Table: `workspaces`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | workspace ID |
| `name` | string | e.g. "My Workspace" |
| `shareCode` | string | nullable — invite code |
| `updatedAt` | ISO string | |
| `isSynced` | 0 \| 1 | |
| `isDeleted` | 0 \| 1 | |

### PocketBase Collections

**`workspaces` collection:**
- `id` (text, PK)
- `name` (text)
- `share_code` (text, nullable)
- `created` (automatic)

**`workspace_members` collection:**
- `id` (text, PK)
- `workspace_id` (relation → workspaces)
- `user_id` (relation → users)
- `role` (text: 'admin' | 'member')

### New Field: `isDeleted` on All Tables

Every synced table gets `isDeleted: number` (0 | 1). Prevents sync conflicts when user A deletes while user B (offline) edits.

- All `delete()` becomes `update(id, { isDeleted: 1, updatedAt: now, isSynced: 0 })`
- All UI queries filter `where('isDeleted').equals(0)`

---

## Seed Logic

- **Guest:** Seed locally as today (categories, units, items, recipes)
- **Create Account:** Local Dexie data is pushed to the new workspace. No additional seeding.
- **Join Workspace:** Workspace data pulled from PocketBase. Seed only items/categories/units missing locally.

---

## Service Worker

- Register `'grocery-sync'` sync tag in `sw.js`
- On `sync` event → message client to run push queue
- Client listens for SW messages

---

## Testing Checklist

### Phase 1 Tests
- [ ] **Guest (first launch):** No prompts, app works, seed data loaded, no cloud calls
- [ ] **Create Account:** Works in settings, account created in PocketBase
- [ ] **Login:** Existing account logs in, session works
- [ ] **Auth persistence:** Close and reopen app while authenticated → session restored
- [ ] **Logout:** Token cleared, clears Dexie, back to fresh guest

### Phase 2 Tests
- [ ] **Guest → Create Account:** Local data pushed to new workspace
- [ ] **Login on second device:** Workspace data pulled, matches first device
- [ ] **Push on edit:** Add item on A → appears in PocketBase
- [ ] **Pull on login:** All workspace data present on new device

### Phase 3 Tests
- [ ] **Invite code in settings:** Admin sees code with share button
- [ ] **Join workspace with code:** Member enters code → data pulled → sees same data
- [ ] **Member sees code read-only:** No copy/share button for members
- [ ] **Grocery list sync (realtime):** Add item on A → appears on B
- [ ] **Check item (realtime):** Check on B → A sees checked state
- [ ] **Offline write:** Offline changes sync when back online
- [ ] **Soft delete:** Delete on A → B sees it removed, isDeleted flag in DB
- [ ] **Leave workspace:** Member leaves → data removed from local Dexie

---

## Open Decisions

1. **PocketBase URL**: Self-hosted (Docker), PocketBase Cloud, or localhost?
2. **Auth UI**: Inline `<dialog>` modals in `index.html` or dedicated Web Component?
3. **PocketBase SDK**: CDN `<script>` tag or ESM (vendored)?
4. **Invite code format**: 6-character alphanumeric (e.g. `A3KF92`)?