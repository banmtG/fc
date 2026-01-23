// smart-dragdrop-core.js

// --- History helpers ---
export function saveHistory(component) {
  const snapshot = {
    selected: JSON.parse(JSON.stringify(component.selected)),
    available: JSON.parse(JSON.stringify(component.available)),
  };
  component.historyStack = component.historyStack.slice(0, component.historyIndex + 1);
  component.historyStack.push(snapshot);
  component.historyIndex = component.historyStack.length - 1;
}

export function navigateHistory(component, direction) {
  const newIndex = component.historyIndex + direction;
  if (newIndex < 0 || newIndex >= component.historyStack.length) return;

  const snapshot = component.historyStack[newIndex];
  if (!snapshot) return;

  component.selected = JSON.parse(JSON.stringify(snapshot.selected));
  component.available = JSON.parse(JSON.stringify(snapshot.available));
  component.historyIndex = newIndex;
  component._renderChange();
}

// --- Selection logic ---
export function initSelectionLogic(component, signal) {
  component._handleClickSelection = function (e) {
    const item = e.target.closest('.draggable');
    if (!item) return;
    const siblings = [...item.parentElement.querySelectorAll('.draggable')];

    if (e.shiftKey && component.lastSelectedIndex !== null) {
      const currentIdx = siblings.indexOf(item);
      const [min, max] = [component.lastSelectedIndex, currentIdx].sort((a, b) => a - b);
      for (let i = min; i <= max; i++) siblings[i].classList.add('selected');
    } else {
      item.classList.toggle('selected');
    }
    component.lastSelectedIndex = siblings.indexOf(item);
  };

  component._handleDoubleClickTransfer = function (e) {
    const item = e.target.closest('.draggable');
    if (!item) return;
    const container = item.closest('.available-container');
    if (!container) return;

    const selectedItems = [...container.querySelectorAll('.draggable.selected')];
    const itemsToMove = selectedItems.length ? selectedItems : [item];

    itemsToMove.forEach(el => {
      const id = el.getAttribute('data-id');
      const index = component.available.findIndex(d => d._id === id);
      if (index !== -1) {
        const movedItem = component.available.splice(index, 1)[0];
        component.selected.push(movedItem);
      }
    });

    saveHistory(component);
    component._renderChange();
  };

  component._columns.addEventListener('click', component._handleClickSelection, { signal });
  component._columns.addEventListener('dblclick', component._handleDoubleClickTransfer, { signal });
}

// --- Drag logic ---
export function initDragLogic(component, element, signal) {
  if (!element) return;
  component._dragSurface = element;

  component._onPointerDown = e => {
  if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button")) return;
  component._isDragging = true;
  component._startX = e.clientX;
  component._startY = e.clientY;
  const lasso = component.shadowRoot.getElementById("lasso");
  Object.assign(lasso.style, {
    left: `${component._startX}px`,
    top: `${component._startY}px`,
    width: "0px",
    height: "0px",
    display: "block"
  });
};

component._onPointerMove = e => {
  if (!component._isDragging) return;
  clearTimeout(component._selectionTimeout);

  const x = Math.min(e.clientX, component._startX);
  const y = Math.min(e.clientY, component._startY);
  const w = Math.abs(e.clientX - component._startX);
  const h = Math.abs(e.clientY - component._startY);

  const lasso = component.shadowRoot.getElementById("lasso");
  Object.assign(lasso.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });

  const box = lasso.getBoundingClientRect();
  const items = component.shadowRoot.querySelectorAll(".draggable");

  component._selectionTimeout = setTimeout(() => {
    items.forEach(item => {
      const r = item.getBoundingClientRect();
      const xOverlap = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
      const yOverlap = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
      const coverage = (xOverlap * yOverlap) / (r.width * r.height);
      item.classList.toggle("selected", coverage >= 0.6);
    });
  }, 20);
};

component._onPointerUp = () => {
  component._isDragging = false;
  component.shadowRoot.getElementById("lasso").style.display = "none";
};

  element.addEventListener("pointerdown", component._onPointerDown, { signal });
  element.addEventListener("pointermove", component._onPointerMove, { signal });
  element.addEventListener("pointerup", component._onPointerUp, { signal });



// Drag start
component._onDragStart = e => {
  if (!(e.target instanceof Element)) return;
  const item = e.target.closest(".draggable");
  if (!item) return;
  const container = item.closest(".container");
  if (!container) return;

  // Collect dragged items
  component._draggedItems = [...container.querySelectorAll(".draggable.selected")];
  if (component._draggedItems.length === 0) {
    item.classList.add("selected");
    component._draggedItems = [item];
  }

  // Ghost element
  const ghost = item.cloneNode(true);
  ghost.classList.add("drag-ghost");
  ghost.style.position = "absolute";
  ghost.style.top = "-9999px";
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 0, 0);

  // Mark dragged items
  component._draggedItems.forEach(el => el.classList.add("dragging"));

  // Ghost text
  const count = component._draggedItems.length;
  ghost.textContent = count > 1 ? `[${count}] items dragging` : "1 item dragging";

  // Snapshot original order and indices
