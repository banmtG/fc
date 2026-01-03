import '../delete-button.js';

const menuTemplate = document.createElement('template');
menuTemplate.innerHTML = `
  <style>
    sl-menu { overflow-y: auto; }

    .row-content {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0;
    }

    .row-content sl-checkbox {
      margin-right: 2px;
    }

    .row-content span {
      flex: 1; /* label grows to fill space */
    }

    .row-content delete-button {
      margin-left: auto; /* push delete button to far right */
    }

    .add-row { padding: 2px 4px; cursor: pointer; font-weight: 600; }
    .newly-added { animation: new-item-flash 1.5s ease-out forwards; }

    @keyframes new-item-flash {
      0%   { background-color: var(--sl-color-primary-300); }
      100% { background-color: transparent; }
    }

    .highlighted { background-color: var(--sl-color-primary-100); border-radius: 4px; }
  </style>
  <sl-menu size="small" id="menu"></sl-menu>
`;

class ComboMenu extends HTMLElement {
  static get observedAttributes() {
    return ['max-height', 'allow-delete', 'confirm-delete'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(
      menuTemplate.content.cloneNode(true)
    );
    this.menu = this.shadowRoot.querySelector('#menu');

    this._options = [];
    this._selected = new Set();
    this._filter = '';
    this._rowCleanups = new Set();
    this._lastAdded = null;
    this._highlightIndex = -1;
    this._visibleItems = [];
  }

  connectedCallback() {
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.addEventListener('keydown', this._onKeyDown, true);
    this._applyAttributes();
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this._onKeyDown, true);
    for (const fn of this._rowCleanups) fn();
    this._rowCleanups.clear();
  }

  attributeChangedCallback() {
    this._applyAttributes();
    this._renderMenu();
  }

  _applyAttributes() {
    const mh = this.getAttribute('max-height');
    if (mh) {
      this.menu.style.maxHeight = mh;
      this.menu.style.overflowY = 'auto';
    } else {
      this.menu.style.maxHeight = '';
      this.menu.style.overflowY = '';
    }
  }

  set options(list) {
    this._options = Array.isArray(list) ? [...list] : [];
    this._renderMenu();
  }

  set selected(list) {
    this._selected = new Set(Array.isArray(list) ? list : []);
    this._renderMenu();
  }

  set filter(text) {
    this._filter = (text || '').toLowerCase();
    this._renderMenu();
  }

  set lastAdded(value) {
    this._lastAdded = value;
  }

