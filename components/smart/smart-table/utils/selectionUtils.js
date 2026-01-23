// selectionUtils.js

// Remove the "selected" class from all rows
export function clearSelectionVisuals(shadowRoot) {
  shadowRoot.querySelectorAll(".row.selected").forEach(r => r.classList.remove("selected"));
}

// Apply selection classes to rows based on the selectedSet
export function applySelection(shadowRoot, rowMap, selectedSet) {
  clearSelectionVisuals(shadowRoot);
  for (const id of selectedSet) {
    const row = rowMap.get(String(id));
    if (row) row.classList.add("selected");
  }
}

// Toggle selection for a single id, honoring multi selection
export function toggleSelection(shadowRoot, rowMap, selectedSet, id, multi) {
  const sid = String(id);
  const row = rowMap.get(sid);
  if (!row) return;

  if (multi) {
    if (selectedSet.has(sid)) {
      selectedSet.delete(sid);
      row.classList.remove("selected");
    } else {
      selectedSet.add(sid);
      row.classList.add("selected");
    }
  } else {
    selectedSet.clear();
    clearSelectionVisuals(shadowRoot);
    selectedSet.add(sid);
    row.classList.add("selected");
  }
}

// Emit selection change (aggregate list of selected IDs)
export function emitSelectionChanged(component, selectedSet) {
  const ids = Array.from(selectedSet);
  component.dispatchEvent(new CustomEvent("row-selected", { detail: { ids } }));
}



// Delete all currently selected rows
// export function deleteSelected(component) {
//   if (component._selected.size === 0) return;

//   const ids = component.getSelected();

//   // 🔑 Emit intent only
//   component.dispatchEvent(new CustomEvent("delete-requested", {
//     detail: { ids },
//     bubbles: true,
//     composed: true
//   }));
// }

export function requestDelete(component, ids) {
  const sids = Array.isArray(ids) ? ids.map(String) : [String(ids)];
  component.dispatchEvent(new CustomEvent("delete-requested", {
    detail: { ids: sids },
    bubbles: true,
    composed: true
  }));
}


// Select one or more rows
export function selectRows(component, ids = [], multi = true) {
  if (!Array.isArray(ids)) ids = [ids];

  if (!multi) {
    // Clear everything first
    clearSelectionVisuals(component.shadowRoot);
    component._selected.clear();
  }

  ids.forEach(id => {
    const sid = String(id);
    const row = component._rowMap.get(sid);
    if (row) {
      component._selected.add(sid);
      row.classList.add("selected");
    }
  });

  emitSelectionChanged(component, component._selected);
}


// Clear any existing highlight
export function clearHighlight(component) {
  if (!component._highlightId) return;
  const current = component._rowMap.get(component._highlightId);
  if (current) current.classList.remove("highlight");
  component._highlightId = null;
}

// Set highlight on a given row id and scroll it into view
export function setHighlight(component, id) {
  const row = component._rowMap.get(String(id));  
  if (!row) return;

  clearHighlight(component);
  component._highlightId = String(id);

  row.classList.add("highlight");  
  component._hightlightPosition = row.dataset.index;
  //console.log(Array.from(component._rowMap.entries())[row.dataset.index].id);
  // Scroll the highlighted row into view
  row.scrollIntoView({ block: "nearest" });

  // console.log(component._highlightId);
  component.dispatchEvent(
    new CustomEvent("highlight-changed", {
      detail: { id: component._highlightId },
      bubbles: true,
      composed: true
    })
  );
}
