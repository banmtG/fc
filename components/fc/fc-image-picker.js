import '../smart/smart-dialog.js';
import './../smart/smart-dragdrop/smart-dragdrop.js';
import { checkImagesAlive, downloadAndSaveImages, removeImageBlobEntry, normalizeBlobItems, getImageUrl  } from './../../js/data_services/imgUrls.js';
import { NotificationManagerInstance } from './../../core/notification-manager.js';
import { confirmDialog } from './../../core/confirmDialog.js';

const cssUrl = new URL("./fc-image-picker.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <smart-dialog esc-close overlay-close draggable>
    <div slot="header">

        <div class="title">
          <span style="font-size: 1.2rem"><b>Image picker</b></span>
        </div>
      </div>        
      <div slot="body" class="body">
          <div class="container">
              <div class="container_row">
                <sl-input size="small" placeholder="Urls or text to fetch..."></sl-input><sl-button size="small">✚</sl-button></sl-input><sl-button size="small">🔍</sl-button>
              </div>
              <smart-dragdrop></smart-dragdrop>
              <div class="smartDragdrop_buttons">
                <sl-button size="small" id="deleteBtn">⛔ Del</sl-button>
                <sl-button size="small" id="downloadBtn">🌍➜💾 Local</sl-button>
                <sl-button size="small" id="extractLinksBtn">⛓️ Get Urls</sl-button>
                <sl-button size="small" id="useBtn">📌 Use</sl-button>
              </div>
              <div class="spinner"><sl-spinner style="font-size: 50px; --track-width: 10px;"></sl-spinner></div>
          </div>
      </div>
      <div slot="footer">
          <sl-button size="small" variant="primary" id="confirm" class="focusable">Confirm</sl-button>
          <sl-button size="small" variant="default" id="cancel" class="focusable">Cancel</sl-button>
      </div>   
    </smart-dialog>
`;

class FCImagePicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // AbortController for cleanup
    this._abort = new AbortController();
    this._data = [];
    this._entry = {};
    this._lastKeyTime = 0;
    // Clone template content into shadow DOM
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  async open(entry) {
    this._entry = entry;    

    requestAnimationFrame(() => {   
      if (this._smart_dialog) { 
        this._smart_dialog.style.display = "block"; 
      }
    });
    this._entry = await normalizeBlobItems(entry);

    console.log(this._entry);
    // this._imageArray = this._entry.image.data;
 
    this._smartDragDrop.data = {
     arr: this._entry.image.data, 
     renderFields: {     
      list: ["title"],  
      icon: ["url","title"],
      detail:["title","url"] 
     },
    detailCols: { 
       "<400": "30px auto", 
       ">400": "30px auto" 
    },
    // <img data-src="${item.url}" alt="${item.id}" url_blob/>
        // <img data-src="${item.t==="web"? item.url : getImageUrl(this._entry.phraseID, item.id)}" alt="${item.id}" />
     renderItem: (item, zone, viewMode) => {
      switch (viewMode) {                    
        case "icon":
          return `
            <div class="draggable" draggable="true" data-zone="${zone}" data-id="${item._id}">
              <img data-src="${item.t==="web"? item.url : item.url_blob}" alt="${item.id}" />
              <div style="height: 25px; width:25px" class="corner_TopLeft">${item.t === "web"? "🌍" : "💾" }</div>
              ${item.pick === true? "<div style='height: 25px; width:25px' class='corner_TopRight'>📌</div>":"" }
              <div class="title">${item.id}</div>
            </div>`;
        case "detail":
          return `
            <div class="draggable" draggable="true" data-zone="${zone}" data-id="${item._id}">   
              <div class="detail_field" ><img style="width:30px; height:30px; object-fit: cover;" src="${item.url}" alt="${item.id}"/></div>
              <div class="detail_field">${item.url}</div>
            </div>`;  
        case "list":
          return `
            <div class="draggable" draggable="true" data-zone="${zone}" data-id="${item._id}">   
              <div class="title">${item.id}</div>
            </div>`;     
        default:
          return "";
      }
    },
      columns: [
        {
          id: "1",
          title: "🌍 Online + 💾",
          view: "list",          // "list" | "detail" | "icon"
          listItemWidth: 120,    // 
          listItemHeight: 20,    // 
          rowGap: 5,            // 
          columnGap: 5,         // 
          height: 450,           // px column height
          rangeValue: 40// initial slider step
        },
        //  {
        //   id: "2",
        //   title: "🌍 Online + 💾",
        //   view: "list",          // "list" | "detail" | "icon"
        //   listItemWidth: 120,    // 
        //   listItemHeight: 20,    // 
        //   rowGap: 5,            // 
        //   columnGap: 5,         // 
        //   // height: 300,            // px column height
        //   rangeValue: 40// initial slider step
        // },
        // {
        //   id: "3",
        //   title: "🌍 Online + 💾",
        //   view: "icon",          // "list" | "detail" | "icon"
        //   listItemWidth: 120,    // 
        //   listItemHeight: 20,    // 
        //   rowGap: 5,            // 
        //   columnGap: 5,         // 
        //   // height: 300,            // px column height
        //   rangeValue: 40// initial slider step
        // }
      ],
      viewOption: ["icon","detail","list"]
    };


    // console.log(this._entry);
    // Spinner.show();
    // const { aliveItems, totalAlive, totalCompactAlive } = await checkImagesAlive(this._entry.image.data);
    // Spinner.hide();
    // this._imageArray = aliveItems;
    // console.log(totalAlive);
    // console.log(totalCompactAlive);
    // console.log(this._imageArray);


    this._imageArray = this._smartDragDrop.fullData;
  }
  
  get data() { return this._entry }

  exportImageData() {
    const exportArray = this._imageArray.map(item => {
     return {
      id: item.id,   
      t: item.t,
      url: item.url,
      ...(item.pick ? { pick: item.pick } : {}), // only add if true
      ...(item.source? { source: item.source } : {}), // only add if true
     }; 
  });
    return exportArray;
  }
  
  connectedCallback() {
    const { signal } = this._abort;
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');    
    this._smartDragDrop = this.shadowRoot.querySelector('smart-dragdrop');
    this._smartDragDrop.setAttribute('tabindex', '0');// make it focusable

    this._spinner = this.shadowRoot.querySelector('.spinner');

    this._deleteBtn= this.shadowRoot.querySelector('#deleteBtn');
    this._downloadBtn= this.shadowRoot.querySelector('#downloadBtn');
    this._extractLinksBtn= this.shadowRoot.querySelector('#extractLinksBtn');
    this._useBtn= this.shadowRoot.querySelector('#useBtn');

    this._smartDragDrop.addEventListener('keydown',e =>this._handleKeydown(e), { signal });
    this._deleteBtn.addEventListener('click', ()=>this._handleDelete(), { signal });
    this._downloadBtn.addEventListener('click', ()=>this._handleDownload(), { signal });
    this._useBtn.addEventListener('click', ()=>this._handleToggleUse(), { signal });    

        // add EventListeners
    this._smart_dialog.addEventListener("smart-dialog-confirmed", () => this._confirmHandler(), { signal });
    this._smart_dialog.addEventListener("smart-dialog-canceled", () => this._cancelHandler(), { signal });
  }

_handleKeydown(e) {
  // e.stopPropagation();
  // const now = Date.now(); 
  // if (now - this._lastKeyTime < 200) return; // ignore if <200ms since last 
  // this._lastKeyTime = now;

  // Ctrl + A (or Cmd + A on macOS)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
    e.preventDefault(); // prevent browser "select all"
    this._handleSelectAll(); // your custom function
    return;
  }

  // Delete key
  if (e.key === "Delete") {
    e.preventDefault();
    this._handleDelete(); // your custom function
    return;
  }

  // Enter key
  if (e.key === " ") {
    e.preventDefault();
    this._handleToggleUse(); // your custom function
    return;
  }
}

  _handleSelectAll() {
    console.log(this._smartDragDrop.fullData);
    this._smartDragDrop.shadowRoot.querySelectorAll(".draggable").forEach(item => {
       item.classList.add("selected");
    });  
  
  }

  _handleToggleUse() {
    const selectedIDs = this._smartDragDrop.getSelectedItems()['1'];
    const itemPatches = selectedIDs.map(id => { 
      const obj = this._imageArray.find(obj => obj._id === id);
      if (!obj) return;
      return  { _id: id, pick: obj.pick===true? false : true } 
    });
    this._smartDragDrop.updateItems(itemPatches);
    this._imageArray = this._smartDragDrop.fullData;
    console.log(this._imageArray.length);
    console.log(this._imageArray);
    console.log(this.exportImageData());
  }

  async _handleDownload() {
    const selectedIDs = this._smartDragDrop.getSelectedItems()['1'];
    this._imageArray = this._smartDragDrop.fullData;
    const cookedArray = [];
    selectedIDs.forEach(id => {            
        const idx = this._imageArray.findIndex(i => i._id === id);
        if (idx === -1) return;
        const item = this._imageArray[idx];
        cookedArray.push(item);
    });
    this.showDownloadingUI();
    const { success, failed } = await downloadAndSaveImages(this,this._entry.phraseID,this._entry.phrase, cookedArray);
    
    console.log(success);
    const patchedItems = await Promise.all(success.map(async item=> { 
      return { ...item, t:"blob", url_blob: await getImageUrl(this._entry.phraseID,item.id)} 
    })
    );
    this.hideDownloadingUI();
    this._smartDragDrop.updateItems(patchedItems);
    console.log(failed);       
    if (failed.length>0) NotificationManagerInstance.show({ 
      label: `${failed.length} items cannot be downloaded!`,
      icon: 'exclamation-square',
      color: '--sl-color-warning-500',
      timer: 4000
    })
  }

  showDownloadingUI() {
    console.log(`vao show`);
    this._spinner.style.display = "block";
  }

  hideDownloadingUI() {
    console.log(`none show`);
    this._spinner.style.display = "none";
  }

  async _handleDelete() {   
    const selectedIDs = this._smartDragDrop.getSelectedItems()['1'];  
    if (selectedIDs.length<=0) return;
    // const confirmed = window.confirm(`Delete "${selectedIDs.length} items"?`);
    // if (!confirmed) return;

    const confirmed = await confirmDialog.show("⛔ Confirmation dialog",`Delete ${selectedIDs.length} ${selectedIDs.length>1? "items" : "item"}?`);
    if (!confirmed) return;

// proceed with deletion

    
    this._imageArray = this._smartDragDrop.fullData;    
    const blobArray= [];
    selectedIDs.forEach(id => {            
        const idx = this._imageArray.findIndex(i => i._id === id);
        if (idx === -1) return;
        const item = this._imageArray[idx];
        blobArray.push(item.id);
    });
    this._smartDragDrop.removeItems(selectedIDs);
    console.log(blobArray);
    const result = await removeImageBlobEntry(this._entry.phraseID,blobArray);
    this._imageArray = this._smartDragDrop.fullData;    
    console.log(this._imageArray);
    console.log(result);
  }

  disconnectedCallback() {
    this._abort.abort();   
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

customElements.define('fc-image-picker', FCImagePicker);

