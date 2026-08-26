class SimpleTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set input(value) {
    this._input = value;
    this.render();
  }

  render() {
    const { tableName, data, gridTemplateColumns, columnAlignments = {} } = this._input;
    const headers = Object.keys(data[0]).filter(key => key !== '_styles'); // Hide style metadata

    const gridStyle = `--gridTemplateColumns: ${gridTemplateColumns}`;

    this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          font-family: var(--sl-input-font-family);
        }
        .grid-container {
          width: 100%;
          display: grid;
          grid-template-columns: var(--gridTemplateColumns);
          border: 1px solid #ccc;
          font-size: 14px;
        }
        .data-cell {
          padding: 2px 3px;
          border: 1px solid #eee;
          background-color: var(--bg);
          color: var(--color);
          text-align: var(--align); /* 👈 alignment variable */
        }
        .header-cell {
          padding: 2px 3px;
          text-align: center;  
          font-weight: bold; 
          background-color: #ccc;    
          vertical-align: center;
        }
        .tableTitle {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 5px;
        }
      </style>
      <div class="container">
        <div class='tableTitle'>${tableName}</div>
        <div class="grid-container" style="${gridStyle}">
          ${headers.map(h => `<div class="header-cell">${h}</div>`).join('')}
          
          ${data.map(row => {
            return headers.map(key => {
              const cellValue = row[key];
              const cellStyle = row._styles?.[key] || {};
              
              // Alignment: from columnAlignments or fallback
              const align = columnAlignments[key] || 'center';

              const inlineStyle = `
                --bg: ${cellStyle.bg || 'transparent'}; 
                --color: ${cellStyle.color || 'inherit'};
                --align: ${align};
              `;

              return `<div class="data-cell" style="${inlineStyle}">${cellValue}</div>`;
            }).join('');
          }).join('')}
        </div>
      </div>
    `;
  }
}

customElements.define('simple-table', SimpleTable);
