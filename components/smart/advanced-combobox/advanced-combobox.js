// advanced-combobox.js
import './combo-input.js';
import './combo-menu.js';
import './combo-chip.js';

const comboTemplate = document.createElement('template');
comboTemplate.innerHTML = `
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
      padding: 6px 0;
    }
    /* Hidden capture slot for row actions provided by the app */
    .hidden-slot {
      display: none;
    }
  </style>
  <div class="container">
    <combo-input id="comboInput" placeholder="Tags: select or add a new tag"></combo-input>
    <sl-popup id="popup" placement="bottom-start" distance="0" close-on-outside-click>
      <combo-menu id="comboMenu"></combo-menu>
    </sl-popup>
    <div class="hidden-slot">
      <slot name="row-actions" id="rowActionsSlot"></slot>
    </div>
  </div>
`;

class AdvancedCombobox extends HTMLElement {
  static get observedAttributes() {
    return ['max-height', 'allow-delete', 'need-confirm'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(
      comboTemplate.content.cloneNode(true)
    );

    this.inputComp = this.shadowRoot.querySelector('#comboInput');
    this.menuComp = this.shadowRoot.querySelector('#comboMenu');
    this.popup = this.shadowRoot.querySelector('#popup');
    this.rowActionsSlot = this.shadowRoot.querySelector('#rowActionsSlot');

    this._options = [];
    this._selected = new Set();

    // this._onDocMouseDown = this._onDocMouseDown.bind(this);

     // bind once
    this._onDocPointerDown = this._onDocPointerDown.bind(this);
    
  }

  connectedCallback() {

    this.popup.anchor = this.inputComp.focusTarget;

    this.inputComp.addEventListener('typed-change', this._onTypedChange);
    this.inputComp.addEventListener('chip-remove', this._onChipRemove);
    this.inputComp.addEventListener('input-focus', this._onInputFocus);

    this.menuComp.addEventListener('option-toggle', this._onOptionToggle);
    this.menuComp.addEventListener('option-add', this._onOptionAdd);
    this.menuComp.addEventListener('option-action', this._onOptionAction);


        // 🔹 NEW: listen for Esc close event from combo-menu
    this.menuComp.addEventListener('combo-menu-close', () => {
      this._hidePopup();
    });
    //document.addEventListener('mousedown', this._onDocMouseDown);
    //document.addEventListener("pointerdown", this._onDocPointerDown);

    // listen for popup show/hide
    this.popup.addEventListener('sl-show', () => {
      document.addEventListener('pointerdown', this._onDocPointerDown);
    });
    this.popup.addEventListener('sl-hide', () => {
      document.removeEventListener('pointerdown', this._onDocPointerDown);
    });

    // this.popup.addEventListener('mousedown', (e) => e.stopPropagation());

    this.inputComp.focusTarget.addEventListener('keydown', this._onInputKeyDown);

    // collect actions from slot and pass to combo-menu
    this._collectRowActions();
    this.rowActionsSlot.addEventListener('slotchange', this._onRowActionsSlotChange);

    this._applyAttributes();
    this._updateChildren('');
  }

  disconnectedCallback() {
    this.inputComp.removeEventListener('typed-change', this._onTypedChange);
    this.inputComp.removeEventListener('chip-remove', this._onChipRemove);
    this.inputComp.removeEventListener('input-focus', this._onInputFocus);

    this.menuComp.removeEventListener('option-toggle', this._onOptionToggle);
    this.menuComp.removeEventListener('option-add', this._onOptionAdd);
    this.menuComp.removeEventListener('option-action', this._onOptionAction);

    // 🔹 NEW: remove listener for Esc close
    this.menuComp.removeEventListener('combo-menu-close', this._hidePopup);

    //document.removeEventListener('mousedown', this._onDocMouseDown);
    // safety: ensure listener is removed
    document.removeEventListener("pointerdown", this._onDocPointerDown);

    this.inputComp.focusTarget.removeEventListener('keydown', this._onInputKeyDown);

    this.rowActionsSlot.removeEventListener('slotchange', this._onRowActionsSlotChange);
  }

  // ---------- outside click handler ----------
  _onDocPointerDown(e) {
  const path = e.composedPath();
    // console.log(e.composedPath());
  // Only treat clicks inside the input element or inside the popup part as "inside"
  const clickedInsideInput = path.includes(this.inputComp); // instead of (this) for the entire component.
  const popupPart = this.popup?.shadowRoot?.querySelector('[part="popup"]');
  const clickedInsidePopup = popupPart && path.includes(popupPart);

  if (!clickedInsideInput && !clickedInsidePopup) {
    this._hidePopup();
  }
}

  // ---------- show/hide helpers ----------
  _showPopup() {
    if (!this.popup.active) {
      // console.log(`addEventListener 'pointerdown'`);
      this.popup.active = true;
      document.addEventListener('pointerdown', this._onDocPointerDown);
   
    }
  }

  _hidePopup() {
    // console.log(`removeEventListener 'pointerdown'`);
    if (this.popup.active) {
      this.popup.active = false;
      document.removeEventListener('pointerdown', this._onDocPointerDown);
      
    }
  }

  attributeChangedCallback() {
    this._applyAttributes();
  }

  _applyAttributes() {
    const mh = this.getAttribute('max-height');
    if (mh) {
      this.popup.style.maxHeight = mh;
      this.popup.style.overflow = 'auto';
      this.menuComp.setAttribute('max-height', mh);
    } else {
      this.popup.style.maxHeight = '';
      this.popup.style.overflow = '';
      this.menuComp.removeAttribute('max-height');
    }

    // mirror allow-delete and need-confirm
    if (this.hasAttribute('allow-delete')) {
      this.menuComp.setAttribute('allow-delete', '');
    } else {
      this.menuComp.removeAttribute('allow-delete');
    }

    if (this.hasAttribute('confirm-delete')) {
      this.menuComp.setAttribute('confirm-delete', '');
    } else {
      this.menuComp.removeAttribute('confirm-delete');
    }
  }
  

  // Expand both direct elements and <template> children
  _collectRowActions() {
    const assigned = this.rowActionsSlot.assignedNodes();
    const actions = [];

    for (const node of assigned) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      if (node.tagName?.toLowerCase() === 'template') {
        const tpl = node;
        const fragmentChildren = [...tpl.content.children];
        fragmentChildren.forEach(el => actions.push(el));
      } else {
        actions.push(node);
      }
    }

    this.menuComp.rowActions = actions;
  }

