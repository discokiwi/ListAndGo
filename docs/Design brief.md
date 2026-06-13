# Design Brief: List&GO PWA
**Role:** Senior Product Designer / UX Architect
**Objective:** Create an ergonomic, high-end design system for a Grocery & Meal Planning app. The goal is to turn a time-consuming chore into a pleasant, high-speed experience.

---

## 1. Ergonomic Philosophy: "The Dual-Mode UX"

### A. The "Shopping Mode" (One-Handed)
*   **Context:** User is in a grocery store, pushing a cart with one hand, holding the phone with the other.
*   **Requirement:** The **Grocery List** must be 100% operable via the "Thumb Zone" (bottom 60% of the screen).
*   **Interactions:** 
    - Large touch targets (min 48x48px).
    - Checkboxes/Toggles positioned on the right side (for right-handed thumb reach).
    - Swipe-to-delete gestures to avoid hunting for small icons.
*   **Visuals:** High-contrast typography to handle supermarket glare and low-light conditions.

### B. The "Planning Mode" (Two-Handed)
*   **Context:** User is at home on a couch or kitchen counter.
*   **Requirement:** The **Recipe Builder** and **Meal Planner** should emphasize speed of data entry and visual clarity.
*   **Interactions:** 
    - Optimized for search-first workflows.
    - Keyboard-friendly inputs.
    - Use of sliding bottom-sheets (modals) to maintain context.

---

## 2. Visual Language & Aesthetics
*   **Concept:** "Calm Efficiency" (Fresh, Organic, Clean).
*   **Typography:** Highly legible Sans-Serif. Clear hierarchy between Item Names (Bold) and Units/Quantities (Regular/Dimmed).
*   **Styling:** Minimalist. Use subtle shadows and CSS containment rather than heavy borders.

---

## 3. Technical Constraints (For Developer Handoff)
The design must be implementable using **Vanilla HTML5 and Modern CSS ONLY**.
*   **No Frameworks:** Do not design components that require React/Vue libraries.
*   **Standard Elements:** 
    - Use `<dialog>` for all modals and sheets.
    - Use `<details>/<summary>` for collapsible sections.
    - Use **CSS Grid and Flexbox** for all layouts.
*   **Icons:** Use clean, geometric shapes compatible with **Inline SVG**.
*   **Animations:** Design transitions compatible with the **CSS View Transitions API** (e.g., smooth sliding tabs or fading headers).

---

## 4. Component Generation Tasks
Please generate the following design tokens and component specs:

1.  **Design Tokens:** Define CSS variables (`--color-primary`, `--spacing-unit`, `--text-lg`, etc.).
2.  **The "Thumb-Zone" Grocery Row:** A list item with a large toggle area on the right, category badge, and quantity display.

---

## 5. Deliverables
- **CSS Variable Map:** A `:root` block of all design tokens.
- **HTML/CSS Blueprints:** Structural guidance for the main layouts (Grid/Flex logic).

