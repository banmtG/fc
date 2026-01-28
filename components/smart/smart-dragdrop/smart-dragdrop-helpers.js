// smart-dragdrop-helpers.js
import { getTextWidth } from './../../../js/utils/fontToWidth.js';      


/**
 * Normalize items: assign zone + order consistently.
 */
export function normalizeOrders(arr, columns) {
  const zoneOrders = {};
  arr.forEach(def => {
    const zoneId = def.zone || (columns[0] ? columns[0].id : null);
    if (!zoneOrders[zoneId]) zoneOrders[zoneId] = [];
    if (typeof def.order === "number") {
      zoneOrders[zoneId].push(def.order);
    }
  });

  Object.keys(zoneOrders).forEach(z => zoneOrders[z].sort((a, b) => a - b));

  return arr.map((def, i) => {
    const zoneId = def.zone || (columns[0] ? columns[0].id : null);

    let order;
    if (typeof def.order === "number") {
      order = def.order;
    } else {
      const used = zoneOrders[zoneId] || [];
      const maxOrder = used.length ? Math.max(...used) : -1;

      let candidate = 0;
      while (used.includes(candidate)) {
        candidate++;
      }

      const lastExplicitIndex = arr.findLastIndex(
        it => (it.zone || (columns[0] ? columns[0].id : null)) === zoneId && typeof it.order === "number"
      );

      if (i > lastExplicitIndex) {
        order = maxOrder + 1;
      } else {
        order = candidate;
      }

      used.push(order);
      zoneOrders[zoneId] = used;
    }

    return {
      ...def,
      _id: generateInternalId(), // always use one generator
      zone: zoneId,
      order
    };
  });
}

/**
 * Apply layout (row/column/auto) to the container.
 */
export function applyLayout(container, layout) {
  if (!container) return;

  let direction = "column";
  if (layout === "horizontal") {
    direction = "row";
  } else if (layout === "auto") {
    direction = window.innerWidth >= 768 ? "row" : "column";
    // console.log(direction);
  }

  container.style.overflow = "scroll";
  container.style.display = "flex";
  container.style.height = "100%";
  container.style.flexDirection = direction;
  container.style.flexWrap = direction === "column" ? "nowrap" : "wrap";
}

/**
 * Apply column view (list/detail/icon) styling.
 */
export function applyColumnView(container, config, triggerIcon, range) {
  const view = config.view;

  container.style.setProperty("--row-gap", `${config.rowGap || 0}px`);
  container.style.setProperty("--column-gap", `${config.columnGap || 0}px`);
  container.style.setProperty("--list-item-width", `${config.listItemWidth || 120}px`);
  container.style.setProperty("--list-item-height", `${config.listItemHeight || 30}px`);

  if (view === "icon") {
    if (range) {
      range.style.display = "block";
      const step = typeof config.rangeValue === "number"
        ? config.rangeValue
        : Math.round(((config.defaultIconSize || 120) - 50) / 2);
      range.value = step;
      const size = 50 + step * 2;
      container.style.setProperty("--icon-size", `${size}px`);
    }
    if (triggerIcon) triggerIcon.name = "grid-3x3-gap";
  } else {
    if (range) range.style.display = "none";
    if (view === "list" && triggerIcon) triggerIcon.name = "layout-three-columns";
    if (view === "detail" && triggerIcon) triggerIcon.name = "list-columns-reverse";
  }

  container.setAttribute("data-view", view);
}


/**
 * Insert a new item into a zone at a specific order.
 * Shifts down items at or after that order.
 * @param {SmartDragdrop} component
 * @param {Object} item - item data
 * @param {string|null} zoneId - target zone (defaults to columns[0].id if null)
 * @param {number} atOrder - exact order position
 */
export function _addItem(component, item, zoneId, atOrder) {
  const arr = component.fullData;

  // Default zone: first column if zoneId not provided
  const effectiveZoneId = zoneId || (component.columns[0] ? component.columns[0].id : null);

  const zoneItems = arr.filter(i => i.zone === effectiveZoneId);

  // Default to append if atOrder not provided
  const order = typeof atOrder === "number" ? atOrder : zoneItems.length;

  // Shift down items at or after that order
  zoneItems
    .filter(i => i.order >= order)
    .forEach(i => i.order++);

  const newItem = {
    ...item,
    _id: generateInternalId(), // always use one generator
    zone: effectiveZoneId,
    order
  };

  arr.push(newItem);
  return newItem;
}


/**
 * Remove multiple items by id.
 */
export function _removeItems(component, itemIds) {
  const arr = component.fullData;
  const removed = [];

  itemIds.forEach(itemId => {
    const item = arr.find(i => i._id === itemId);
    if (!item) return;

    const zoneId = item.zone;
    const order = item.order;

    // Remove
    component.fullData = component.fullData.filter(i => i._id !== itemId);

    // Shift up items after it
    component.fullData
      .filter(i => i.zone === zoneId && i.order > order)
      .forEach(i => i.order--);

    removed.push(item);
  });

  return removed;
}

/**
 * Move multiple items to a new zone/order.
 */
