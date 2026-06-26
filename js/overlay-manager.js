// @ts-check
/**
 * Centralized Overlay Manager for List&GO.
 * Business Logic: Maintains a stack of open overlays (dialogs, drawers, edit modes).
 * When the user presses the browser/phone back button or Escape, the topmost overlay
 * is closed first. Only when no overlays are open does the router navigate to a
 * different screen.
 *
 * Key insight about hash-based SPA routing and the back button:
 * - When the back button is pressed, `location.hash` has ALREADY changed by the time
 *   `hashchange` or `popstate` fires. We cannot "cancel" the navigation — we must
 *   restore the correct hash via `history.pushState()`.
 * - On mobile browsers, `popstate` may NOT fire for hash navigation — only `hashchange`
 *   fires. Therefore the `hashchange` handler MUST close the overlay (not just block).
 * - On desktop, both `popstate` and `hashchange` may fire. The `suppressNextHashChange`
 *   flag prevents double-close when both fire in sequence.
 *
 * The manager:
 * 1. Intercepts `hashchange` in the capture phase: closes topmost overlay and restores
 *    the correct hash via `history.pushState()`.
 * 2. Intercepts `popstate`: closes topmost overlay and replaces the history entry.
 * 3. Centralizes Escape key handling.
 * @module
 */

/**
 * @typedef {object} OverlayEntry
 * @property {() => void} close - Function to close this overlay.
 * @property {string} [name] - Optional debug label for the overlay.
 */

/**
 * @type {OverlayEntry[]}
 * Stack of open overlays. The last entry is the topmost (most recently opened).
 */
const overlayStack = [];

/** @type {boolean} */
let initialized = false;

/**
 * Flag to prevent the hashchange handler from firing after a popstate handler
 * has already restored the URL. When we push a state in popstate, a hashchange
 * event fires immediately after. Without this guard, the hashchange handler would
 * try to restore the URL again (which is already correct) and potentially close
 * another overlay.
 * @type {boolean}
 */
let suppressNextHashChange = false;

/**
 * The hash value that should be restored if the user presses Back while an overlay
 * is open. Saved when the first overlay is registered, cleared when all are gone.
 * @type {string}
 */
let restoreHash = '';

/**
 * Initialize the overlay manager — sets up hashchange/popstate interception
 * and centralized Escape key handling. Called once during app startup.
 * Business Logic: Uses capture-phase listeners on `window` to intercept
 * navigation events before router.js's bubble-phase handler processes them.
 * @returns {void}
 */
export function initOverlayManager() {
  if (initialized) return;
  initialized = true;

  // Intercept hashchange in capture phase — fires before router.js's bubble listener
  // Business Logic: When the back button is pressed, the hash has already changed.
  // If an overlay is open, we close the topmost one and push the correct hash back
  // into the history, effectively cancelling the back navigation. We then block
  // the event so the router's bubble-phase handler doesn't process the wrong route.
  // IMPORTANT: capture restoreHash BEFORE calling closeTopmost(), because
  // closeTopmost() clears restoreHash when the overlay stack empties out.
  window.addEventListener('hashchange', (e) => {
    // If popstate already handled this, just suppress and exit
    if (suppressNextHashChange) {
      suppressNextHashChange = false;
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    if (overlayStack.length > 0 && restoreHash) {
      e.stopImmediatePropagation();
      e.preventDefault();

      // Capture the hash BEFORE closeTopmost() clears it
      const hashToRestore = restoreHash;

      // Close the topmost overlay
      closeTopmost();

      // Restore the hash to the value before the back button was pressed
      // history.pushState does NOT fire hashchange, so this is safe
      if (hashToRestore) {
        history.pushState(null, '', hashToRestore);
      }
    }
  }, true); // capture phase

  // Intercept popstate (Android hardware back button, browser back)
  // Business Logic: The popstate event fires when the back button is pressed
  // (mainly on desktop browsers). We close the topmost overlay and push a
  // replacement state to keep the app on the current route. We set the suppress
  // flag so the follow-up hashchange event doesn't try to close another overlay.
  // IMPORTANT: capture restoreHash BEFORE calling closeTopmost(), because
  // closeTopmost() clears restoreHash when the overlay stack empties out.
  window.addEventListener('popstate', (e) => {
    if (overlayStack.length > 0) {
      e.stopImmediatePropagation();
      e.preventDefault();

      // Capture the hash BEFORE closeTopmost() clears it
      const hashToRestore = restoreHash;

      closeTopmost();

      // Restore the correct hash to keep the app on the current route
      if (hashToRestore) {
        suppressNextHashChange = true;
        history.pushState(null, '', hashToRestore);
      }
    }
  }, true); // capture phase

  // Centralized Escape key handling
  // Business Logic: Closes the topmost overlay when Escape is pressed.
  // Individual components no longer need their own keydown listeners.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayStack.length > 0) {
      e.stopPropagation();
      closeTopmost();
    }
  }, true); // capture phase
}

/**
 * Register an overlay as open. Returns a token function that should be called
 * when the overlay closes.
 * Business Logic: Each overlay component calls this when it opens and calls the
 * returned token when it closes (or was closed externally). If an overlay was
 * already registered (same close function reference), it is not double-added.
 * When the first overlay is registered, the current hash is saved so it can be
 * restored if the user presses the back button.
 * @param {OverlayEntry} entry - The overlay entry with a close function.
 * @returns {() => void} Close token — call this when the overlay closes.
 */
export function registerOverlay(entry) {
  // Save the current hash when the first overlay is opened
  // This is the hash we'll restore if the user presses Back
  if (overlayStack.length === 0) {
    restoreHash = location.hash || `#/${getDefaultRoute()}`;
  }

  // Avoid duplicates by checking close function reference
  const exists = overlayStack.some((e) => e.close === entry.close);
  if (!exists) {
    overlayStack.push(entry);
  }
  return () => {
    unregisterOverlay(entry.close);
  };
}

/**
 * Get the default route name for fallback.
 * @returns {string}
 */
function getDefaultRoute() {
  return 'lists';
}

/**
 * Unregister an overlay by its close function reference.
 * Business Logic: Called internally by the close token or externally by the
 * overlay component if it closes itself. When the last overlay is removed,
 * the restore hash is cleared so a subsequent Back press navigates normally.
 * @param {() => void} closeFn - The close function to find and remove.
 * @returns {void}
 */
export function unregisterOverlay(closeFn) {
  const idx = overlayStack.findIndex((e) => e.close === closeFn);
  if (idx !== -1) {
    overlayStack.splice(idx, 1);
  }

  // If all overlays are closed, clear the restore hash
  if (overlayStack.length === 0) {
    restoreHash = '';
  }
}

/**
 * Close the topmost overlay on the stack.
 * Business Logic: Pops the last entry and calls its close function.
 * Does nothing if the stack is empty.
 * @returns {void}
 */
export function closeTopmost() {
  const entry = overlayStack.pop();
  if (entry) {
    entry.close();
  }

  // If the overlay stack is now empty, clear the restore hash
  if (overlayStack.length === 0) {
    restoreHash = '';
  }
}

/**
 * Check whether any overlay is currently open.
 * Business Logic: Used by router.js to block navigation when overlays are active.
 * @returns {boolean} True if at least one overlay is open.
 */
export function isAnyOverlayOpen() {
  return overlayStack.length > 0;
}

/**
 * Get the number of open overlays (useful for debugging).
 * @returns {number} The stack depth.
 */
export function overlayCount() {
  return overlayStack.length;
}