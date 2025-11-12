/*<body>    
  <!-- Custom toggle component with specific properties -->
  <smart-toggle
    id="tog1"                               <!-- Unique id for the component -->
    values='[true,false]'                   <!-- Toggle states: true and false -->
    icons='["toggle-on","toggle-off"]'      <!-- Icons for each state -->
    colors='["#009999","#999999"]'      <!-- Color codes for true/false states -->
    fontSize="2rem"                         <!-- Font size for visibility -->
    tooltips='["Select All","Unselect All"]' <!-- Tooltip for each status  -->
    btnBorder                               <!-- Attribute to enable toggle border-->
    >                      
  </smart-toggle>  

   <smart-toggle id="selected_smartToggleSelect" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' tooltips='["Select All","Unselect All"]' fontSize='1.8rem' btnBorder></smart-toggle>

  <script>   
    const toggle = document.querySelectorAll("smart-toggle");    // Select all smart-toggle elements on the page   
    toggle.forEach((eachtog) => { // Loop over each toggle and assign callback functions
        eachtog.callbacks = {        
            0: () => console.log(`${eachtog.name} Toggle value ${eachtog.value} `),  // Callback when in the first state (index 0)
            1: () => console.log(`${eachtog.name} Toggle value ${eachtog.value} `),  // Callback when in the second state (index 1)
        }    
    });   

    document.addEventListener("smart-toggle-change", e => { // Listen for the custom 'smart-toggle-change' event
        console.log(`${e.detail.name} changed to:`, e.detail.value);        // Log toggle name and new value when it changes
    });
  </script>
</body>
*/

// Define a custom HTML element called <smart-toggle>
class SmartToggle extends HTMLElement {
  constructor() {
    super(); // Call the parent constructor

    this._onClick = this.toggle.bind(this);
    this._onKeydown = this._onKeydown.bind(this);

    // Attach a shadow DOM for encapsulation
    this.attachShadow({ mode: "open" });

    // 🔢 Current selected index
    this._index = 0;

    // 📝 Arrays for labels, icons, colors
    this.values = [];
    this.icons = [];
    this.colors = [];    

    // 🔁 Map of callback functions for each state
    this.callbacks = {};

    // ⏪ Undo history stack
    this._history = [];

    // ⏩ Redo stack
    this._future = [];
  }

  setDefaultValue() {
    this._index=0;
    this.render();
  }

  
  disconnectedCallback() {     
      const btn = this.shadowRoot.querySelector("button");
      if (btn) {
        btn.removeEventListener("click", this._onClick);
        btn.removeEventListener("keydown", this._onKeydown);
      }
      this.shadowRoot.replaceChildren();
      //window.removeEventListener('keydown', this._boundHandleShortcuts);   
  }
 

