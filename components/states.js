class StateStore {
    static state = { app: "ADFlashCard" }; // Initial state object
    static listeners = []; // Listeners to notify on state changes
    static history = [{ ...StateStore.state }]; // Initial state history
    static history_min = this.history.length; // Minimum undoable position
    static history_pos = this.history_min; // Current position in history

    // Set state with history tracking
    static setState(key, value) {
        StateStore.state[key] = value;

        if (this.history_pos !== this.history.length) {
            this.history = this.history.slice(0, this.history_pos); // Truncate forward history
        }
        this.history.push({ ...StateStore.state });
        this.history_pos = this.history.length;

        // Dispatch event for global listeners
        document.dispatchEvent(new CustomEvent("state-change", { detail: { key, value } }));

        // Notify listeners
        this.listeners.forEach((listener) => {
            try {
                listener(key, value);
            } catch (error) {
                console.error("Listener error:", error);
            }
        });
    }

    // Undo the last state change
    static undo() {
        if (this.history_pos === this.history_min) {
            console.warn("No state to undo.");
            return;
        }
        this._applyHistoryState(this.history_pos - 1, "undo");
    }

    // Redo the next state change
    static redo() {
        if (this.history_pos === this.history.length) {
            console.warn("No state to redo.");
            return;
        }
        this._applyHistoryState(this.history_pos + 1, "redo");
    }

    // Apply a history state by position
    static _applyHistoryState(position, action) {
        this.history_pos = position;
        const currentState = { ...this.history[this.history_pos - 1] }; // Adjust for 0-indexed array
        StateStore.state = currentState;

        document.dispatchEvent(new CustomEvent("state-change", { detail: { key: action, state: currentState } }));
        this.listeners.forEach((listener) => {
            try {
                listener(action, currentState);
            } catch (error) {
                console.error("Listener error:", error);
            }
        });
    }

    // Subscribe a listener to state changes
    static subscribe(listener) {
        this.listeners.push(listener);
    }

    // Get a specific state value
    static getState(key) {
        return StateStore.state[key];
    }

    // Get the entire state object
    static getStateObject() {
        return { ...StateStore.state };
    }

    // Clear history and reset tracking
    static clearHistory() {
        this.history = [{ ...StateStore.state }];
        this.history_min = 1;
        this.history_pos = this.history_min;
    }
}


////////////////USAGE EXAMPLE//////////////////////////

// let aComplexObj = {
//   accounting: [
//     { firstName: "John", lastName: "Doe", age: 23 },

//     { firstName: "Mary", lastName: "Smith", age: 32 },
//   ],
//   sales: [
//     { firstName: "Sally", lastName: "Green", age: 27 },

//     { firstName: "Jim", lastName: "Galley", age: 41 },
//   ],
// };

// let anComplexArray = {
//   problems: [
//     {
//       Diabetes: [
//         {
//           medications: [
//             {
//               medicationsClasses: [
//                 {
//                   className: [
//                     {
//                       associatedDrug: [
//                         {
//                           name: "asprin",
//                           dose: "",
//                           strength: "500 mg",
//                         },
//                       ],
//                       "associatedDrug#2": [
//                         {
//                           name: "somethingElse",
//                           dose: "",
//                           strength: "500 mg",
//                         },
//                       ],
//                     },
//                   ],
//                   className2: [
//                     {
//                       associatedDrug: [
//                         {
//                           name: "asprin",
//                           dose: "",
//                           strength: "500 mg",
//                         },
//                       ],
//                       "associatedDrug#2": [
//                         {
//                           name: "somethingElse",
//                           dose: "",
//                           strength: "500 mg",
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//           labs: [
//             {
//               missing_field: "missing_value",
//             },
//           ],
//         },
//       ],
//       Asthma: [{}],
//     },
//   ],
// };
// // Set some states
// StateStore.setState("theme", "dark");
// StateStore.setState("fontSize", "large");

// // StateStore.subscribe(handleTaskA)

// // function handleTaskA(key,value) {
// //     console.log(key, value);
// // }

// StateStore.setState("complex", aComplexObj);

// StateStore.setState("pos", 3);
// StateStore.setState("fontSize", anComplexArray);
// // Undo the last state change
// //StateStore.undo(); // Reverts to the state with "theme: dark"

// // Fetch current state
// console.log(StateStore.getStateObject()); // { theme: "dark" }

// // Subscribe to state changes
// // StateStore.subscribe((key, value) => {
// //   if (key === "undo") {
// //     console.log("State reverted to:", value);
// //   } else {
// //     console.log(`State changed: ${key} = ${value}`);
// //   }
// // });