  // ---------- rendering ----------
  _renderMenu() {
    for (const fn of this._rowCleanups) fn();
    this._rowCleanups.clear();
    this.menu.innerHTML = '';

    const typed = (this._filter || '').trim();
    const matches = this._options.filter(opt =>
      opt.toLowerCase().includes(this._filter)
    );

    this._visibleItems = [];
    if (typed && !this._options.includes(typed)) {
      this._visibleItems.push({ type: 'add', value: typed });
    }
    for (const m of matches) {
      this._visibleItems.push({ type: 'item', value: m });
    }

    if (this._highlightIndex < 0 || this._highlightIndex >= this._visibleItems.length) {
      this._highlightIndex = this._visibleItems.length > 0 ? 0 : -1;
    }

    this._visibleItems.forEach((vi, idx) => {
      const menuItem = document.createElement('sl-menu-item');
      menuItem.dataset.value = vi.value;
      menuItem.dataset.type = vi.type;

      if (vi.type === 'add') {
        const addRow = document.createElement('div');
        addRow.className = 'add-row';
        addRow.textContent = `Add "${vi.value}"`;
        if (idx === this._highlightIndex) addRow.classList.add('highlighted');
        menuItem.appendChild(addRow);
        this.menu.appendChild(menuItem);

        const onAddClick = (e) => {
          e.stopPropagation();
          this._emitAdd(vi.value);
          this._refocus();
        };
        addRow.addEventListener('click', onAddClick);
        this._rowCleanups.add(() => addRow.removeEventListener('click', onAddClick));
        return;
      }

      // Build row content
      const row = document.createElement('div');
      row.className = 'row-content';
      if (idx === this._highlightIndex) row.classList.add('highlighted');

      const checkbox = document.createElement('sl-checkbox');
      checkbox.checked = this._selected.has(vi.value);
      checkbox.tabIndex = -1;

      const label = document.createElement('span');
      label.textContent = vi.value;

      row.appendChild(checkbox);
      row.appendChild(label);

      // Conditionally add delete-button
      if (this.hasAttribute('allow-delete')) {
        const deleteBtn = document.createElement('delete-button');
        if (this.hasAttribute('confirm-delete')) {
          deleteBtn.setAttribute('confirm-delete', '');
        }
        const onDeleteConfirmed = () => {
          this.dispatchEvent(new CustomEvent('option-action', {
            detail: { value: vi.value, action: 'delete' },
            bubbles: true,
            composed: true
          }));
        };
        deleteBtn.addEventListener('delete-confirmed', onDeleteConfirmed);
        this._rowCleanups.add(() => {
          deleteBtn.removeEventListener('delete-confirmed', onDeleteConfirmed);
        });
        row.appendChild(deleteBtn);
      }

      menuItem.appendChild(row);
      this.menu.appendChild(menuItem);

      if (vi.value === this._lastAdded) {
        row.classList.add('newly-added');
        requestAnimationFrame(() => {
          menuItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        setTimeout(() => {
          row.classList.remove('newly-added');
          this._lastAdded = null;
        }, 1600);
      }

      const onCheckboxChange = (e) => {
        e.stopPropagation();
        this._toggleLocal(vi.value, checkbox);
        this._emitToggle(vi.value);
        this._refocus();
      };
      checkbox.addEventListener('sl-change', onCheckboxChange);

      const onRowClick = (e) => {
        console.log(e.target);        
        e.stopPropagation(); // prevents outside-close
        
        const deleteButton = e.target.closest("delete-button");
         if (deleteButton) return;

        this._toggleLocal(vi.value, checkbox);
        this._emitToggle(vi.value);
        this._refocus();
      };
      row.addEventListener('click', onRowClick);

      this._rowCleanups.add(() => {
        checkbox.removeEventListener('sl-change', onCheckboxChange);
        row.removeEventListener('click', onRowClick);
      });
    });
  }

  // ---------- keyboard ----------
  _onKeyDown = (e) => {
    console.log(e);
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (this._visibleItems.length === 0 || this._highlightIndex < 0) {
      this._refocus();
      return;
    }

    if (e.key === 'ArrowDown') {
      this._highlightIndex = (this._highlightIndex + 1) % this._visibleItems.length;
      this._applyHighlight();
      this._refocus();
      return;
    }

    if (e.key === 'ArrowUp') {
      this._highlightIndex = (this._highlightIndex - 1 + this._visibleItems.length) % this._visibleItems.length;
      this._applyHighlight();
      this._refocus();
      return;
    }

    const current = this._visibleItems[this._highlightIndex];
    if (!current) {
      this._refocus();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      if (current.type === 'add') {
        this._emitAdd(current.value);
        this._refocus();
        return;
      }
      const { checkbox } = this._findDomForIndex(this._highlightIndex);
      this._toggleLocal(current.value, checkbox);
      this._emitToggle(current.value);
      this._refocus();
      return;
    }
  };

  // ---------- highlight ----------
  _applyHighlight() {
    const nodes = [...this.menu.querySelectorAll('sl-menu-item')];
    nodes.forEach((node, idx) => {
      const type = node.dataset.type;
      const content = type === 'add'
        ? node.querySelector('.add-row')
        : node.querySelector('.row-content');
      if (!content) return;
      if (idx === this._highlightIndex) {
        content.classList.add('highlighted');
        node.scrollIntoView({ block: 'nearest' });
      } else {
          content.classList.remove('highlighted');
      }
    });
  }

  // ---------- helpers ----------
  _findDomForIndex(index) {
    const nodes = [...this.menu.querySelectorAll('sl-menu-item')];
    const node = nodes[index];
    if (!node) return { node: null, checkbox: null, content: null };
    const checkbox = node.querySelector('sl-checkbox');
    const content = node.dataset.type === 'add'
      ? node.querySelector('.add-row')
      : node.querySelector('.row-content');
    return { node, checkbox, content };
  }

  _refocus() {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
      this.focus({ preventScroll: true });
    });
  }

  _toggleLocal(value, checkbox) {
    if (checkbox) checkbox.checked = !checkbox.checked;
    if (this._selected.has(value)) {
      this._selected.delete(value);
    } else {
      this._selected.add(value);
    }
  }

  // ---------- emitters ----------
  _emitAdd(value) {
    this.dispatchEvent(new CustomEvent('option-add', {
      detail: { value },
      bubbles: true,
      composed: true
    }));
  }

  _emitToggle(value) {
    this.dispatchEvent(new CustomEvent('option-toggle', {
      detail: { value },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('combo-menu', ComboMenu);
