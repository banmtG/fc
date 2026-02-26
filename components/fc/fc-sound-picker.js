import  '../smart/extended-smart-table/extended-smart-table.js';
import '../smart/smart-dialog.js';
import Sortable from '../lib/sortableJS/sortable.complete.esm.js'; 
import { NotificationManagerInstance } from './../../core/notification-manager.js';
import { confirmDialog } from './../../core/confirmDialog.js';
import { copyTextToClipboard } from './../../js/utils/clipboard.js';
import { mapTableSoundData, downloadAndSaveSound, playSoundFromURLorBlob, removeSoundBlobEntry , normalizeSoundUrlsDataFromServer, calculateNewOrder, getUrlFromSoundItem  } from './../../js/data_services/soundUrls.js';
import {checkDefiExist} from './../../js/data_services/phrases.js';

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
              <div class="container_row row1 icon_button">
                <sl-input id="urlInput" class="focusable" size="medium" placeholder="Sound url"></sl-input>   
                <sl-button id="addBtn" class="focusable" size="medium">➕</sl-button>
              </div>
                <div class="container_row row2 icon_button">
                  <sl-input id="originInput" class="focusable"  size="medium" placeholder="Origin"></sl-input>
                  <sl-input id="accentInput" class="focusable"  size="medium" placeholder="Accent: US, UK"></sl-input>
                  <sl-button-group>    
                    <sl-button id="localFileBtn" class="focusable" size="medium">📂</sl-button>
                    <sl-button id="recordBtn" class="focusable" size="medium">🔴</sl-button>
                  </sl-button-group>
                </div>
              </div>
              <extended-smart-table id="smart-table" search="false" pagination="false">
              </extended-smart-table>    
               <sl-button-group label="Alignment" class="smartDragdrop_buttons icon_button">
                <sl-tooltip content="Open Link in Browser"><sl-button class="focusable" size="medium" style="display: none" id="openLinkBtn">↗️</sl-button></sl-tooltip>
                <sl-tooltip content="Delete"><sl-button class="focusable" size="medium" id="deleteBtn">🗑</sl-button></sl-tooltip>
                <sl-tooltip content="Extract links"><sl-button class="focusable" size="medium" id="extractLinksBtn">⛏️</sl-button></sl-tooltip>
                <sl-tooltip content="Pick to use in card view"><sl-button class="focusable" size="medium" id="useBtn">📌</sl-button></sl-tooltip>
              </sl-button-group>      
              <div class="container_row row3 icon_button">  
                  <sl-input id="textToSpeechInput" class="focusable" size="medium" placeholder="Text To Speech"></sl-input>    
                  <sl-button id="fetchBtn" class="focusable" size="medium">🚀</sl-button>
              </div>    
              <input type="file" id="localFileInput" style="display:none" multiple accept="sound/*"> 
              <div class="spinner"><sl-spinner style="font-size: 50px; --track-width: 10px;"></sl-spinner></div>     
              <div class="canvasContainer">
                <canvas id="waveCanvas"></canvas>
                <div id="recordTimer" 
                    style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%);
                            font-family: monospace; font-size: 16px; color: black;">
                  00:00
                </div>
              </div>
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
    this._smartTable.data = [];
    this._smartTable._runPipeline();
    this.showWorkingSpinner();
    this._smartTable.data = await mapTableSoundData(this._entry.phraseID,this._entry.sound?.data);
    this.hideWorkingSpinner();   
    // console.log(this._smartTable.data);
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
      value: "140px",      // fit content width
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
    this._urlInput = this.shadowRoot.querySelector('#urlInput');
    this._addBtn =  this.shadowRoot.querySelector('#addBtn');

    this._originInput = this.shadowRoot.querySelector('#originInput');
    this._accentInput = this.shadowRoot.querySelector('#accentInput');

    this._localFileBtn = this.shadowRoot.querySelector('#localFileBtn');
    this._localFileInput = this.shadowRoot.querySelector('#localFileInput');
    this._recordBtn = this.shadowRoot.querySelector('#recordBtn');

    this._deleteBtn = this.shadowRoot.querySelector('#deleteBtn');
    this._openLinkBtn= this.shadowRoot.querySelector('#openLinkBtn');
    this._extractLinksBtn= this.shadowRoot.querySelector('#extractLinksBtn');
    this._useBtn= this.shadowRoot.querySelector('#useBtn');
    this._canvasContainer = this.shadowRoot.querySelector('.canvasContainer');

    this._addBtn.addEventListener('click', ()=>this._handleAdd(), { signal });
  
    this._deleteBtn.addEventListener('click', ()=>this._handleDelete(), { signal });

    this._smartTable.addEventListener('rows-deleted', async (e)=> { 
      await removeSoundBlobEntry(this._entry.phraseID,e.detail.ids);      
      this.notifySuccess(`${e.detail.ids.length} item(s) has been deleted!`) }
    , { signal });


    // this._downloadBtn.addEventListener('click', ()=>this._handleDownload(), { signal });
    this._extractLinksBtn.addEventListener('click', ()=> this._handleExtractLinks(), { signal });


    this._useBtn.addEventListener('click', ()=>this._handleToggleUse(), { signal });    
    
    this._textToSpeechInput = this.shadowRoot.querySelector('#textToSpeechInput');

    this._fetchBtn = this.shadowRoot.querySelector('#fetchBtn');
    this._fetchBtn.addEventListener('click', ()=>this._handleFetch(), { signal });

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

    this.addEventListener('fc-sound-picker-fetched',(e)=> this._onSoundFetched(e), { signal });    

   
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
      },
    });
  }
  
  async _onSoundFetched(e) {   
    const theTargetOject = e.detail.theTargetOject;
    let audioUrl;
    if (theTargetOject.blob instanceof Blob) {
      // Case: actual Blob
      audioUrl = URL.createObjectURL(theTargetOject.blob);
    } else if (typeof theTargetOject.blob === "string") {
      // Case: base64 string
      audioUrl = "data:audio/mp3;base64," + theTargetOject.blob;
    } else {
      this.notifyWarning("Invalid audio data received");
      return;
    }

    const { success, failed } = await this.saveFromBlobUrls([audioUrl]);
    this.notifySuccess(`${success.length} sound file(s) have been newly added!`);
    if (failed.length > 0) this.notifyWarning(`${failed.length} sound file(s) have not been added!`);
  }

  

  async _handleFetch() {
    const textToSpeech = this._textToSpeechInput.value;
    console.log(this._entry.defi?.length>0);
    const items = [{
      phrase: this._entry.phrase.trim(),
      textToSpeech: textToSpeech.trim(),
      // metadata: { defi: (checkDefiExist(this._entry)? true : false ) }
      metadata: { defi: true }
    }];
    console.log(items);
    this.dispatchEvent(
      new CustomEvent('fc-sound-picker-fetch-requested', { 
        detail: { items, origin: this },
        bubbles: true,
        composed: true,
      }));  
  }

  async _handleRecord() {
    // Toggle stop if already recording
    if (this._mediaRecorder && this._mediaRecorder.state === "recording") {
      this._mediaRecorder.stop();
      this._recordBtn.innerText = "🔴";
      cancelAnimationFrame(this._rafId);
      clearInterval(this._timerInterval); // stop timer
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.notifySuccess(`Start recording!`, undefined, undefined, 3000);

      this._canvasContainer.style.display = "block";

      // MediaRecorder for saving audio
      this._mediaRecorder = new MediaRecorder(stream);
      this._audioChunks = [];

      this._mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this._audioChunks.push(e.data);
      };

      this._mediaRecorder.onstop = async () => {
        this._canvasContainer.style.display = "none";
        const audioBlob = new Blob(this._audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const { success, failed } = await this.saveFromBlobUrls([audioUrl]);
        this.notifySuccess(`${success.length} record(s) saved!`);
        if (failed.length > 0) this.notifyWarning(`${failed.length} record failed!`);
      };

      this._mediaRecorder.start();
      this._recordBtn.innerText = "🟥";

      // Start timer 
      let seconds = 0; 
      this._updateTimerDisplay(seconds); 
      this._timerInterval = setInterval(() => { 
        seconds++; 
        this._updateTimerDisplay(seconds); 
      }, 1000);

      // Web Audio API for visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      source.connect(analyser);

      const canvas = this.shadowRoot.getElementById("waveCanvas");
      const ctx = canvas.getContext("2d");
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        this._rafId = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        // Compute average loudness
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        const avg = sum / dataArray.length;

        // Scroll canvas left
        const imageData = ctx.getImageData(1, 0, canvas.width - 1, canvas.height);
        ctx.putImageData(imageData, 0, 0);
        ctx.clearRect(canvas.width - 1, 0, 1, canvas.height);

        // Draw new bar at right edge
        const barHeight = (avg / 32) * canvas.height;
        ctx.fillStyle = "#6B6B6B";
        ctx.fillRect(canvas.width - 1, canvas.height - barHeight, 1, barHeight);
      };

      draw();
    } catch (err) {
      console.error("Microphone access failed:", err);
      this.notifyWarning("Unable to access microphone");
    }
  }

  // Helper to format and update timer 
  _updateTimerDisplay(seconds) { 
    const timerEl = this.shadowRoot.getElementById("recordTimer"); 
    if (!timerEl) return; 
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0"); 
    const secs = String(seconds % 60).padStart(2, "0"); 
    timerEl.textContent = `${mins}:${secs}`; 
  }


  async _handleAdd() { 
    const newUrls = this._urlInput.value.split(',').map(s => s.trim()).filter(Boolean);
    this._urlInput.value = "";

    if (newUrls.length === 0) {
      this.notifyWarning("Please add a sound url first!")
      return;
    }

    this.showWorkingSpinner();
    // Normalize and add to drag‑drop
    const items = normalizeSoundUrlsDataFromServer(this._entry.phrase, newUrls);
    const origin = this._originInput.value;
    const accent = this._accentInput.value;
    items.forEach(item=> {
      const insertAtPosition = 0;
      const theOrder = calculateNewOrder(this._smartTable._raw,insertAtPosition);
      if (origin) item['origin'] = origin;
      if (accent) item['accent'] = accent;
      item['order'] = theOrder;     
      this._smartTable.addRow(item); // add at position 0 , add new item to "this._smartTable._raw"
    });

    this._smartTable._raw.sort((a, b) => a.order - b.order); // sort basded on "order" key
    this.hideWorkingSpinner();
    this.notifySuccess(`${items.length} sound url(s) have been newly added!`);

}

  async saveFromBlobUrls(blobUrls) {
    // Normalize and add to drag‑drop
    const items = normalizeSoundUrlsDataFromServer(this._entry.phrase, blobUrls);
    const origin = this._originInput.value;
    const accent = this._accentInput.value;
    items.forEach(item=> {
      const insertAtPosition = 0;
      const theOrder = calculateNewOrder(this._smartTable._raw,insertAtPosition);
      if (origin) item['origin'] = origin;
      if (accent) item['accent'] = accent;
      item['order'] = theOrder;     
      this._smartTable.addRow(item); // add at position 0 , add new item to "this._smartTable._raw"
    })    

    this._smartTable._raw.sort((a, b) => a.order - b.order); // sort basded on "order" key
    const { success, failed } = await downloadAndSaveSound(this,this._entry.phraseID,this._entry.phrase,items);
    return { success, failed };
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
    const { success, failed } = await this.saveFromBlobUrls(newUrls);
    this.hideWorkingSpinner();
    this.notifySuccess(`${success.length} sound file(s) have been newly added!`);
    if (failed.length>0) this.notifyWarning(`${failed.length} sound file(s) have not been added!`);
}


  async _playSoundFromUrl(e) {
    const targetID = e.detail.id;    
    playSoundFromURLorBlob(this, this._entry.phraseID,targetID);
  }
  
  // async _handleDownload() {
  //   const selectedIDs = this._smartTable.getSelected();  
  //   if (!selectedIDs) return; // nothing to work on 

  //   const theTargetObjects = this._smartTable._raw.filter(obj => selectedIDs.includes(obj.id));
  //   // show loading Spinner for await
  //   this.showWorkingSpinner();
  //   const { success, failed } = await downloadAndSaveSound(this,this._entry.phraseID,this._entry.phrase, theTargetObjects);
  //   // prepare patchedItems with blob-ready URL
  //   let totalSize = 0;

  //   // get Image Blob Url ready before passing to img
  //   const patchedItems = await Promise.all(success.map(async item=> { 
  //       totalSize = totalSize + item.meta.processed.size;
  //       return { ...item, t:"blob", url_blob: await getImageUrl(this._entry.phraseID,item.id)} 
  //     })
  //   );

  //   //u 
  //   this.hideWorkingSpinner();
    
  //   if (success.length>0) 
  //     this.notifySuccess(`${success.length} item(s) (${(totalSize/1024/1024).toFixed(2)}MB) has been downloaded!`);

  //   if (failed.length>0) 
  //     this.notifyWarning(`${failed.length} items cannot be downloaded!`);
  // }
  

  async _handleDelete() {
    const selectedIDs = this._smartTable.getSelected();  
    if (!selectedIDs || selectedIDs.length===0) return; // nothing to work on  
    const msg = selectedIDs.length === 1
      ? "Are you sure to delete this row?"
      : `Are you sure to delete these ${selectedIDs.length} rows?`;
    const confirmed = await confirmDialog.show("⛔ Confirmation",msg);
    if (!confirmed) return;
    this._smartTable._handleRowDelete(selectedIDs);
    console.log(`before SoundBlobREmove`);
    const result = await removeSoundBlobEntry(this._entry.phraseID,selectedIDs);
    console.log(`after SoundBlobREmove`);
    console.log(result);
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

  async _handleExtractLinks() {
    const selectedIDs = this._smartTable.getSelected();    
    if (!selectedIDs || selectedIDs.length===0) return; // nothing to work on    

    const results = await Promise.all(selectedIDs.map(async (id) => { 
      return await getUrlFromSoundItem(this,this._entry.phraseID,id) 
    }));
    
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
        detail: { value : this._smartTable.data },
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

  notifySuccess(message, icon = "stars", color = "--sl-color-success-500", timer= 1500 ) {
    NotificationManagerInstance.show({
      label: message,
      icon: icon,
      color: color,
      timer: timer
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