  // Lifecycle method called when element is added to the DOM
  connectedCallback() {
    // Parse values and icons from element attributes
    this.values = JSON.parse(this.getAttribute("values") || '[true,false]');
    this.icons = JSON.parse(this.getAttribute("icons") || '["check",""]');
    this.colors = JSON.parse(this.getAttribute("colors") || '["#999999","#0000FF"]');  
    this.tooltips = JSON.parse(this.getAttribute("tooltips") || '[]');   
    //console.log(this.tooltips);
    this.fontSize = this.getAttribute("fontSize") || '2rem'  ;
    this.id =this.getAttribute("id") || 'Toggle_id'  ; // Check id of this toggle or just call "Toggle"
    this.btnBorder = this.hasAttribute("btnBorder") ? "var(--sl-input-border-width) solid var(--sl-input-border-color);" : "none;"  ; // Check btnBorder of this toggle or just set no border
    this.btnHover =  this.hasAttribute("btnBorder") ? "var(--sl-focus-ring-color);" : "none;"  ;  // Check btnBorder of this toggle to set Hover color on button 
 
    this.value = this.values[this._index];  // Store the value of status for external references

    // Initial rendering of the button
     this.render(); 
     // this.initRender(); // First-time setup 
  }

//   // 🔄 Initial render — called once in connectedCallback
// initRender() {
//   const iconName = this.icons[this._index] || "";
//   const label = this.values[this._index] || `Label ${this._index}`;
//   const tooltip = this.tooltips[this._index] || "";
//   const color = this.colors[this._index] || "#000";

//   this.shadowRoot.innerHTML = `
//     <style>
//       :host {
//         display: flex;
//         align-items: center;
//         justify-content: center;
//       }
//       button {
//         all: unset;
//         cursor: pointer;
//         display: flex;
//         align-items: center;
//         padding: 0;
//         background-color: var(--sl-color-neutral-0);
//         border: ${this.btnBorder};
//         border-radius: 4px;
//         font-size: ${this.fontSize};
//         color: ${color};
//       }
//       sl-icon::part(base) {
//         font-size: 1.2rem;
//       }
//       @media (hover: hover) and (pointer: fine) {
//         button:hover {
//           border-color: ${this.btnHover};
//           background-color: var(--sl-color-primary-50);
//         }
//         button:focus-visible {
//           outline: var(--sl-focus-ring);
//           outline-offset: var(--sl-focus-ring-offset);
//         }
//       }
//     </style>
//     <button id="toggleBtn" tabindex="0" aria-label="${label}">
//       <sl-icon name="${iconName}" part="icon"></sl-icon>
//     </button>
//   `;

//   const button = this.shadowRoot.querySelector("button");
//   button.addEventListener("click", this._onClick);
//   button.addEventListener("keydown", this._onKeydown);

//   // Wrap in tooltip if needed
//   if (tooltip && !(button.parentNode?.tagName?.toLowerCase() === 'sl-tooltip')) {
//     const wrapper = document.createElement("sl-tooltip");
//     wrapper.content = tooltip;
//     button.parentNode.insertBefore(wrapper, button);
//     wrapper.append(button);
//   }
// }

// // 🔁 Update visuals only — called on toggle/undo/redo
// updateVisuals() {
//   const iconName = this.icons[this._index] || "";
//   const label = this.values[this._index] || `Label ${this._index}`;
//   const tooltip = this.tooltips[this._index] || "";
//   const color = this.colors[this._index] || "#000";

//   const button = this.shadowRoot.querySelector("button");
//   const icon = this.shadowRoot.querySelector("sl-icon");
//   const tooltipWrapper = this.shadowRoot.querySelector("sl-tooltip");

//   if (button) {
//     button.setAttribute("aria-label", label);
//     button.style.color = color;
//   }

//   if (icon) {
//     icon.setAttribute("name", iconName);
//   }

//   if (tooltipWrapper) {
//     tooltipWrapper.setAttribute("content", tooltip);
//   }
// }

  // 🔄 Render the button with current label and icon
 render() {
  // First-time render — initialize button & icon if not already present
  const color = this.colors[this._index] || `Color ${this._index}`;
  
  if (!this.shadowRoot.querySelector("button")) {
    const iconName = this.icons[this._index] || "";
    const label = this.values[this._index] || `Label ${this._index}`;
    const tooltip = (this.tooltips.length > 0) ? this.tooltips[this._index] : "";

    //console.log(tooltip);
    this.shadowRoot.innerHTML = `
      <style>        
        :host{
          display:flex;
          align-items:center;
          justify-content: center;
        }
        button {
            all: unset;
            cursor: pointer;
            display:flex;
            align-items: center;
            padding: 0;
            background-color: var(--sl-color-neutral-0);
            border: ${this.btnBorder};   /*  this for alter border or non-border smart-toggle*/
            border-radius: 4px;
            font-size: ${this.fontSize};
        }

        sl-icon::part(base) {
            font-size: 1.2rem;
        }

        @media (hover: hover) and (pointer: fine) {
            button:hover {
                border-color: ${this.btnHover};/*this to add hover effect smart-toggle*/    
                background-color: var(--sl-color-primary-50);                            
            }
                 /* 👇 Add this for keyboard navigation visibility */
            button:focus-visible {
                outline: var(--sl-focus-ring);           
                outline-offset: var(--sl-focus-ring-offset); /* Space between ring and button edge */
            }            
        }    
      </style>

      <button id="toggleBtn" tabindex="0" aria-label="${label}">       
            <sl-icon name="${iconName}" part="icon"></sl-icon>
      </button>
    `;
 
    const button = this.shadowRoot.querySelector("button");
    button.style.color = color;
    // console.log(button);
    // Add click listener for toggling options
    button.addEventListener("click", this._onClick);
    button.addEventListener("keydown", this._onKeydown); // ← should be here

    if (this.tooltips.length>0) {
        //console.log('tao tooltips wrapper');
        // Step 2: Create the wrapper element
        if (!(button.parentNode instanceof HTMLElement && button.parentNode.tagName.toLowerCase() === 'sl-tooltip')) {//🔧 Fix: Before wrapping, check if the button is already inside a tooltip:
          const wrapper = document.createElement("sl-tooltip");
          wrapper.content = tooltip; // give it a class or ID if needed
          // Step 3: Insert the wrapper in the DOM right before the original element
          button.parentNode.insertBefore(wrapper, button);
          // Step 4: Move the original element into the wrapper
          wrapper.append(button);
        }
    }  
  } else {
    // Partial update — change only dynamic parts
    const button = this.shadowRoot.querySelector("button");
    const label = this.values[this._index] || `Option ${this._index}`;
    const iconName = this.icons[this._index] || "";
    const tooltip_content = this.tooltips[this._index]; 

    const icon = this.shadowRoot.querySelector("sl-icon");
    const tooltip = this.shadowRoot.querySelector("sl-tooltip");
    
    tooltip?.setAttribute("content", tooltip_content);
    button?.setAttribute("aria-label", label);
    icon?.setAttribute("name", iconName);
    // button.style.color = color;  
  }
    
}


