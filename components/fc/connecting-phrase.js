import  './../smart/extended-smart-table/extended-smart-table.js';
import { tableData } from './../../Testers/phraseList.js';
import Sortable from './../lib/sortableJS/sortable.complete.esm.js';
import Fuse from "./../lib/fuse/fuse.mjs";    
import './../smart/smart-dialog.js';

const cssUrl = new URL("./connecting-phrase.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">

  <smart-dialog esc-close overlay-close draggable>
      <div slot="header">
          <div class="title">
            <span style="font-size: 1.2rem"><b>Connecting phrases</b></span>
          </div>
        </div>        
        <div slot="body" class="body">
            <div class="container">
              <extended-smart-table id="smart-table" search="true" pagination="3,all"></extended-smart-table>        
              <span id="entryPhrase"></span>
              <span id="suggestedConnectPhrases"></span>
            </div>
        </div>
        <div slot="footer">
            <sl-button size="small" variant="primary" id="confirm" class="focusable">Confirm</sl-button>
            <sl-button size="small" variant="default" id="cancel" class="focusable">Cancel</sl-button>
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
    this._connecting_phraseID = this._entry.connecting_phrases? this._entry.connecting_phrases : [];    
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
    // const orderArray = this._connecting_phraseID.map((item,index) => { return { item, theOrder:index} });
    // console.log(orderArray);
    this._theOrder = this._connecting_phraseID.length;

    const MaxOrder = rawData.length+1;
    // console.log(this._theOrder);
    return rawData.map((item) => {
      const order = this._connecting_phraseID.indexOf(item.phraseID);
      return { ...this._aPhraseNormalise(item), 
        linked: (order>-1)? true : false,
        theOrder: (order>-1)? order : MaxOrder
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
    if (!this._connecting_phraseID.includes(item.phraseID)&&item.phraseID!==this._entry.phraseID) {
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
  if (this._suggested_ConnectingPhrases.length>1) {
    console.log(this._suggested_ConnectingPhrases);
    this._entryPhrase.innerHTML = `<i>Similar to <b>${this._entry.phrase}</b>? Double tap to connect!</i>`;
  } else {   console.log(this._suggested_ConnectingPhrases);
    
    this._entryPhrase.innerHTML = `<i>No similar phrases suggested for <b>${this._entry.phrase}</b></i>`; }
}

  _addNewConnectingPhraseFromSuggestion(e) {
    const target = e.target.closest(".suggest_phrase"); 
    const targetID = target.dataset.phraseID;
    this._removeWithAnimation(target);    
    this._connecting_phraseID.push(targetID);    
    this._updateTablewithConnectingPhrase(targetID, true);
  }

  _updateTablewithConnectingPhrase(targetID, flag) {    
    this._smartTable._updateRowData(targetID, { linked: flag, theOrder: this._theOrder });
    this._smartTable._runPipeline();
    this._smartTable.updateRowUI(targetID);
    if (flag===true) this._theOrder++;
    if (flag===false) this._theOrder--;
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
      value: "50px",      // fit content width
      resizable: false
    },
    interactive: true,
    render: (_, obj) => {
      const div = document.createElement("div");
      if (obj.phraseID!==this._entry.phraseID) {     
        div.className = "actions";
        div.style.background = "rgba(0,0,0,0)";
        div.innerHTML = 
        obj.linked? `<button style="border: none; color: #AB9DB7; background:none;" class="btn btn-unlink" data-id="${obj.phraseID}">✂</button> ` : `<button style="border: none; color: #AB9DB7; background:none;" class="btn btn-link" data-id="${obj.phraseID}">🔗</button>`;
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
  }
]);

    this._smartTable.setConfig({
      sortKey: "theOrder",
      sortDir: "asc",
      pageSize: "all",
      tableMaxHeight: "25vh",
      columnToSearch: ["phrase","user_translate","defi","user_defi"],
      idKey: "phraseID",
      cellPading: "4px 6px"
    })   
  }

  connectedCallback() {
    const { signal } = this._abort;

    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');
    this._entryPhrase = this.shadowRoot.querySelector('#entryPhrase');
    this._smartTable = this.shadowRoot.querySelector('extended-smart-table');
    this._tableBody = this._smartTable.shadowRoot.getElementById("tbl").shadowRoot.getElementById("tableBody");



    // add EventListeners
    this._smart_dialog.addEventListener("smart-dialog-confirmed", () => this._confirmHandler(), { signal });
    this._smart_dialog.addEventListener("smart-dialog-canceled", () => this._cancelHandler(), { signal });

    this._suggestedConnectPhrasesDiv = this.shadowRoot.querySelector('#suggestedConnectPhrases');
    this._suggestedConnectPhrasesDiv.addEventListener('dblclick', (e) => this._addNewConnectingPhraseFromSuggestion(e), { signal });
   
    this._smartTable.addEventListener('highlight-changed', (e) => {
      console.log("highlight-changed", e.detail.id);      
    } , { signal });
    this._smartTable.addEventListener('link-requested', (e) => {     
      this._connecting_phraseID.push(e.detail.id);
      this._updateTablewithConnectingPhrase(e.detail.id, true);
      this._hydrateSuggestedContainer();
    },{ signal });
    this._smartTable.addEventListener('unlink-requested', (e) => {
      this._connecting_phraseID = this._connecting_phraseID.filter(id=> {
        return id !== e.detail.id; // must return booleans
      });
      this._updateTablewithConnectingPhrase(e.detail.id, false);
      this._hydrateSuggestedContainer();
    }, { signal });

 
    new Sortable(this._tableBody, {
      animation: 150,      
      scroll: true,             // Enable scrolling
      scrollSensitivity: 40,    // Pixels from edge to start scroll
      scrollSpeed: 10,          // Speed of scroll (pixels/tick)
      fallbackTolerance: 3,     // Start drag after 3px movement
      delay: 250,               // time in ms to hold before drag starts
      delayOnTouchOnly: true,   // only apply delay on touch devices
      touchStartThreshold: 5,   // px of movement before drag starts 
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

  _confirmHandler() {
    const nodeLinked = this._tableBody.querySelectorAll('.linked');
    this._result = [];
    nodeLinked.forEach(el => { this._result.push(el.dataset.id); });
    this._entry.connecting_phrases = this._result;
    this.dispatchEvent(
      new CustomEvent('connecting-phrase-updated', { 
        detail: this._result, 
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent('connecting-phrase-cancelled', { 
        detail: this._connecting_phraseID, 
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }
}

customElements.define('connecting-phrase', ConnectingPhrase);

