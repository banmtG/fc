// Helper: parse a unit string into { type, value }
export function parseUnit(str) {
  if (!str) return { type: "fr", value: 1 }; // default
  if (str === "auto") return { type: "auto" };
  if (str.endsWith("px")) return { type: "px", value: parseFloat(str) };
  if (str.endsWith("fr")) return { type: "fr", value: parseFloat(str) };
  return { type: "fr", value: 1 }; // fallback
}

// Helper: measure widest cell content for auto columns (including padding)
function measureContentWidth(root, key) {
  const cells = root.querySelectorAll(`.cell[data-key="${key}"]`);
  let maxWidth = 0;

  cells.forEach(c => {
    let contentWidth = 0;

    if (c.children.length > 0) {
      Array.from(c.children).forEach(child => {
        contentWidth = Math.max(contentWidth, child.scrollWidth);
      });
    } else {
      // fallback: measure text node via Range
      const range = document.createRange();
      range.selectNodeContents(c);
      const rect = range.getBoundingClientRect();
      contentWidth = rect.width;
    }

    const style = window.getComputedStyle(c);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const totalWidth = contentWidth + paddingLeft + paddingRight;

    maxWidth = Math.max(maxWidth, totalWidth);
  });

  return maxWidth;
}

export function syncPixelTracks(component) {
  const root = component.shadowRoot;
  const table = root.querySelector(".table");
  const body = root.querySelector(".body");
  if (!table || !component._columns) return;

  const containerWidth = table.clientWidth;
  const scrollbarWidth = body ? (body.offsetWidth - body.clientWidth) : 0;
  const usableWidth = containerWidth - scrollbarWidth;

  let fixedPx = 0;
  let totalFr = 0;

  const parsed = component._columns.map(col => {
    const w = col.width_set || {};
    const base = parseUnit(w.value);
    const min = parseUnit(w.min);
    const max = parseUnit(w.max);

    if (base.type === "auto") {
      const autoWidth = measureContentWidth(root, col.key);
      let px = autoWidth;
      if (min.type === "px") px = Math.max(px, min.value);
      if (max.type === "px") px = Math.min(px, max.value);
      fixedPx += px;
      return { type: "px", px };
    }

    if (base.type === "px") {
      let px = base.value;
      if (min.type === "px") px = Math.max(px, min.value);
      if (max.type === "px") px = Math.min(px, max.value);
      fixedPx += px;
      return { type: "px", px };
    }

    if (base.type === "fr") {
      totalFr += base.value;
      return { type: "fr", fr: base.value, min, max, key: col.key };
    } 

    return { type: "fr", fr: 1, min, max, key: col.key }; // fallback
  });

  const remaining = Math.max(usableWidth - fixedPx, 0);

  const widthsPx = parsed.map(p => {
    if (p.type === "px") return `${p.px}px`;

    const share = totalFr > 0 ? (p.fr / totalFr) : 0;
    let px = Math.floor(remaining * share);

    // enforce min/max constraints
    const minPx = p.min?.type === "px" ? p.min.value : 0;
    const maxPx = p.max?.type === "px" ? p.max.value : Infinity;

    // if min/max are "auto", measure content width
    // if (p.min?.type === "auto") {
    //   px = Math.max(px, measureContentWidth(root, p.key));
    // }
    // if (p.max?.type === "auto") {
    //   px = Math.min(px, measureContentWidth(root, p.key));
    // }

    px = Math.max(px, minPx);
    px = Math.min(px, maxPx);

    return `${px}px`;
  });
  // console.log(widthsPx);
  table.style.setProperty("--table-columns", widthsPx.join(" "));
}


export function detachResizeHandles(component) {
  component.shadowRoot.querySelectorAll(".resize-handle").forEach(h => h.remove());
}

export function attachResizeHandles(component) {

  const headerCells = component.shadowRoot.querySelectorAll(".header .cell");
  const table = component.shadowRoot.querySelector(".table");
  headerCells.forEach((cell, i) => {
    if (!cell.querySelector(".resize-handle")) {
      const col = component._columns[i];
      if (!col?.width_set?.resizable) return;

      const minWidth = col.width_set.min? parseToPixels(col.width_set.min) : 40;

      const maxWidth = col.width_set.max? parseToPixels(col.width_set.max) : parseToPixels("400px") ;
     
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      cell.appendChild(handle);

      
      handle.addEventListener("pointerdown", e => {
        e.preventDefault(); // prevent text selection
        const startX = e.clientX;
        const startWidth = cell.offsetWidth;

        // Snapshot all current column widths in px
        const snapshot = component._columns.map((c, idx) => {
          const el = headerCells[idx];
          return {
            col: c,
            width: el.offsetWidth
          };
        });

        // Create a controller for this drag session
        const controller = new AbortController();
        const { signal } = controller;

        const onMove = ev => {
          const delta = ev.clientX - startX;
          let newWidth = startWidth + delta;


          if (newWidth<minWidth) newWidth=minWidth;
          if (newWidth>maxWidth) newWidth=maxWidth;
          // if (newWidth<0) newWidth=40;
          // Update only the target column
          col.width_set.value = `${newWidth}px`;

          // Rebuild template string using snapshot widths for others
          const templateCols = component._columns
            .map((c, idx) => {
              if (idx === i) {
                return col.width_set.value; // resized column
              }
              return `${snapshot[idx].width}px`; // frozen old value
            })
            .join(" ");

            table.style.setProperty("--table-columns", templateCols);

        };

        const onUp = () => {
          controller.abort(); // abort all listeners
        };

        window.addEventListener("pointermove", onMove, { signal });
        window.addEventListener("pointerup", onUp, { signal });
      });
    }
  });
  
}

/**
 * Parse a CSS size string into pixels.
 * Supports px directly, and fr if you provide container size + total fr units.
 *
 * @param {string} value - e.g. "100px", "4fr"
 * @param {number} [containerSize] - pixel size of the container (needed for fr)
 * @param {number} [totalFr] - total fraction units in the grid (needed for fr)
 * @returns {number|null} pixel value or null if cannot resolve
 */
function parseToPixels(value, containerSize, totalFr) {
  if (typeof value !== "string") return null;

  value = value.trim();

  // px values
  if (value.endsWith("px")) {
    return parseFloat(value);
  }

  // fr values (need context)
  if (value.endsWith("fr")) {
    const fr = parseFloat(value);
    if (!containerSize || !totalFr) {
      console.warn("Need containerSize and totalFr to resolve fr units");
      return null;
    }
    return (fr / totalFr) * containerSize;
  }

  // % values
  if (value.endsWith("%")) {
    const pct = parseFloat(value);
    if (!containerSize) {
      console.warn("Need containerSize to resolve % units");
      return null;
    }
    return (pct / 100) * containerSize;
  }

  // fallback
  return null;
}
