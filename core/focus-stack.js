// focus-stack.js
// -----------------------------------------------------------------------------
// FocusStack is a simple utility that manages a stack of "active" components.
// It ensures only the top component in the stack is active and listening for
// keyboard events. When a component is closed (popped), the previous one is
// reactivated automatically.
// -----------------------------------------------------------------------------

export const FocusStack = {
  // Internal array that holds the stack of components.
  // The last element is always the currently active component.
  _stack: [],

  // ---------------------------------------------------------------------------
  // push(component)
  // ---------------------------------------------------------------------------
  // Adds a new component to the stack and makes it active.
  // If there is already a component active, it is deactivated first.
  // ---------------------------------------------------------------------------
  push(component) {

    const current = this.peek();          // Look at the current top of stack
    if (current && current !== component) {
        current.unbindKeyEvents?.();              // Deactivate the current one if different
    }
    this._stack.push(component);          // Push the new component
    component.bindKeyEvents?.();               // Activate the new one
    // console.log(`this._stack`, this._stack);
  },

  // ---------------------------------------------------------------------------
  // pop(component)
  // ---------------------------------------------------------------------------
  // Removes a component from the stack.
  // If the component is the current top, deactivate it and reactivate the
  // previous one. If it's somewhere in the middle, just remove it.
  // ---------------------------------------------------------------------------
  pop(component) {

    const current = this.peek();          // Current active component
    if (current === component) {
      current.unbindKeyEvents?.();           // Deactivate the current one
      this._stack.pop();                  // Remove it from the stack
      const previous = this.peek();       // Look at the new top
      previous?.bindKeyEvents?.();          // Reactivate the previous component
    } else {
      // If the component isn't the top, remove it wherever it is.
      this._stack = this._stack.filter(c => c !== component);
    }
    // console.log(`this._stack`, this._stack);
  },

  // ---------------------------------------------------------------------------
  // peek()
  // ---------------------------------------------------------------------------
  // Returns the current active component (top of the stack).
  // If the stack is empty, returns null.
  // ---------------------------------------------------------------------------
  peek() {
    // console.log(`this._stack`, this._stack);
    return this._stack[this._stack.length - 1] || null;
  }
};
