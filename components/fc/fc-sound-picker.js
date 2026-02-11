import  '../smart/extended-smart-table/extended-smart-table.js';
import '../smart/smart-dialog.js';
import Sortable from '../lib/sortableJS/sortable.complete.esm.js'; 
import { NotificationManagerInstance } from './../../core/notification-manager.js';
import { confirmDialog } from './../../core/confirmDialog.js';
import { copyTextToClipboard } from './../../js/utils/clipboard.js';
import { mapTableSoundData, downloadAndSaveSound, playSoundFromURLorBlob, removeSoundBlobEntry , normalizeSoundUrlsDataFromServer, calculateNewOrder  } from './../../js/data_services/soundUrls.js';


const cssUrl = new URL("./fc-sound-picker.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">

  <smart-dialog esc-close overlay-close draggable>
      <div slot="header">
          <div class="title">
            <span style="font-size: 1.2rem"><b>Sound picker</b></span>
          </div>
        </div>        
        <div slot="body" class="body">
            <div class="container">
              <div class="container_top">
                <sl-input id="urlTextInput" class="focusable"  size="medium" placeholder="Sound url"></sl-input>
                <div class="container_row icon_button">                  
                  <sl-input id="urlOrigin" class="focusable"  size="medium" placeholder="Origin"></sl-input>
                  <sl-input id="urlAccent" class="focusable"  size="medium" placeholder="Accent"></sl-input>
                  <sl-button-group>                  
                    <sl-button id="addBtn" class="focusable" size="medium">➕</sl-button>
                    <sl-button id="localFileBtn" class="focusable" size="medium">📂</sl-button>
                    <sl-button id="recordBtn" class="focusable" size="medium">🔴</sl-button>
                  </sl-button-group>
                </div>
              </div>
              <extended-smart-table id="smart-table" search="false" pagination="false">
              </extended-smart-table>    
               <sl-button-group label="Alignment" class="smartDragdrop_buttons icon_button">
                <sl-tooltip content="Download to use offline"><sl-button class="focusable" size="medium" id="downloadBtn">🌍➜💾</sl-button></sl-tooltip>
                <sl-tooltip content="Delete"><sl-button class="focusable" size="medium" id="deleteBtn">🗑</sl-button></sl-tooltip>
                <sl-tooltip content="Extract links"><sl-button class="focusable" size="medium" id="extractLinksBtn">⛏️</sl-button></sl-tooltip>
                <sl-tooltip content="Pick to use in card view"><sl-button class="focusable" size="medium" id="useBtn">📌</sl-button></sl-tooltip>
              </sl-button-group>          
              <input type="file" id="localFileInput" style="display:none" multiple accept="sound/*"> 
              <div class="spinner"><sl-spinner style="font-size: 50px; --track-width: 10px;"></sl-spinner></div>           
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

class FCSoundPicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // AbortController for cleanup
    this._abort = new AbortController();

      // Clone template content into shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    // this.render();
  }

  open(entry) {
    this._entry = entry;
    this._hydrateTable();
    requestAnimationFrame(() => {   
      if (this._smart_dialog) { 
        this._smart_dialog.style.display = "block";
        this._smartTable.focus();
      }
    });
  }

  _mapTableData(soundArray) {   

  }
  
  async _hydrateTable() {
    const { signal } = this._abort;
    this.showWorkingSpinner();
    this.hideWorkingSpinner();   
    this._smartTable.data = await mapTableSoundData(this._entry.phraseID,this._entry.sound.data);
    // console.log(this._data.length);
    // Pass down columns
    this._smartTable.setColumns([ 
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
        div.className = "actions";
        div.innerHTML = `
        <button style="border: none; color: #AB9DB7; background:none;" class="btn btn-play" data-id="${obj.id}">▶</button>`;
        requestAnimationFrame(() => {        
          if (div.parentNode) {    
              div.parentNode.style.padding = "0px";
              div.parentNode.style.justifyContent = "center";
          }        
        });
      return div;
    },
    events: {
      click: (e, row, obj) => {
        if (e.target.classList.contains("btn-play")) {
          console.log(`click on play`, obj.id);
          row.dispatchEvent(new CustomEvent("playSound-requested", {
            detail: { id: obj.id },
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
    key: "id",
    label: "SoundID",
    sortable: false,
    width_set: {
      value: "120px",      // fit content width
    },
    render: (val, obj) => {
      const div = document.createElement("div");      
      div.innerHTML =  val;       
      return div;
    }
  },
    {
    key: "t",
    label: "",
    width_set: {
      value: "auto",      // fit content width
    },
    render: (_, obj) => {
      const div=document.createElement('div');      
      div.style.cssText = "display: flex; flex-direction: row; justify-content: center; align-items: center; position: relative;";
      const mainIcon = document.createElement('span');     
      mainIcon.innerHTML = `${obj.t === "web"? "🌍" : "💾" }`;
      div.appendChild(mainIcon);

      if (obj.alive === "dead") {
        const secondIcon = document.createElement('span');
        secondIcon.style.cssText = "position: absolute; top: 0px; right: 0px; opacity:0.9";
        secondIcon.innerHTML = `${obj.alive === "alive"? "" : "🚫" }`;
        div.appendChild(secondIcon);
      }   
      return div;
    }
  },
  {
    key: "origin",
    label: "Origin",
    width_set: {
      value: "1fr",      // fit content width
    },
    render: (_, obj) => {
       return obj.origin;
    }
  },
  {
    key: "accent",
    label: "",
    width_set: {
      value: "auto",      // fit content width
    },
    render: (_, obj) => {
       return obj.accent;
    }
  },
  {
    key: "pick",
    label: "",
    width_set: {
      value: "30px",      // fit content width
    },
    render: (_, obj) => {
       return `${obj.pick === true? "📌" : "" }`;
    }
  }
]);

  this._smartTable.setConfig({
      sortKey: "order",
      sortDir: "asc",
      pageSize: "all",
      tableMaxHeight: "32vh",
      // columnToSearch: ["phrase","user_translate","defi","user_defi"],
      idKey: "id",
      cellPading: "7px 5px",
      selectionModeOnTouch: true,
      allowDeleteKey: true,
    })   
  }

  connectedCallback() {
    const { signal } = this._abort;
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');
    this._smartTable = this.shadowRoot.querySelector('extended-smart-table');
    this._tableBody = this._smartTable.shadowRoot.getElementById("tbl").shadowRoot.getElementById("tableBody");
    this._childSmartTable = this._smartTable.shadowRoot.getElementById("tbl");

    this._spinner = this.shadowRoot.querySelector('.spinner');
    this._urlTextInput =  this.shadowRoot.querySelector('#urlTextInput');
    this._addBtn =  this.shadowRoot.querySelector('#addBtn');
    this._localFileBtn = this.shadowRoot.querySelector('#localFileBtn');
    this._localFileInput = this.shadowRoot.querySelector('#localFileInput');
    this._recordBtn = this.shadowRoot.querySelector('#recordBtn');

    this._deleteBtn = this.shadowRoot.querySelector('#deleteBtn');
    this._downloadBtn= this.shadowRoot.querySelector('#downloadBtn');
    this._extractLinksBtn= this.shadowRoot.querySelector('#extractLinksBtn');
    this._useBtn= this.shadowRoot.querySelector('#useBtn');


    this._addBtn.addEventListener('click', ()=>this._handleAdd(), { signal });
  

    this._deleteBtn.addEventListener('click', ()=>this._handleDelete(), { signal });

    this._smartTable.addEventListener('rows-deleted',(e)=>this.notifySuccess(`${e.detail.ids.length} item(s) has been deleted!`), { signal });

    this._downloadBtn.addEventListener('click', ()=>this._handleDownload(), { signal });
    this._extractLinksBtn.addEventListener('click', ()=> this._handleExtractLinks(), { signal });
    this._useBtn.addEventListener('click', ()=>this._handleToggleUse(), { signal });    
    
    this.addEventListener('playSound-requested',(e)=> this._playSoundFromUrl(e), { signal });    

    this._localFileBtn.addEventListener("click", () => this._localFileInput.click(), { signal });
    this._localFileInput.addEventListener("change", () => this._handleGetLocalSounds(), { signal });

    this._recordBtn.addEventListener('click', ()=>this._handleRecord(), { signal });


    // add EventListenerszz
    this._smart_dialog.addEventListener("smart-dialog-confirmed", () => this._confirmHandler(), { signal });
    this._smart_dialog.addEventListener("smart-dialog-canceled", () => this._cancelHandler(), { signal });
   
    this._smartTable.addEventListener('highlight-changed', (e) => {
      console.log("highlight-changed", e.detail.id);      
    } , { signal });
   
    this._sortable = new Sortable(this._tableBody, {
      animation: 150,      
      scroll: true,             // Enable scrolling
      scrollSensitivity: 40,    // Pixels from edge to start scroll
      scrollSpeed: 10,          // Speed of scroll (pixels/tick)
      fallbackTolerance: 3,     // Start drag after 3px movement
      delay: 250,               // time in ms to hold before drag starts
      delayOnTouchOnly: true,   // only apply delay on touch devices
      touchStartThreshold: 5,   // px of movement before drag starts 
      onEnd: (evt) => {
        this.shiftItemAfterDrag(this._childSmartTable._data,evt.oldIndex,evt.newIndex);
        this.shiftItemAfterDrag(this._smartTable._raw,evt.oldIndex,evt.newIndex);
        this._childSmartTable._data = this.reSetOrderArray(this._childSmartTable._data);
        this._smartTable._raw = this.reSetOrderArray(this._smartTable._raw);

        console.log(this._childSmartTable._data);
        console.log(this._smartTable._raw);

      },
    });
  }

  _handleRecord() {  
    console.log(this._childSmartTable._data);
    console.log(this._smartTable._raw);
}

  async _handleGetLocalSounds() {
    const files = Array.from(this._localFileInput.files || []);
    if (files.length === 0) return;

    const newUrls = [];
    const metaList = [];

    this.showWorkingSpinner();

    for (const file of files) {
      // For audio, you can skip conversion unless you want to normalize format
      const blob = file; // File is already a Blob
      const meta = { name: file.name, size: file.size, type: file.type };

      metaList.push(meta);

      // Create local object URL for playback
      newUrls.push(URL.createObjectURL(blob));
    }

    // Normalize and add to drag‑drop
    const items = normalizeSoundUrlsDataFromServer(this._entry.phrase, newUrls);
    console.log(items);

    items.forEach(item=> {
      const insertAtPosition = 0;
      const theOrder = calculateNewOrder(this._smartTable._raw,insertAtPosition);
      item['order'] = theOrder;     
      this._smartTable.addRow(item); // add at position 0 , add new item to "this._smartTable._raw"
    })    
    this._smartTable._raw.sort((a, b) => a.order - b.order); // sort basded on "order" key
    this.notifySuccess(`${items.length} sound file(s) have been newly added!`);


    const { success, failed } = await downloadAndSaveSound(this,this._entry.phraseID,this._entry.phrase,items);

    console.log(success);
    console.log(failed);

    this.hideWorkingSpinner();
  // console.table(metaList);
}


  async _playSoundFromUrl(e) {
    const targetID = e.detail.id;    
    playSoundFromURLorBlob(this, this._entry.phraseID,targetID);
  }
  
  async _handleDownload() {
    const selectedIDs = this._smartTable.getSelected();  
    if (!selectedIDs) return; // nothing to work on 

    const theTargetObjects = this._smartTable._raw.filter(obj => selectedIDs.includes(obj.id));
    // show loading Spinner for await
    this.showWorkingSpinner();
    const { success, failed } = await downloadAndSaveSound(this,this._entry.phraseID,this._entry.phrase, theTargetObjects);
    // prepare patchedItems with blob-ready URL
    let totalSize = 0;

    // get Image Blob Url ready before passing to img
    const patchedItems = await Promise.all(success.map(async item=> { 
        totalSize = totalSize + item.meta.processed.size;
        return { ...item, t:"blob", url_blob: await getImageUrl(this._entry.phraseID,item.id)} 
      })
    );

    //u 
    this.hideWorkingSpinner();
    
    if (success.length>0) 
      this.notifySuccess(`${success.length} item(s) (${(totalSize/1024/1024).toFixed(2)}MB) has been downloaded!`);

    if (failed.length>0) 
      this.notifyWarning(`${failed.length} items cannot be downloaded!`);
  }
  

  async _handleDelete() {
    const selectedIDs = this._smartTable.getSelected();  
    if (!selectedIDs || selectedIDs.length===0) return; // nothing to work on  
    const msg = selectedIDs.length === 1
      ? "Are you sure to delete this row?"
      : `Are you sure to delete these ${selectedIDs.length} rows?`;
    const confirmed = await confirmDialog.show("⛔ Confirmation",msg);
    if (!confirmed) return;
    this._smartTable._handleRowDelete(selectedIDs);

    const result = await removeSoundBlobEntry(this._entry.phraseID,selectedIDs);
 
  }

  _handleToggleUse() {
    const selectedIDs = this._smartTable.getSelected();
    if (!selectedIDs || selectedIDs.length===0) return; // nothing to work on    
    selectedIDs.forEach(id => {
      const theTarget = this._smartTable._raw.find(obj => id === obj.id);
      const newPick = (theTarget.pick===undefined||theTarget.pick===null)? true : !theTarget.pick;
      theTarget.pick = newPick; // update the targeted object in this._smartTable._raw
      this._updateTablewithConnectingPhrase(id,null,newPick,null);
    }); 
    this.notifySuccess(`${selectedIDs.length} item(s) has been updated!`);
  }

  _handleExtractLinks() {
    const selectedIDs = this._smartTable.getSelected();    
    if (!selectedIDs || selectedIDs.length===0) return; // nothing to work on    

    const theTargets = this._smartTable._raw.filter(obj => selectedIDs.includes(obj.id));
    const results = theTargets.map(obj=> obj.url);
    // console.log(results);
    this.notifySuccess(`${results.length} link(s) has been copied to clipboard`);
    copyTextToClipboard(results.join(',\n'));  
  }

  _updateTablewithConnectingPhrase(targetID, newType, newPick, newOrder) {
    this._smartTable._updateRowData(targetID, { 
      ...(newType? { t: newType } : {}),
      ...(newPick? { pick: newPick } : {}),
      ...(newOrder? { order: newOrder } : {}),
    });
    this._smartTable.updateRowUI(targetID);
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
    //const nodeLinked = this._tableBody.querySelectorAll('.linked');
    //this._result = [];
    //nodeLinked.forEach(el => { this._result.push(el.dataset.id); });
    //this._entry.connecting_phrases = this._result;
    this.dispatchEvent(
      new CustomEvent('fc-sound-picker-updated', { 
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent('fc-sound-picker-cancelled', {         
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
  }

  showWorkingSpinner() {
    this._spinner.style.display = "block";
  }

  hideWorkingSpinner() {
    this._spinner.style.display = "none";
  }

  notifySuccess(message) {
    NotificationManagerInstance.show({
      label: message,
      icon: "stars",
      color: "--sl-color-success-500",
      timer: 1500
    });
  }

  notifyWarning(message) {
    NotificationManagerInstance.show({
      label: message,
      icon: 'exclamation-square',
      color: '--sl-color-warning-500',
      timer: 3000
    });
  }

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

  reSetOrderArray(arr) {
    const result = arr.map((item,index) => { return { ...item, order: index} });
    return result;
  }      
}

customElements.define('fc-sound-picker', FCSoundPicker);

