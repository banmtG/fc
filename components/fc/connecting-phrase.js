import  './../smart/extended-smart-table/extended-smart-table.js';
import { tableData } from './../../Testers/phraseList.js';
import Sortable from './../lib/sortableJS/sortable.complete.esm.js';
import Fuse from "./../lib/fuse/fuse.mjs";    
import './../smart/smart-dialog.js';
import {CONFIG} from './../../config/config.js';

const typeColorMap = Object.fromEntries(CONFIG.RELATED_TYPE.map(ct => [ct.type, ct.bg]));
const cssUrl = new URL("./connecting-phrase.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">

  <smart-dialog esc-close overlay-close draggable>
      <div slot="header">
          <div class="title">
            <span style="font-size: 1.2rem"><b>Related phrases</b></span>
          </div>
        </div>        
        <div slot="body" class="body">
            <div class="container">
              <extended-smart-table id="smart-table" search="true" pagination="3,all">
              </extended-smart-table>
              <span id="entryPhrase"></span>
              <span id="suggestedConnectPhrases"></span>

              <div class="legendBoard"></div>
            </div>
        </div>
        <div slot="footer" class="footer">
            <sl-button-group> 
              <sl-button size="medium" variant="primary" id="confirm" class="focusable"><sl-icon name="check-circle-fill" slot="prefix"></sl-icon>Confirm</sl-button>
              <sl-button size="medium" variant="default" id="cancel" class="focusable"><sl-icon name="x-circle" slot="prefix"></sl-icon>Cancel</sl-button>
            </sl-button-group> 
        </div>    
    </smart-dialog>
`;

class ConnectingPhrase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // AbortController for cleanup
    this._abort = new AbortController();
    this._data = [];
    this._entry = {};

      // Clone template content into shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    // this.render();
  }

  open(entry) {
    this._entry = entry;
    this._loadPhrasesFromDataBase();    
    this._hydrateSuggestedContainer();
    this._hydrateTable();
    
    requestAnimationFrame(() => {   
      if (this._smart_dialog) { 
        this._smart_dialog.style.display = "block";
        this._smartTable.focus();
      }
    });
  }
  
  get data() { return this._entry }

  _loadPhrasesFromDataBase() {
    this._data = tableData;
    this._unConnecting_phrases_forFuseSearch = this._data.map(item => {    
        return { phrase: item.phrase, phraseID: item.phraseID }     
    });       
    this._suggested_ConnectingPhrases = this._findRelatedPhrases(this._entry.phrase, this._unConnecting_phrases_forFuseSearch);
    this._related_phraseID = this._entry.related_phrases? this._entry.related_phrases.map(item=> item.id) : [];    
    this._related_phrases_map = this._entry.related_phrases? this._entry.related_phrases : [];  
  }

  _aPhraseNormalise(item) {
      return {
        phraseID: item.phraseID,       // normalized ID
        phrase: item.phrase,
        defi: item.defi,  
        reminder_text: item.reminder_text,
        tags: item.tags,
        user_ipa: item.user_ipa,
        user_defi: item.user_defi,
        user_note: item.user_note,
        user_translate: item.user_translate
      };
  }

  _mapTableData(rawData) {   
    // const orderArray = this._related_phraseID.map((item,index) => { return { item, theOrder:index} });
    // console.log(orderArray);
    this._theOrder = this._related_phraseID.length;

    const MaxOrder = rawData.length+1;
    // console.log(this._theOrder);
    return rawData.map((item) => {
      const order = this._related_phraseID.indexOf(item.phraseID);
      const foundObj = this._related_phrases_map.find(obj=>obj.id===item.phraseID);
      let connectingType = foundObj? foundObj['type'] : null;
      return { ...this._aPhraseNormalise(item), 
        linked: (order>-1)? true : false,
        theOrder: (order>-1)? order : MaxOrder,
        connectingType: connectingType
      };
    });
  }

  _findRelatedPhrases(target, inputArray) {
  const options = {
    keys: ["phrase"],       // search in the phrase field
    threshold: 0.4,         // lower = stricter (0.0 exact, 1.0 very loose)
    distance: 100,           // max distance to allow matches inside the string
    minMatchCharLength: 2,  // require at least 3 chars in common
    includeScore: true
  };


  const fuse = new Fuse(inputArray, options);
  const results = fuse.search(target);

  // return simplified array
  return results.map(r => ({    
    phraseID: r.item.phraseID,
    phrase: r.item.phrase,
    score: r.score
  }));
}

_hydrateSuggestedContainer() {
  const container = this._suggestedConnectPhrasesDiv;

  // Collect existing phraseIDs already in the DOM
  const existingIDs = new Set(
    Array.from(container.children).map(el => el.dataset.phraseID)
  );
  // Clear container
  container.innerHTML = '';
  this._suggested_ConnectingPhrases.forEach(item => {
    if (!this._related_phraseID.includes(item.phraseID)&&item.phraseID!==this._entry.phraseID) {
      const el = document.createElement('span');
      el.className = 'suggest_phrase';
      el.textContent = item.phrase;
      el.dataset.phraseID = item.phraseID;

      // If this phraseID was not in the DOM before, mark as new
      if (!existingIDs.has(item.phraseID)) {
        el.classList.add('new-item');
        el.addEventListener('animationend', () => {
          el.classList.remove('new-item');
        }, { once: true });
      }

      container.appendChild(el);
    }
  });
  if (this._suggested_ConnectingPhrases.length>0) {
    //console.log(this._suggested_ConnectingPhrases);
    this._entryPhrase.innerHTML = `<i>Similar to <b>${this._entry.phrase}</b>? Double tap to connect!</i>`;
  } else { //console.log(this._suggested_ConnectingPhrases);    
    this._entryPhrase.innerHTML = `<i>No similar phrases suggested for <b>${this._entry.phrase}</b></i>`; }
}

  _addNewConnectingPhraseFromSuggestion(e) {
    const target = e.target.closest(".suggest_phrase"); 
    const targetID = target.dataset.phraseID;
    this._removeWithAnimation(target);    
    this._related_phraseID.push(targetID);   
    this._related_phrases_map.push({id: targetID , type: "R"});   
    this._updateTablewithConnectingPhrase(targetID, true, "R");
  }

  _updateTablewithConnectingPhrase(targetID, linkFlag, connectingType, changeOrder = true) {
    this._smartTable._updateRowData(targetID, { 
      linked: linkFlag, 
      ...(changeOrder? { theOrder: this._theOrder } : {}),
      connectingType: connectingType 
    });
    
    this._smartTable._runPipeline();
    this._smartTable.updateRowUI(targetID);
    // console.log(changeOrder);

    if (changeOrder&&linkFlag===true) this._theOrder++;
    if (changeOrder&&linkFlag===false) this._theOrder--;
  }

  _removeWithAnimation(el) {
    el.classList.add("hide"); // trigger fade-out
    el.addEventListener("transitionend", () => {
      el.remove(); // remove after animation completes
    }, { once: true });
  }
  
  _hydrateTable() {
    const { signal } = this._abort;
    this._smartTable.data = this._mapTableData(this._data);
    // console.log(this._data.length);
    // Pass down columns
    this._smartTable.setColumns([ 
  {
    key: "phrase",
    label: "Phrase",
    width_set: {
      value: "1fr",      // fit content width
    },
    render: (val, obj) => {
      const div = document.createElement("div");      
      div.innerHTML =  obj.linked? `<i>🔗 ${val}</i>` : `${val}`;
      if (obj.linked) {
        requestAnimationFrame(() => {          // console.log(div.parentElement.parentElement);
          if (div.parentElement?.parentElement) {
            div.parentElement.parentElement.classList.add('linked');
          }
        });
      }
      return div;
    }
  },
    {
    key: "user_translate",
    label: "Translate",
    width_set: {
      value: "1fr",      // fit content width
    }
  },
  {
    key: "_actions",
    sortable: false,
    label: "",
    width_set: {       
      value: "40px",      // fit content width
      resizable: false
    },
    interactive: true,
    render: (_, obj) => {
      const div = document.createElement("div");
      if (obj.phraseID!==this._entry.phraseID) {     
        div.className = "actions";
        div.style.background = "rgba(0,0,0,0)";
        div.innerHTML = 
        obj.linked? `<button style="border: none; color: #AB9DB7; background:none;" class="btn btn-unlink" data-id="${obj.phraseID}">✂️</button> ` : `<button style="border: none; color: #AB9DB7; background:none;" class="btn btn-link" data-id="${obj.phraseID}">🔗</button>`;
        requestAnimationFrame(() => {        
          if (div.parentNode) {    
              div.parentNode.style.padding = "0px";
              div.parentNode.style.justifyContent = "center";
          }        
        });
      }
      return div;
    },
    events: {
      click: (e, row, obj) => {
        if (e.target.classList.contains("btn-link")) {
          row.dispatchEvent(new CustomEvent("link-requested", {
            detail: { id: obj.phraseID },
            bubbles: true,
            composed: true
          }));
        }
        if (e.target.classList.contains("btn-unlink")) {
          row.dispatchEvent(new CustomEvent("unlink-requested", {
            detail: { id: obj.phraseID },
            bubbles: true,
            composed: true
          }));
        }
      }
    }
  },
  {
    key: "connectingType",
    sortable: false,
    label: "",
    width_set: {       
      value: "40px",      // fit content width
      resizable: false
    },
    interactive: true,
    render: (_, obj) => {
      if (obj.connectingType !== null) {
        const div = document.createElement("div");
        const color = typeColorMap[obj.connectingType] || "#ccc"; // fallback
        div.innerHTML = `
          <div style="display:flex; cursor:pointer; justify-content:center;
          align-items:center; border-radius:20px; width:30px; height:25px;
          background:${color}">${obj.connectingType}</div>`;
        return div;
      }
    },
    events: {
      click: (e, row, obj) => {

         if (obj.connectingType!==null) {


        // if (e.target.classList.contains("btn-link")) {
          row.dispatchEvent(new CustomEvent("connectingType-altered", {
            detail: { id: obj.phraseID },
            bubbles: true,
            composed: true
          }));
                // }
           console.log(obj.phraseID);
         }
      }
    }
  }
]);

    this._smartTable.setConfig({
      sortKey: "theOrder",
      sortDir: "asc",
      pageSize: "all",
      tableMaxHeight: "35vh",
      columnToSearch: ["phrase","user_translate","defi","user_defi"],
      idKey: "phraseID",
      cellPading: "4px 6px",
      selectionModeOnTouch: false,
    })   
  }

  connectedCallback() {
    const { signal } = this._abort;

    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');
    this._entryPhrase = this.shadowRoot.querySelector('#entryPhrase');
    this._smartTable = this.shadowRoot.querySelector('extended-smart-table');
    this._tableBody = this._smartTable.shadowRoot.getElementById("tbl").shadowRoot.getElementById("tableBody");
    this._childSmartTable = this._smartTable.shadowRoot.getElementById("tbl");
    this._legendBoard = this.shadowRoot.querySelector('.legendBoard');

    this._renderLengend();
    // add EventListeners
    this._smart_dialog.addEventListener("smart-dialog-confirmed", () => this._confirmHandler(), { signal });
    this._smart_dialog.addEventListener("smart-dialog-canceled", () => this._cancelHandler(), { signal });

    this._suggestedConnectPhrasesDiv = this.shadowRoot.querySelector('#suggestedConnectPhrases');
    this._suggestedConnectPhrasesDiv.addEventListener('dblclick', (e) => this._addNewConnectingPhraseFromSuggestion(e), { signal });
   
    this._smartTable.addEventListener('highlight-changed', (e) => {
      console.log("highlight-changed", e.detail.id);      
    } , { signal });
    this._smartTable.addEventListener('link-requested', (e) => {     
      this._related_phraseID.push(e.detail.id);
      this._updateTablewithConnectingPhrase(e.detail.id, true, "R");
      this._hydrateSuggestedContainer();
      this._related_phrases_map.push({id: e.detail.id , type: "R"});
    },{ signal });
    this._smartTable.addEventListener('unlink-requested', (e) => {
      this._related_phraseID = this._related_phraseID.filter(id=> {
        return id !== e.detail.id; // must return booleans
      });

      this._related_phrases_map = this._related_phrases_map.filter(obj=> 
         obj.id !== e.detail.id );

      this._updateTablewithConnectingPhrase(e.detail.id, false, null);
      this._hydrateSuggestedContainer();
    }, { signal });

   this._smartTable.addEventListener('connectingType-altered', (e) => {    
      const targetID = e.detail.id;
      const targetObject = this._related_phrases_map.find(obj => obj.id === targetID);
      const currentType = targetObject?.type;

      // Find current index in RELATED_TYPE
      const idx = CONFIG.RELATED_TYPE.findIndex(ct => ct.type === currentType);

      // Next index (wrap around)
      const nextIdx = (idx + 1) % CONFIG.RELATED_TYPE.length;
      const targetType = CONFIG.RELATED_TYPE[nextIdx].type;

      targetObject.type = targetType;
      this._updateTablewithConnectingPhrase(targetID, true, targetType, false);
      this._hydrateSuggestedContainer();
    }, { signal });


 
    this._sortable = new Sortable(this._tableBody, {
      animation: 150,      
      scroll: true,             // Enable scrolling
      scrollSensitivity: 40,    // Pixels from edge to start scroll
      scrollSpeed: 10,          // Speed of scroll (pixels/tick)
      fallbackTolerance: 3,     // Start drag after 3px movement
      delay: 250,               // time in ms to hold before drag starts
      delayOnTouchOnly: true,   // only apply delay on touch devices
      touchStartThreshold: 5,   // px of movement before drag starts 
      onStart: (evt) => {  
        evt.oldIndex;  // element index within parent
        console.log(this._childSmartTable._data.slice(0,5));
      },
      onEnd: (evt) => {        
        this.shiftItemAfterDrag(this._childSmartTable._data,evt.oldIndex,evt.newIndex);
        // Get final order of IDs
        const newOrder = Array.from(this._tableBody.querySelectorAll(".linked")).map(el => el.dataset.id);
        // Step 1: Create a lookup map for order 
        const orderMap = new Map(newOrder.map((id, index) => [id, index])); 
        // Step 2: Sort the array based on the order map 
        const sorted = this._related_phrases_map.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id)); 
        // Step 3: Add theOrder key based on index 
        this._related_phrases_map = sorted.map((obj, index) => ({ ...obj, theOrder: index }));
           console.log("Final order of IDs:", newOrder);
              console.log("Final order of IDs:", this._related_phrases_map);
        this._related_phrases_map.forEach(item=> {
          const targetID=item.id;
          this._smartTable._updateRowData(targetID, { 
          linked: true, 
          theOrder: item.theOrder,
          connectingType: item.type
          });   
        })
            // this._smartTable._runPipeline();
                
      },
    });
  }

  disconnectedCallback() {
    this._abort.abort();
    // Destroy Sortable instance if you keep a reference 
    if (this._sortable) { 
      this._sortable.destroy(); 
      this._sortable = null; 
    } 
    // Null out references 
    this._smartTable = null; 
    this._tableBody = null; 
    this._suggestedConnectPhrasesDiv = null;
  }

  _renderLengend() {
      // Assuming this._legendBoard is already set
      this._legendBoard.innerHTML = ""; // clear old content if needed

      CONFIG.RELATED_TYPE.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.margin = "4px";

        // color box
        const colorBox = document.createElement("div");
        colorBox.style.width = "20px";
        colorBox.style.height = "20px";
        colorBox.style.borderRadius = "4px";
        colorBox.style.background = item.bg;
        colorBox.style.marginRight = "8px";

        // legend text
        const text = document.createElement("span");
        text.textContent = item.legend;

        wrapper.appendChild(colorBox);
        wrapper.appendChild(text);

        this._legendBoard.appendChild(wrapper);
      });
  }

  _confirmHandler() {
    //const nodeLinked = this._tableBody.querySelectorAll('.linked');
    //this._result = [];
    //nodeLinked.forEach(el => { this._result.push(el.dataset.id); });
    //this._entry.connecting_phrases = this._result;
    this.dispatchEvent(
      new CustomEvent('related-phrases-updated', { 
        detail: this._related_phrases_map.map(item=> {return { id: item.id, type: item.type }}), 
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent('related-phrases-cancelled', {         
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }

/**
 * Move an item in an array from oldIndex to newIndex,
 * shifting other items up or down as needed.
 *
 * @param {Array} arr - The array of objects
 * @param {number} oldIndex - The current index of the item
 * @param {number} newIndex - The target index
 * @returns {Array} the updated array
 */
  shiftItemAfterDrag(arr, oldIndex, newIndex) {
  if (
    oldIndex < 0 || oldIndex >= arr.length ||
    newIndex < 0 || newIndex >= arr.length
  ) {
    throw new Error("Invalid indices");
  }

  // Remove the item from oldIndex
  const [item] = arr.splice(oldIndex, 1);
  // Insert it at newIndex
  arr.splice(newIndex, 0, item);

  return arr;
}


}

customElements.define('connecting-phrase', ConnectingPhrase);

