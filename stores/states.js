/**
 * StateStore
 * ====================
 * Global state manager with built-in change history.
 * Useful for lightweight apps that need undo/redo or reactive updates across components.
 */
class StateStore {
    static state = { app: "ADFC" };        // Initial state object (can be customized) to new app name
    static listeners = [];                        // List of functions that respond to state changes
    static history = [{ ...StateStore.state }];   // Stores entire snapshots of state over time
    static history_min = this.history.length;     // First undoable history index
    static history_pos = this.history_min;        // Current position in history for undo/redo

    /**
     * Set a key/value in state and record to history
     * @param {string} key
     * @param {any} value
     */
    static setState(key, value) {
        StateStore.state[key] = value; //Update the internal state

        // Truncate future history if we've undone before setting
        if (this.history_pos !== this.history.length) {
            this.history = this.history.slice(0, this.history_pos);
        }

        // Save current state snapshot
        this.history.push({ ...StateStore.state });
        this.history_pos = this.history.length;

        // Broadcast state change as event
        document.dispatchEvent(new CustomEvent("state-changed", {
            detail: { key, value }
        }));

        // Notify listeners
        this.listeners?.forEach((fn) => {
            try {
                fn(key, value);
            } catch (error) {
                console.error("Listener error:", error);
            }
        });
    }

    /**
     * Undo the last state change
     */
    static undo() {
        if (this.history_pos === this.history_min) {
            console.warn("No state to undo.");
            return;
        }
        this._applyHistoryState(this.history_pos - 1, "undo");
    }

    /**
     * Redo a previously undone state
     */
    static redo() {
        if (this.history_pos === this.history.length) {
            console.warn("No state to redo.");
            return;
        }
        this._applyHistoryState(this.history_pos + 1, "redo");
    }

    /**
     * Internal method to apply state from history
     * @param {number} position
     * @param {string} action
     */
    static _applyHistoryState(position, action) {
        this.history_pos = position;
        const currentState = { ...this.history[this.history_pos - 1] }; // -1 to match 0-index
        StateStore.state = currentState;

        document.dispatchEvent(new CustomEvent("state-changed", {
            detail: { key: action, state: currentState }
        }));

        this.listeners.forEach((listener) => {
            try {
                listener(action, currentState);
            } catch (error) {
                console.error("Listener error:", error);
            }
        });
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Receives (key, value) on every change
     */
    static subscribe(listener) {
        this.listeners.push(listener);
    }

    /**
     * Retrieve a single key from state
     * @param {string} key
     * @returns {any}
     */
    static getState(key) {
        return StateStore.state[key];
    }

    /**
     * Retrieve entire state object
     * @returns {object}
     */
    static getStateObject() {
        return { ...StateStore.state };
    }

    /**
     * Reset history (useful for new session or restart)
     */
    static clearHistory() {
        this.history = [{ ...StateStore.state }];
        this.history_min = 1;
        this.history_pos = this.history_min;
    }
}
