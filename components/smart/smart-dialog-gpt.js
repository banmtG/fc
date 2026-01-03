import { getDeviceType_Robust } from './../../js/utils/deviceUtils_ex.js';
import './confirm-dialog.js';

class SmartDialogGPT extends HTMLElement {
  static activeDialogs = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._onDialogKeyDown = this._onDialogKeyDown.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._startDrag = this._startDrag.bind(this);
    this._onDrag = this._onDrag.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);

    this._isDragging = false;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialog {
          background: white;
          border-radius: 4px;
          max-width: 90vw;
          max-height: 90vh;
          min-width: 200px;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          outline: none;
        }

        .header {
          padding: 8px;
          background: #f0f0f0;
          cursor: move;
        }

        .body {
          flex: 1;
          overflow: auto;
        }

        .footer {
          padding: 8px;
          text-align: right;
        }
      </style>

      <div class="overlay" part="overlay">
        <div class="dialog" part="dialog" tabindex="-1" role="dialog" aria-modal="true">
          <div class="header" part="header">
            <slot name="header"></slot>
          </div>
          <div class="body" part="body">
            <slot name="body"></slot>
          </div>
          <div class="footer" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;

    this._overlay = this.shadowRoot.querySelector('.overlay');
    this._dialog = this.shadowRoot.querySelector('.dialog');
    this._header = this.shadowRoot.querySelector('.header');

    this._previousFocus = document.activeElement;

    this._overlay.addEventListener('click', this._onOverlayClick);
    this._dialog.addEventListener('keydown', this._onDialogKeyDown, { capture: true });

    if (this.hasAttribute('draggable')) {
      this._header.addEventListener('pointerdown', this._startDrag);
      window.addEventListener('pointermove', this._onDrag);
      window.addEventListener('pointerup', this._onDragEnd);
    }

    SmartDialogGPT.activeDialogs.push(this);
    this.style.zIndex = 1000 + SmartDialogGPT.activeDialogs.length;

    this._setInert(true);
    this._focusFirst();
    this._center();
  }

  disconnectedCallback() {
    this._setInert(false);
    this._previousFocus?.focus();

    this._overlay.removeEventListener('click', this._onOverlayClick);
    this._dialog.removeEventListener('keydown', this._onDialogKeyDown, { capture: true });

    if (this.hasAttribute('draggable')) {
      this._header.removeEventListener('pointerdown', this._startDrag);
      window.removeEventListener('pointermove', this._onDrag);
      window.removeEventListener('pointerup', this._onDragEnd);
    }

    SmartDialogGPT.activeDialogs =
      SmartDialogGPT.activeDialogs.filter(d => d !== this);
  }

  /* ---------------- keyboard ---------------- */

  _onDialogKeyDown(e) {
    // HARD boundary
    e.stopPropagation();

    if (e.key === 'Escape' && this.hasAttribute('esc-close')) {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      this._trapTab(e);
      return;
    }

    // Let focused control handle Enter / Space
    if (e.key === 'Enter' || e.key === ' ') return;
  }

  _trapTab(e) {
    const focusables = this._getFocusable();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------------- overlay ---------------- */

  _onOverlayClick(e) {
    if (!this.hasAttribute('overlay-close')) return;
    if (e.target === this._overlay) {
      this.close();
    }
  }

  /* ---------------- focus ---------------- */

  _focusFirst() {
    const focusables = this._getFocusable();
    (focusables[0] || this._dialog).focus();
  }

  _getFocusable() {
    return Array.from(
      this._dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.disabled && el.offsetParent !== null);
  }

  _setInert(on) {
    document.querySelectorAll('body > *').forEach(el => {
      if (el !== this) el.inert = on;
    });
  }

  /* ---------------- drag ---------------- */

  _startDrag(e) {
    if (e.target.closest('button')) return;
    this._isDragging = true;
    this._startX = e.clientX;
    this._startY = e.clientY;
    const rect = this._dialog.getBoundingClientRect();
    this._baseX = rect.left;
    this._baseY = rect.top;
    this._dialog.setPointerCapture(e.pointerId);
  }

  _onDrag(e) {
    if (!this._isDragging) return;
    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;
    this._dialog.style.left = `${this._baseX + dx}px`;
    this._dialog.style.top = `${this._baseY + dy}px`;
    this._dialog.style.position = 'absolute';
  }

  _onDragEnd() {
    this._isDragging = false;
  }

  /* ---------------- positioning ---------------- */

  _center() {
    if (getDeviceType_Robust() !== 'desktop') {
      this._dialog.style.marginTop = '10px';
    }
  }

  /* ---------------- public API ---------------- */

  close() {
    this.remove();
    this.dispatchEvent(
      new CustomEvent('smart-dialog-canceled', {
        bubbles: true,
        composed: true
      })
    );
  }
}

customElements.define('smart-dialog-gpt', SmartDialogGPT);
