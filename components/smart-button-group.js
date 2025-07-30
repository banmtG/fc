class SmartButtonGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.state = {};
    this.callbacks = {};
    this._history = [];
    this._future = [];
  }

  connectedCallback() {
    this.name = this.getAttribute("id") || "btnGroup";
    this.secondColor = this.getAttribute("secondColor") || "default";
    // You can access slotted nodes here
    this.renderStatic();            // One-time structure setup

    // Initialize state for sl-button children using group-ready event method
    this.addEventListener("group-ready", () => {
        // 👇 Perform slot-related initialization safely here
        //const slot = this.shadowRoot.querySelector("slot");
        //const slottedButtons = slot.assignedElements();

        this.querySelectorAll("sl-button").forEach(btn => {        
            const fullName = `${this.name}_${btn.getAttribute("cb")}`;
            this.state[fullName] = false;
            });
        //console.log(this.state);
    });

    this.shadowRoot.addEventListener("click", e => this.handleClick(e));
    this.shadowRoot.addEventListener("keydown", e => this.handleKey(e));
  }

  renderStatic() {
    // 🧱 Shadow DOM structure + slot content
    this.shadowRoot.innerHTML = `
      <style>        
        sl-button-group::part(base) {
          gap: 1.5rem;
        }

        @media (hover: hover) and (pointer: fine) {
 
        }     
      </style>
      <sl-button-group part="base">
        <slot></slot> <!-- 🪄 User-injected buttons go here -->
      </sl-button-group>
    `;     
  }

  handleClick(e) {
    const button = e.target.closest("sl-button");
    if (!button) return;

    const key = `${this.name}_${button.getAttribute("cb")}`;
    
    // Save current state to history
    this._history.push({ ...this.state });
    this._future = [];

    // Update toggle status
    this.state[key] = !this.state[key];

    // 🔁 Call callback if registered
    const cbKey = button.getAttribute("cb");
    if (typeof this.callbacks[cbKey] === "function") {
      this.callbacks[cbKey](this.state[key]);
    }

    this.renderChanged(button, key);
    this.emitChange(key);
  }

  renderChanged(button, key) {
    // 🧠 Update UI based on state
    if (this.state[key]) {
      button.setAttribute("variant", this.secondColor); // "Primary"
    } else {
      button.setAttribute("variant", "default");
    }
  }

  emitChange(key) {
    this.dispatchEvent(new CustomEvent("smart-button-group-change", {
      detail: {
        group_id: this.id,
        name: key,
        value: this.state[key],
        state: { ...this.state }
      },
      bubbles: true,
      composed: true
    }));
  }

  handleKey(e) {
    const isMac = navigator.platform.includes("Mac");
    const cmd = isMac ? e.metaKey : e.ctrlKey;

    if (cmd && e.key.toLowerCase() === "z") {
      this.undo();
    }
    if (cmd && e.key.toLowerCase() === "y") {
      this.redo();
    }
  }

  undo() {
    if (this._history.length === 0) return;
    this._future.push({ ...this.state });
    this.state = this._history.pop();
    this.syncRender();
  }

  redo() {
    if (this._future.length === 0) return;
    this._history.push({ ...this.state });
    this.state = this._future.pop();
    this.syncRender();
  }

  syncRender() {
    // 🖼️ Re-render UI state without rebuilding DOM
    this.querySelectorAll("sl-button").forEach(btn => {
      const key = `${this.name}_${btn.getAttribute("cb")}`;
      if (this.state[key]) {
        btn.setAttribute("variant", "primary");
      } else {
        btn.setAttribute("variant", "default");
      }
    });
  }
}

customElements.define("smart-button-group", SmartButtonGroup);
