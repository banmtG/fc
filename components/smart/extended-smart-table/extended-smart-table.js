import "./../smart-table/smart-table.js";

import { debounce } from "./../smart-table/utils/debounce.js";
import { sortRowsFullObject } from "./../smart-table/utils/sortUtils.js";
import { getDeviceType_Robust } from './../../../js/utils/deviceUtils_ex.js';

const cssUrl = new URL("./extended-smart-table.css", import.meta.url);

const tpl = document.createElement("template");
tpl.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <div class="toolbar">
    <sl-input class="search-input" size="small" clearable type="search" placeholder="Search..." ></sl-input>
    <div class="pager">
      <button class="prev">❮</button>
      <button class="next">❯</button>
    </div>
    <select class="page-size"></select>
  </div>
  <smart-table id="tbl"></smart-table>
  <div class="est_footer">
    <div class="status"></div>
    <sl-tooltip content="Multi-selection mode">  
      <div id="selectionMode" class="mode-toggle" data-mode="0">
        <sl-icon></sl-icon>
      </div>
    </sl-tooltip>
  </div>
`;

export class ExtendedSmartTable extends HTMLElement {
  static get observedAttributes() {
    return ["search", "pagination"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));

    // State
    this._raw = [];
    this._search = "";
    this._sortState = null;
    this._page = 1;
    this._pageSize = '45';
    this._columnsToSearch = "all";
    this._abort = new AbortController();

    // Bound handlers
    this._onSearch = debounce(this._onSearch.bind(this), 200);
    this._onPrev = this._onPrev.bind(this);
    this._onNext = this._onNext.bind(this);
    this._onPageSize = this._onPageSize.bind(this);

    // Refs
    this.$tbl = this.shadowRoot.getElementById("tbl");
    this.$search = this.shadowRoot.querySelector(".search-input");
    this.$prev = this.shadowRoot.querySelector(".prev");
    this.$next = this.shadowRoot.querySelector(".next");
    this.$pageSize = this.shadowRoot.querySelector(".page-size");
    this.$status = this.shadowRoot.querySelector(".status");
    
    this.$modeToggle = this.shadowRoot.querySelector('.mode-toggle');
    // Defaults
    this._enableSearch = false;
    this._pageSizes = null;
  }

  connectedCallback() {
    const { signal } = this._abort;
    this.$search.addEventListener("input", e => this._onSearch(e.target.value), { signal });
    this.$prev.addEventListener("click", this._onPrev, { signal });
    this.$next.addEventListener("click", this._onNext, { signal });
    this.$pageSize.addEventListener("change", this._onPageSize, { signal });

    // Sort requests from smart-table
    this.$tbl.addEventListener("sort-requested", e => {
      const { key, dir } = e.detail;      
      this._sortState = { key, dir };
      this.$tbl.setSortState(this._sortState);
      this._runPipeline();
    }, { signal });

    // Interactive changes (patch raw only)
    this.$tbl.addEventListener("interactive-component-changed", e => {
      console.log(e);
      const { id, field, value } = e.detail;
      this._updateRowData(id, { [field]: value });
    }, { signal });

    this.$tbl.addEventListener("delete-requested", e => { 
      this._handleRowDelete(e.detail.ids); 
    }, { signal });

    if (this._raw.length > 0) {
      this._runPipeline();
    }

    
    this._initSelectionModeOnTouch();
    this.setAttribute('tabindex', '-1');
    
  }

  focus() {
      this.$search.focus();
  }

  _initSelectionModeOnTouch() {
    const toggle = this.shadowRoot.querySelector(".mode-toggle");
    if (!toggle) return;

    // initialize from config if present
    this._selectionMode = 0;

    toggle.addEventListener("click", () => {
      // cycle 0 → 1 → 2 → 0
      this._selectionMode = (this._selectionMode + 1) % 3;
      this.$tbl._touchScreen = this._selectionMode;
      toggle.setAttribute("data-mode", this._selectionMode);

      const icon = toggle.querySelector("sl-icon");
      if (icon) {
        icon.name = this._selectionMode === 1 ? "check2" :
                    this._selectionMode === 2 ? "arrows" : "";
      }
    }, { signal: this._abort.signal });
  }

  disconnectedCallback() {
    this._abort.abort();
    this.$tbl = null;
    this.$search = null;
    this.$prev = null;
    this.$next = null;
    this.$pageSize = null;
    this.$status = null;
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name === "search") {
      this._enableSearch = newVal !== "false";
      this.$search.style.display = this._enableSearch ? "" : "none";
    }
    if (name === "pagination") {
      if (newVal === "false") {
        this._pageSizes = null;
        this.shadowRoot.querySelector(".pager").style.display = "none";
        this.$pageSize.style.display = "none";
      } else {
        this._pageSizes = newVal.split(",").map(v => v.trim());
        this._renderPageSizeOptions();
      }
    }
  }

  set data(value) {
    this._raw = Array.isArray(value) ? value : [];
    this._page = 1;
    // this._runPipeline();
  }

  get data() { return this._raw; }


  setConfig(configs) {         
    this._config = configs;
    this._idKey = configs.idKey;
    this.$tbl._idKey = this._idKey;
    this._sortState = { key: configs.sortKey, dir: configs.sortDir};    
    this._selectionModeOnTouch = (configs.selectionModeOnTouch !== undefined)? configs.selectionModeOnTouch : true;
    if (this._selectionModeOnTouch===true) this.$modeToggle.style.display = "flex";
    if (getDeviceType_Robust() === "mobile" || getDeviceType_Robust() === "tablet") {} else 
      this.$modeToggle.style.display = "none";
  
    if (!Number.isNaN(configs.pageSize) && configs.pageSize > 0) {
        this._pageSize = configs.pageSize;
        this.$pageSize.value = configs.pageSize;
    } else if (configs.pageSize==="all") {
        this._pageSize = this._raw.length;
        this.$pageSize.value = "all";
    }
    this.$tbl.style.setProperty('--tableMaxHeight',configs.tableMaxHeight);
    this.$tbl._allowDeleteKey = configs.allowDeleteKey? configs.allowDeleteKey : false;
    
    this._columnsToSearch = configs.columnToSearch? configs.columnToSearch : "all"; // all = default; ["phrase","status"] data field
    this._cellPadding = configs.cellPading? configs.cellPading : "6px 8px";
    this.$tbl.style.setProperty('--cellPadding', this._cellPadding);
    this._onPageSize({ target : { value : `${configs.pageSize}`}});      // this will also call render()
  }

  getSelected() {
    return this.$tbl.getSelected();
  }

  setColumns(columns) {
    this.$tbl.columns = columns;   
    this.$tbl.setColumns(columns);
    //this.$tbl._renderInitial?.();
  }

  _handleRowDelete(ids) {
    // Normalize: accept single id or array
    const sids = Array.isArray(ids) ? ids.map(String) : [String(ids)];

    //set new HighLight after delete
    const newHighLightObject = this._raw.find(item => 
      (item.id!==this.$tbl._highlightId && !Array.from(this.$tbl._selected).includes(item.id)));
    this.$tbl._highlightId = newHighLightObject.id; 


    // Remove from raw dataset
    this._raw = this._raw.filter(o => !sids.includes(String(o[this._idKey])));

    // clear selected of smart-table after delete rows.
    this.$tbl._selected.clear();
    // Re-run pipeline
    this._runPipeline();

    // Forward event for host apps
    this.dispatchEvent(new CustomEvent("rows-deleted", { 
      detail: { ids: sids }, 
      bubbles: false,
      composed: true
    }
    ));
  }

  _flattenValues(obj) {
    let result = [];
    if (Array.isArray(obj)) {
      obj.forEach(v => result.push(...this._flattenValues(v)));
    } else if (obj && typeof obj === "object") {
      Object.values(obj).forEach(v => result.push(...this._flattenValues(v)));
    } else {
      result.push(String(obj ?? ""));
    }
    return result;
  }

  _buildHaystack(row, columns) {
    if (columns === "all") {
      console.log(columns);
      const hay = this._flattenValues(row).join(" ").toLowerCase();
      return hay;
    } else {
      // console.log(columns);
      const hay = columns.map(col => {
        return this._flattenValues(row[col]).join(" ");
      }).join(" ").toLowerCase();
      return hay;
    }
  }

  
  // Pipeline: raw → filter → sort → paginate → render
  _runPipeline() {
    // console.log(this._pageSize);
    let view = [...this._raw];

    // Filter
    const q = this._search.trim().toLowerCase();
    if (q) {
      view = view.filter(row => this._buildHaystack(row, this._columnsToSearch).includes(q)); 
    }

    // Sort
    if (this._sortState?.key) {
      const { key, dir } = this._sortState;
      view = sortRowsFullObject(view, key, dir);
    }

    // Page slice
    const totalPages = Math.max(1, Math.ceil(view.length / this._pageSize));
    if (this._page > totalPages) this._page = totalPages;
    const start = (this._page - 1) * this._pageSize;
    const end = start + this._pageSize;
    const pageSlice = view.slice(start, end);

    // Render
    this.$tbl.data = pageSlice;

    this.$tbl._renderInitial?.();

    if (this.$status) {
      this.$status.textContent = `Showing ${start + 1}-${Math.min(end, view.length)} of ${view.length} • Page ${this._page}/${totalPages}`;
    }
    if (this.$prev) this.$prev.disabled = this._page <= 1;
    if (this.$next) this.$next.disabled = this._page >= totalPages;
  }


  _onSearch(value) {
    // value is a plain string, safe to use after debounce
    this._search = value || "";
    this._page = 1;
    this._runPipeline();
  }

  _onPrev() {
    if (this._page > 1) {
      this._page -= 1;
      this._runPipeline();
    }
  }
  _onNext() {
    this._page += 1;
    this._runPipeline();
  }
  
  _onPageSize(e) {
    const val = e.target.value;
    if (val === "all") {
      this._pageSize = this._raw.length;
      this.$prev.classList.add('hidden');
      this.$next.classList.add('hidden');
    } else {
      const n = parseInt(val, 10);
      this.$prev.classList.remove('hidden');
      this.$next.classList.remove('hidden');
      if (!Number.isNaN(n) && n > 0) {
        this._pageSize = n;
      }
    }
    this._page = 1;

    this._runPipeline();
  }

  _updateRowData(id, patch) {
    const sid = String(id);
    const idx = this._raw.findIndex(o => String(o[this._idKey]) === sid);
    if (idx !== -1) {
      this._raw[idx] = { ...this._raw[idx], ...patch };
    }
    // No immediate re-render; pipeline runs only on search/sort/pagination
  }

  updateRowUI(id) { //call this after _updateRowData()
    const checkObjectInUI = this.$tbl.data.find(item => item[this._idKey] === id);
       // console.log(this._raw[id]);
    // console.log(checkObjectInUI);     
    if (checkObjectInUI) {
      const sid = String(id);
      const idx = this._raw.findIndex(o => String(o[this._idKey]) === sid);
      console.log(this._raw[idx]);
      this.$tbl.updateRowUI(id, this._raw[idx]);
    }
  }

  addRow(newRow, positionIndex = 0) {
    this._raw.push(newRow);
    this.setConfig(this._config);
    //this.$tbl.addRow(newRow, positionIndex);
  }

    _renderPageSizeOptions() {
    this.$pageSize.innerHTML = "";
    this._pageSizes.forEach(size => {
      const opt = document.createElement("option");
      opt.value = size;
      opt.textContent = size === "all" ? "All items" : `${size} items`;

      // Select the current page size if it matches
      if (size !== "all" && parseInt(size, 10) === this._pageSize) {
        opt.selected = true;
      }
      if (size === "all" && this._pageSize === this._raw.length) {
        opt.selected = true;
      }

      this.$pageSize.appendChild(opt);
    });
  }
}

customElements.define("extended-smart-table", ExtendedSmartTable);
