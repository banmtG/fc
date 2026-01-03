// simple-combobox.js
// Requires Shoelace JS/CSS already loaded globally.

const simpleTemplate = document.createElement('template');
simpleTemplate.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      font-family: var(--sl-font-sans);
    }

    .container {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    sl-popup::part(popup) {
      width: 100%;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      padding: 2px;
    }

    .content {
      padding: 8px 10px;
      font-size: 0.9rem;
    }
  </style>

  <div class="container">
    <sl-input id="input" placeholder="Type something..."></sl-input>

    <sl-popup id="popup" placement="bottom-start" anchor="input" distance="8">
      <div class="content" id="content"></div>
      <!-- ✅ Hardcoded checkbox row -->
      <div class="row" id="test-row">
        <sl-checkbox id="test-check"></sl-checkbox>
        <span>Hardcoded Option</span>
      </div>
    </sl-popup>
  </div>
`;

class SimpleCombobox extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' }).appendChild(
      simpleTemplate.content.cloneNode(true)
    );

    this.input = this.shadowRoot.querySelector('#input');
    this.popup = this.shadowRoot.querySelector('#popup');
    this.content = this.shadowRoot.querySelector('#content');
    this.testCheck = this.shadowRoot.querySelector('sl-checkbox');

    this._onFocus = this._onFocus.bind(this);
    this._onInput = this._onInput.bind(this);
    this._onFocusOut = this._onFocusOut.bind(this);
  }
connectedCallback() {
  this.input.addEventListener("focus", this._onFocus);
  this.input.addEventListener("input", this._onInput);

  // ✅ Close popup only when clicking outside component
  this._onDocumentClick = (e) => {
    if (!this.contains(e.target)) {
      this.popup.active = false;
    }
  };

  document.addEventListener("mousedown", this._onDocumentClick);
}

disconnectedCallback() {
  this.input.removeEventListener("focus", this._onFocus);
  this.input.removeEventListener("input", this._onInput);
  document.removeEventListener("mousedown", this._onDocumentClick);
}

  // Show popup and update content
  _onFocus() {
    this._updatePopupContent();
    this.popup.active = true;
  }

  // Update content while typing
  _onInput() {
    this._updatePopupContent();
  }

  _updatePopupContent() {
    const value = this.input.value.trim();
    this.content.textContent = value ? `You typed: "${value}"` : 'Start typing...';
  }

  // Close popup only when focus leaves BOTH input and popup
_onFocusOut() {
  requestAnimationFrame(() => {
    const active = this.shadowRoot.activeElement;

    // ✅ Keep open if focus is still on input
    if (active === this.input) return;

    // ✅ Keep open if click was inside popup
    if (this.popup.contains(document.activeElement)) return;

    this.popup.active = false;
  });
}



}

customElements.define('simple-combobox', SimpleCombobox);
