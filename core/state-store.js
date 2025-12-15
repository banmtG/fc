// state-store.js. This state-store.js gives you a central reactive state system that integrates seamlessly with your other 4 files. Components can listen for "state:changed" events to update themselves automatically.

// state-store.js.: a generic reactive frame — it provides the mechanics (set/get, undo/redo, broadcast), but it doesn’t know what to store.

/**
 * StateStore
 * ===========================================
 * Reactive global state manager.
 * - Holds app state in memory
 * - Provides set/get helpers
 * - Broadcasts changes via custom events
 * - Supports undo/redo stack
 */

class StateStoreClass {
  constructor() {
    this.state = {};          // current state
    this.history = [];        // undo stack
    this.future = [];         // redo stack
  }

  // Set a single key
  set(key, value) {
    const prev = this.state[key];
    this.history.push({ key, prev }); // push to undo stack
    this.state[key] = value;

    // Clear redo stack on new change
    this.future = [];

    // Broadcast event
    this._broadcast(key, value);
  }

  // Bulk set multiple keys
  setStateObject(obj) {
    Object.entries(obj).forEach(([key, value]) => this.set(key, value));
  }

  // Get a single key
  get(key) {
    return this.state[key];
  }

  // Get full state object
  getStateObject() {
    return { ...this.state };
  }

  // Undo last change
  undo() {
    const last = this.history.pop();
    if (last) {
      const { key, prev } = last;
      this.future.push({ key, next: this.state[key] });
      this.state[key] = prev;
      this._broadcast(key, prev);
    }
  }

  // Redo last undone change
  redo() {
    const next = this.future.pop();
    if (next) {
      const { key, next: value } = next;
      this.history.push({ key, prev: this.state[key] });
      this.state[key] = value;
      this._broadcast(key, value);
    }
  }

  // Internal: broadcast state changes
  _broadcast(key, value) {
    const event = new CustomEvent("state:changed", {
      detail: { key, value, state: this.getStateObject() }
    });
    document.dispatchEvent(event);
  }
}

// Export singleton instance
const StateStore = new StateStoreClass();
export default StateStore;
