import  '../smart/smart-toggle.js';
import '../smart/smart-button-group.js';

class DragdropBox extends HTMLElement {
  constructor() {
    super(); // Call the parent constructor for HTMLElement

    this.attachShadow({ mode: "open" }); // Attach shadow DOM so styles and markup are encapsulated

    // Initialize state variables
    this.fullData = []; // All definitions, regardless of selection
    this.selected = []; // Items in the "selected" column
    this.available = []; // Items in the "available" column
    this.lastSelectedIndex = null; // Tracks Shift+Click selection range
    this.historyStack = []; // Stores snapshots for undo/redo
    this.historyIndex = -1; // Current position in the history stack

    this.selected_allSelected = false;
    this.available_allSelected = false;
  }

  // Loads external stylesheet dynamically, then shows UI
  _loadExternalStyleSheet_thenTurnOnContent() {
    const styleLink = document.createElement("link");
    const path = `.././components/fc/dragdrop-box.css`;
    styleLink.setAttribute("rel", "stylesheet");
    styleLink.setAttribute("href", path);
    styleLink.setAttribute("type", "text/css");
    // Attach only if not already present
    if (!this.shadowRoot.querySelector(`link[href="${path}"]`)) {
      this.shadowRoot.appendChild(styleLink);
      styleLink.onload = () => {
        this._component_content.style.visibility = "visible";
      };
    }
  }

  disconnectedCallback() {     
      if (this._columns) {
        this._columns.removeEventListener('click', this._handleClickSelection);
        this._columns.removeEventListener('dblclick', this._handleDoubleClickTransfer);
      }

      if (this._dragSurface) {
        this._dragSurface.removeEventListener("pointerdown", this._onPointerDown);
        this._dragSurface.removeEventListener("pointermove", this._onPointerMove);
        this._dragSurface.removeEventListener("pointerup", this._onPointerUp);
      }
      this.shadowRoot.removeEventListener("dragstart", this._onDragStart);
      this.shadowRoot.removeEventListener("dragend", this._onDragEnd);
      this.shadowRoot.querySelectorAll(".container").forEach(container => {
        container.removeEventListener("dragover", this._onDragOver);
      });
      this.shadowRoot.replaceChildren();
  }
 
  // Called after setting `data` externally
set data({arr, defaultItems, renderItem }) {

  //console.log(defaultItems);

  // assign render function to local property
  this.renderItem = renderItem || this._defaultRenderer;

  // Save full dataset, assigning fallback IDs if missing
  this.fullData = arr.map((def, i) => ({
    ...def,
    _id: def._id || `def-${i}`,
  }));
  
  //console.log(this.fullData);
  // 🧠 Auto-select the first 'autoPreselectCount' items if available
 
  this._defaultSelection(defaultItems); // selected 1 or 2 default option from the dataset

  this.saveHistory(); // ✅ Save the initial state for undo to work
  // Initialize the component visuals and logic
    // Create the initial DOM structure
  this._renderInit(); // Build interface
  this._renderChange();

  this._loadExternalStyleSheet_thenTurnOnContent(); // Wait for CSS then show content
  
  //this._handleKeyInteractions(); // Set up keyboard shortcuts

  this._initDragLogic(this._columns); // Enable drag functionality
  this._initSelectionLogic(); // Enable click and shift-click selection
}

  _defaultSelection(defaultItems) {
    //console.log(`vao defaultItems`, defaultItems);
    //const count = Math.min(defaultItems.length, this.fullData.length); //This ensures you’re never trying to grab more items than exist — and everything keeps humming along smoothly.
    try {  
      if (defaultItems.length===0) { // no default item
       // console.log(`try`);
        const count = Math.min(2, this.fullData.length);
        this.selected  = this.fullData.slice(0,count);
        this.available = this.fullData.slice(count);
      } else  { // has some default items   
        //console.log(`else`);
        // 🧵 Step 1: Extract elements at given positions
        this.selected = defaultItems.map(pos => this.fullData[pos]);
        // 🧮 Step 2: Subtract extracted elements from mother array
        this.available = this.fullData.filter(item => !this.selected.includes(item));
        
      }
      this.saveHistory();
      //this.emitResult();
     // console.log(this.getSelectedIndexArray());
    } catch (e) {
      console.log(`Fail to extract data`, e);
    }
  }

