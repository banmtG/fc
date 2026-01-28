import '../smart/smart-dialog.js';
import './../smart/smart-dragdrop/smart-dragdrop.js';
import { checkImagesAlive, downloadAndSaveImages, removeImageBlobEntry  } from './../../js/data_services/imgUrls.js';
import { Spinner } from './../smart/spinner.js';

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
              <sl-input size="small" placeholder="Add direct urls or Search..."></sl-input><sl-button size="small">✚</sl-button></sl-input><sl-button size="small">🔍</sl-button>
            </div>
              <smart-dragdrop></smart-dragdrop>
            <div class="smartDragdrop_buttons">
              <sl-button size="small" id="deleteBtn">⛔ Del</sl-button>
              <sl-button size="small" id="downloadBtn">🌍➜💾 Offline</sl-button>
              <sl-button size="small" id="extractLinksBtn">⛓️ Get Urls</sl-button>
              <sl-button size="small" id="useBtn">📌 Use</sl-button>
            </div>
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
    this._imageArray = this._entry.image.data;
 
    this._smartDragDrop.data = {
     arr: this._imageArray, 
     renderFields: {       
      icon: ["url","title"],
      detail:["title","url"] 
     },
    detailCols: { 
       "<400": "30px auto", 
       ">400": "30px auto" 
    },
     renderItem: (item, zone, viewMode) => {
      switch (viewMode) {                    
        case "icon":
          return `
            <div class="draggable" draggable="true" data-zone="${zone}" data-id="${item._id}">
              <img loading="lazy"src="${item.url}" alt="${item.id}"/>
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
        default:
          return "";
      }
    },
      columns: [
        {
          id: "avail",
          title: "Online + Offline",
          view: "icon",          // "list" | "detail" | "icon"
          listItemWidth: 150,    // 
          listItemHeight: 30,    // 
          rowGap: 5,            // 
          columnGap: 5,         // 
          height: 300,            // px column height
          rangeValue: 120// initial slider step
        }
      ],
      viewOption: ["icon","detail"]
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
  
  connectedCallback() {
    const { signal } = this._abort;
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');    
    this._smartDragDrop = this.shadowRoot.querySelector('smart-dragdrop');
    this._deleteBtn= this.shadowRoot.querySelector('#deleteBtn');
    this._downloadBtn= this.shadowRoot.querySelector('#downloadBtn');
    this._extractLinksBtn= this.shadowRoot.querySelector('#extractLinksBtn');
    this._useBtn= this.shadowRoot.querySelector('#useBtn');

    this._deleteBtn.addEventListener('click', ()=>this._handleDelete(), { signal });
    this._downloadBtn.addEventListener('click', ()=>this._handleDownload(), { signal });
    this._useBtn.addEventListener('click', ()=>this._handleToggleUse(), { signal });
    
  }

  _handleToggleUse() {
    const selectedIDs = this._smartDragDrop.getSelectedItems()['avail'];
    const itemPatches = selectedIDs.map(id => { 
      const obj = this._imageArray.find(obj => obj._id === id);
      if (!obj) return;
      return  { _id: id, pick: obj.pick===true? false : true } 
    });
    this._smartDragDrop.updateItems(itemPatches);
    this._imageArray = this._smartDragDrop.fullData;
  }

  async _handleDownload() {
    const selectedIDs = this._smartDragDrop.getSelectedItems()['avail'];
    this._imageArray = this._smartDragDrop.fullData;
    const cookedArray = [];
    selectedIDs.forEach(id => {            
        const idx = this._imageArray.findIndex(i => i._id === id);
        if (idx === -1) return;
        const item = this._imageArray[idx];
        cookedArray.push(item);
    });
    const { success, fail } = await downloadAndSaveImages(this._entry.phraseID,this._entry.phrase, cookedArray);
    console.log(success);
    const patchedItems = success.map(item=> { return { ...item, t:"blob"} });
    console.log(patchedItems);
    this._smartDragDrop.updateItems(patchedItems);
    console.log(fail);
  }

  async _handleDelete() {
    const selectedIDs = this._smartDragDrop.getSelectedItems()['avail'];    
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

