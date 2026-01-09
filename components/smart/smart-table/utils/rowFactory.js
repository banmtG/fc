// rowFactory.js
export function createRow(obj, columns, templateCols, idKey) {
  const rowEl = document.createElement("div");
  rowEl.className = "row";
  rowEl.style.gridTemplateColumns = templateCols;
  rowEl.dataset.id = String(obj[idKey]);

  for (const col of columns) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.key = col.key; // ✅ add data-key attribute

    if (typeof col.render === "function") {
      const rendered = col.render(obj[col.key], obj);
      if (rendered instanceof Node) {
        cell.appendChild(rendered);
      } else {
        cell.textContent = rendered ?? "";
      }
    } else { 
      const span = document.createElement("span"); 
      span.textContent = obj[col.key] ?? ""; 
      cell.appendChild(span); 
    }

    // Attach custom events if defined
    // OBSOLATE!!! NOW DELEGATE TO COLUMN EVENT (2nd) IN _ONCLICK IN smart-table.js
    // SO WE DONT END OF HAVING THOUGHSAND OF CELL BASED EVENT.
    // if (col.events) {
    //   console.log(`attached event to cell`);
    //   for (const [evt, handler] of Object.entries(col.events)) {
    //     cell.addEventListener(evt, (e) => handler(e, rowEl, obj));
    //   }
    // }

    rowEl.appendChild(cell);
  }

  return rowEl;
}

// Utility: apply sort classes to a header cell
function _applySortState(component, cell, key) {
  cell.classList.remove("sort-asc", "sort-desc");
  if (component._sortState?.key === key) {
    cell.classList.add(
      component._sortState.dir === "asc" ? "sort-asc" : "sort-desc"
    );
  }
}

export function _renderHeaderCell(component, col) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.key = col.key;
  const span = document.createElement("span"); 
  span.textContent = col.label ?? ""; 
  cell.appendChild(span); 
  // cell.textContent = col.label;

  // reuse the sort state helper
  _applySortState(component, cell, col.key);

  return cell;
}

export function _renderHeader(component) {
  const headerRow = component.shadowRoot.querySelector(".header");
  headerRow.querySelectorAll(".cell").forEach(cell => {
    _applySortState(component, cell, cell.dataset.key);
  });
}


