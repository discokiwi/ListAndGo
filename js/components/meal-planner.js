// @ts-check
/**
 * Meal Planner Web Component.
 * Business Logic: Displays a 7-day week view showing planned recipes per day.
 * Stamps content from `<template id="meal-plan-template">`.
 * @class
 */
export class MealPlanner extends HTMLElement {
  /** Construct the component. */
  constructor() {
    super();
  }

  /**
   * Called when element is added to the DOM. Stamps template and shows initial state.
   * @returns {Promise<void>}
   */
  async connectedCallback() {
    // Stamp template content on connect (not in constructor)
    const tmpl = /** @type {HTMLTemplateElement} */ (document.getElementById('meal-plan-template'));
    if (tmpl && !this.hasChildNodes()) {
      const content = /** @type {DocumentFragment} */ (tmpl.content.cloneNode(true));
      this.appendChild(content);
    }
    const container = this.querySelector('#meal-plan-container');
    if (container) {
      container.innerHTML = `<div class="page-empty"><p>No meals planned this week. Add recipes to your plan.</p></div>`;
    }
  }
}

customElements.define('meal-planner', MealPlanner);