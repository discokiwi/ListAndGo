// @ts-check
/**
 * Internationalization module for List&GO.
 * Business Logic: Loads the correct language bundle, provides a Proxy-based
 * STRINGS object that automatically reflects the current language, and
 * exports helpers for string interpolation and runtime language switching.
 * Language preference is persisted in localStorage ('listandgo-lang').
 * @module
 */

import nl from './nl.js';
import en from './en.js';

/** @type {{ [lang: string]: any }} */
const bundles = { nl, en };

/**
 * Detect the user's preferred language.
 * Checks localStorage first, then navigator.language, then defaults to 'nl'.
 * @returns {string} The language code ('nl' or 'en').
 */
function detectLanguage() {
  const stored = localStorage.getItem('listandgo-lang');
  if (stored && bundles[stored]) return stored;
  if (navigator.language.startsWith('en')) return 'en';
  return 'nl';
}

/** @type {any} */
let _strings = bundles[detectLanguage()];

/**
 * A Proxy-based STRINGS object that delegates all property access to the
 * currently active language bundle. When setLanguage() swaps the bundle,
 * STRINGS automatically returns values from the new language.
 */
/** @type {any} */
export const STRINGS = new Proxy({}, {
  /**
   * Intercept property reads on STRINGS and delegate to the current bundle.
   * @param {object} _target - The proxy target (unused).
   * @param {string | symbol} key - The property key being accessed.
   * @returns {any} The value from the current language bundle.
   */
  get(_target, key) {
    void _target;
    if (typeof key === 'string' && key in _strings) {
      return _strings[key];
    }
    return undefined;
  },
  /**
   * Allow writing properties (for backward compat, delegates to current bundle).
   * @param {object} _target - The proxy target.
   * @param {string | symbol} key - The property key.
   * @param {any} value - The value to set.
   * @returns {boolean} Always true.
   */
  set(_target, key, value) {
    void _target;
    if (typeof key === 'string') {
      _strings[key] = value;
    }
    return true;
  },
  /**
   * Return the keys of the current bundle for enumeration.
   * @param {object} _target - The proxy target.
   * @returns {(string | symbol)[]} The keys of the current bundle.
   */
  ownKeys(_target) {
    void _target;
    return Reflect.ownKeys(_strings);
  },
  /**
   * Provide property descriptors for the current bundle's keys.
   * @param {object} _target - The proxy target.
   * @param {string | symbol} key - The key to describe.
   * @returns {object | undefined}
   */
  getOwnPropertyDescriptor(_target, key) {
    void _target;
    if (key in _strings) {
      return { configurable: true, enumerable: true };
    }
    return undefined;
  },
});

/**
 * Interpolate a template string with values.
 * Replaces {key} placeholders with the corresponding value from the values object.
 * @param {string} template - The string template with {placeholder} tokens.
 * @param {{ [key: string]: string | number }} [values] - Key-value pairs for interpolation.
 * @returns {string} The interpolated string.
 */
export function t(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => {
    return String(values[key] ?? `{${key}}`);
  });
}

/**
 * Switch the runtime language and notify all components.
 * Persists the choice to localStorage and dispatches a 'language-changed'
 * custom event so components can re-render.
 * @param {string} lang - The language code ('nl' or 'en').
 * @returns {void}
 */
export function setLanguage(lang) {
  if (!bundles[lang]) return;
  _strings = bundles[lang];
  localStorage.setItem('listandgo-lang', lang);
  document.dispatchEvent(new CustomEvent('language-changed'));
}

/**
 * Get the currently active language code.
 * @returns {string} The language code ('nl' or 'en').
 */
export function getCurrentLanguage() {
  return localStorage.getItem('listandgo-lang') || 'nl';
}