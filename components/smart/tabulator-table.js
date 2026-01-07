// tabulator-table.js LIGHT DOM

// 🔒 Ensure CSS is only loaded ONCE
if (!document.querySelector('link[data-tabulator-table]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";

  // ✅ Resolve relative to THIS FILE, not the HTML
  link.href = new URL("./tabulator-table.css", import.meta.url).href;

  link.dataset.smartTable = "true";
  document.head.appendChild(link);
}

class TabulatorTable extends HTMLElement {
  constructor() {
    super();
    this._table = null;
    this._data = [];
    this._columns = null;
    this._columnBuilder = null;  
  }

  /* ---------- public API ---------- */
  set data(value) {
    this._data = Array.isArray(value) ? value : [];
    if (this.isConnected) this._init();
  }

  set columns(value) {
    this._columns = Array.isArray(value) ? value : null;
    if (this.isConnected) this._init();
  }

  set columnBuilder(fn) {
    this._columnBuilder = typeof fn === "function" ? fn : null;
    if (this.isConnected) this._init();
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    if (this._data.length) this._init();
  }

  disconnectedCallback() {
    this._destroy();
  }

  /* ---------- internal ---------- */

  _destroy() {
    if (this._table) {
      this._table.destroy();
      this._table = null;
    }
  }

  _init() {
    this._destroy();

    requestAnimationFrame(() => {
      this._table = new Tabulator(this, {
        data: this._data,
        layout: "fitColumns",
        autoResize: false,
        resizeTable: false,
        selectable: true,

        columns: this._resolveColumns(),
      });
    });
  }

  _resolveColumns() {
    if (this._columns) return this._columns;
    if (this._columnBuilder) return this._columnBuilder(this._data);
    return this._autoColumns(this._data);
  }

  _autoColumns(data) {
    if (!data.length) return [];
    return Object.keys(data[0]).map(key => ({
      title: key,
      field: key,
    }));
  }

  
}

customElements.define("tabulator-table", TabulatorTable);