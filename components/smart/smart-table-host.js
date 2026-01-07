// smart-table-host.js
import "./tabulator-table.js";

class SmartTableHost extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        smart-table-host {
          display: block;
          width: 100%;
          padding: 12px;
          font-family: sans-serif;
          box-sizing: border-box;
        }

        smart-table {
          display: block;
          width: 100%;
          min-height: 200px;
        }

        .toolbar {
          margin-bottom: 8px;
          display: flex;
          gap: 8px;
        }

        button {
          padding: 4px 10px;
          cursor: pointer;
        }
      </style>

      <p>Test Title (NO shadow DOM)</p>

      <div class="toolbar">
        <button id="del">Delete Selected</button>
        <button id="all">Select All</button>
        <button id="none">Clear</button>
      </div>

      <smart-table id="table"></smart-table>
    `;

    const table = this.querySelector("#table");

    table.data = this._data();
    table.columnBuilder = this._columns();

    this.querySelector("#del").onclick = () => {
      const rows = table._table.getSelectedData();
      console.log("delete rows", rows);
    };

    this.querySelector("#all").onclick = () => {
      table._table.selectRow();
    };

    this.querySelector("#none").onclick = () => {
      table._table.deselectRow();
    };
  }

  _data() {
    return [
      { phrase: "wheelhouse", createdAt: "2026-01-04", source: "d" },
      { phrase: "bracelet", createdAt: "2026-01-04", source: "n" },
    ];
  }

  _columns() {
    return () => [
      {
        formatter: "rowSelection",
        titleFormatter: "rowSelection",
        hozAlign: "center",
        headerSort: false,
        width: 40,
      },
      { title: "Phrase", field: "phrase" },
      { title: "Created", field: "createdAt", width: 120 },
      {
        title: "Status",
        field: "source",
        width: 80,
        formatter(cell) {
          const v = cell.getValue();
          const el = cell.getElement();
          el.style.background =
            v === "d" ? "#ffd6d6" :
            v === "n" ? "#d6ffd6" :
            "#eaeaea";
          return v;
        },
      },
      { width: 40, hozAlign: "center", formatter: () => "✏️" },
      { width: 40, hozAlign: "center", formatter: () => "🗑️" },
    ];
  }
}

customElements.define("smart-table-host", SmartTableHost);