  // 🔘 Toggle to next option
  toggle() {
    // Save current index to undo history
    this._history.push(this._index);

    // Clear redo stack since we're making a new action
    this._future = [];

    // Move to next index (looping back if needed)
    this._index = (this._index + 1) % this.values.length;

    this.value = this.values[this._index];
    //console.log(this._index);

    // Call associated callback if available
    const cb = this.callbacks[this._index];

    if (typeof cb === "function") cb();

    // Re-render updated icon and label
     this.render();
     // this.updateVisuals(); // Only update visuals
   
    // Emit custom event with new state
    this.emitChange();
  }

  // ⏪ Undo last toggle
  undo() {
    if (this._history.length === 0) return; // Nothing to undo

    // Push current index to redo stack
    this._future.push(this._index);

    // Pop previous index from history
    this._index = this._history.pop();

    // Render restored state
    this.render();

    // Emit event for restored state
    this.emitChange();
  }

  // ⏩ Redo last undone toggle
  redo() {
    if (this._future.length === 0) return; // Nothing to redo

    // Push current index to undo stack
    this._history.push(this._index);

    // Pop index from redo stack
    this._index = this._future.pop();

    // Render restored state
    this.render();

    // Emit event for new state
    this.emitChange();
  }

  // 📡 Emit custom event "toggle-change" with current value and index
  emitChange() {      
    //console.log(`smart-toggle-change ${this.id} emit ${this.value}`);
    this.dispatchEvent(new CustomEvent("smart-toggle-change", {
      detail: {
        id: this.id,
        value: this.value,
        index: this._index
      },
      bubbles: false,
      composed: true
    }));
  }

  // ⌨️ Keyboard accessibility handler (Space or Enter triggers toggle)
  _onKeydown(e) {
    // 🎹 Listen for Ctrl/Command + Z/Y for undo/redo
    const isMac = navigator.platform.includes("Mac"); // Detect platform
    const cmd = isMac ? e.metaKey : e.ctrlKey;         // Use Command (Mac) or Ctrl (Win)

    // Ctrl+Z or Cmd+Z = undo
    if (cmd && e.key.toLowerCase() === "z") {
      this.undo();
      e.preventDefault();
    }

    // Ctrl+Y or Cmd+Y = redo
    if (cmd && e.key.toLowerCase() === "y") {
      this.redo();
      e.preventDefault();
    }

    // shortcut with Spacebar or Enter to toggle
    if (e.key === " " || e.key === "Enter") {
      this.toggle();
      e.preventDefault(); // Prevent default scroll or submit
    }

  }

}

// 🌐 Register the custom element
customElements.define("smart-toggle", SmartToggle);
