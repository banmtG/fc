// phrase-table.js
import "./../smart/smart-table/smart-table.js";
import { mapTableData } from "./../smart/smart-table/utils/mapTableData.js";
import "./../smart/star-rating.js";


// Simple debounce to avoid excessive filtering while typing
function debounce(fn, delay = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

const tpl = document.createElement("template");
tpl.innerHTML = `
  <style>
    :host {
      display: block;
      box-sizing: border-box;
      padding: 8px;
      font-family: system-ui, sans-serif;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .search-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 6px;
    }
    .pager {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }
    .pager button {
      padding: 4px 8px;
      border: 1px solid #ccc;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
    }
    .pager button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .page-size {
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
    }
    .status {
      font-size: 12px;
      color: #666;
    }
  </style>

  <div class="toolbar">
    <input class="search-input" type="search" placeholder="Search phrases..." />
    <div class="pager">
      <button class="prev">&larr; Prev</button>
      <button class="next">Next &rarr;</button>
    </div>
    <select class="page-size">
      <option value="10">10 / page</option>
      <option value="20" selected>20 / page</option>
      <option value="50">50 / page</option>
      <option value="100">100 / page</option>
    </select>
  </div>

  <smart-table id="tbl"></smart-table>
  <div class="status"></div>
`;

export class PhraseTable extends HTMLElement {
  static get observedAttributes() {
    return ["page-size"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(tpl.content.cloneNode(true));

    // State
    this._raw = [];            // full dataset (mapped)
    this._filtered = [];       // filtered dataset (by search)
    this._page = 1;            // 1-based
    this._pageSize = 20;
    this._search = "";
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
  }

  connectedCallback() {
    // Initialize listeners (AbortController guards against leaks)
    const { signal } = this._abort;
    this.$search.addEventListener("input", this._onSearch, { signal });
    this.$prev.addEventListener("click", this._onPrev, { signal });
    this.$next.addEventListener("click", this._onNext, { signal });
    this.$pageSize.addEventListener("change", this._onPageSize, { signal });

    // Optional: set columns once (host owns columns)
    if (!this.$tbl.columns || this.$tbl.columns.length === 0) {
      this.$tbl.columns = [
        { key: "phrase", label: "Phrase", width: "3fr" },
        { key: "status", label: "Status", width: "2fr" },
        {
          key: "_actions",
          sortable: false,
          label: "Actions",
          width: "2fr",
          interactive: true,
          render: (_, obj) => {
            const div = document.createElement("div");
            div.className = "actions";
            div.innerHTML = `
              <button class="btn btn-edit" data-id="${obj.id}">✏️</button>
              <button class="btn btn-delete" data-id="${obj.id}">🗑️</button>
            `;
            return div;
          },
          events: {
            click: (e, row, obj) => {
              if (e.target.classList.contains("btn-edit")) {
                row.dispatchEvent(new CustomEvent("row-edit", {
                  detail: { id: obj.id },
                  bubbles: true,
                  composed: true
                }));
              }
              if (e.target.classList.contains("btn-delete")) {
                const msg = "Are you sure you want to delete this row?";
                if (confirm(msg)) {
                  row.dispatchEvent(new CustomEvent("row-delete", {
                    detail: { id: obj.id },
                    bubbles: true,
                    composed: true
                  }));
                }
              }
            }
          }
        },
        {
          key: "rating",
          label: "Stars",
          width: "2fr",
          interactive: true,
          render: (val, obj) => {
            const rating = document.createElement("star-rating");
            rating.rating = val;
            rating.id = obj.id;
            rating.setAttribute("row-id", obj.id);
            return rating;
          }
        },
        {
          key: "phrase",
          label: "Reminder",
          width: "2fr",
          interactive: true,
          render: (val) => {
            const input = document.createElement("input");
            input.type = "text";
            input.value = val || "";
            return input;
          },
          events: {
            input: (e, row) => {
              row.dispatchEvent(new CustomEvent("row-note", {
                detail: { id: row.dataset.phraseID, note: e.target.value },
                bubbles: true,
                composed: true
              }));
            }
          }
        }
      ];
    }

    // Forward smart-table events to host app as needed
    this.$tbl.addEventListener("row-edit", e => this.dispatchEvent(new CustomEvent("row-edit", { detail: e.detail })), { signal });
    this.$tbl.addEventListener("row-delete", e => this._handleDelete(e.detail.id), { signal });
    this.$tbl.addEventListener("row-multi-delete", e => {  this._handleMultiDelete(e.detail.ids);}, { signal });
    this.$tbl.addEventListener("highlight-changed", e => this.dispatchEvent(new CustomEvent("move", { detail: e.detail })), { signal });
    this.$tbl.addEventListener("row-selected", e => this.dispatchEvent(new CustomEvent("row-selected", { detail: e.detail })), { signal });
    this.$tbl.addEventListener("rating-changed", e => this._handleRatingChanged(e.detail), { signal });
    this.$tbl.addEventListener("row-note", e => this.dispatchEvent(new CustomEvent("row-note", { detail: e.detail })), { signal });

    // If consumer already set data property before connectedCallback, render it
    if (this._raw.length > 0) {
      this._applyView();
    }
  }

  disconnectedCallback() {
    // Clean up listeners and any pending timers
    this._abort.abort();
    // Drop references that could retain DOM nodes
    this.$tbl = null;
    this.$search = null;
    this.$prev = null;
    this.$next = null;
    this.$pageSize = null;
    this.$status = null;
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name === "page-size") {
      const n = parseInt(newVal, 10);
      if (!Number.isNaN(n) && n > 0) {
        this._pageSize = n;
        this._page = 1;
        this._applyView();
      }
    }
  }

  // Public API: set raw data (will be mapped and rendered)
  set data(value) {
    const arr = Array.isArray(value) ? value : [];
    this._raw = mapTableData(arr);
    this._page = 1;
    this._filterData();
    this._applyView();
  }
  get data() { return this._raw; }

  // Search handler
  _onSearch(e) {
    this._search = e.target.value || "";
    this._page = 1;
    this._filterData();
    this._applyView();
  }

  // Page navigation
  _onPrev() {
    if (this._page > 1) {
      this._page -= 1;
      this._applyView();
    }
  }
  _onNext() {
    const totalPages = Math.max(1, Math.ceil(this._filtered.length / this._pageSize));
    if (this._page < totalPages) {
      this._page += 1;
      this._applyView();
    }
  }
  _onPageSize(e) {
    const n = parseInt(e.target.value, 10);
    if (!Number.isNaN(n) && n > 0) {
      this._pageSize = n;
      this._page = 1;
      this._applyView();
    }
  }

  // Filter raw data by search term (case-insensitive, simple contains on key fields)
  _filterData() {
    const q = this._search.trim().toLowerCase();
    if (!q) {
      this._filtered = this._raw.slice();
      return;
    }
    this._filtered = this._raw.filter(row => {
      // Adjust keys based on your schema
      const hay = [
        String(row.phrase || ""),
        String(row.status || "")
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // Apply current page to the smart-table
  _applyView() {
    const start = (this._page - 1) * this._pageSize;
    const end = start + this._pageSize;
    const pageSlice = this._filtered.slice(start, end);

    // Feed into smart-table
    this.$tbl.data = pageSlice;

    // Re-render to ensure columns already set render correctly
    this.$tbl._renderInitial?.();

    // Update status and button states
    const totalPages = Math.max(1, Math.ceil(this._filtered.length / this._pageSize));
    if (this.$status) {
      this.$status.textContent = `Showing ${start + 1}-${Math.min(end, this._filtered.length)} of ${this._filtered.length} • Page ${this._page}/${totalPages}`;
    }
    if (this.$prev) this.$prev.disabled = this._page <= 1;
    if (this.$next) this.$next.disabled = this._page >= totalPages;
  }

  // Handle deletes: remove from raw, then rebuild filtered/page
  _handleDelete(id) {
    const sid = String(id);
    this._raw = this._raw.filter(o => String(o.id) !== sid);
    this._filterData();
    // Clamp page if we went past end after deletion
    const totalPages = Math.max(1, Math.ceil(this._filtered.length / this._pageSize));
    if (this._page > totalPages) this._page = totalPages;
    this._applyView();

    // Forward event
    this.dispatchEvent(new CustomEvent("row-delete", { detail: { id } }));
  }

  _handleMultiDelete(ids = []) {
  const sids = ids.map(String);

  // Remove all matching rows from raw data
  this._raw = this._raw.filter(o => !sids.includes(String(o.id)));

  // Re‑filter and clamp page
  this._filterData();
  const totalPages = Math.max(1, Math.ceil(this._filtered.length / this._pageSize));
  if (this._page > totalPages) this._page = totalPages;
  this._applyView();

  // Forward event with all deleted IDs
  this.dispatchEvent(new CustomEvent("row-multi-delete", { detail: { ids } }));
}


_handleRatingChanged({ id, rating }) {
  const sid = String(id);
  const idx = this._raw.findIndex(o => String(o.id) === sid);
  if (idx !== -1) {
    this._raw[idx] = { ...this._raw[idx], rating };
  }

  // Reapply filter + view so UI stays consistent
  this._filterData();
  this._applyView();

  this.dispatchEvent(new CustomEvent("rating-changed", { detail: { id, rating } }));
}

}

customElements.define("phrase-table", PhraseTable);
