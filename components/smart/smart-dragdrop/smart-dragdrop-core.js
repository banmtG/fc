// smart-dragdrop-core.js
import {getMatrix} from './smart-dragdrop-navigation.js';

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
  
  const root = component.shadowRoot.getElementById("component-container");
  if (!root) return;

  component._handleClickSelection = function (e) {
    if (component._justLassoed) {
      component._justLassoed = false;
      component._isDragging = false;
      return;
    }

    const item = e.target.closest('.draggable');
    if (!item) {
      // Clear all highlights and selections
      component.shadowRoot.querySelectorAll('.draggable.highlight, .draggable.selected')
        .forEach(el => {
          el.classList.remove('highlight');
          el.classList.remove('selected');
        });
      component.lastSelectedIndex = null;
      component._isDragging = false;
      return;
    }

    const siblings = [...item.parentElement.querySelectorAll('.draggable')];
    const currentIdx = siblings.indexOf(item);

    // find the config for this column
    const container = item.closest('[id$="-container"]');
    const config = component.columns.find(c => `${c.id}-container` === container.id);

    // --- Desktop modifiers take priority ---
    if (e.shiftKey && component.lastSelectedIndex !== null) {
      // Range select
      const [min, max] = [component.lastSelectedIndex, currentIdx].sort((a, b) => a - b);
      for (let i = min; i <= max; i++) {
        siblings[i]?.classList.add('selected');
      }
    } else if (e.ctrlKey) {
      // Multi-select individual
      item.classList.toggle('selected');
    } else {
      // Plain click → highlight only
      // Clear previous highlight
      component.shadowRoot.querySelectorAll('.draggable.highlight')
        .forEach(el => el.classList.remove('highlight'));
      item.classList.add('highlight');
      // console.log(item);
      // console.log(`old matrix`, component._matrix);
      if (container!==component._activeContainer || component._matrixRecalculate === true) {
        component._matrix = getMatrix(container, config); 
        component._matrixRecalculate = false;
      }
      // console.log(`new matrix`, component._matrix);
      const itemsMatrix = component._matrix.flat();
      // console.log(itemsMatrix);
      component._highlightIndex = itemsMatrix.findIndex(el => el.classList.contains('highlight'));
      // console.log(component._highlightIndex);
      component._activeContainer = container;

      // --- Mobile toggle fallback for selection ---
      switch (config?.selectionMode) {
        case 2: // Range select
          if (component.lastSelectedIndex !== null) {
            const [min, max] = [component.lastSelectedIndex, currentIdx].sort((a, b) => a - b);
            for (let i = min; i <= max; i++) {
              siblings[i]?.classList.add('selected');
            }
          } else {
            item.classList.add('selected');
          }
          break;

        case 1: // Multi-select individual
          item.classList.toggle('selected');
          break;

        default: // Normal
          // component.shadowRoot.querySelectorAll('.draggable.selected')
          //   .forEach(el => el.classList.remove('selected'));
          // item.classList.add('selected');
          break;
      }
    }

    component.lastSelectedIndex = currentIdx;
    component._isDragging = false;
  };


  // component._handleDoubleClickTransfer = function (e) {
  //   const item = e.target.closest('.draggable');
  //   if (!item) return;
  //   // You may want to generalize this for multi-column setups
  //   const container = item.closest('.container');
  //   if (!container) return;

  //   // Example: move selected items within this container
  //   // (extend this logic to update component.columnData[container.id])
  // };

  root.addEventListener('click', component._handleClickSelection, { signal });
  // root.addEventListener('dblclick', component._handleDoubleClickTransfer, { signal });
}


