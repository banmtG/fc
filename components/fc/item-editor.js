import { fallbackCreateRandomId } from './../../js/utils/id.js';
import  { extractFromDefiObjects } from '../../js/utils/dictionary.js';
import '../smart/smart-toggle.js';
import '../smart/smart-button-group.js';

class ItemEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });    
    this.componentCSS = `<link rel="stylesheet" href=".././components/fc/item-editor.css" />`;
    this._handleShortcuts = this._handleShortcuts.bind(this);
    this._channelClick = this._channelClick.bind(this);
    this._handleDblClick = this._handleDblClick.bind(this);
    this._handleSlChange = this._handleSlChange.bind(this);

    // Internal state
    this.defaultObject = {
      definition: "",
      example:"",
      pos:"",
      info:""
    }
    this.originalData = [];
    this.currentData = [];
    this.templateFn = null;
    this.historyStack = [];
    this.historyIndex = -1;
    this.listOrder = new Set();    //store list Order

    // ✅ Selection state
    this.selectedItemId  = new Set(); //A Set is a built-in JavaScript object that stores unique values—no duplicates allowed. Advantages Over Arrays: No need to check for duplicates manually. Faster performance for large lists. Cleaner logic for toggling selection

    // Prepare template with embedded styles
    const template = document.createElement('template');

    // Include styles and component structure in the template
    template.innerHTML = `${this.componentCSS}      
      <div class="component_wrapper">
        <div class="component_top_controls">
          <div class="flex-item-start" >
            <smart-button-group id="addRemove_buttonGroup" secondColor="default">
              <sl-button-group>            
                <sl-tooltip content="Add" placement="bottom">
                  <sl-button size="small" cb="addItem" id="addBtn"><sl-icon name="plus-lg"></sl-icon></sl-button>
                </sl-tooltip>
                <sl-tooltip content="Remove" placement="bottom">
                 <sl-button cb="removeItems" size="small" id="deleteBtn"><sl-icon name="dash-lg"></sl-icon></sl-button>  
                   </sl-tooltip>          
                <sl-tooltip content="Undo" placement="bottom">
                  <sl-button size="small" cb="Undo"><sl-icon name="arrow-counterclockwise"></sl-icon></sl-button>
                </sl-tooltip>
                <sl-tooltip content="Redo" placement="bottom">
                  <sl-button size="small" cb="Redo"><sl-icon name="arrow-clockwise"></sl-icon></sl-button>
                </sl-tooltip>   
                <sl-tooltip content="Import from Dictionary" placement="bottom">
                  <sl-button size="small" cb="Import"><sl-icon name="copy"></sl-icon></sl-button>
                </sl-tooltip>      
              </sl-button-group>
            </smart-button-group>        
          
          </div>
          <div class="flex-item-end">     
            <smart-toggle id="selectedAllItem_toggle" values='["On","Off"]' icons='["","check"]' colors='["#999","#999"]' fontSize='1rem' btnBorder></smart-toggle>            
          </div>
        </div>
        <div id="list" class="smallScrollBar"></div>
      </div>
    `;
   
    // Attach to shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));

  }

  disconnectedCallback() {
      this.component_wrapper.addEventListener('keydown', this._handleShortcuts);
    // window.removeEventListener('keydown', this._handleShortcuts);   
      this.list.removeEventListener('click', this._channelClick);
      this.list.removeEventListener('dblclick', this._handleDblClick);
      this.list.removeEventListener('sl-change', this._handleSlChange);

      this.shadowRoot.replaceChildren();

  }
 

  connectedCallback() {

    this.component_wrapper = this.shadowRoot.querySelector('.component_wrapper');
    this.component_wrapper.tabIndex = -1; 

    this.list = this.shadowRoot.getElementById('list');

    // 📌 Get reference to the smart-toggle component for "available" items
    this.selectedAllItem_toggle = this.shadowRoot.getElementById("selectedAllItem_toggle");
    this.selectedAllItem_toggle.callbacks = {
      0: () => this._bulkUnselect(),
      1: () => this._bulkSelect(),
    };

    // 📌 Get reference to the smart-button-group component for history controls (undo/redo)
    this.addRemove_buttonGroup = this.shadowRoot.getElementById("addRemove_buttonGroup");
    
    // 🧭 Define named callbacks for undo/redo functionality
    this.addRemove_buttonGroup.callbacks = {
        addItem: () => this._addNewItem(),  
        removeItems: () => this._removeSelected(this.selectedItemId),   
        Undo: () => this._navigateHistory(-1),    // "Undo" triggers history navigation back one step (-1)
        Redo: () => this._navigateHistory(1),    // "Redo" moves forward one step (+1)
        Import: () => this._importFromDistionary(),    // "Redo" moves forward one step (+1)
    };

    this.component_wrapper.addEventListener('keydown', this._handleShortcuts);
  }

  _importFromDistionary() {
    //console.log(this.entry.user_defi.default_defi);
    const currentDefault_Defi = this.entry.user_defi.default_defi;
    const result = extractFromDefiObjects(currentDefault_Defi,this.entry.defi);
    //console.log(result);
    result.forEach(itemObject=>this._addNewItem(itemObject));
  }



  _navigateHistory(direction) {
    const newIndex = this.historyIndex + direction;
    // console.log(newIndex);
    // console.log(this.historyIndex);
    // console.log(direction );
    // Abort if index is out of bounds
    if (newIndex < 0 || newIndex >= this.historyStack.length) {      
      console.log(`stop NavigateHistory early`);
      return;
    }

    const snapshot = this.historyStack[newIndex];
    if (!snapshot) return;
    console.log(`newIndex`,newIndex);
    console.log(snapshot); console.log(`co cac buoc trong history: `,this.historyStack.length);

    // Load previous state snapshot
    this.currentData = JSON.parse(JSON.stringify(snapshot.currentData));
    this.selectedItemId = new Set(JSON.parse(JSON.stringify(snapshot.selectedItemId)));
    this.historyIndex = newIndex;

    // Re-render UI with restored state
    // this.list.replaceChildren();
    // console.log(this.list);
    this.renderItems();
    this.selectedItemId.forEach(itemId=> {
        this.shadowRoot.getElementById(itemId).classList.remove('selected');
        this.shadowRoot.getElementById(itemId).classList.add('selected');
        this.shadowRoot.getElementById(itemId).querySelector('.list_item_header').classList.remove('selected');
        this.shadowRoot.getElementById(itemId)?.querySelector('.list_item_header').classList.add('selected');          
    });
    
  }
  
  //Keeps track of every meaningful interaction for undo/redo. Deep cloning ensures that mutations don’t affect past states.
  _saveHistory() {
    const snapshot = {
      currentData: JSON.parse(JSON.stringify(this.currentData)), // Deep clone
      selectedItemId: JSON.parse(JSON.stringify([...this.selectedItemId])),// Turn Set to Array
    };

    //console.log(snapshot); 
    // Trim forward history if user had undone actions
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    // Push new snapshot and move pointer
    this.historyStack.push(snapshot);
    this.historyIndex = this.historyStack.length - 1;
   // console.log(`co cac buoc trong history: `,this.historyStack.length);
    this.emitChange();
  }
  
  set data(entry) {
    //console.log(entry);
    this.entry = entry;
    const value = this.entry.user_defi.customized_defi;
    //console.log(value);
    let inputArray = [];
    try {
      if (!Array.isArray(value)) inputArray=JSON.parse(value); 
      else inputArray= [...value];
    } catch (e) {
      console.log(`error parsing input`, e);
    }
    
   // console.log(inputArray);
    this.originalData = [...inputArray];
   // console.log(this.originalData);
    // enhance data with id, order, etc.
    this.currentData = inputArray.map((item) => (
        { ...item, 
            id: window.crypto?.randomUUID?.() || fallbackCreateRandomId(), 
            createdAt: Date.now(), 
        }));

    //console.log(this.currentData);

    this._saveHistory();
    this.renderItems();

    if (value.length==0&& this.entry.defi.length==0) this._addNewItem();
    
    /* wait for all shoelace sl- components to be loaded */
                const tagsUsed = new Set(
                Array.from(this.shadowRoot.querySelectorAll('*'))
                    .map(el => el.tagName.toLowerCase())
                    .filter(tag => tag.startsWith('sl-'))
                );

                Promise.all(
                Array.from(tagsUsed).map(tag => customElements.whenDefined(tag))
                ).then(() => {
                this.component_wrapper.style.opacity = 1;
                });
    /* wait for all shoelace sl- components to be loaded */
  }

  set template(fn) {
    this.templateFn = fn;
   // console.log(`vao set template`);
    this.renderItems();
  }

    _createItemElement(item) {       
      // console.log(item); 
        const list_item = document.createElement('div');
        list_item.classList.add('list_item');
        list_item.id = item.id;
        
        //const itemIndex = this.currentData.findIndex(obj => obj.id === item.id) + 1;//human friendly order
  
        const list_item_header = document.createElement('div');
        list_item_header.classList.add('list_item_header');
        list_item_header.innerHTML=`<span><sl-icon name="arrows-move"></sl-icon></span>`;

        const item_element = document.createElement('div');
        item_element.classList.add('item');     

        // Host template MAIN CONTENT
        item_element.innerHTML = this.templateFn(item);

        // ✅ Inject item control: checkbox, remove, etc.
        const item_wrapper_open = document.createElement('div');
        item_wrapper_open.classList.add('item_control_wrapper');

        const controls_html = `<sl-button variant="danger" class="item_removeBtn">Remove</sl-button>
        <sl-button variant="primary" class="item_selectBtn">Select</sl-button>`;        

        item_wrapper_open.append(item_element);
        item_wrapper_open.insertAdjacentHTML('beforeend', controls_html);        

        list_item.append(list_item_header);
        list_item.append(item_wrapper_open);
        
        return list_item;
    }

    _handleEventListeners() {
      // console.log(`handleEventListners`);
      this.list.addEventListener('click', this._channelClick);
      this.list.addEventListener('dblclick', this._handleDblClick);
      this.list.addEventListener('sl-change', this._handleSlChange);
    }

    _channelClick(e) {
        if (e.target.matches('.item_removeBtn')) {
          const id = e.target.closest('.list_item').id;
          this._removeSelected(id);
        }
        if (e.target.matches('.item_selectBtn')) {
          const id = e.target.closest('.list_item').id;
          this._toggleSelect(id);
        }
    }

    _handleDblClick(e) {
        if (e.target.matches('.list_item_header')) {
          const id = e.target.closest('.list_item').id;
          this._toggleSelect(id);
        }      
    }

    _handleSlChange(e) {
        const input = e.target;
        const list_item = input.closest('[class*="list_item"]');
        if (!list_item) return;
        const target_id=list_item.id;
        const target_key=input.name;

        const target = this.currentData.find(obj => obj.id === target_id);
        if (target) {
            target[target_key] = input.value;
            this._saveHistory();
          //  console.log(this.currentData);
        }       
    }

    // ✅ Selection logic
    _toggleSelect(item_id) {
        //console.log(this.selectedItemId);
        this.shadowRoot.getElementById(item_id)?.classList.toggle('selected');
        this.shadowRoot.getElementById(item_id)?.querySelector('.list_item_header').classList.toggle('selected');
        if (this.selectedItemId.has(item_id)) {
            this.selectedItemId.delete(item_id);
        } else {
            this.selectedItemId.add(item_id);
        }
      //  console.log(this.selectedItemId);
        this._saveHistory();
    }

    // ✅ Selection logic
    _removeSelected(itemId = "") {       
       // console.log(`vaof remove`,itemId); 
        if (itemId instanceof Set&&itemId.length<=0) return; // no item to delete       
       
        if (itemId instanceof Set) // remove all selected items
        {
            // remove all selected item from data
            this.currentData = this.currentData.filter(item=>!this.selectedItemId.has(item.id));
                    
            this.selectedItemId.forEach(id=> { // remove from UI
                this.shadowRoot.getElementById(id).replaceChildren();
                this.shadowRoot.getElementById(id).remove();
            })
            
            this.selectedItemId.clear(); // reset the selected ID list

        } else {
             // remove certain itemID from data
            this.currentData = this.currentData.filter(item=>item.id!==itemId);
           
            // remove certain itemID from selectedID
            if (this.selectedItemId.has(itemId)) this.selectedItemId.delete(itemId);
            
            // remove from UI
            this.shadowRoot.getElementById(itemId).replaceChildren();
            this.shadowRoot.getElementById(itemId).remove();

        }
        //console.log(this.selectedItemId);
        this._saveHistory();
    }

    _bulkSelect() {
        const allItems =  this.shadowRoot.querySelectorAll(`.list_item`);
      //  console.log(this.selectedItemId);
        allItems.forEach(item=> {
            this.shadowRoot.getElementById(item.id)?.classList.remove('selected');
            this.shadowRoot.getElementById(item.id)?.classList.add('selected');
            this.shadowRoot.getElementById(item.id)?.querySelector('.list_item_header').classList.remove('selected');
            this.shadowRoot.getElementById(item.id)?.querySelector('.list_item_header').classList.add('selected');
            
            if (!this.selectedItemId.has(item.id)) this.selectedItemId.add(item.id);
        })    
       // console.log(this.selectedItemId);
        this._saveHistory();
    }


    _bulkUnselect() {
        const allItems =  this.shadowRoot.querySelectorAll(`.list_item`);
        this.selectedItemId.clear();
       // console.log(this.selectedItemId);
        allItems.forEach(item=> {
            this.shadowRoot.getElementById(item.id)?.classList.remove('selected');
            this.shadowRoot.getElementById(item.id)?.querySelector('.list_item_header').classList.remove('selected');
        })  
        this._saveHistory();
    }

    renderItems() {       
        this.list.replaceChildren();
        this.list.innerHTML = ``;
        this.currentData.forEach((item) => {
            this.list.append(this._createItemElement(item));
        });
        this._handleEventListeners();
    }
  
  _addNewItem(itemObject = {}) {
    //console.log(itemObject);
    const keys = Object.keys(this.defaultObject); // assuming all objects share keys
    const newObj = Object.fromEntries(keys.map(key => [key, itemObject[key]])); // or '' / 0 / false
    newObj.id = window.crypto?.randomUUID?.() || fallbackCreateRandomId(); 
    newObj.createdAt = Date.now();
    this.currentData.push(newObj);
   // console.log(this.currentData);
    this.list.append(this._createItemElement(newObj));
    this._saveHistory();
    //this.renderChange();

  //  this.emitChange();
  }
    
  _handleShortcuts(e) {
    
    if (e.key === 'Delete') {
      this.component_wrapper.blur();// 🔹 1. Manually Blur the Wrapper to fix black border when key = delete
      this._removeSelected(this.selectedItemId);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
       this._navigateHistory(-1);   
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
       this._navigateHistory(1);
    }
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent('item-editor-changed', {
      detail: { data: this.currentData },
      bubbles: false,
      composed: true
    }));
  }

}

customElements.define('item-editor', ItemEditor);
