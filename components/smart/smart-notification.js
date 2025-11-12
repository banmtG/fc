/**
 * SmartNotification Web Component
 * --------------------------------
 * A lightweight, responsive notification system built as a custom HTML element.
 * It supports icon-based messages, auto-dismiss timers, and dynamic positioning
 * that adapts to keyboard visibility and screen orientation.
 *
 * ✅ Features:
 * - Shadow DOM encapsulation
 * - Customizable icon, label, and color
 * - Auto-dismiss with smooth transitions
 * - Responsive positioning (keyboard-aware)
 * - Memory-safe: cleans up event listeners and timers on disconnect
 *
 * 📦 Usage:
 * ```html
 * <smart-notification id="notifier"></smart-notification>
 * <script>
 *   const notifier = document.getElementById('notifier');
 *   notifier.show({
 *     label: 'Message sent!',
 *     icon: 'check',
 *     color: '--sl-color-success-600',
 *     timer: 4000
 *   });
 * </script>
 * ```
 */

class SmartNotification extends HTMLElement {
  constructor() {
    super();

    // Attach shadow DOM for style encapsulation
    const shadow = this.attachShadow({ mode: 'open' });

    // Define component styles
    const style = document.createElement('style');
    style.textContent = `:host { position: fixed; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; pointer-events: none; } .notification { display: flex; align-items: center; background: var(--sl-color-neutral-100); color: var(--sl-color-neutral-900); border-radius: 6px; padding: 0.6rem 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 0.95rem; pointer-events: auto; opacity: 1; margin-bottom: 5px; transition: transform 0.2s ease, opacity 0.3s ease; } .notification.hide { opacity: 0; transform: translateY(-20px); } .icon { margin-right: 0.6rem; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; } `;

    shadow.appendChild(style);

    // Container to hold notification elements
    this.container = document.createElement('div');
    shadow.appendChild(this.container);

    // Bind event listeners for cleanup
    this._boundResize = () => this._updatePosition();
    this._boundOrientation = () => this._updatePosition();
    this._boundScroll = () => this._updatePosition();

    // Track active timers for cleanup
    this._activeTimers = new Set();
  }

  // Called when component is added to the DOM
  connectedCallback() {
    this._bindViewportListeners();
  }

  // Called when component is removed from the DOM
  disconnectedCallback() {
    this._unbindViewportListeners();
    this._clearTimers();
  }

  /**
   * Displays a notification box
   * @param {Object} options - Notification options
   * @param {string} options.label - Text content
   * @param {string} [options.icon] - Optional icon name
   * @param {string} [options.color] - CSS variable for background
   * @param {number} [options.timer=3000] - Auto-dismiss time in ms
   */
  show({ label, icon = '', color = '', timer = 3000, selfDestroy = false}) {
    const notif = document.createElement('div');
    notif.classList.add('notification');

    // Apply custom background color if provided
    if (color) {
      notif.style.background = `var(${color})`;
      notif.style.color = 'white';
    }

    // Render icon + label or just label
    notif.innerHTML = icon
      ? `<sl-icon name="${icon}" class="icon"></sl-icon><span>${label}</span>`
      : label;

    this.container.appendChild(notif);

    // Schedule auto-dismiss
    const hideTimer = setTimeout(() => {
      notif.classList.add('hide');
      const removeTimer = setTimeout(() => notif.remove(), 300);
      this._activeTimers.add(removeTimer);
      if (selfDestroy===true) this.destroy();
    }, timer);

    this._activeTimers.add(hideTimer);
  }

  destroy() {
    this.remove(); // Removes the element from the DOM
  }


  // Dynamically adjust position based on keyboard or scroll
  _updatePosition() {
  const vv = window.visualViewport;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const keyboardVisible = vv?.height < window.innerHeight;

  const yOffset = keyboardVisible
    ? vv.pageTop + vv.height - 100
    : scrollY + 10;

  this.style.top = `${yOffset}px`;
  this.style.right = '10px';

  // 🔄 Flip stacking direction based on keyboard visibility
  this.style.flexDirection = keyboardVisible ? 'column-reverse' : 'column';  
  }


  // Attach viewport-related listeners
  _bindViewportListeners() {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._boundResize);
    }
    window.addEventListener('orientationchange', this._boundOrientation);
    window.addEventListener('scroll', this._boundScroll, { passive: true });

    // Initial position adjustment
    this._updatePosition();
  }

  // Remove listeners to prevent memory leaks
  _unbindViewportListeners() {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._boundResize);
    }
    window.removeEventListener('orientationchange', this._boundOrientation);
    window.removeEventListener('scroll', this._boundScroll);
  }

  // Clear all active timers
  _clearTimers() {
    for (const timer of this._activeTimers) {
      clearTimeout(timer);
    }
    this._activeTimers.clear();
  }
}

// Register the custom element
customElements.define('smart-notification', SmartNotification);


/**
 * 🌐 Global Notification Trigger
 * --------------------------------
 * This function allows you to show a notification from anywhere in your app
 * by calling `window.showNotification({...})`. It looks for the first
 * <smart-notification> element in the DOM and calls its `.show()` method.
 *
 * 📦 Usage:
 * ```js
 * window.showNotification({
 *   label: 'Profile updated successfully!',
 *   icon: 'check-circle',
 *   color: '--sl-color-success-600',
 *   timer: 4000
 * });
 * ```
 *
 * 🔒 Safe fallback: If no <smart-notification> is found, nothing breaks.
 */

// window.showNotification = function({ label = "Some thing to notify", icon = 'check-circle', color = '--sl-color-success-600', timer = 3000 }) {
//   const host = document.querySelector('smart-notification');
//   if (host) {
//     host.show({ label, icon, color, timer });
//   }
// };



export function appNotify(label = "Some thing to notify", icon = 'check-circle', color = '--sl-color-warning-600', timer = 3000, selfDestroy =false) 
{
   const smart_notify = document.createElement("smart-notification");
        document.body.appendChild(smart_notify);
        if (smart_notify) {
          smart_notify.show({
            label: label,
            icon: icon,
            color: color,
            timer: timer,
            selfDestroy: selfDestroy,
          });
        }
}

//Use sl-alert //
// Always escape HTML for text arguments!
// function escapeHtml(html) {
// const div = document.createElement('div');
// div.textContent = html;
// return div.innerHTML;
// }

// // Custom function to emit toast notifications
// function notify(message, variant = 'primary', icon = 'info-circle', duration = 3000) {
// const alert = Object.assign(document.createElement('sl-alert'), {
//     variant,
//     closable: true,
//     duration: duration,
//     innerHTML: `<sl-icon name="${icon}" slot="icon"></sl-icon>
//     ${escapeHtml(message)}`
// });

// document.body.append(alert);
// return alert.toast();
// }

//Use sl-alert //