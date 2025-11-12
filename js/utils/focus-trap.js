/**
 * trapFocus.js
 * ============
 * Utility to trap keyboard focus within a set of focusable elements.
 * Designed for use in modal dialogs, popovers, or custom components with Shadow DOM.
 *
 * Usage:
 * - Call `trapFocus(e, focusableElements)` inside a keydown handler.
 * - `focusableElements` should be an ordered array of elements that can receive focus.
 * - Works with deeply nested shadow roots and custom elements like <sl-button>.
 *
 * Example:
 *   import { trapFocus } from './trapFocus.js';
 *   dialog.addEventListener('keydown', (e) => {
 *     const focusables = getFocusableElements(dialog); // your own logic
 *     trapFocus(e, focusables);
 *   });
 */

/**
 * Traps focus within the first and last elements of a given list.
 * Prevents focus from escaping when Tab or Shift+Tab is pressed.
 * @param {KeyboardEvent} e - The keydown event.
 * @param {HTMLElement[]} focusableElements - Ordered list of focusable elements.
 */
export function trapFocus(e, focusableElements) {
  //console.log(`vao trapfocus`); // Debug log: entered trapFocus

  // Exit early if key is not Tab or no focusable elements are present
  if (e.key !== 'Tab' || focusableElements.length === 0) return;

  // Get the deepest active element, even if it's inside nested shadow roots
  const active = getDeepActiveElement();
  console.log(`active`, active);
  // Identify the first and last focusable elements in the list
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  console.log(`first`, first);
  console.log(`last`,last);
  // Get the shadow host of the currently focused element
  const root = active?.getRootNode().host;
  console.log(`root`,root);
  //console.log(root?.host); // Debug log: show host of active element


  const index = focusableElements.indexOf(root);
  console.log(`index`,index);
  // If Shift+Tab is pressed and focus is on the first element (or its shadow host), loop to last
  if (e.shiftKey && (active === first || root === first)) {
    if (index===focusableElements.length) first.focus();
    e.preventDefault();
    last.focus();

  // If Tab is pressed and focus is on the last element (or its shadow host), loop to first
  } else if (!e.shiftKey && (active === last || root === last )) {
    e.preventDefault();
    first.focus();
  }
  if (index<0) first.focus();

  
}

export function trapFocus1(e, focusableElements) {
  if (e.key !== 'Tab' || focusableElements.length === 0) return;

  const active = getDeepActiveElement();

  // Find the index of the currently focused element
  let index = focusableElements.findIndex(el => el === active || el.shadowRoot?.contains(active));  // If not found, default to first
  if (index === -1) index = 0;

  e.preventDefault(); // Prevent default tab behavior

  // Calculate next index based on Shift key
  const nextIndex = e.shiftKey
    ? (index - 1 + focusableElements.length) % focusableElements.length
    : (index + 1) % focusableElements.length;

  focusableElements[nextIndex].focus();
}

/**
 * Recursively finds the deepest active element across nested shadow roots.
 * @param {Document} doc - Optional document context (defaults to global document).
 * @returns {Element|null} - The deepest focused element.
 */
function getDeepActiveElement(doc = document) {
  let active = doc.activeElement;

  // Traverse into shadow roots until no deeper active element is found
  while (active?.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}
