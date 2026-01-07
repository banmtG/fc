import "./../smart-table/smart-table.js";

import { debounce } from "./../smart-table/utils/debounce.js";
import { sortRowsFullObject } from "./../smart-table/utils/sortUtils.js";

const cssUrl = new URL("./extended-smart-table.css", import.meta.url);

const tpl = document.createElement("template");
tpl.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <div class="toolbar">
    <input class="search-input" type="search" placeholder="Search..." />
    <div class="pager">
      <button class="prev">&larr; Prev</button>
      <button class="next">Next &rarr;</button>
    </div>
    <select class="page-size"></select>
  </div>
  <smart-table id="tbl"></smart-table>
  <div class="status"></div>
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
    this._pageSize = 20;
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
      const { id, field, value } = e.detail;
      this._updateRowData(id, { [field]: value });
    }, { signal });

    this.$tbl.addEventListener("delete-requested", e => { 
      this._handleRowDelete(e.detail.ids); 
    }, { signal });

    if (this._raw.length > 0) {
      this._runPipeline();
    }
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

  setColumns(columns) {
    this.$tbl.columns = columns;
    //this.$tbl._renderInitial?.();
  }

  _handleRowDelete(ids) {
    // Normalize: accept single id or array
    const sids = Array.isArray(ids) ? ids.map(String) : [String(ids)];

    // Remove from raw dataset
    this._raw = this._raw.filter(o => !sids.includes(String(o.id)));

    // Re-run pipeline
    this._runPipeline();
    // Forward event for host apps
    this.dispatchEvent(new CustomEvent("rows-deleted", { detail: { ids: sids } }));
  }


  
  // Pipeline: raw → filter → sort → paginate → render
  _runPipeline() {
    let view = [...this._raw];

    // Filter
    const q = this._search.trim().toLowerCase();
    if (q) {
      view = view.filter(row => {
        const hay = [
          String(row.phrase || ""),
          String(row.status || "")
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
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
    } else {
      const n = parseInt(val, 10);
      if (!Number.isNaN(n) && n > 0) {
        this._pageSize = n;
      }
    }
    this._page = 1;
    this._runPipeline();
  }

  _updateRowData(id, patch) {
    const sid = String(id);
    const idx = this._raw.findIndex(o => String(o.id) === sid);
    if (idx !== -1) {
      this._raw[idx] = { ...this._raw[idx], ...patch };
    }
    // No immediate re-render; pipeline runs only on search/sort/pagination
  }

    _renderPageSizeOptions() {
    this.$pageSize.innerHTML = "";
    this._pageSizes.forEach(size => {
      const opt = document.createElement("option");
      opt.value = size;
      opt.textContent = size === "all" ? "All" : `${size} / page`;

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
