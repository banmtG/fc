/** Usage 
<body>
   
    <dragdrop-box></dragdrop-box>
    
    <script> 

    const definition = document.querySelector("dragdrop-box");
    let arrayObjects = JSON.parse("[{\"pos\":\"verb\",\"info\":\"A1 [T]\",\"definition\":\"to obtain, buy, or earn something\",\"example\":\"He went to the shop to get some milk.\\nUK I think she gets about £40,000 a year.\\nWe stopped on the way to get some breakfast.\\nget something for something I managed to get all three suitcases for under $200.\\nHow much did he get for his car? (= How much money did he sell it for?)\\nget something from something Where did you get your shoes from?\"},{\"pos\":\"verb\",\"info\":\"A1 [T]\",\"definition\":\"to receive or be given something\",\"example\":\"UK I got quite a surprise when I saw her with short hair.\\nWhen did you get the news about Sam?"},{\"pos\":\"verb\",\"info\":\"A2 [T]\",\"definition\":\"to go somewhere and bring back someone or something\",\"example\":\"Let me go get my glasses.\\n[+ two objects] Can I get you a drink?\"}]");
   

    const cardData = [{id: "card-1",title: "card-1",imgUrl: "https://tse3.mm.bing.net/th/id/OIP.n_xnoO2NUFM3Vwec1zACPwHaFj?w=400&c=7&r=0&o=5&pid=1.7"},{id: "card-2",title: "card-2",imgUrl: "https://tse1.mm.bing.net/th/id/OIP.j12h-Rf5gXD8hX3mhSa1IAHaEo?w=400&c=7&r=0&o=5&pid=1.7"}];

    definition.data = {arr: arrayObjects, autoPreselectCount: 2, renderItem:renderDefi_callBack };

    document.addEventListener("definitionEditorClosed", e => {
        console.log("Selected items in order:", e.detail.selected);
    });

    function renderCard_callBack(d, zone) {
        return `
            <div class="draggable" draggable="true" part="card-container" data-id="${d._id}">
                <img src="${d.imgUrl}" alt="${d.title}" part="card-img" />
                <h3 part="card-title">${d.id}</h3>
            </div>
        `;
    }

    function renderDefi_callBack(d, zone) {
        return `
            <div class="draggable" draggable="true" data-id="${d._id}">
              <span class="info">${d?.pos} | ${d?.info} </span><br>
              ${d?.definition}<br>
              <span class="info">${d?.example.split(`\n`).join('<br>')}</span>
            </div>
        `;
    }
*/

// Define a custom HTML element named 'DragdropBox'
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

    // Paths to external resources
    this.componentCSS = `<link rel="stylesheet" href=".././components/dragdrop-box.css" />`;

    // this.CSSJSlibraries = ` <link rel="preload" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/themes/light.css" />
    // <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/shoelace-autoloader.js"></script>`;
  }

  // Loads external stylesheet dynamically, then shows UI
  _loadExternalStyleSheet_thenTurnOnContent() {
    LoadingOverlay.show({ loadingstyle: `2arcs` }); // Start a global loading icon UI
    const styleLink = document.createElement("link");
    const path = `.././components/dragdrop-box.css`;
    styleLink.setAttribute("rel", "stylesheet");
    styleLink.setAttribute("href", path);
    styleLink.setAttribute("type", "text/css");
    // Attach only if not already present
    if (!this.shadowRoot.querySelector(`link[href="${path}"]`)) {
      this.shadowRoot.appendChild(styleLink);
      styleLink.onload = () => {
        this.component_content.style.visibility = "visible";
        LoadingOverlay.hide(); // Hides a global loading UI
      };
    }
  }

  disconnectedCallback() {     
      this.shadowRoot.replaceChildren();
      this.shadowRoot.innerHTML =``;
      this.remove();
      //window.removeEventListener('keydown', this._boundHandleShortcuts); 

  }
 

  // Called after setting `data` externally
