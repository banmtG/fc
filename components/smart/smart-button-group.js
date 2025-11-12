/**
 * SmartButtonGroup Web Component
 * 
 * 📦 Purpose:
 * A custom element that wraps a group of <sl-button> elements and manages their toggle state,
 * visual styling, and undo/redo history. It supports dynamic callbacks and emits change events
 * when buttons are toggled.
 * 
 * 🧠 Features:
 * - Tracks toggle state for each button using a unique key
 * - Allows external callbacks via `callbacks` object
 * - Emits `smart-button-group-changed` events on interaction
 * - Supports undo/redo with Ctrl+Z / Ctrl+Y (or Cmd on Mac)
 * - Reacts to external signal `host_inform_slots_loaded` to initialize state
 * - Dynamically updates button variant based on toggle state
 * - Memory-leak safe: cleans up all listeners and DOM references on disconnect
 * 
 * 🛠️ Usage Example:
 * 
  <smart-button-group id="fruit" secondColor="warning">
      <sl-button-group label="history">
        <sl-tooltip content="Undo">
          <sl-button cb="Undo"><sl-icon name="arrow-counterclockwise"></sl-icon></sl-button>
        </sl-tooltip>
        <sl-tooltip content="Redo">
          <sl-button cb="Redo"><sl-icon name="arrow-clockwise"></sl-icon></sl-button>
        </sl-tooltip>
      </sl-button-group>
      <sl-button-group label="Formatting">        
          <sl-button cb="Bold"></sl-button>        
          <sl-button cb="Underline"</sl-button>
      </sl-button-group>
    </smart-button-group>

 <script>

  // wait until the slots are fully loaded before doing something inside the component.
      const group = document.querySelector("smart-button-group");
      requestAnimationFrame(() => {        
        group.dispatchEvent(new CustomEvent("host_inform_slots_loaded"));
      });
     
   // assign callback for buttons  
      group.callbacks = {
        Undo: (val) => console.log("handle_Undo is", val),
        Redo: (val) => console.log("handle_Redo fucntion is", val),
      };

   // listen to event emitted   
      group.addEventListener("smart-button-group-changed", (e) => {
        console.log("Group :", e.detail.group_id);
        console.log("Group change:", e.detail.name, "=", e.detail.value);
        console.log("Group state:", e.detail.state);
      });
  </script>
 */

class SmartButtonGroup extends HTMLElement {
  constructor() {
    super();

    // Attach shadow DOM for encapsulated styling and structure
    this.attachShadow({ mode: "open" });

    // Internal state tracking
    this.state = {};           // Stores toggle state for each button
    this.callbacks = {};       // Optional callbacks keyed by button cb attribute
    this._history = [];        // Undo history stack
    this._future = [];         // Redo stack

    // Bind event handlers to preserve context
    this._handleClick = this._handleClick.bind(this);
    this._handleKey = this._handleKey.bind(this);
    this._initializeState = this._initializeState.bind(this);
  }

  // Observe changes to the 'secondcolor' attribute
  static get observedAttributes() {
    return ['secondcolor'];
  }

  // React to attribute changes
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'secondcolor') this.secondColor = newVal;
  }

  // Clean up listeners and shadow DOM on removal
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._handleClick);
    this.shadowRoot.removeEventListener("keydown", this._handleKey);
    this.shadowRoot.removeEventListener("host_inform_slots_loaded", this._initializeState);
    this.shadowRoot.replaceChildren(); // Clear shadow DOM   
  }

  // Initialize component when added to DOM
  connectedCallback() {
    this.name = this.getAttribute("id") || "btnGroup";
    this.secondColor = this.getAttribute("secondColor") || "default";

    this.renderStatic(); // Build static structure

    // Wait for host to signal that slotted buttons are ready
    this.addEventListener("host_inform_slots_loaded", this._initializeState);

    // Listen for user interactions
    this.shadowRoot.addEventListener("click", this._handleClick);
    this.shadowRoot.addEventListener("keydown", this._handleKey);
  }

  // Initialize toggle state for each sl-button
  _initializeState() {
    this.querySelectorAll("sl-button").forEach(btn => {
      const fullName = `${this.name}_${btn.getAttribute("cb")}`;
      this.state[fullName] = false;
    });
  }

  // Render static layout and styles
  renderStatic() {
    const styleEl = document.createElement('style');
    styleEl.innerText = `
      :host {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 5px;
      }

      /* Style slotted sl-button-group if present */
      ::slotted(sl-button-group) {
        margin-left: 0px;
      }
    `;

    const slotElt = document.createElement('slot'); // Slot for user-injected buttons

    this.shadowRoot.append(styleEl);
    this.shadowRoot.append(slotElt);
  }

  // Handle button clicks
  _handleClick(e) {
    const button = e.target.closest("sl-button");
    if (!button) return;

    const key = `${this.name}_${button.getAttribute("cb")}`;
    this._history.push({ ...this.state }); // Save current state
    this._future = [];                     // Clear redo stack

    this.state[key] = !this.state[key];    // Toggle state

    const cbKey = button.getAttribute("cb");
    if (!cbKey) return;
    if (typeof this.callbacks[cbKey] === "function") {
      this.callbacks[cbKey](this.state[key]); // Call external callback
    }

    this.renderChanged(button, key); // Update button UI
    this.emitChange(key);           // Emit change event
  }

  // Update button variant based on state
  renderChanged(button, key) {
    if (this.state[key]) {
      button.setAttribute("variant", this.secondColor);
    } else {
      button.setAttribute("variant", "default");
    }
  }

  // Emit custom event with state info
  emitChange(key) {
   // console.log(this.state);
    this.dispatchEvent(new CustomEvent("smart-button-group-changed", {
      detail: {
        group_id: this.id,
        name: key,
        value: this.state[key],
        state: { ...this.state }
      },
      bubbles: false,
      composed: true
    }));
  }

  // Handle undo/redo keyboard shortcuts
  _handleKey(e) {
    const isMac = navigator.platform.includes("Mac");
    const cmd = isMac ? e.metaKey : e.ctrlKey;

    if (cmd && e.key.toLowerCase() === "z") this.undo();
    if (cmd && e.key.toLowerCase() === "y") this.redo();
  }

  // Undo last state change
  undo() {
    if (this._history.length === 0) return;
    this._future.push({ ...this.state });
    this.state = this._history.pop();
    this.syncRender();
  }

  // Redo last undone change
  redo() {
    if (this._future.length === 0) return;
    this._history.push({ ...this.state });
    this.state = this._future.pop();
    this.syncRender();
  }

  // Re-render all buttons based on current state
  syncRender() {
    this.querySelectorAll("sl-button").forEach(btn => {
      const key = `${this.name}_${btn.getAttribute("cb")}`;
      if (this.state[key]) {
        btn.setAttribute("variant", this.secondColor);
      } else {
        btn.setAttribute("variant", "default");
      }
    });
  }
}

customElements.define("smart-button-group", SmartButtonGroup);