// --- Drag logic ---
export function initDragLogic(component, element, signal) {
  if (!element) return;
  component._dragSurface = element;
const DRAG_THRESHOLD = 5;

component._onPointerDown = e => {
  if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button")) return;
  if (e.target.closest(".header")) return;

  const clickedItem = e.target.closest(".draggable");
  if (clickedItem) {
    component._isItemDrag = true;
    return;
  }

  const container = component.component_container; // the outer #component-container
  const rect = container.getBoundingClientRect();

  // Coordinates relative to #component-container
  component._startX = e.clientX - rect.left;
  component._startY = e.clientY - rect.top;
  component._lassoContainer = container;
  component._isDragging = false;

  const lasso = container.querySelector("#lasso");
  if (lasso) {
    lasso.style.display = "block";
    lasso.style.left = `${component._startX}px`;
    lasso.style.top = `${component._startY}px`;
    lasso.style.width = "0px";
    lasso.style.height = "0px";
  }

  window.addEventListener("pointermove", component._onPointerMove);
  window.addEventListener("pointerup", component._onPointerUp, { once: true });
};

component._onPointerMove = e => {
  // Defensive reset: if no button pressed, stop dragging
  if (e.buttons === 0 && component._isDragging) {
    component._isDragging = false;
    return;
  }

  const container = component._lassoContainer || component.component_container;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  const dx = Math.abs(currentX - component._startX);
  const dy = Math.abs(currentY - component._startY);

  // Only start lasso if movement exceeds threshold
  if (!component._isDragging && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
    component._isDragging = true;

    const lasso = container.querySelector("#lasso") || component.shadowRoot.getElementById("lasso");
    if (lasso) {
      Object.assign(lasso.style, {
        left: `${component._startX}px`,
        top: `${component._startY}px`,
        width: "0px",
        height: "0px",
        display: "block"
      });
    }
  }

  if (!component._isDragging) return;

  clearTimeout(component._selectionTimeout);

  const x = Math.min(currentX, component._startX);
  const y = Math.min(currentY, component._startY);
  const w = Math.abs(currentX - component._startX);
  const h = Math.abs(currentY - component._startY);

  const lasso = container.querySelector("#lasso") || component.shadowRoot.getElementById("lasso");
  if (lasso) {
    Object.assign(lasso.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`
    });
  }

  // Selection box in container coordinates
  const box = { left: x, top: y, right: x + w, bottom: y + h };

  const items = container.querySelectorAll(".draggable");

  component._selectionTimeout = setTimeout(() => {
    if (!component._isDragging) return; // guard against ghost selection

    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      // Convert item rect into container-relative coordinates
      const itemBox = {
        left: rect.left - container.getBoundingClientRect().left,
        right: rect.right - container.getBoundingClientRect().left,
        top: rect.top - container.getBoundingClientRect().top,
        bottom: rect.bottom - container.getBoundingClientRect().top
      };

      const xOverlap = Math.max(0, Math.min(itemBox.right, box.right) - Math.max(itemBox.left, box.left));
      const yOverlap = Math.max(0, Math.min(itemBox.bottom, box.bottom) - Math.max(itemBox.top, box.top));
      const coverage = (xOverlap * yOverlap) / ((itemBox.right - itemBox.left) * (itemBox.bottom - itemBox.top));

      if (coverage >= 0.3) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
  }, 0);
};


component._onPointerUp = e => {
  const wasDragging = component._isDragging;

  component._isDragging = false;
  component._lassoContainer = null;

  clearTimeout(component._selectionTimeout);
  component._selectionTimeout = null;

  const lasso = component.shadowRoot.getElementById("lasso");
  Object.assign(lasso.style, {
    display: "none",
    width: "0px",
    height: "0px",
    left: "0px",
    top: "0px"
  });

  window.removeEventListener("pointermove", component._onPointerMove);

  if (wasDragging) {
    component._justLassoed = true; // mark that lasso happened
    const selectedItems = component.shadowRoot.querySelectorAll(".draggable.selected");
    console.log("Selected items at pointerUp:", selectedItems);
  } else {
    // If no drag happened, treat as click
    // component._handleClickSelection?.(e);
  }
};

element.addEventListener("pointerdown", component._onPointerDown, { signal });



  // element.addEventListener("pointermove", component._onPointerMove, { signal });
  // element.addEventListener("pointerup", component._onPointerUp, { signal });



// Drag start
component._onDragStart = e => {
  console.log(e);
  let target = e.target; 
  if (target.nodeType === Node.TEXT_NODE) { 
    target = target.parentElement; 
  }
  if (!(target instanceof Element)) return;
  const item = target.closest(".draggable");
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
component._lastElToDifferentContainer = [];
let dragOverScheduled = false;

component._onDragOver = e => {
  e.preventDefault();
  if (!component._draggedItems?.length) return;

  const container = e.currentTarget;
  const afterElement = getDragAfterElement(component, container, e.clientX, e.clientY);

  // If dragged items are not yet in this container, append them here
  component._draggedItems.forEach(el => {
    if (el.parentElement !== container) {
      component._matrixRecalculate = true;
      component._lastElToDifferentContainer.push(el);
      for (const child of el.children) {
        if (!child.classList.contains("title")) {
              // If the class is not present, add the 'hidden' class
              child.classList.add('hidden');
        }        
      }
      container.appendChild(el);
    }
  });

  if (!afterElement) return;
  component._lastTarget = afterElement;

  // 👇 Defer heavy DOM work until next animation frame
  if (!dragOverScheduled) {
    dragOverScheduled = true;
    requestAnimationFrame(() => {
      dragOverScheduled = false;

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
        // el.querySelector(".index-label")?.remove();
        // const label = document.createElement("span");
        // label.className = "index-label";
        // label.textContent = `(old:${el.dataset.oldindex}, new:${idx})`;
        // el.appendChild(label);
      });

      component._previewOrder = preview;
      // console.log(component._lastTarget);
    });
  }
};


// Drag end
component._onDragEnd = () => {
  if (component._previewOrder) {
    component._originalOrder = component._previewOrder;
  }

  if (component._lastElToDifferentContainer.length!==0) {
    component._lastElToDifferentContainer.forEach(el=> {
        for (const child of el.children) {
        // 3. Add the 'hidden' class to each child
          if (!child.classList.contains("title")) {
              // If the class is not present, add the 'hidden' class
              child.classList.remove('hidden');
          }
        }          
    });
    component._lastElToDifferentContainer.length = 0;
  }

  // Cleanup ghost
  const ghost = document.querySelector(".drag-ghost");
  if (ghost) ghost.remove();

  // Reset indices: new becomes old for next drag 
  component._originalOrder?.forEach((el, idx) => { el.dataset.oldindex = idx; el.dataset.newindex = idx; });

  // Reset state
  component._lastTarget = null;
  component._draggedItems?.forEach(el => el.classList.remove("dragging"));
  component._draggedItems = [];
  component.lastSelectedIndex = null;
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
  // Helper: grab ordered items from a container
  const grab = (container, zoneId) =>
    [...container.querySelectorAll(".draggable")].map((el, idx) => {
      const id = el.getAttribute("data-id");
      // Find the original object in fullData
      const original = component.fullData.find(obj => obj._id === id);
      if (original) {
        // Update zone + order to reflect current DOM
        original.zone = zoneId;
        original.order = idx;
        return original;
      }
      // Fallback if not found in fullData
      return { _id: id, zone: zoneId, order: idx, text: el.textContent.trim() };
    });

  // Reset columnData
  component.columnData = {};

  // Rebuild columnData and update fullData
  let newFullData = [];
  component.columns.forEach(config => {
    const container = component.shadowRoot.getElementById(`${config.id}-container`);
    if (container) {
      const items = grab(container, config.id);
      component.columnData[config.id] = items;
      newFullData.push(...items);
    }
  });

  // Replace fullData with updated snapshot
  component.fullData = newFullData;

  // Save history for undo/redo
  saveHistory(component);

  // Emit event with updated data + orders
  component.dispatchEvent(new CustomEvent("dragdrop-box-changed", {
    detail: {
      columnData: component.columnData,
      orders: extractOrdersByIdKey(component, component._idKey) // e.g. phraseID → order
    },
    bubbles: true,
    composed: true
  }));
}


/**
 * Extract ordered arrays of item IDs grouped by zone.
 * @param {SmartDragdrop} component
 * @param {string} idKey - property name to use (e.g. "phraseID")
 * @returns {Object} mapping { zoneId: [idKeyValue, idKeyValue, ...] }
 */
function extractOrdersByIdKey(component, idKey = "_id") {
  
  const result = {};

  component.columns.forEach(col => {
    result[col.id] = [];
  });

  component.fullData
    .sort((a, b) => a.order - b.order) // ensure order is respected
    .forEach(item => {
      const key = item[idKey];
      if (key !== undefined && key !== null) {
        if (!result[item.zone]) {
          result[item.zone] = [];
        }
        result[item.zone].push(key);
      }
    });

  return result;
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
      if (x >= box.left && x <= box.right &&
          y >= box.top && y <= box.bottom) {
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


// function animateReorder(container, newOrder) {
//   const children = [...container.querySelectorAll('.draggable')];

//   // Record first positions
//   const firstRects = new Map();
//   children.forEach(el => {
//     firstRects.set(el, el.getBoundingClientRect());
//   });

//   // Apply new order in DOM
//   newOrder.forEach(el => container.appendChild(el));

//   // Record last positions and invert
//   children.forEach(el => {
//     const first = firstRects.get(el);
//     const last = el.getBoundingClientRect();
//     const dx = first.left - last.left;
//     const dy = first.top - last.top;

//     if (dx || dy) {
//       el.classList.add('moving');
//       el.style.transform = `translate(${dx}px, ${dy}px)`;
//       // Force reflow
//       el.getBoundingClientRect();
//       // Play
//       el.style.transform = '';
//       el.addEventListener('transitionend', () => {
//         el.classList.remove('moving');
//       }, { once: true });
//     }
//   });
// }
