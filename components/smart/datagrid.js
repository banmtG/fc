// grid-data.js 
const jstableCssUrl = "/components/lib/jstable/jstable.css";
const jstableJsUrl = "/components/lib/jstable/jstable.min.js";

class GridData extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = [];
    this._table = null;

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${jstableCssUrl}">
      <style>
        :host { display: block; font-family: system-ui, sans-serif; }
        h3 { margin: 8px 0 12px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 10px; border: 1px solid #ccc; }

        tr.selected { outline: 2px solid #007bff; }
        .btn-edit, .btn-delete {
          padding: 4px 8px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer;
        }
        .btn-edit { background: #007bff; color: #fff; }
        .btn-delete { background: #dc3545; color: #fff; }
      </style>   
      <table id="phraseTable">
        <thead></thead>
        <tbody></tbody>
      </table>
    `;
  }

  set data(arr) {
    this._data = Array.isArray(arr) ? arr : [];
    if (this.isConnected) this._render();
  }

  get data() {
    return this._data;
  }

connectedCallback() {
  this._ensureLibs().then(() => {
    if (this._data.length) this._render();
  });
}

  disconnectedCallback() {
    if (this._table) {
      this._table.destroy();
      this._table = null;
    }
  }

async _ensureLibs() {
  if (!window.JSTable) {
    await this._injectScript(jstableJsUrl);
  }
}

  _injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  _render() {
    const tableEl = this.shadowRoot.querySelector("#phraseTable");
    const thead = tableEl.querySelector("thead");
    const tbody = tableEl.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!this._data.length) return;

    // Derive columns from object keys
    const keys = Object.keys(this._data[0]).filter(k => k !== "id");

    // Build header
    const headerRow = document.createElement("tr");
    keys.forEach(k => {
      const th = document.createElement("th");
      th.textContent = k;
      headerRow.appendChild(th);
    });
    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    headerRow.appendChild(thActions);
    thead.appendChild(headerRow);

    // Build rows
    this._data.forEach(obj => {
      const tr = document.createElement("tr");
      if (obj.status) tr.classList.add(obj.status);

      keys.forEach(k => {
        const td = document.createElement("td");
        td.textContent = obj[k] ?? "";
        tr.appendChild(td);
      });

      const tdActions = document.createElement("td");
      tdActions.innerHTML = `
        <button class="btn-edit" data-id="${obj.id}">Edit</button>
        <button class="btn-delete" data-id="${obj.id}">Delete</button>
      `;
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });

    // Destroy previous JSTable
    if (this._table) {
      this._table.destroy();
      this._table = null;
    }

    // Initialize JSTable
    if (window.JSTable) {
    this._table = new JSTable(tableEl, {
      searchable: true,
      sortable: true,
      perPage: 5,
      perPageSelect: [5, 10, 20]
    }); }
    else { 
      console.warn("JSTable not loaded yet"); 
    }

    // Row highlight on click
    this.shadowRoot.querySelectorAll("tbody tr").forEach(row => {
      row.addEventListener("click", e => {
        console.log(e.target);
        if (e.target.tagName === "BUTTON") return; // skip buttons
        this.shadowRoot.querySelectorAll("tbody tr").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
        this.dispatchEvent(new CustomEvent("row-selected", { detail: { id: row.querySelector(".btn-edit")?.dataset.id } }));
      });
    });

    // Action handlers
    this.shadowRoot.addEventListener("click", e => {
      if (e.target.classList.contains("btn-edit")) {
        const id = e.target.dataset.id;
        this.dispatchEvent(new CustomEvent("row-edit", { detail: { id } }));
      }
      if (e.target.classList.contains("btn-delete")) {
        const id = e.target.dataset.id;
        e.target.closest("tr").remove();
        this.dispatchEvent(new CustomEvent("row-delete", { detail: { id } }));
      }
    });
  }
}

customElements.define("grid-data", GridData);