export function _moveItems(component, itemIds, newZoneId, startOrder) {
  const moved = [];
  let currentOrder = startOrder;

  itemIds.forEach(itemId => {
    const item = component.fullData.find(i => i._id === itemId);
    if (!item) return;

    const oldZone = item.zone;
    const oldOrder = item.order;

    // Shift up items in old zone
    component.fullData
      .filter(i => i.zone === oldZone && i.order > oldOrder)
      .forEach(i => i.order--);

    // Shift down items in new zone
    component.fullData
      .filter(i => i.zone === newZoneId && i.order >= currentOrder)
      .forEach(i => i.order++);

    item.zone = newZoneId;
    item.order = currentOrder++;

    moved.push(item);
  });

  return moved;
}

export function _updateItems(component, itemPatches) {
  console.log(itemPatches);
  const results = [];

  itemPatches.forEach(itemPatch => {
    const idx = component.fullData.findIndex(i => i._id === itemPatch._id);
    if (idx === -1) return;
    console.log(idx);
    // Update item with new patch
    component.fullData[idx] = { ...component.fullData[idx], ...itemPatch };
    console.log(component.fullData);
    const updatedItem = component.fullData[idx];
    // console.log(updatedItem);
    // Render new markup
    const view = component.columns.find(column => column.id === updatedItem.zone)?.view;
    const html = component.renderItem(updatedItem, updatedItem.zone, view);
    // console.log(html);
    // Parse into a real element
    const temp = document.createElement("div");
    temp.innerHTML = html.trim();
    const newEl = temp.firstElementChild;

    // Find existing element
    const targetElement = component.shadowRoot.querySelector(`[data-id="${updatedItem._id}"]`);
    const classList = targetElement.classList;
    console.log(classList);
    if (targetElement && newEl) {
      targetElement.replaceWith(newEl); // safer than outerHTML
      newEl.classList.add("selected");
    }

    results.push(updatedItem);
  });

  return results;
}




/**
 * Insert a single item element into the correct position in its zone.
 */
export function _insertElement(component, item) {

  const container = component.shadowRoot.getElementById(`${item.zone}-container`);
  if (!container) return;

  // Create the element markup
  const view = component.columns.filter(column=> column.id === item.zone)[0]["view"];
  const html = component.renderItem(item, item.zone, view);
  const temp = document.createElement("div");
  temp.innerHTML = html
  const newEl = temp.firstElementChild;
  // Find the first child whose order is greater than this item's order
  const siblings = Array.from(container.children);
  const target = siblings.find(el => {
    const id = el.getAttribute("data-id");
    const siblingItem = component.fullData.find(i => i._id === id);
    return siblingItem && siblingItem.order > item.order;
  });

  if (target) {
    container.insertBefore(newEl, target);
  } else {
    container.appendChild(newEl);
  }
}


/**
 * Remove multiple DOM elements.
 */
export function _removeElements(component, items) {
  console.log(items);
  items.forEach(item => {
    const container = component.shadowRoot.getElementById(`${item.zone}-container`);
    if (!container) return;
    const el = container.querySelector(`[data-id="${item._id}"]`);
    if (el) container.removeChild(el);
  });
}

/**
 * Move multiple DOM elements.
 */
export function _moveElements(component, items) {
  items.forEach(item => {
    const el = component.shadowRoot.querySelector(`[data-id="${item._id}"]`);
    if (!el) return;

    const newContainer = component.shadowRoot.getElementById(`${item.zone}-container`);
    if (!newContainer) return;

    // Find correct sibling
    const siblings = Array.from(newContainer.children);
    const target = siblings.find(sib => {
      const id = sib.getAttribute("data-id");
      const siblingItem = component.fullData.find(i => i._id === id);
      return siblingItem && siblingItem.order > item.order;
    });

    if (target) {
      newContainer.insertBefore(el, target);
    } else {
      newContainer.appendChild(el);
    }

    el.setAttribute("data-zone", item.zone);
  });
}

function generateInternalId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}


export function _computeGridTemplate(dataset, fields, container, font = "12px Roboto", imageWidth = 20, padding = 5) {
  const maxWidths = [];

  dataset.forEach(row => {
    fields.forEach((field, idx) => {
      const val = row[field];
      if (val !== undefined && val !== null) {
        const text = String(val);
        const w = getTextWidth(text, font) + padding + 10;
        maxWidths[idx] = Math.max(maxWidths[idx] || 0, w);
      }
    });
  });

  // console.log(maxWidths);
  // Use container width as denominator
  const containerWidth = container.getBoundingClientRect().width;
  // console.log(containerWidth);
  const cols = maxWidths.map(w => {
    const fraction = (w / containerWidth).toFixed(3);
    return `${fraction}fr`;
  });

  return cols.join(" ");
}

export function _getSelectedItems(component) {
  const results = {};
  component.columns.forEach(config => {
    const container = component.shadowRoot.getElementById(`${config.id}-container`);
    const selected = [...container.querySelectorAll(".draggable.selected")];
    const result = selected.map(el => el.dataset.id);
    results[config.id] = result;
  });
  return results;
}