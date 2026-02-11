import { createRow, _renderHeaderCell, _renderHeader, _updateRowUI } from "./utils/rowFactory.js";
import {clearSelectionVisuals,applySelection,toggleSelection,emitSelectionChanged,clearHighlight,setHighlight, requestDelete, selectRows } from "./utils/selectionUtils.js";
import { addRow, handleHeaderClick } from "./utils/handlers.js";
import { syncPixelTracks, attachResizeHandles, detachResizeHandles } from './utils/columnWidth.js';
import {confirmDialog} from './../../../core/confirmDialog.js';
const cssUrl = new URL("./smart-table.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <div class="table" id="mainTable" style="overflow-x:auto;">
    <div class="header"></div>
    <div class="body" id="tableBody" style="overflow-y:auto;">
    </div>
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
    this._touchScreen = 0; // 1 ctrl 2 shift
    this._touchScreenFlag = 0;  
    this._hightlightPosition = null;
    // this._idKey = "phraseID";
    this._sortState = { key: null, dir: null };
    this._allowDeleteKey = true; // Allow Delete Key to delete multiple rows

    // Cache references
    this._table = this.shadowRoot.querySelector(".table"); 
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
    // if (this.isConnected) this._renderInitial();
  }

  get data() { return this._data; }

  setSortState(sortState) { 
    this._sortState = sortState; 
   // _renderHeader(this); // re-render header with arrows 
  }

  getSelected() { return Array.from(this._selected); }
  
// Example config:
// extTbl.setColumns([
//   { key: "phrase", label: "Phrase", width: "3fr", min: 120 },
//   { key: "status", label: "Status", width: "2fr", min: 100 },
//   { key: "actions", label: "Actions", width: "120px" }
// ]);

setColumns(columns) {
  this._columns = columns;
  // After header render (so container width is known), compute tracks:
  // requestAnimationFrame(() => this._syncPixelTracks());
}

_syncPixelTracks() {
  syncPixelTracks(this)
}

connectedCallback() {
  this._resizeObserver = new ResizeObserver(() => this._syncPixelTracks());
  this._resizeObserver.observe(this._table);
  
  // if (this._data.length) this._renderInitial();
}

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._onClick);
    this.removeEventListener("keydown", this._onKeyDown);
    if (this._resizeObserver) {
       this._resizeObserver.disconnect();
       this._resizeObserver = null; 
    }
    this._rowMap.clear();
    this._selected.clear();
    this._highlightId = null;
  }

  // Rendering
  _renderInitial() {
    const body = this.shadowRoot.querySelector(".body");
    const header = this.shadowRoot.querySelector(".header");

    // ✅ cleanup old handles before clearing header 
    detachResizeHandles(this);

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
    // const idIdx = columnDefs.findIndex(c => c.key === this._idKey);
    // if (idIdx > 0) {
    //   const idCol = columnDefs.splice(idIdx, 1)[0];
    //   columnDefs.unshift(idCol);
    // }

    // Filter hidden columns
    this._visibleCols = columnDefs.filter(c => !c.hidden);

    // Render header cells
    for (const col of this._visibleCols) {
      const headerCell = _renderHeaderCell(this, col);
      header.appendChild(headerCell);
    }

    attachResizeHandles(this);

    // Render rows using rowFactory
    const total = this._data.length; //subset Local Total
    this._data.forEach((obj, index) => {
      // console.log(obj);
      // console.log(this._idKey);
      
      const rowEl = createRow(
        obj,
        this._visibleCols,
        this._idKey, // "id"
        index,
        total
      );

      body.appendChild(rowEl);
      this._rowMap.set(String(obj[this._idKey]), rowEl);
    });

    // Sync header + body column widths 
    this._syncPixelTracks();

    // Restore selection
    applySelection(this.shadowRoot, this._rowMap, this._selected);

    if (this._highlightId) {
      const row = this._rowMap.get(this._highlightId);
      if (row) { 
        row.classList.add("highlight");
      } else if (this._hightlightPosition) {   
        const rowMapArray = Array.from(this._rowMap.entries());   
        try {
          this._highlightId = rowMapArray[this._hightlightPosition][0];
        } catch {
          this._highlightId = rowMapArray[rowMapArray.length-1][0];
        }
            
        this.setHighlight(this._highlightId);
        // console.log(this._highlightId);
        // const row = this._rowMap.get(this._highlightId);
        // if (row) row.classList.add("highlight");
      }
    } 
  }



  // Click events
 _onClick(e) {
  const target = e.target;

  const cell = target.closest(".cell"); 
  const header = target.closest(".header");

  // 1. Header sort 
  if (cell && header && cell.dataset.key) {
    const colDef = this.columns.find(c => c.key === cell.dataset.key);

    // Default to sortable unless explicitly false
    if (colDef && colDef.sortable !== false) {
      // Ignore clicks on resize handles
      if (!target.closest(".resize-handle")) {
        handleHeaderClick(this, cell);
        return;
      }
    }
  }

  // 2. Column‑level events (delegated) 
  // so we dont need to add to everycell the eventlistener
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
    const allIds = this._data.map(d => String(d[this._idKey]));
    if ((e.shiftKey || this._touchScreen===2) && this._highlightId) {

      // clear shift select
      if (this._touchScreenFlag===1) {
          clearSelectionVisuals(this.shadowRoot);
          this._touchScreenFlag=0;
          this.setHighlight(id);   
          return;
      }
      this._touchScreenFlag++;

      // SHIFT: extend selection from anchor (_highlightId) to current
      const startIdx = allIds.indexOf(this._highlightId);    
      const endIdx = allIds.indexOf(id); 
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

        // Clear visuals but keep existing _selected set
        clearSelectionVisuals(this.shadowRoot);

        // Add all rows in range to selection
        for (let i = from; i <= to; i++) {
          const rid = allIds[i];
          this._selected.add(rid);
          const rEl = this._rowMap.get(rid);
          if (rEl) rEl.classList.add("selected");
        }
      }
      // Anchor (_highlightId) stays the same until a normal/ctrl click
    } else if (e.ctrlKey || e.metaKey || this._touchScreen===1) {
      // CTRL/META: toggle single row, and reset anchor to this row
      toggleSelection(this.shadowRoot, this._rowMap, this._selected, id, true);
      this.setHighlight(id);   
    } else {
      // Normal click: reset selection and anchor
      this._touchScreenFlag=0;
      clearSelectionVisuals(this.shadowRoot);
      this._selected.clear();
      this._selected.add(id);
      row.classList.add("selected");
      this.setHighlight(id);
    }

    emitSelectionChanged(this, this._selected);
  }
}


  // Keyboard events
