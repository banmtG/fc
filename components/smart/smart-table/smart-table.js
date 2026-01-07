import { createRow } from "./utils/rowFactory.js";
import {clearSelectionVisuals,applySelection,toggleSelection,emitSelectionChanged,clearHighlight,setHighlight, requestDelete, selectRows } from "./utils/selectionUtils.js";
import { addRow, handleHeaderClick } from "./utils/handlers.js";

const cssUrl = new URL("./smart-table.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <div class="table">
    <div class="header"></div>
    <div class="body"></div>
  </div>
`;

class SmartTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Clone template content into shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // Internal state
    this._data = [];
    this._columns = [];
    this._rowMap = new Map();
    this._selected = new Set();
    this._highlightId = null;
    this._idKey = "id";
    this._sortState = { key: null, dir: null };

    // Cache references
    this._header = this.shadowRoot.querySelector(".header");
    this._body = this.shadowRoot.querySelector(".body");

    // Bind handlers
    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    // Event listeners
    this.shadowRoot.addEventListener("click", this._onClick);
    this.addEventListener("keydown", this._onKeyDown);
    this.setAttribute("tabindex", "0");
  }

  set data(arr) {
    this._data = Array.isArray(arr) ? arr : [];
    if (this.isConnected) this._renderInitial();
  }

  get data() { return this._data; }

  getSelected() { return Array.from(this._selected); }

  connectedCallback() {
    if (this._data.length) this._renderInitial();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._onClick);
    this.removeEventListener("keydown", this._onKeyDown);
    this._rowMap.clear();
    this._selected.clear();
    this._highlightId = null;
  }

  // Rendering
  _renderInitial() {
    const body = this.shadowRoot.querySelector(".body");
    const header = this.shadowRoot.querySelector(".header");
    body.innerHTML = "";
    header.innerHTML = "";
    this._rowMap.clear();

    if (!this._data.length) {
      body.innerHTML = `<div class="empty">No data available</div>`;
      return;
    }

    // Use provided column config or derive from data keys
    let columnDefs = this.columns && Array.isArray(this.columns)
      ? this.columns
      : Object.keys(this._data[0]).map(k => ({ key: k, label: k }));

    // Ensure idKey is first if present
    const idIdx = columnDefs.findIndex(c => c.key === this._idKey);
    if (idIdx > 0) {
      const idCol = columnDefs.splice(idIdx, 1)[0];
      columnDefs.unshift(idCol);
    }

    // Filter hidden columns
    const visibleCols = columnDefs.filter(c => !c.hidden);

    // Build grid template from widths
    this._templateCols = visibleCols.map(c => c.width || "1fr").join(" ");
    header.style.gridTemplateColumns = this._templateCols;

    // Render header cells
    for (const col of visibleCols) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = col.label || col.key;
      cell.dataset.key = col.key;
      header.appendChild(cell);
    }

    // Render rows using rowFactory
    for (const obj of this._data) {
      const rowEl = createRow(obj, visibleCols, this._templateCols, this._idKey);
      body.appendChild(rowEl);
      this._rowMap.set(String(obj[this._idKey]), rowEl);
    }

    // Restore selection and highlight
    applySelection(this.shadowRoot, this._rowMap, this._selected);
    if (this._highlightId) {
      const row = this._rowMap.get(this._highlightId);
      if (row) row.classList.add("highlight");
    }
  }


  // Click events
 _onClick(e) {
  const target = e.target;

  // 1. Header sort
  if (
    target.classList.contains("cell") &&
    target.parentElement.classList.contains("header") &&
    target.dataset.key
  ) {
    const colDef = this.columns.find(c => c.key === target.dataset.key);

    // Default to sortable unless explicitly false
    if (colDef && colDef.sortable !== false) {
      handleHeaderClick(this, target);
      return;
    }
  }

  // 2. Column‑level events (delegated)
  const cell = target.closest(".cell");
  const row = target.closest(".row");
  if (cell && row) {
    const id = row.dataset.id;
    const obj = this._data.find(d => String(d[this._idKey]) === id);

    const colKey = cell.dataset.key;
    const colDef = this.columns?.find(c => c.key === colKey);

    if (colDef && colDef.events) {
      for (const [evt, handler] of Object.entries(colDef.events)) {
        if (evt === e.type) {
          handler(e, row, obj);
          return;
        }
      }
    }
  }

  // 3. Row selection + highlight
  if (row) {
    const id = row.dataset.id;

    if (e.shiftKey && this._highlightId) {
      // SHIFT: select range from last highlight to current
      const allIds = this._data.map(d => String(d[this._idKey]));
      const startIdx = allIds.indexOf(this._highlightId);
      const endIdx = allIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        this._selected.clear();
        clearSelectionVisuals(this.shadowRoot);
        for (let i = from; i <= to; i++) {
          const rid = allIds[i];
          this._selected.add(rid);
          const rEl = this._rowMap.get(rid);
          if (rEl) rEl.classList.add("selected");
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      // CTRL/META: toggle single row
      toggleSelection(this.shadowRoot, this._rowMap, this._selected, id, true);
    } else {
      // Normal click: single selection
      clearSelectionVisuals(this.shadowRoot);
      this._selected.clear();
      this._selected.add(id);
      row.classList.add("selected");
    }

    // Always update highlight to the last clicked row
    this.setHighlight(id);

    emitSelectionChanged(this, this._selected);
  }
}

  // Keyboard events
  _onKeyDown(e) {
    const rows = Array.from(this.shadowRoot.querySelectorAll(".row"));
    if (!rows.length) return;

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      let idx = this._highlightId
        ? rows.findIndex(r => r.dataset.id === this._highlightId)
        : -1;

      if (e.key === "ArrowUp") {
        idx = idx > 0 ? idx - 1 : rows.length - 1;
      } else {
        idx = idx < rows.length - 1 ? idx + 1 : 0;
      }
      this.setHighlight(rows[idx].dataset.id);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!this._highlightId) return;

      const id = this._highlightId;
      const row = this._rowMap.get(id);

      // Check for multi-select modifier
      const multi = e.ctrlKey || e.metaKey || e.shiftKey;

      if (multi) {
        // Toggle highlighted row in selection set
        if (this._selected.has(id)) {
          this._selected.delete(id);
          if (row) row.classList.remove("selected");
        } else {
          this._selected.add(id);
          if (row) row.classList.add("selected");
        }
      } else {
        // Single select: clear everything, then add highlighted row
        clearSelectionVisuals(this.shadowRoot);
        this._selected.clear();
        this._selected.add(id);
        if (row) row.classList.add("selected");
      }

      emitSelectionChanged(this, this._selected);
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      if (this._selected.size > 0) {
        // console.log(this._selected);
        const arraySelected = Array.from(this._selected);
        const msg = this._selected.size === 1
          ? "Are you sure you want to delete this row?"
          : `Are you sure you want to delete these ${arraySelected.length} rows?`;
        if (confirm(msg)) this._requestDelete(arraySelected);
      }
      return;
    }
  }

  // Highlight helpers
  setHighlight(id) { setHighlight(this, id); }   
  _clearHighlight() { clearHighlight(this); }
  // Selection emit
  _emitSelectionChanged() {  emitSelectionChanged(this, this._selected);  }
  // Data ops
  addRow(obj) { addRow(this, obj); }

  
  _requestDelete(ids) {     
    requestDelete(this, ids); 
  }  

  selectRows(ids = [], multi = true) { selectRows(this, ids, multi); }
}

customElements.define("smart-table", SmartTable);
