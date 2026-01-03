// combo-chip.js
const chipTemplate = document.createElement('template');
chipTemplate.innerHTML = `
  <style>
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px 4px;
      border-radius: 999px;
      background: var(--sl-color-neutral-200);
      color: var(--sl-color-neutral-700);
      font-size: 1.0rem;
    }
    .chip-remove {
      cursor: pointer;
      font-size: 1.2rem;
      user-select: none;
    }
  </style>
  <div class="chip">
    <span id="label"></span>
    <span class="chip-remove">✗</span>

  </div>
`;

class ComboChip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(
      chipTemplate.content.cloneNode(true)
    );
    this.labelEl = this.shadowRoot.querySelector('#label');
    this.removeEl = this.shadowRoot.querySelector('.chip-remove');
  }

  connectedCallback() {
    this.removeEl.addEventListener('click', this._onRemove);
  }

  disconnectedCallback() {
    this.removeEl.removeEventListener('click', this._onRemove);
  }

  set label(text) {
    this.labelEl.textContent = text;
  }

  get label() {
    return this.labelEl.textContent;
  }

  _onRemove = (e) => {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('chip-remove', {
      detail: { value: this.label },
      bubbles: true,
      composed: true
    }));
  };
}

customElements.define('combo-chip', ComboChip);
