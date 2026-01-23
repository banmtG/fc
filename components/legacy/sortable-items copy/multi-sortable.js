// multi-sortable.js
export class MultiSortable extends HTMLElement {
  constructor() {
    super();
    this._items = [];
    this._selected = new Set();
    this._dragGroup = null;
    this._placeholder = null;
    this._abort = new AbortController();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .ms-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border: 1px solid #ccc;
          padding: 8px;
        }
        .ms-item {
          width: 120px;
          height: 120px;
          border: 1px solid #999;
          background: #f9f9f9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
          cursor: grab;
        }
        .ms-item img {
          width: 100%;
          height: 80px;
          object-fit: cover;
        }
        .ms-item.selected {
          background: #cce5ff;
          border-color: #3399ff;
        }
        .ms-placeholder {
          width: 120px;
          height: 120px;
          border: 2px dashed #3399ff;
          background: rgba(51,153,255,0.1);
        }
      </style>
      <div class="ms-container"></div>
    `;
    this._container = this.shadowRoot.querySelector('.ms-container');
  }

  connectedCallback() {
    const { signal } = this._abort;

    // Selection
    this._container.addEventListener('click', e => {
      const itemEl = e.target.closest('.ms-item');
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      if (e.ctrlKey) {
        if (this._selected.has(id)) {
          this._selected.delete(id);
          itemEl.classList.remove('selected');
        } else {
          this._selected.add(id);
          itemEl.classList.add('selected');
        }
      } else {
        this._selected.clear();
        this._container.querySelectorAll('.ms-item.selected')
          .forEach(el => el.classList.remove('selected'));
        this._selected.add(id);
        itemEl.classList.add('selected');
      }
      this.dispatchEvent(new CustomEvent('selection-change', {
        detail: { ids: Array.from(this._selected) }
      }));
    }, { signal });

    // Drag start
    this._container.addEventListener('dragstart', e => {
      const itemEl = e.target.closest('.ms-item');
      if (!itemEl) return;
      const id = itemEl.dataset.id;
      this._dragGroup = (this._selected.size > 1 && this._selected.has(id))
        ? Array.from(this._selected)
        : [id];
      if (!this._placeholder) {
        this._placeholder = document.createElement('div');
        this._placeholder.className = 'ms-placeholder';
      }
      e.dataTransfer.effectAllowed = 'move';
    }, { signal });

    // Drop
    this._container.addEventListener('drop', e => {
      e.preventDefault();
      if (!this._dragGroup || !this._placeholder) return;

      const fragment = document.createDocumentFragment();
      this._dragGroup.forEach(id => {
        const el = this._container.querySelector(`.ms-item[data-id="${id}"]`);
        if (el) fragment.appendChild(el);
      });

      // Replace placeholder with dragged group
      if (this._placeholder.parentNode === this._container) {
        this._container.replaceChild(fragment, this._placeholder);
      }

      this._placeholder = null;
      this._updateOrder();
      this._dragGroup = null;
    }, { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  set items(arr) {
    this._items = Array.isArray(arr) ? arr.slice() : [];
    this._render();
  }
  get items() { return this._items.slice(); }

  _render() {
    this._container.innerHTML = '';
    for (const item of this._items) {
      const el = document.createElement('div');
      el.className = 'ms-item';
      el.dataset.id = item.id;
      el.draggable = true;
      el.innerHTML = `
        <img src="${item.img}" alt="${item.title}">
        <div>${item.title}</div>
      `;

      // Attach dragenter only to the item itself
      el.addEventListener('dragenter', e => {
        e.preventDefault();
        if (!this._dragGroup) return;
        if (!this._selected.has(el.dataset.id)) {
          if (!this._placeholder) {
            this._placeholder = document.createElement('div');
            this._placeholder.className = 'ms-placeholder';
          }
          if (this._placeholder.parentNode !== this._container) {
            this._container.insertBefore(this._placeholder, el);
          } else {
            this._container.insertBefore(this._placeholder, el);
          }
        }
      });

      this._container.appendChild(el);
    }
  }

  _updateOrder() {
    const ids = Array.from(this._container.children)
      .filter(el => el.classList.contains('ms-item'))
      .map(el => el.dataset.id);
    const map = new Map(this._items.map(i => [i.id, i]));
    this._items = ids.map(id => map.get(id)).filter(Boolean);
    this.dispatchEvent(new CustomEvent('order-change', { detail: { ids } }));
  }
}

customElements.define('multi-sortable', MultiSortable);