set data({arr, defaultItems, renderItem }) {

  this.renderItem = renderItem || this._defaultRenderer;

  // Save full dataset, assigning fallback IDs if missing
  this.fullData = arr.map((def, i) => ({
    ...def,
    _id: def._id || `def-${i}`,
  }));
  
  console.log(this.fullData);
  // 🧠 Auto-select the first 'autoPreselectCount' items if available
  //const count = Math.min(defaultItems.length, this.fullData.length); //This ensures you’re never trying to grab more items than exist — and everything keeps humming along smoothly.
  try {  

    if (defaultItems.length===0) { // no default item
      console.log(`try`);
      const count = Math.min(2, this.fullData.length);
      this.selected  = this.fullData.slice(0,count);
      this.available = this.fullData.slice(count);
    } else  { // has some default items   
      console.log(`else`);
      // 🧵 Step 1: Extract elements at given positions
      this.selected = defaultItems.map(pos => this.fullData[pos]);
      // 🧮 Step 2: Subtract extracted elements from mother array
      this.available = this.fullData.filter(item => !this.selected.includes(item));
    }
  } catch (e) {
    console.log(`Fail to extract data`, e);
  }

  this.saveHistory(); // ✅ Save the initial state for undo to work

  // Create the initial DOM structure
  this.frameUpTheComponent(); // Populate the shadow root with HTML

  // Initialize the component visuals and logic
  this.renderInit(); // Build interface
  this.renderChange();
  this._loadExternalStyleSheet_thenTurnOnContent(); // Wait for CSS then show content
  this._trapFocus(); // Lock focus inside component if needed
  this._handleKeyInteractions(); // Set up keyboard shortcuts
  this.initDragLogic(); // Enable drag functionality
  this.initSelectionLogic(); // Enable click and shift-click selection
}


  // Render basic HTML structure for the component
  frameUpTheComponent() {
    // Set the inner HTML of the shadow root, injecting external resources ${this.CSSJSlibraries}
    this.shadowRoot.innerHTML = `
      <div id="component-container"></div>
    `;

    // Grab reference to main container and hide until styles are loaded
    this.component_content = this.shadowRoot.getElementById(
      "component-container"
    );
    this.component_content.style.visibility = "hidden"; // Hide to avoid unstyled flash
  }

  

  _defaultRenderer(item, zone) {
  return `<div class="def-item" data-zone="${zone}" data-id="${item._id}">
    ${item.text || item.label || item.name || 'Unnamed'}
  </div>`;
}

   assignFunctionsToElements() {
    // this.shadowRoot.getElementById("closeBtn").onclick = () =>
    // this.emitResult();    

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
  // Renders UI containers and buttons
  renderInit() {
    this.component_content.innerHTML = `
      <div class="columns">
        <div class="column">
          <div class="header">              
            <span id="selectedColumnTitle">selected</span>    
            <smart-toggle id="selected_smartToggleSelect" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' fontSize='1rem' btnBorder></smart-toggle>
          </div>
          <div id="selected-container" class="container selected-container">         
          
          </div>
        </div>
        <div class="column">
          <div class="header">
            <span id="availableColumnTitle">available</span>
            <smart-toggle id="available_smartToggleSelect" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' fontSize='1rem' btnBorder></smart-toggle>
          </div>
          <div id="available-container" class="container available-container"> 
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
     
        </div>
      <div id="lasso"></div>`;

    this.assignFunctionsToElements();
  }

    //  <div class="right-tools">
    //       <smart-button-group id="history_buttonGroup" secondColor="default">
    //           <sl-button-group>            
    //             <sl-tooltip content="Cancel">
    //               <sl-button size="small" cb="Cancel"><sl-icon name="x-lg"></sl-icon> Cancel</sl-button>
    //             </sl-tooltip>
    //             <sl-tooltip content="Confirm">
    //               <sl-button id="closeBtn" size="small" cb="Confirm" ><sl-icon name="box-arrow-in-right"></sl-icon> Confirm</sl-button>
    //             </sl-tooltip>
    //           </sl-button-group>
    //         </smart-button-group>          
    //     </div>

  renderChange() {
    const selectedContainer = this.shadowRoot.getElementById("selected-container");
    const availableContainer = this.shadowRoot.getElementById("available-container");      
 
    // 🧼 Clear previous items and inject new ones
    selectedContainer.innerHTML = this.selected.map(item => this.renderItem(item, "selected")).join("");
    availableContainer.innerHTML = this.available.map(item => this.renderItem(item, "available")).join("");

    //reset smart toggle;
    const smart_toggles = this.shadowRoot.querySelectorAll('smart-toggle');
    smart_toggles.forEach(tog=> tog.setDefaultValue());
    this.emitResult();    
  }


  // 🛠️ Handles selection logic for draggable items,
  // including multi-select via Shift+Click and transferring items on double-click
  initSelectionLogic() {
    // Selects all elements with class 'draggable' inside the shadow DOM
    const all = this.shadowRoot.querySelectorAll(".draggable");

    // Iterate over each draggable item with its index
    all.forEach((item, idx) => {
      // 👆 Handle single and shift-click selection
      item.addEventListener("click", (e) => {
        // Check if Shift is held and there's a previous selection index
        if (e.shiftKey && this.lastSelectedIndex !== null) {
          // Get the container that holds the current item
          const container = item.parentElement;

          // Get all sibling draggable elements in the same container
          const siblings = [...container.querySelectorAll(".draggable")];

          // Get index of the currently clicked item within its siblings
          const currentIdx = siblings.indexOf(item);

          // Sort the index range between last selected and current to get selection bounds
          const [min, max] = [this.lastSelectedIndex, currentIdx].sort(
            (a, b) => a - b
          );

          // Apply the 'selected' class to all items in the range (inclusive)
          for (let i = min; i <= max; i++) {
            siblings[i].classList.add("selected");
          }
        } else {
          // If Shift isn't held, toggle the selected state of the clicked item only
          item.classList.toggle("selected");
        }

        // Update the last selected index for future shift-selects
        this.lastSelectedIndex = [
          ...item.parentElement.querySelectorAll(".draggable"),
        ].indexOf(item);
      });

      // ✅ Handle double-click to transfer item(s) from available → selected
      item.addEventListener("dblclick", (e) => {
        // Locate the nearest container with class 'available-container'
        const container = item.closest(".available-container");

        // Only proceed if the item is in the available list (not selected column)
        if (!container) return;

        // Get all currently selected items in the available container
        const selectedItems = [
          ...container.querySelectorAll(".draggable.selected"),
        ];

        // Determine what to move: use selected items if any, else the double-clicked item
        const itemsToMove = selectedItems.length > 0 ? selectedItems : [item];

        // Loop over each item that will be moved
        itemsToMove.forEach((el) => {
          // Get unique identifier from data attribute
          const id = el.getAttribute("data-id");

          // Find the item in the 'available' array by its ID
          const index = this.available.findIndex((d) => d._id === id);

          // If found, remove from available and push to selected list
          if (index !== -1) {
            const movedItem = this.available.splice(index, 1)[0];
            this.selected.push(movedItem);
          }
        });

        // Save the current state to the history stack (for undo/redo)
        this.saveHistory();
        // Re-render the UI to reflect changes
        this.renderChange();
        // Re-initialize drag logic for newly rendered items
        this.initDragLogic();
        // Re-apply selection logic to new DOM structure
        this.initSelectionLogic();
      });
    });
  }

  // 🧲 Enable rectangle lasso selection and drag/drop behavior
  initDragLogic() {
    // Track whether the user is currently dragging the mouse for lasso
    let isDragging = false;

    // Reference to the invisible rectangle (lasso) drawn by the user
    const lasso = this.shadowRoot.getElementById("lasso");

    // Store starting X/Y position when lasso begins
    let startX = 0,
      startY = 0;

    // Array to store selected draggable elements during drag
    let draggedItems = [];

    // 👆 Trigger when mouse button is pressed down
    document.addEventListener("mousedown", (e) => {
      // Exit if not left-click or if user clicked a button (prevent accidental triggers)
      if (e.button !== 0 || e.target.closest("button")) return;

      // Begin dragging state
      isDragging = true;

      // Record starting mouse position
      startX = e.clientX;
      startY = e.clientY;

      // Position and reset the lasso dimensions
      lasso.style.left = `${startX}px`;
      lasso.style.top = `${startY}px`;
      lasso.style.width = "0px";
      lasso.style.height = "0px";
      lasso.style.display = "block"; // Make lasso visible
    });

    let selectionTimeout;
    // 📦 Track mouse movement while dragging to resize lasso
    document.addEventListener("mousemove", (e) => {
      // Only draw if dragging is active
      if (!isDragging) return;

      clearTimeout(selectionTimeout); // Cancel previous timeout

      // Calculate top-left corner of the lasso
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);

      // Calculate width and height from starting position
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);

      // Update lasso rectangle size and position
      lasso.style.left = `${x}px`;
      lasso.style.top = `${y}px`;
      lasso.style.width = `${w}px`;
      lasso.style.height = `${h}px`;

      // Get bounding box of the lasso element
      const box = lasso.getBoundingClientRect();

      // Select all draggable items in the component
      const items = this.shadowRoot.querySelectorAll(".draggable");

      // Loop through each item to determine if it's inside the lasso box
      //🧪 Updated Lasso Selection with 60% Overlap Threshold
      selectionTimeout = setTimeout(() => { //Debounce or throttle mousemove selection To reduce conflicts, you can debounce the selection logic so it doesn’t spam updates too frequently:
        // Your coverage-based selection logic here
        items.forEach((item) => {
          const r = item.getBoundingClientRect(); // Item position and dimensions
          const l = box;                          // Lasso bounding box

          // Compute intersection rectangle dimensions
          const xOverlap = Math.max(0, Math.min(r.right, l.right) - Math.max(r.left, l.left));
          const yOverlap = Math.max(0, Math.min(r.bottom, l.bottom) - Math.max(r.top, l.top));

          const intersectionArea = xOverlap * yOverlap;             // Area of overlap
          const itemArea = r.width * r.height;                      // Total item area
          const coverage = intersectionArea / itemArea;             // Percent covered

          // Select item if lasso covers at least 80% of its area
          if (coverage >= 0.6) item.classList.add("selected");
          else item.classList.remove("selected");
        });
      }, 20); // Tune this timing if needed
    });

    // 🖱️ Triggered when mouse button is released
    document.addEventListener("mouseup", () => {
      isDragging = false; // Stop dragging state
      lasso.style.display = "none"; // Hide lasso rectangle
      
    });

    // 🚚 Add drag logic to each draggable item
    this.shadowRoot.querySelectorAll(".draggable").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        // Find the container the dragged item belongs to
        const container = item.closest(".container");

        // Cache all selected items in that container (multi-drag)
        draggedItems = [...container.querySelectorAll(".draggable.selected")];

        // If nothing is selected, default to dragging the current item
        if (draggedItems.length === 0) {
          item.classList.add("selected");
          draggedItems = [item];
        }

        // Create a hidden drag image to represent number of items being dragged
        const dragImg = document.createElement("div");
        dragImg.id = "dragImgId";
        dragImg.style.position = "absolute";
        dragImg.style.top = "-9999px";
        dragImg.style.fontSize = "20px";
        dragImg.style.padding = "6px 12px";
        dragImg.style.background = "white";
        dragImg.style.border = "1px solid #ccc";
        dragImg.style.borderRadius = "2px";
        dragImg.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.0)";
        dragImg.style.pointerEvents = "none"; // prevent interaction
        dragImg.style.zIndex = "9999";
        dragImg.textContent = `${draggedItems.length} item(s)`;        
        document.body.appendChild(dragImg);

        // Set custom drag image (browser default is often ugly)
        e.dataTransfer.setDragImage(dragImg, -5, -5); // 📍 Offset from cursor

        // Mark items visually as 'dragging' for feedback
        draggedItems.forEach((el) => el.classList.add("dragging"));
      });

      // 🧹 Clean up after drag completes
      item.addEventListener("dragend", () => {
        // Remove the 'dragging' style from each item
        draggedItems.forEach((el) => el.classList.remove("dragging"));

        // Sync internal lists to reflect changes in DOM order (optional implementation)
        this.syncContainers();

        document.getElementById('dragImgId')?.remove(); // remove dragged number of files;

        // Re-render component to ensure layout updates
        //this.renderInit();
        this.resetLasso();
        
        this.renderChange();

        // Re-bind drag and selection logic to new DOM
        this.initDragLogic();
        this.initSelectionLogic();
        //this.emitResult();  
        // Reset dragged items array
        draggedItems = [];
        //console.log('emit');
      });
    });

    // 🧲 Handle dragging over a container to reorder items
    this.shadowRoot.querySelectorAll(".container").forEach((container) => {
      container.addEventListener("dragover", (e) => { //when dragging over one of your .container elements, it becomes a drop zone — the browser knows it’s allowed.
        e.preventDefault(); // Allow dropping

        // Exit if there are no items being dragged
        if (!draggedItems.length) return;

        // Get reference to the item that we're hovering over
        const afterElement = this.getDragAfterElement(container, e.clientY);

        // All current siblings in the container that aren't being dragged
        const siblings = [
          ...container.querySelectorAll(".draggable:not(.dragging)"),
        ];

        // Reset visual cues
        siblings.forEach((el) =>
          el.classList.remove("moving-up", "moving-down")
        );

        // Add visual hints to show target drop position
        if (afterElement) {
          const index = siblings.indexOf(afterElement);
          siblings.forEach((el, i) => {
            if (i === index) el.classList.add("moving-down");
            if (i === index - 1) el.classList.add("moving-up");
          });
        }

        // 🚚 Move each dragged item to its new position (preserving order)
        draggedItems.forEach((dragged) => {
          container.insertBefore(dragged, afterElement || null);
        });
      });
    });
  }


  resetLasso() {
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
    console.log(this.selected.length);
    console.log(this.available.length);
    // Log this state change in undo history
    this.saveHistory();
  }
  //Used to finalize the selection and remove the component—like clicking a “Done” button.
  emitResult() {
    //this.syncContainers(); // Ensure final selections are accurate
    this.getSelectedIndexArray();
    this.dispatchEvent(
      new CustomEvent("dragdrop-box-changed", {
        detail: { selected: this.selected,
                  indexSelected: this.getSelectedIndexArray()
         }, // Pass selected data to parent context
        bubbles: true, // Allow event to bubble out of shadow DOM
        composed: true, // Allow event to cross shadow boundaries
      })
    );
    
    this.shadowRoot.getElementById(`selectedColumnTitle`).innerText=`${this.selected.length} selected`;
    this.shadowRoot.getElementById(`availableColumnTitle`).innerText=`${this.available.length} available`;
    // availableColumnTitle
   // this.remove(); // Remove the component from DOM
  }

  getSelectedIndexArray() {
    return this.selected.map(item=>item._id.slice(4,item._id.length));    
  }

  //Calculates which item is immediately after the dragged position—so you can insert dragged items correctly in DOM order.
  getDragAfterElement(container, y) {
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
    this.renderChange();
    this.initDragLogic();
    this.initSelectionLogic();
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

  //Keeps focus looping inside the component so users don’t accidentally tab out. It’s a common pattern in modal dialogs and overlays.

  _trapFocus() {
    this.shadowRoot.addEventListener("keydown", (event) => {
      // Recalculate focusable elements every time Tab is pressed
      const focusableElements = this._getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.key === "Tab") {
        // Remove highlight styling (if used)
        for (const item of focusableElements) {
          item.classList.remove("buttonfocused");
        }

        if (event.shiftKey) {
          // Reverse Tab cycle: if at first, jump to last
          if (this.shadowRoot.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Forward Tab cycle: if at last, jump to first
          if (this.shadowRoot.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }
}

customElements.define("dragdrop-box", DragdropBox);