async _onKeyDown(e) {
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

    if (e.shiftKey) {
      // ✅ SHIFT+Enter/Space: select range from anchor to current
      const allIds = this._data.map(d => String(d[this._idKey]));
      const anchorIdx = allIds.indexOf(this._anchorId || this._highlightId);
      const currentIdx = allIds.indexOf(id);

      if (anchorIdx !== -1 && currentIdx !== -1) {
        const [from, to] = anchorIdx < currentIdx
          ? [anchorIdx, currentIdx]
          : [currentIdx, anchorIdx];

        clearSelectionVisuals(this.shadowRoot);
        this._selected.clear();

        for (let i = from; i <= to; i++) {
          const rid = allIds[i];
          this._selected.add(rid);
          const rEl = this._rowMap.get(rid);
          if (rEl) rEl.classList.add("selected");
        }
      }
      // keep anchor fixed until a normal/ctrl/meta click resets it
    } else if (e.ctrlKey || e.metaKey) {
      // CTRL/META: toggle highlighted row
      if (this._selected.has(id)) {
        this._selected.delete(id);
        if (row) row.classList.remove("selected");
      } else {
        this._selected.add(id);
        if (row) row.classList.add("selected");
      }
      // reset anchor to this row
      this._anchorId = id;
    } else {
      // Normal Enter/Space: single select
      clearSelectionVisuals(this.shadowRoot);
      this._selected.clear();
      this._selected.add(id);
      if (row) row.classList.add("selected");
      // reset anchor to this row
      this._anchorId = id;
    }

    emitSelectionChanged(this, this._selected);
    return;
  }
  if (e.key === "Delete"&&this._allowDeleteKey) {

    e.preventDefault();
    if (this._selected.size > 0) {
      const arraySelected = Array.from(this._selected);
      const msg = this._selected.size === 1
        ? "Are you sure to delete this row?"
        : `Are you sure to delete these ${arraySelected.length} rows?`;
      const confirmed = await confirmDialog.show("⛔ Confirmation",msg);
      if (!confirmed) return;
      this._requestDelete(arraySelected);
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
  addRow(obj, positionIndex) { addRow(this, obj, positionIndex); }

  updateRowUI(id,newRowData) { 
    _updateRowUI(this,id,newRowData) 
  }

  _requestDelete(ids) {     
    requestDelete(this, ids); 
  }  

  selectRows(ids = [], multi = true) { selectRows(this, ids, multi); }
}

customElements.define("smart-table", SmartTable);
