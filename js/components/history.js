function createSnapshot(data, selectedSet) {
  return {
    currentData: structuredClone(data), //structuredClone() is a modern, safer alternative to JSON.parse(JSON.stringify(...)) — supports more types and avoids edge cases.
    selectedItemId: [...selectedSet], //Set is a non-serializable structure, you need to convert it to an array before saving, and then reconstruct the Set when restoring.
  };
}

function restoreSnapshot(snapshot) {
  return {
    currentData: structuredClone(snapshot.currentData),
    selectedItemId: new Set(snapshot.selectedItemId), // re-construct Set()
  };
}



function _navigateHistory(direction) {
    const newIndex = this.historyIndex + direction;
    // Abort if index is out of bounds
    if (newIndex < 0 || newIndex >= this.historyStack.length) return;

    const snapshot = this.historyStack[newIndex];

    if (!snapshot) return;

    // Load previous state snapshot
    this.currentData = JSON.parse(JSON.stringify(snapshot.currentData));
    this.selectedItemId = new Set(JSON.parse(JSON.stringify(snapshot.selectedItemId)));

    this.historyIndex = newIndex;

    // Re-render UI with restored state
    this.initRender();

    // Re-render Selected Items with restored state 
    this.selectedItemId.forEach(itemId=> {
        this.shadowRoot.getElementById(itemId)?.classList.remove('selected');
        this.shadowRoot.getElementById(itemId)?.classList.add('selected');
        this.shadowRoot.getElementById(itemId)?.querySelector('.list_item_header').classList.remove('selected');
        this.shadowRoot.getElementById(itemId)?.querySelector('.list_item_header').classList.add('selected');          
    });
    
    // Apply logic to newly created Items
    // this.initDragLogic();
    //this.initSelectionLogic();
  }

  
  //Keeps track of every meaningful interaction for undo/redo. Deep cloning ensures that mutations don’t affect past states.
  function _saveHistory() {
    const snapshot = {
      currentData: JSON.parse(JSON.stringify(this.currentData)), // Deep clone
      selectedItemId: JSON.parse(JSON.stringify([...this.selectedItemId])),// Turn Set to Array
    };

    console.log(snapshot);
    // Trim forward history if user had undone actions
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    // Push new snapshot and move pointer
    this.historyStack.push(snapshot);
    this.historyIndex = this.historyStack.length - 1;
  }
  