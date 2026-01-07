// rowFactory.js
export function createRow(obj, columns, templateCols, idKey) {
  const rowEl = document.createElement("div");
  rowEl.className = "row";
  rowEl.style.gridTemplateColumns = templateCols;
  rowEl.dataset.id = String(obj[idKey]);

  for (const col of columns) {
    const cell = document.createElement("div");
    cell.className = "cell";

    if (typeof col.render === "function") {
      const rendered = col.render(obj[col.key], obj);
      if (rendered instanceof Node) {
        cell.appendChild(rendered);
      } else {
        cell.textContent = rendered ?? "";
      }
    } else {
      cell.textContent = obj[col.key] ?? "";
    }

    // Attach custom events if defined
    if (col.events) {
      for (const [evt, handler] of Object.entries(col.events)) {
        cell.addEventListener(evt, (e) => handler(e, rowEl, obj));
      }
    }

    rowEl.appendChild(cell);
  }

  return rowEl;
}

export function _renderHeaderCell(component,col) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.key = col.key;
  cell.textContent = col.label;
  if (component._sortState?.key === col.key) {
    cell.classList.add(component._sortState.dir === "asc" ? "sort-asc" : "sort-desc");
  }
  // console.log(cell);
  return cell;
}


export function _renderHeader(component) {
  const headerRow = component.shadowRoot.querySelector(".header");
  headerRow.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("sort-asc", "sort-desc");
    const key = cell.dataset.key;
    if (component._sortState?.key === key) {
      cell.classList.add(component._sortState.dir === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}