  _defaultRenderer(item, zone) {
  return `<div class="def-item" data-zone="${zone}" data-id="${item._id}">
    ${item.text || item.label || item.name || 'Unnamed'}
  </div>`;
}
  
// Renders UI containers and buttons
  _renderInit() {
    const template = document.createElement("template");
    template.innerHTML =  `<div id="component-container"><div class="columns">
        <div class="column">
          <div class="header">              
            <span id="selectedColumnTitle">selected</span>    
            <smart-toggle id="selected_smartToggleSelect" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' fontSize='1rem' btnBorder></smart-toggle>
          </div>
          <div id="selected-container" class="container selected-container noScrollable_container">         
          
          </div>
        </div>
        <div class="column">
          <div class="header">
            <span id="availableColumnTitle">available</span>
            <smart-toggle id="available_smartToggleSelect" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' fontSize='1rem' btnBorder></smart-toggle>
          </div>
          <div id="available-container" class="container available-container noScrollable_container"> 
          </div>
        </div>
      </div>

        <div class="toolbar">
          <div class="left-tools">
              <smart-button-group id="history_buttonGroup" secondColor="default">
                <sl-button-group>            
                  <sl-tooltip content="Undo - (Esc)">
                    <sl-button size="small" cb="Undo"><sl-icon name="arrow-counterclockwise"></sl-icon></sl-button>
                  </sl-tooltip>
                  <sl-tooltip content="Redo">
                    <sl-button size="small" cb="Redo"><sl-icon name="arrow-clockwise"></sl-icon> </sl-button>
                  </sl-tooltip>
                </sl-button-group>
              </smart-button-group>
          </div>
          <div class="right-tools"></div>
        </div>
        <div id="lasso"></div>
      </div>`;
 
    // Attach to shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._assignNameandFunctionsToElements();
  }

