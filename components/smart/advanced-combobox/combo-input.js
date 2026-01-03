import './combo-chip.js';

const inputTemplate = document.createElement('template');
inputTemplate.innerHTML = `
  <style>
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }    
  </style>
  <sl-input id="input" clearable>
    <div slot="prefix" class="chips" id="chips"></div>
  </sl-input>
`;

class ComboInput extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'placeholder'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(
      inputTemplate.content.cloneNode(true)
    );
    this.input = this.shadowRoot.querySelector('#input');
    this.chipsContainer = this.shadowRoot.querySelector('#chips');
    this._selected = [];
  }

  connectedCallback() {
    this.input.addEventListener('input', this._onInput);
    this.input.addEventListener('sl-clear', this._onClear);
    this.input.addEventListener('focus', this._onFocus);
    this.input.addEventListener('click', this._onFocus);

    // apply initial attributes
    this._applyAttributes();
  }

  disconnectedCallback() {
    this.input.removeEventListener('input', this._onInput);
    this.input.removeEventListener('sl-clear', this._onClear);
    this.input.removeEventListener('focus', this._onFocus);
    this.input.removeEventListener('click', this._onFocus);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this._applyAttributes();
  }

  _applyAttributes() {
    if (this.hasAttribute('label')) {
      this.input.label = this.getAttribute('label');
    } else {
      this.input.removeAttribute('label');
    }

    if (this.hasAttribute('placeholder')) {
      this.input.placeholder = this.getAttribute('placeholder');
    } else {
      this.input.removeAttribute('placeholder');
    }
  }

  set selected(list) {
    this._selected = Array.isArray(list) ? [...list] : [];
    this._renderChips();
  }

  get selected() {
    return [...this._selected];
  }

  get typedValue() {
    return this.input.value.trim();
  }

  clearTyped() {
    this.input.value = '';
  }

  get focusTarget() {
    return this.input;
  }

  _onInput = (e) => {
    // console.log(`on_inPut`, e);
    this.dispatchEvent(new CustomEvent('typed-change', {
      detail: { value: this.typedValue },
      bubbles: true,
      composed: true
    }));
  };

  _onClear = () => {
    this.clearTyped();
    this.dispatchEvent(new CustomEvent('typed-change', {
      detail: { value: '' },
      bubbles: true,
      composed: true
    }));
  };

  _onFocus = () => {
    this.dispatchEvent(new CustomEvent('input-focus', {
      bubbles: true,
      composed: true
    }));
  };

  _renderChips() {
    this.chipsContainer.innerHTML = '';
    this._selected.forEach(item => {
      const chip = document.createElement('combo-chip');
      chip.label = item;
      chip.addEventListener('chip-remove', (e) => {
        this.dispatchEvent(new CustomEvent('chip-remove', {
          detail: { value: e.detail.value },
          bubbles: true,
          composed: true
        }));
      });
      this.chipsContainer.appendChild(chip);
    });
  }
}

customElements.define('combo-input', ComboInput);
