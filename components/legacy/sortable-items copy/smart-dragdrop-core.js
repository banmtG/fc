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

  component._onDragStart = e => {
    const item = e.target.closest(".draggable");
    if (!item) return;
    const container = item.closest(".container");
    component._draggedItems = [...container.querySelectorAll(".draggable.selected")];
    if (component._draggedItems.length === 0) {
      item.classList.add("selected");
      component._draggedItems = [item];
    }
    const dragImg = document.createElement("div");
    dragImg.id = "dragImgId";
    Object.assign(dragImg.style, {
      position: "absolute", top: "-9999px", fontSize: "20px", padding: "6px 12px",
      background: "white", border: "1px solid #ccc", borderRadius: "2px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.0)", pointerEvents: "none", zIndex: "9999"
    });
    dragImg.textContent = `${component._draggedItems.length} item(s)`;
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, -5, -5);
    component._draggedItems.forEach(el => el.classList.add("dragging"));
  };

  component._onDragEnd = () => {
    component._draggedItems?.forEach(el => el.classList.remove("dragging"));
    syncContainers(component);
    document.getElementById("dragImgId")?.remove();
    resetLasso(component);
    component._renderChange();
    component._draggedItems = [];
  };

  component._onDragOver = e => {
    e.preventDefault();
    if (!component._draggedItems?.length) return;
    const container = e.currentTarget;
    const afterElement = getDragAfterElement(container, e.clientY);
    component._draggedItems.forEach(dragged => {
      container.insertBefore(dragged, afterElement || null);
    });
  };

  element.addEventListener("pointerdown", component._onPointerDown, { signal });
  element.addEventListener("pointermove", component._onPointerMove, { signal });
  element.addEventListener("pointerup", component._onPointerUp, { signal });
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
    component.available = []; // not used in single mode
  }

  saveHistory(component);
}



export function resetLasso(component) {
  const lasso = component.shadowRoot.getElementById("lasso");
  if (lasso) {
    Object.assign(lasso.style, { display: "none", width: "0px", height: "0px", left: "0px", top: "0px" });
  }
}

export function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll(".draggable:not(.dragging)")];
  return items.reduce(
    (closest, el) => {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? { offset, element: el } : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