  _onRowActionsSlotChange = () => this._collectRowActions();

  // ---------- input key handler ----------
  _onInputKeyDown = (e) => {
    // console.log(e);
    if (e.key == 'Escape') this._hidePopup();

    if (e.key !== 'Enter') return;   

    const typed = this.inputComp.typedValue;
    if (typed && !this._options.includes(typed)) {
      e.preventDefault();
      e.stopPropagation();
      this._addNewItem(typed);
    }

  };

  // ---------- handlers ----------
  _onDocMouseDown(e) {
    if (!this.contains(e.target)) this.popup.active = false;
  }

  _onInputFocus = () => {
    this._showPopup();
    this._updateChildren(this.inputComp.typedValue || '');
  };

  _onTypedChange = (e) => {
    this._showPopup();
    this._updateChildren(e.detail.value);
  };

  _onChipRemove = (e) => {
    this._selected.delete(e.detail.value);
    this._updateChildren(this.inputComp.typedValue || '');
    this._emitChange();
  };

  _onOptionToggle = (e) => {
    const val = e.detail.value;
    if (this._selected.has(val)) this._selected.delete(val);
    else this._selected.add(val);
    this._updateChildren(this.inputComp.typedValue || '');
    this._emitChange();
  };

  _onOptionAdd = (e) => {
    const typed = e.detail.value;
    this._addNewItem(typed);
  };

  _onOptionAction = (e) => {
    
    const { value, action } = e.detail;
    console.log(`vao option action`, e, value, action);
    if (action === 'delete') {
      this._options = this._options.filter(o => o !== value);
      this._selected.delete(value);
      this._updateChildren(this.inputComp.typedValue || '');
      this._emitChange();      
      this.dispatchEvent(new CustomEvent('combobox-item-deleted', {
        detail: { value, options: [...this._options] },
        bubbles: true,
        composed: true
      }));
    } else {
      this.dispatchEvent(new CustomEvent('combobox-item-action', {
        detail: { value, action },
        bubbles: true,
        composed: true
      }));
    }
  };

  // ---------- internals ----------
  _addNewItem(typed) {
    this._options.push(typed);
    this._options.sort((a, b) => a.localeCompare(b));
    this._selected.add(typed);
    this.menuComp.lastAdded = typed;
    this.inputComp.clearTyped();
    this._updateChildren('');
    this._emitCreate(typed);
    this._emitChange();
  }

  _updateChildren(filter = '') {
    this.inputComp.selected = [...this._selected];
    const filtered = this._options.filter(opt =>
      opt.toLowerCase().includes((filter || '').toLowerCase())
    );
    this.menuComp.options = filtered;
    this.menuComp.selected = [...this._selected];
    this.menuComp.filter = filter;
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('combobox-selection-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  _emitCreate(typed) {
    this.dispatchEvent(new CustomEvent('combobox-item-created', {
      detail: { value: typed, options: [...this._options]  },
      bubbles: true,
      composed: true
    }));
  }


  set options(list) {
    this._options = Array.isArray(list) ? [...list] : [];
    this._updateChildren(this.inputComp.typedValue || '');
  }

  get options() {
    return [...this._options];
  }

  set value(list) {
    const incoming = Array.isArray(list) ? list : [];
    this._selected = new Set(incoming.filter(item => this._options.includes(item)));
    this._updateChildren(this.inputComp.typedValue || '');
    this._emitChange();
  }

  get value() {
    return [...this._selected];
  }
}

customElements.define('advanced-combobox', AdvancedCombobox);
