// smart-table.js
const cssUrl = new URL("./smart-table.css", import.meta.url);

class SmartTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Internal state
    this._data = [];
    this._idKey = "id"; // configurable via attribute later if needed
    this._rowMap = new Map(); // id -> row element
    this._columns = []; // ordered keys
    this._observerCleanup = []; // for any observers we add in future

    // Base template with external CSS link
    const wrapper = document.createElement("div");
    wrapper.className = "table";

    const header = document.createElement("div");
    header.className = "header";
    const body = document.createElement("div");
    body.className = "body";

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    this.shadowRoot.appendChild(document.createElement("link")).setAttribute("rel", "stylesheet");
    this.shadowRoot.querySelector("link").setAttribute("href", cssUrl);

    this.shadowRoot.appendChild(wrapper);

    // Single delegated click listener (prevents per-row leaks)
    this._onClick = this._onClick.bind(this);
    this.shadowRoot.addEventListener("click", this._onClick);
  }

  // Public API: set/get data
  set data(arr) {
    const next = Array.isArray(arr) ? arr : [];
    this._setData(next);
  }
  
  get data() { return this._data; }

  connectedCallback() {
    // If data was set before connect, ensure render
    if (this._data.length) this._renderInitial();
  }

  disconnectedCallback() {
    // Clean up event listeners and observers to avoid leaks
    this.shadowRoot.removeEventListener("click", this._onClick);
    this._rowMap.clear();
    this._observerCleanup.forEach(stop => { try { stop(); } catch {} });
    this._observerCleanup = [];
  }

  // Efficiently set data with minimal redraw
  _setData(next) {
    const wasEmpty = this._data.length === 0;
    this._data = next;

    if (wasEmpty) {
      this._renderInitial();
    } else {
      this._diffAndPatch(next);
    }
  }

  // Initial render builds columns and all rows
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

    // Derive ordered columns from first row keys
    this._columns = Object.keys(this._data[0]);

    // Optional: move 'id' to the first column if present
    const idIdx = this._columns.indexOf(this._idKey);
    if (idIdx > 0) {
      this._columns.splice(idIdx, 1);
      this._columns.unshift(this._idKey);
    }

    // Add an "Actions" column at end
    const columnsWithActions = [...this._columns, "_actions"];

    // Set grid template columns on header/rows
    const templateCols = `repeat(${columnsWithActions.length}, minmax(80px, 1fr))`;
    header.style.gridTemplateColumns = templateCols;

    // Build header
    const fragHeader = document.createDocumentFragment();
    for (const col of columnsWithActions) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = col === "_actions" ? "Actions" : col;
      fragHeader.appendChild(cell);
    }
    header.appendChild(fragHeader);

    // Build rows in a fragment for performance
    const fragRows = document.createDocumentFragment();
    for (const obj of this._data) {
      const rowEl = this._createRow(obj, columnsWithActions, templateCols);
      fragRows.appendChild(rowEl);
      const id = obj[this._idKey] ?? Symbol(); // fallback key
      this._rowMap.set(id, rowEl);
    }
    body.appendChild(fragRows);
  }

  // Create a single row element (reusable for adds)
  _createRow(obj, columnsWithActions, templateCols) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    rowEl.style.gridTemplateColumns = templateCols;
    rowEl.dataset.id = obj[this._idKey];

    for (const col of columnsWithActions) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (col === "_actions") {
        const actions = document.createElement("div");
        actions.className = "actions";
        actions.innerHTML = `
          <button class="btn btn-edit" data-id="${obj[this._idKey]}">Edit</button>
          <button class="btn btn-delete" data-id="${obj[this._idKey]}">Delete</button>
        `;
        cell.appendChild(actions);
      } else {
        const val = obj[col];
        cell.textContent = val == null ? "" : String(val);
      }
      rowEl.appendChild(cell);
    }
    return rowEl;
  }

  // Minimal diff: add/update/remove by keyed id without full re-render
  _diffAndPatch(next) {
    const body = this.shadowRoot.querySelector(".body");
    if (!next.length) {
      body.innerHTML = `<div class="empty">No data available</div>`;
      this._rowMap.clear();
      return;
    }

    // If columns changed shape, rebuild header and adjust rows only once
    const nextCols = Object.keys(next[0]);
    const colsChanged =
      nextCols.length !== this._columns.length ||
      nextCols.some((k, i) => k !== this._columns[i]);

    if (colsChanged) {
      this._columns = nextCols;
      const idIdx = this._columns.indexOf(this._idKey);
      if (idIdx > 0) {
        this._columns.splice(idIdx, 1);
        this._columns.unshift(this._idKey);
      }
      const columnsWithActions = [...this._columns, "_actions"];
      const templateCols = `repeat(${columnsWithActions.length}, minmax(80px, 1fr))`;

      // Rebuild header once
      const header = this.shadowRoot.querySelector(".header");
      header.innerHTML = "";
      const fragHeader = document.createDocumentFragment();
      for (const col of columnsWithActions) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = col === "_actions" ? "Actions" : col;
        fragHeader.appendChild(cell);
      }
      header.style.gridTemplateColumns = templateCols;
      header.appendChild(fragHeader);

      // Patch existing rows to new column structure
      for (const [id, rowEl] of this._rowMap) {
        // Full rebuild of each row element to match new columns
        const obj = next.find(o => o[this._idKey] === id);
        if (!obj) continue;
        const newRow = this._createRow(obj, columnsWithActions, templateCols);
        body.replaceChild(newRow, rowEl);
        this._rowMap.set(id, newRow);
      }
    }

    // Add/update/remove rows by id with minimal DOM ops
    const nextIds = new Set(next.map(o => o[this._idKey]));
    const existingIds = new Set(this._rowMap.keys());

    // Remove rows not in next
    for (const id of existingIds) {
      if (!nextIds.has(id)) {
        const el = this._rowMap.get(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this._rowMap.delete(id);
      }
    }

    // Insert/update rows in order
    const columnsWithActions = [...this._columns, "_actions"];
    const templateCols = `repeat(${columnsWithActions.length}, minmax(80px, 1fr))`;
    const fragToInsert = document.createDocumentFragment();

    next.forEach((obj, idx) => {
      const id = obj[this._idKey];
      const existing = this._rowMap.get(id);

      if (!existing) {
        // New row: create and insert
        const rowEl = this._createRow(obj, columnsWithActions, templateCols);
        this._rowMap.set(id, rowEl);
        fragToInsert.appendChild(rowEl);
      } else {
        // Update existing cells text only (no node replacement)
        const cells = existing.querySelectorAll(".cell");
        let c = 0;
        for (const col of columnsWithActions) {
          const cell = cells[c++];
          if (col === "_actions") continue;
          const newVal = obj[col];
          const newText = newVal == null ? "" : String(newVal);
          if (cell.textContent !== newText) {
            cell.textContent = newText;
          }
        }
      }
    });

    // Append new rows fragment once
    if (fragToInsert.childNodes.length) {
      body.appendChild(fragToInsert);
    }

    // Reorder existing rows to match next order with minimal moves
    // We walk next and ensure DOM order equals next order:
    const desiredOrder = next.map(o => o[this._idKey]);
    let cursor = body.firstElementChild;
    for (const id of desiredOrder) {
      const el = this._rowMap.get(id);
      if (!el) continue;
      if (el !== cursor) {
        body.insertBefore(el, cursor);
      }
      cursor = el.nextElementSibling;
    }
  }

  // Delegated click handler for selection and actions
  _onClick(e) {
    const target = e.target;

    // Delete
    if (target.classList.contains("btn-delete")) {
      const id = target.dataset.id;
      this.deleteRow(id);
      this.dispatchEvent(new CustomEvent("row-delete", { detail: { id } }));
      return;
    }

    // Edit
    if (target.classList.contains("btn-edit")) {
      const id = target.dataset.id;
      this.dispatchEvent(new CustomEvent("row-edit", { detail: { id } }));
      return;
    }

    // Row selection (supports multi-selection via modifier key)
    const row = target.closest(".row");
    if (row) {
      const multi = e.ctrlKey || e.metaKey || e.shiftKey;
      if (multi) {
        row.classList.toggle("multi-selected");
      } else {
        // Single selection: clear others, set selected
        this.shadowRoot.querySelectorAll(".row.selected").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
        // Remove multi-selected to avoid confusion
        this.shadowRoot.querySelectorAll(".row.multi-selected").forEach(r => {
          if (r !== row) r.classList.remove("multi-selected");
        });
      }
      const id = row.dataset.id;
      this.dispatchEvent(new CustomEvent("row-selected", { detail: { id, multi } }));
    }
  }

  // Public API: add, delete, update by id with minimal redraw
  addRow(obj) {
    const id = obj[this._idKey];
    if (id == null) throw new Error(`Row must contain '${this._idKey}'`);
    const next = [...this._data, obj];
    this._setData(next);
  }

  deleteRow(id) {
    const next = this._data.filter(o => String(o[this._idKey]) !== String(id));
    this._setData(next);
  }

  updateRow(id, patch) {
    const next = this._data.map(o => {
      if (String(o[this._idKey]) === String(id)) {
        return { ...o, ...patch };
      }
      return o;
    });
    this._setData(next);
  }
}

customElements.define("smart-table", SmartTable);
