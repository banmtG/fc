import Sortable from '../../lib/sortableJS/sortable.complete.esm.js';

class SortableItems extends HTMLElement {
  static get observedAttributes() {
    return ['layout']; // 'column' | 'row'
  }

  constructor() {
    super();
    this._items = [];
    this._renderer = null;
    this._itemStyle = null;
    this._sortable = null;
    this._abort = new AbortController();
  }

  connectedCallback() {
    if (this._abort.signal.aborted) {
      this._abort = new AbortController();
    }

    // Inject template directly into light DOM
    this.innerHTML = `
    <style>
    .sContainer {
      border: 1px solid #ccc;
      user-select: none;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      align-content: flex-start;
      gap: 10px;
      width: 100%;
      height:100%;
      overflow-x: scroll;
      flex-wrap: wrap;
    }
      .sItem.selected {
      background: #cce5ff;
      border-color: #3399ff;
    }
    </style>
      <div id="container" class="sContainer"></div>
    `;

    // Apply initial layout
    this._applyLayout();
    this._render();

    const container = this.querySelector('#container');
    this._sortable = new Sortable(container, {
      animation: 150,
      multiDrag: true,
      selectedClass: 'selected',
      fallbackTolerance: 3,
      onEnd: () => {
        const ids = Array.from(container.children).map(el => el.dataset.id);
        this.dispatchEvent(new CustomEvent('order-change', { detail: { ids } }));
      },
      onSelect: (evt) => {
        const selectedIDs = Array.from(this.querySelectorAll('.selected'))
          .map(el => el.dataset.id);
        this.dispatchEvent(new CustomEvent('selection-change', {
          detail: { type: 'select', id: evt.item?.dataset?.id, ids: selectedIDs }
        }));
      },
      onDeselect: (evt) => {
        const selectedIDs = Array.from(this.querySelectorAll('.selected'))
          .map(el => el.dataset.id);
        this.dispatchEvent(new CustomEvent('selection-change', {
          detail: { type: 'deselect', id: evt.item?.dataset?.id, ids: selectedIDs }
        }));
      }
    });

    const { signal } = this._abort;
    container.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.sItem');
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      const item = this._items.find(i => i.id === id);
      this.dispatchEvent(new CustomEvent('item-click', { detail: { id, item } }));
    }, { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
    if (this._sortable) {
      this._sortable.destroy();
      this._sortable = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'layout' && oldVal !== newVal) {
      this._applyLayout();
    }
  }

  set items(arr) {
    this._items = Array.isArray(arr) ? arr.slice() : [];
    this._render();
  }
  get items() { return this._items.slice(); }

  set renderer(fn) {
    this._renderer = typeof fn === 'function' ? fn : null;
    this._render();
  }
  get renderer() { return this._renderer; }

  set itemStyle(obj) {
    this._itemStyle = (obj && typeof obj === 'object') ? obj : null;
    this._render();
  }
  get itemStyle() { return this._itemStyle; }

  getOrder() {
    const container = this.querySelector('#container');
    return Array.from(container.children).map(el => el.dataset.id);
  }

  setOrder(ids) {
    const container = this.querySelector('#container');
    const map = new Map(this._items.map(i => [i.id, i]));
    this._items = ids.map(id => map.get(id)).filter(Boolean);
    this._render();
    this.dispatchEvent(new CustomEvent('order-change', { detail: { ids } }));
  }

  _applyLayout() {
    const container = this.querySelector('#container');
    if (!container) return;
    const layout = (this.getAttribute('layout') || 'column').toLowerCase();
    container.style.flexDirection = (layout === 'row') ? 'row' : 'column';
  }


  _render() {
    const container = this.querySelector('#container');
    if (!container) return;
    container.innerHTML = '';

    for (const item of this._items) {
      const el = document.createElement('div');
      el.className = 'sItem';
      el.dataset.id = item.id;

      if (this._itemStyle) {
        for (const [k, v] of Object.entries(this._itemStyle)) {
          el.style[k] = v;
        }
      }

      if (this._renderer) {
        const rendered = this._renderer(item);
        if (typeof rendered === 'string') {
          el.innerHTML = rendered;
        } else if (rendered instanceof HTMLElement) {
          el.innerHTML = '';
          el.appendChild(rendered);
        }
      } else {
        el.innerHTML = `
          ${item.img ? `<img src="${item.img}" alt="${item.title ?? item.id}">` : ''}
          <div>${item.title ?? item.id}</div>
        `;
      }

      container.appendChild(el);
    }
  }
}

customElements.define('sortable-items', SortableItems);