  _assignNameandFunctionsToElements() {
    this._component_content = this.shadowRoot.getElementById("component-container");
    this._component_content.style.visibility = "hidden"; // Hide to avoid unstyled flash
    
    this._selectedColumnTitle = this.shadowRoot.getElementById(`selectedColumnTitle`);
    this._availableColumnTitle = this.shadowRoot.getElementById(`availableColumnTitle`);
    // console.log(this._selectedColumnTitle);
    // console.log(this._availableColumnTitle);

    this._columns = this.shadowRoot.querySelector(".columns");
    this._selected_container = this.shadowRoot.getElementById("selected-container");
    this._available_container = this.shadowRoot.getElementById("available-container");

    // 📌 Get reference to the smart-toggle component for "selected" items
    this.selected_smartToggleSelect = this.shadowRoot.getElementById("selected_smartToggleSelect");
    // 🧭 Define callback functions for each toggle state 
    this.selected_smartToggleSelect.callbacks = {
      0: () => this.bulkUnselect(".selected-container"),   // Index 0 → Off: unselect items in ".selected-container"
      1: () => this.bulkSelect(".selected-container"),     // Index 1 → On: select items in ".selected-container"
    };

    // 📌 Get reference to the smart-toggle component for "available" items
    this.available_smartToggleSelect = this.shadowRoot.getElementById("available_smartToggleSelect");
    this.available_smartToggleSelect.callbacks = {
      0: () => this.bulkUnselect(".available-container"),
      1: () => this.bulkSelect(".available-container"),
    };

    // 📌 Get reference to the smart-button-group component for history controls (undo/redo)
    this.history_buttonGroup = this.shadowRoot.getElementById("history_buttonGroup");
    // 🚀 Dispatch a custom "group-ready" event to notify the history button group
    // This tells it to initialize now that all slots are populated
    this.history_buttonGroup.dispatchEvent(new CustomEvent("group-ready"));
    // 🧭 Define named callbacks for undo/redo functionality
    this.history_buttonGroup.callbacks = {
      Undo: () => this.navigateHistory(-1),    // "Undo" triggers history navigation back one step (-1)
      Redo: () => this.navigateHistory(1),    // "Redo" moves forward one step (+1)
    };


  }

_renderChange() {     
  // 🧼 Clear previous items in each column and inject new ones
  this._selected_container.replaceChildren();
  this._selected_container.innerHTML = this.selected.map(item => this.renderItem(item, "selected")).join("");
  this._available_container.replaceChildren();
  this._available_container.innerHTML = this.available.map(item => this.renderItem(item, "available")).join("");

  //reset all smart toggles to default value;
  const smart_toggles = this.shadowRoot.querySelectorAll('smart-toggle');
  smart_toggles.forEach(tog=> tog.setDefaultValue());
  this.emitResult();    
}

// 🛠️ Handles selection logic for draggable items,
// including multi-select via Shift+Click and transferring items on double-click
_initSelectionLogic() {
// Store bound handlers so they can be removed later
this._handleClickSelection = this._handleClickSelection.bind(this);
this._handleDoubleClickTransfer = this._handleDoubleClickTransfer.bind(this);

this._columns.addEventListener('click', this._handleClickSelection);
this._columns.addEventListener('dblclick', this._handleDoubleClickTransfer);
}

_handleClickSelection(e) {
  const item = e.target.closest('.draggable');
  if (!item) return;

  const siblings = [...item.parentElement.querySelectorAll('.draggable')];

  if (e.shiftKey && this.lastSelectedIndex !== null) {
    const currentIdx = siblings.indexOf(item);
    const [min, max] = [this.lastSelectedIndex, currentIdx].sort((a, b) => a - b);

    for (let i = min; i <= max; i++) {
      siblings[i].classList.add('selected');
    }
  } else {
    item.classList.toggle('selected');
  }
  this.lastSelectedIndex = siblings.indexOf(item);
}

_handleDoubleClickTransfer(e) {
  const item = e.target.closest('.draggable');
  if (!item) return;

  const container = item.closest('.available-container');
  if (!container) return;

  const selectedItems = [...container.querySelectorAll('.draggable.selected')];
  const itemsToMove = selectedItems.length > 0 ? selectedItems : [item];

  itemsToMove.forEach((el) => {
    const id = el.getAttribute('data-id');
    const index = this.available.findIndex((d) => d._id === id);
    if (index !== -1) {
      const movedItem = this.available.splice(index, 1)[0];
      this.selected.push(movedItem);
    }
  });

  this.saveHistory();
  this._renderChange();
}


_initDragLogic(element) {
  if (!element) return;
  this._dragSurface = element; // Store reference for cleanup

  // Bind handlers once and store them for removal
  this._onPointerDown = this._onPointerDown.bind(this);
  this._onPointerMove = this._onPointerMove.bind(this);
  this._onPointerUp = this._onPointerUp.bind(this);
  this._onDragStart = this._onDragStart.bind(this);
  this._onDragEnd = this._onDragEnd.bind(this);
  this._onDragOver = this._onDragOver.bind(this);

  element.addEventListener("pointerdown", this._onPointerDown);
  element.addEventListener("pointermove", this._onPointerMove);
  element.addEventListener("pointerup", this._onPointerUp);

  this.shadowRoot.addEventListener("dragstart", this._onDragStart);
  this.shadowRoot.addEventListener("dragend", this._onDragEnd);

  this.shadowRoot.querySelectorAll(".container").forEach(container => {
    container.addEventListener("dragover", this._onDragOver);
  });
}

_onPointerDown(e) {
  if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button")) return;
  
  this._isDragging = true;
  this._startX = e.clientX;
  this._startY = e.clientY;

  const lasso = this.shadowRoot.getElementById("lasso");
  lasso.style.left = `${this._startX}px`;
  lasso.style.top = `${this._startY}px`;
  lasso.style.width = "0px";
  lasso.style.height = "0px";
  lasso.style.display = "block";
}

_onPointerMove(e) {
  if (!this._isDragging) return;
  clearTimeout(this._selectionTimeout);

  const x = Math.min(e.clientX, this._startX);
  const y = Math.min(e.clientY, this._startY);
  const w = Math.abs(e.clientX - this._startX);
  const h = Math.abs(e.clientY - this._startY);

  const lasso = this.shadowRoot.getElementById("lasso");
  lasso.style.left = `${x}px`;
  lasso.style.top = `${y}px`;
  lasso.style.width = `${w}px`;
  lasso.style.height = `${h}px`;

  const box = lasso.getBoundingClientRect();
  const items = this.shadowRoot.querySelectorAll(".draggable");

  this._selectionTimeout = setTimeout(() => {
    items.forEach(item => {
      const r = item.getBoundingClientRect();
      const xOverlap = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
      const yOverlap = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
      const coverage = (xOverlap * yOverlap) / (r.width * r.height);
      item.classList.toggle("selected", coverage >= 0.6);
    });
  }, 20);
}

_onPointerUp() {
  this._isDragging = false;
  this.shadowRoot.getElementById("lasso").style.display = "none";
}

_onDragStart(e) {
  const item = e.target.closest(".draggable");
  if (!item) return;

  const container = item.closest(".container");
  this._draggedItems = [...container.querySelectorAll(".draggable.selected")];

  if (this._draggedItems.length === 0) {
    item.classList.add("selected");
    this._draggedItems = [item];
  }

  const dragImg = document.createElement("div");
  dragImg.id = "dragImgId";
  Object.assign(dragImg.style, {
    position: "absolute", top: "-9999px", fontSize: "20px", padding: "6px 12px",
    background: "white", border: "1px solid #ccc", borderRadius: "2px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.0)", pointerEvents: "none", zIndex: "9999"
  });
  dragImg.textContent = `${this._draggedItems.length} item(s)`;
  document.body.appendChild(dragImg);
  e.dataTransfer.setDragImage(dragImg, -5, -5);

  this._draggedItems.forEach(el => el.classList.add("dragging"));
}

_onDragEnd(e) {
  this._draggedItems?.forEach(el => el.classList.remove("dragging"));
  this.syncContainers();
  document.getElementById("dragImgId")?.remove();
  this._resetLasso();
  this._renderChange();
  this._draggedItems = [];
}

_onDragOver(e) {
  e.preventDefault();
  if (!this._draggedItems?.length) return;

  const container = e.currentTarget;
  const afterElement = this._getDragAfterElement(container, e.clientY);
  const siblings = [...container.querySelectorAll(".draggable:not(.dragging)")];

  siblings.forEach(el => el.classList.remove("moving-up", "moving-down"));

  if (afterElement) {
    const index = siblings.indexOf(afterElement);
    siblings.forEach((el, i) => {
      if (i === index) el.classList.add("moving-down");
      if (i === index - 1) el.classList.add("moving-up");
    });
  }

  this._draggedItems.forEach(dragged => {
    container.insertBefore(dragged, afterElement || null);
  });
}

//Calculates which item is immediately after the dragged position—so you can insert dragged items correctly in DOM order.
  _getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll(".draggable:not(.dragging)")];

    // Reduce to find the closest item above the mouse Y position
    return items.reduce(
      (closest, el) => {
        const box = el.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        return offset < 0 && offset > closest.offset
          ? { offset, element: el }
          : closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }


  _resetLasso() {
    const lasso = this.shadowRoot.getElementById("lasso");
    if (lasso) {
      lasso.style.display = "none";
      lasso.style.width = "0px";
      lasso.style.height = "0px";
      lasso.style.left = "0px";
      lasso.style.top = "0px";
    }
  }
  //These are utility methods for quickly toggling selection state across a group—useful for “select all” or “clear selection” buttons.
  bulkSelect(selector) {
    // Selects all .draggable items inside the given container and adds 'selected' class
    this.shadowRoot
      .querySelectorAll(`${selector} .draggable`)
      .forEach((d) => d.classList.add("selected"));
  }

  bulkUnselect(selector) {
    // Removes 'selected' class from all .draggable items in the given container
    this.shadowRoot
      .querySelectorAll(`${selector} .draggable`)
      .forEach((d) => d.classList.remove("selected"));
  }

  //This method updates your selected and available lists based on the current DOM layout—ideal after dragging items or manual reordering.
  syncContainers() {
    const grab = (sel) =>
      [...this.shadowRoot.querySelectorAll(`${sel} .draggable`)].map((el) => {
        const id = el.getAttribute("data-id");
        const original = this.fullData.find((obj) => obj._id === id);
        return original || { _id: id, definition: el.textContent.trim() };
      });

    // Update internal arrays by reading directly from the DOM
    this.selected = grab(".selected-container");
    this.available = grab(".available-container");

    this.shadowRoot.getElementById('')
    //console.log(this.selected.length);
    //console.log(this.available.length);
    // Log this state change in undo history
    this.saveHistory();
  }
  //Used to finalize the selection and remove the component—like clicking a “Done” button.
  emitResult() {
    //console.log("emit dragdrop-box-changed result");
    //this.syncContainers(); // Ensure final selections are accurate
    this.getSelectedIndexArray();
    //console.log(this.getSelectedIndexArray());
    this.dispatchEvent(
      new CustomEvent("dragdrop-box-changed", {
        detail: { selected: this.selected,
                  indexSelected: this.getSelectedIndexArray()
         }, // Pass selected data to parent context
        bubbles: false, // Allow event to bubble out of shadow DOM
        composed: true, // Allow event to cross shadow boundaries
      })
    );
    
    // console.log(this._selectedColumnTitle);
    // console.log(this._availableColumnTitle);
    this._selectedColumnTitle.innerText=`${this.selected.length} selected`;
    this._availableColumnTitle.innerText=`${this.available.length} available`;

    // availableColumnTitle
   // this.remove(); // Remove the component from DOM
  }

  getSelectedIndexArray() {
    return this.selected.map(item=>Number(item._id.slice(4,item._id.length)));    
  }

  //Keeps track of every meaningful interaction for undo/redo. Deep cloning ensures that mutations don’t affect past states.
  saveHistory() {
    const snapshot = {
      selected: JSON.parse(JSON.stringify(this.selected)), // Deep clone
      available: JSON.parse(JSON.stringify(this.available)),
    };

    // Trim forward history if user had undone actions
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    // Push new snapshot and move pointer
    this.historyStack.push(snapshot);
    this.historyIndex = this.historyStack.length - 1;
  }

  //Supports undo (direction = -1) or redo (direction = +1) by jumping to a saved snapshot.
  navigateHistory(direction) {
    const newIndex = this.historyIndex + direction;

    // Abort if index is out of bounds
    if (newIndex < 0 || newIndex >= this.historyStack.length) return;

    const snapshot = this.historyStack[newIndex];
    if (!snapshot) return;

    // Load previous state snapshot
    this.selected = JSON.parse(JSON.stringify(snapshot.selected));
    this.available = JSON.parse(JSON.stringify(snapshot.available));
    this.historyIndex = newIndex;

    // Re-render UI with restored state
    this._renderChange();
   // this.initDragLogic();
   // this.initSelectionLogic();
  }

  //⌨️ Keyboard Interaction Setup
  // Listens for Escape key to trigger undo. Easily extendable for more hotkeys (like Ctrl+Z or Enter).
  _handleKeyInteractions() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        console.log(e); // Optional debug logging
        this.navigateHistory(-1); // Undo
        e.preventDefault(); // Prevent browser default
      }
    });
  }

  //🚪 Focus Management Helpers
  // Helps keep tab navigation inside the component. Critical for accessibility and keyboard users.
  _getFocusableElements() {
    // Grab focusable tags and filter out disabled ones
    return Array.from(
      this.shadowRoot.querySelectorAll(
        "button, input, textarea, select, a[href]"
      )
    ).filter((el) => !el.hasAttribute("disabled"));
  }  
}

customElements.define("dragdrop-box", DragdropBox);