const children = [...container.querySelectorAll(".draggable")]; component._originalOrder = children; component._originalIndices = {}; children.forEach((el, idx) => { const id = el.getAttribute("data-id"); component._originalIndices[id] = idx; el.dataset.oldindex = idx; // store old index 
el.dataset.newindex = idx; // initialize new index 
});


  
  // Reset tracker
  component._lastTarget = null;
};



// Track the last element we were targeting
component._lastTarget = null;
// Drag over
component._onDragOver = e => {
  e.preventDefault();
  if (!component._draggedItems?.length) return;

  const container = e.currentTarget;
  let afterElement = getDragAfterElement(component, container, e.clientX, e.clientY);

  // Skip if target unchanged
  if (!afterElement) return;
  component._lastTarget = afterElement;

  // Always recalc from current DOM order
  const children = [...container.querySelectorAll(".draggable")];
  const draggedIds = component._draggedItems.map(el => el.getAttribute("data-id"));
  const draggedBlock = children.filter(el => draggedIds.includes(el.getAttribute("data-id")));
  const remaining = children.filter(el => !draggedIds.includes(el.getAttribute("data-id")));

  const minDragIndex = Math.min(...draggedBlock.map(el => children.indexOf(el)));
  const targetIndex = remaining.findIndex(el => el.getAttribute("data-id") === afterElement.getAttribute("data-id"));

  let preview = [...remaining];
  if (minDragIndex < children.indexOf(afterElement)) {
    preview.splice(targetIndex + 1, 0, ...draggedBlock);
  } else {
    preview.splice(targetIndex, 0, ...draggedBlock);
  }

  // Mutate DOM for preview and update indices
  preview.forEach((el, idx) => {
    container.appendChild(el);
    el.dataset.newindex = idx;
    el.querySelector(".index-label")?.remove();
    const label = document.createElement("span");
    label.className = "index-label";
    label.textContent = `(old:${el.dataset.oldindex}, new:${idx})`;
    el.appendChild(label);
  });

  // Mutate DOM for preview
  preview.forEach(el => container.appendChild(el));
  component._previewOrder = preview;
  console.log(component._lastTarget);
};

// Drag end
component._onDragEnd = () => {
  if (component._previewOrder) {
    component._originalOrder = component._previewOrder;
  }

  // Cleanup ghost
  const ghost = document.querySelector(".drag-ghost");
  if (ghost) ghost.remove();

  // Reset indices: new becomes old for next drag 
  component._originalOrder.forEach((el, idx) => { el.dataset.oldindex = idx; el.dataset.newindex = idx; });

  // Reset state
  component._lastTarget = null;
  component._draggedItems = [];

  // Sync + render
  syncContainers(component);
  resetLasso(component);
  component._renderChange();
};




  component.shadowRoot.addEventListener("dragstart", component._onDragStart, { signal });
  component.shadowRoot.addEventListener("dragend", component._onDragEnd, { signal });
  component.shadowRoot.querySelectorAll(".container").forEach(container => {
  container.addEventListener("dragover", component._onDragOver, { signal });
  });
}

// --- Utility functions ---
export function syncContainers(component) {
  const grab = sel =>
    [...component.shadowRoot.querySelectorAll(`${sel} .draggable`)].map(el => {
      const id = el.getAttribute("data-id");
      const original =
        component.selected.find(obj => obj._id === id) ||
        component.available.find(obj => obj._id === id) ||
        component.fullData.find(obj => obj._id === id);
      return original || { _id: id, definition: el.textContent.trim() };
    });

  const mode = component.getAttribute("mode") || "dual";

  if (mode === "dual") {
    component.selected = grab(".selected-container");
    component.available = grab(".available-container");
  } else {
    component.selected = grab(".single-container");
    component.available = [];
  }

  saveHistory(component);
}


export function resetLasso(component) {
  const lasso = component.shadowRoot.getElementById("lasso");
  if (lasso) {
    Object.assign(lasso.style, { display: "none", width: "0px", height: "0px", left: "0px", top: "0px" });
  }
}

// --- Improved insertion logic with threshold ---
export function getDragAfterElement(component, container, x, y) {
  const items = [...container.querySelectorAll(".draggable:not(.dragging)")];
  const view = component.getAttribute("view") || "list";

  if (view === "list") {
    for (const el of items) {
      const box = el.getBoundingClientRect();
      if (y >= box.top && y <= box.bottom) {
        return el;
      }
    }
    return null; // pointer below all items → append at end
  } else {
    for (const el of items) {
      const box = el.getBoundingClientRect();
      if (x >= box.left && x <= box.right &&
          y >= box.top && y <= box.bottom) {
        return el;
      }
    }
    return null; // pointer outside all items → append at end
  }
}
