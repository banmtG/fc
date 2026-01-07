// handlers.js for row‑level operations
import { createRow } from './rowFactory.js';

export function handleHeaderClick(component, target) {
  const key = target.dataset.key;

  let dir = "asc";

  // Toggle direction if already sorted asc
  if (component._sortState?.key === key && component._sortState.dir === "asc") {
    dir = "desc";
  }

  // Update local sort state (for header UI only)
  // component._sortState = { key, dir };

  // // Update header sort classes
  // component.shadowRoot
  //   .querySelectorAll(".header .cell")
  //   .forEach(c => c.classList.remove("sort-asc", "sort-desc"));

  // console.log(target);
  // target.classList.add(dir === "asc" ? "sort-asc" : "sort-desc");
  // console.log(target.classList);
  // 🔑 Instead of sorting data here, just emit an event
  console.log(`key, dir`, key, dir);
  component.dispatchEvent(new CustomEvent("sort-requested", {
    detail: { key, dir },
    bubbles: true,
    composed: true
  }));
}


// Add a new row
export function addRow(component, obj) {
  const sid = String(obj[component._idKey]);
  // Update data model
  component._data.push(obj);
  // Build row element using external rowFactory
  const rowEl = createRow(obj, component.columns, component._templateCols, component._idKey);
  // Track in rowMap
  component._rowMap.set(sid, rowEl);
  // Append to body
  component.shadowRoot.querySelector(".body").appendChild(rowEl);
}


export function deleteRow(component, id) {
  const sid = String(id);
  // 🔑 Emit intent only
  component.dispatchEvent(new CustomEvent("delete-requested", {
    detail: { ids: [sid] },
    bubbles: true,
    composed: true
  }));
}

// export function updateRow(component, id, patch) {
//   const sid = String(id);

//   // 🔑 Instead of mutating data and DOM, emit a generic intent
//   component.dispatchEvent(new CustomEvent("row-update-requested", {
//     detail: { id: sid, patch },
//     bubbles: true,
//     composed: true
//   }));
// }


export function setHighlight(component, id) {
  const sid = String(id);
  component.shadowRoot.querySelectorAll(".row.highlight")
    .forEach(r => r.classList.remove("highlight"));
  const rowEl = component._rowMap.get(sid);
  if (rowEl) rowEl.classList.add("highlight");
}
