// @ts-check
/**
 * Category Color Map — single source of truth for category accent colors.
 * Business Logic: Maps category IDs to CSS color values used for the
 * 4px left border accent on flat list rows. Used by both grocery-row and
 * items-library components for visual consistency.
 * @type {Record<string, string>}
 */
export const CATEGORY_COLORS = {
  produce: 'var(--color-primary, #0f5238)',
  dairy: '#A8DADC',
  bakery: 'var(--color-secondary, #53634e)',
  meat: 'var(--color-tertiary, #713638)',
  pantry: 'var(--color-outline-variant, #bfc9c1)',
  condiments: 'var(--color-outline-variant, #bfc9c1)',
  beverages: 'var(--color-primary-fixed-dim, #95d4b3)',
  frozen: 'var(--color-secondary-fixed-dim, #baccb3)',
};

/**
 * Get the accent color for a given category ID.
 * @param {string} categoryId - The category identifier.
 * @returns {string} CSS color value.
 */
export function getCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || 'var(--color-outline-variant, #bfc9c1)';
}