import '../smart/smart-dialog.js';
import './../smart/smart-dragdrop/smart-dragdrop.js';
import { downloadAndSaveImages, removeImageBlobEntry, normalizeBlobItems, getImageUrl, normalizeUrlsDataFromServer, reverseTransform  } from './../../js/data_services/imgUrls.js';
import { NotificationManagerInstance } from './../../core/notification-manager.js';
import { confirmDialog } from './../../core/confirmDialog.js';
import { copyTextToClipboard } from './../../js/utils/clipboard.js';
import { verifyUrl, normalizeUrl } from './../../js/utils/urls.js';
import { processImage } from './../../js/imageProcessor/imageProcessor.js';

const cssUrl = new URL("./fc-image-picker.css", import.meta.url);

// Define a template once
const template = document.createElement("template");
template.innerHTML = `
  <link rel="stylesheet" href="${cssUrl}">
  <smart-dialog esc-close draggable resizable>
    <div slot="header">
        <div class="title">
          <span style="font-size: 1.2rem"><b>Image picker</b></span>
        </div>
      </div>        
      <div slot="body" class="body">
          <div class="container">
              <div class="container_row icon_button">
                <sl-input id="urlTextInput" class="focusable"  size="medium" placeholder="Urls or text to fetch..."></sl-input>
                <sl-button-group>
                  <sl-button id="addBtn" class="focusable" size="medium">➕</sl-button>
                  <sl-button id="fetchBtn" class="focusable" size="medium">🚀</sl-button>
                </sl-button-group>
              </div>
              <smart-dragdrop class="focusable" ></smart-dragdrop>
      
              <sl-button-group label="Alignment" class="smartDragdrop_buttons icon_button">              
                <sl-tooltip content="Add local photos"><sl-button class="focusable" size="medium" id="localPhotoBtn">📂</sl-button></sl-tooltip>
                <sl-tooltip content="Download to use offline"><sl-button class="focusable" size="medium" id="downloadBtn">🌍➜💾</sl-button></sl-tooltip>
                <sl-tooltip content="Delete"><sl-button class="focusable" size="medium" id="deleteBtn">🗑</sl-button></sl-tooltip>
                <sl-tooltip content="Extract links"><sl-button class="focusable" size="medium" id="extractLinksBtn">⛏️</sl-button></sl-tooltip>
                <sl-tooltip content="Pick to use in card view"><sl-button class="focusable" size="medium" id="useBtn">📌</sl-button></sl-tooltip>
              </sl-button-group>  
              </div>
              <input type="file" id="localPhotoInput" style="display:none" multiple accept="image/*"> 
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
`;// capture="environment" to use camera

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

  async init() { 
    this._smartDragDrop.setupColumns = {
    arr: [], 
     renderFields: {     
      // list: ["title"],  
      icon: ["url","title"],
      // detail:["title","url"] 
     },
    detailCols: { 
       "<400": "30px auto", ">400": "30px auto" 
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
          title: "🌍 Web + 💾",
          view: "icon",          // "list" | "detail" | "icon"
          listItemWidth: 120,    // 
          listItemHeight: 25,    // 
          rowGap: 5,            // 
          columnGap: 5,         // 
          //height:400,           // px column height
          rangeValue: 40// initial slider step
        },
        //  {
        //   id: "2",
        //   title: "🌍 Web + 💾",
        //   view: "icon",          // "list" | "detail" | "icon"
        //   listItemWidth: 120,    // 
        //   listItemHeight: 20,    // 
        //   rowGap: 5,            // 
        //   columnGap: 5,         // 
        //   height: 400,            // px column height
        //   rangeValue: 40// initial slider step
        // }
      ],
      viewOption: ["icon"] // "detail","list"
    };
  }

  async open(entry) {
    // console.log(`vao fc-image-picker open`);
    this._entry = await normalizeBlobItems(entry);
    this._smartDragDrop.data = {
      arr : this._entry.image.data,      
    }
        // this._imageArray = this._smartDragDrop.fullData;
    requestAnimationFrame(() => {   
      if (this._smart_dialog) { 
        this._smart_dialog.style.display = "block";    
        this._smartDragDrop.autoSetRangeValue();     
        this._smartDragDrop.setHighlight(); // set highlight and focus to 1st item in dragdrop
      } 
    });
  
  }
  
  get data() { return this._entry }

  connectedCallback() {
    const { signal } = this._abort;
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');
    this._container = this.shadowRoot.querySelector('.container');    
    this._smartDragDrop = this.shadowRoot.querySelector('smart-dragdrop');
    this._smartDragDrop.setAttribute('tabindex', '0');// make it focusable

    this._spinner = this.shadowRoot.querySelector('.spinner');

    this._urlTextInput =  this.shadowRoot.querySelector('#urlTextInput');
    this._addBtn =  this.shadowRoot.querySelector('#addBtn');
    this._fetchBtn =  this.shadowRoot.querySelector('#fetchBtn');

    this._deleteBtn = this.shadowRoot.querySelector('#deleteBtn');
    this._downloadBtn= this.shadowRoot.querySelector('#downloadBtn');
    this._extractLinksBtn= this.shadowRoot.querySelector('#extractLinksBtn');
    this._useBtn= this.shadowRoot.querySelector('#useBtn');
    this._localPhotoBtn = this.shadowRoot.querySelector('#localPhotoBtn');

    this._localPhotoInput = this.shadowRoot.querySelector('#localPhotoInput');

    this._addBtn.addEventListener('click', ()=>this._handleAdd(), { signal });
    this._fetchBtn.addEventListener('click', ()=>this._handleFetch(), { signal });
    this._smartDragDrop.addEventListener('smart-dragdrop-externalEventKeys-pressed',e =>this._handleKeydown(e), { signal });
    this._deleteBtn.addEventListener('click', ()=>this._handleDelete(), { signal });
    this._downloadBtn.addEventListener('click', ()=>this._handleDownload(), { signal });
    this._extractLinksBtn.addEventListener('click', ()=> this._handleExtractLinks(), { signal });
    this._useBtn.addEventListener('click', ()=>this._handleToggleUse(), { signal });    
    
    this.addEventListener('fc-image-picker-fetched',(e)=> this._onImageFetched(e), { signal });    

    this._localPhotoBtn.addEventListener("click", () => this._localPhotoInput.click(), { signal });
    this._localPhotoInput.addEventListener("change", () => this._handleGetLocalPhotos(), { signal });

    this._urlTextInput.addEventListener('paste', (e)=>this._handlePaste(e), {signal});
      
        // add EventListeners
    this._smart_dialog.addEventListener("smart-dialog-confirmed", () => this._confirmHandler(), { signal });
    this._smart_dialog.addEventListener("smart-dialog-canceled", () => this._cancelHandler(), { signal });
  }

  async _handleGetLocalPhotos() {
    const files = Array.from(this._localPhotoInput.files || []);
    if (files.length === 0) return;

    const newUrls = [];
    const metaList = [];

      // show loading Spinner for await
     this.showWorkingSpinner();

    // Process each file asynchronously
    for (const file of files) {
      const { blob, meta } = await processImage(file, {
        maxWidth: 1200,
        quality: 85,
        convert: true // or false depending on your needs
      });

      metaList.push(meta);
      // Create local object URL from processed blob
      newUrls.push(URL.createObjectURL(blob));
    }

    // Normalize and add to drag‑drop
    const items = normalizeUrlsDataFromServer(this._entry.phrase, newUrls);
    items.forEach(item => {
      this._smartDragDrop.addItem(item, "1", 0);
    });

    this._smartDragDrop.updateColumnData();
        // Show notification
    this.notifySuccess(`${items.length} item(s) have been newly added!`);
    // show loading Spinner for await
    this.hideWorkingSpinner();
    // Optional: log compression stats
    console.table(metaList);
  }

  async _handleFetch() {
    console.log(this._smartDragDrop.fullData);
    const query = this._urlTextInput.value;
    console.log(this._entry.defi?.length>0);
    const items = [{
      phrase: this._entry.phrase,
      query,
      defi: false,
      noLiveUrls: null,      
    }];
    //  console.log(items);
    this.dispatchEvent(
      new CustomEvent('fc-image-picker-fetch-requested', { 
        detail: { items, origin: this },
        bubbles: true,
        composed: true,
      }));  
  }

  async _handlePaste(e) {
    const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          // Get the blob from clipboard
          this.showWorkingSpinner();
          const newUrls = [];
          const file = item.getAsFile();
          const { blob, meta } = await processImage(file, {
            maxWidth: 1200,
            quality: 85,
            convert: true // or false depending on your needs
          });
             
          newUrls.push(URL.createObjectURL(blob));
          
          // Normalize and add to drag‑drop
          const items = normalizeUrlsDataFromServer(this._entry.phrase, newUrls);
          items.forEach(item => {
            this._smartDragDrop.addItem(item, "1", 0);
          });
          this._smartDragDrop.updateColumnData();
          // Show notification
          this.notifySuccess(`${items.length} item(s) have been newly added!`);         
          // show loading Spinner for await
          this.hideWorkingSpinner();
        }
      }
  }
  
  async _onImageFetched(e) {   
    const theTargetOject = e.detail.theTargetOject;
    // console.log(theTargetOject);
    let finalUrls = [];
    let fullLinksNode2 = [];
    if (Array.isArray(theTargetOject.node2gas)) {
      fullLinksNode2 = theTargetOject.node2gas.map(link=> reverseTransform(link));
      finalUrls = [...finalUrls,...fullLinksNode2];
    }
    if (Array.isArray(theTargetOject.node1)) finalUrls = [...finalUrls,...theTargetOject.node1];

    // console.log(finalUrls);
    await this.addUrlsToSmartDragDrop(this._entry.phrase, finalUrls, this._smartDragDrop);
    this._urlTextInput.value = "";
  }

  async _handleAdd() {
    const rawUrls = this._urlTextInput.value.split(',').map(s => s.trim()).filter(Boolean);
    await this.addUrlsToSmartDragDrop(this._entry.phrase, rawUrls, this._smartDragDrop);
    this._urlTextInput.value = "";
  }


  async addUrlsToSmartDragDrop(entryPhrase, rawUrls, smartDragDrop) {
    // Normalize and verify URLs
    const verifiedUrls = [];
    for (const raw of rawUrls) {
      const normalised = normalizeUrl(raw);
      const checkResult = await verifyUrl(normalised);
      if (checkResult.valid) {
        verifiedUrls.push(normalised);
      }
    }

    if (verifiedUrls.length === 0) {
      this.notifyWarning(`No new urls to add (duplicates skipped).`);
      return;
    }

    // Deduplicate: collect existing URLs from smartDragDrop
    const existingUrls = new Set(
      (smartDragDrop.fullData || []).map(item => item.url)
    );

    const newUrls = verifiedUrls.filter(u => !existingUrls.has(u));

    if (newUrls.length === 0) {
      this.notifyWarning(`No new urls to add (duplicates skipped).`);     
      return;
    }

    // Build items and add them
    const items = normalizeUrlsDataFromServer(entryPhrase, newUrls);
    items.forEach(item => {
      smartDragDrop.addItem(item, "1", 0);
    });
    smartDragDrop.updateColumnData();

    this.notifySuccess(`${items.length} item(s) have been newly added!`);  
  }


  async _handleExtractLinks() {
    const targetIDs = this.getRealTargetIDs();
    if (!targetIDs) return; // nothing to work on
    const results = targetIDs.map(id => { 
      const obj = this._smartDragDrop.fullData.find(obj => obj._id === id);
      if (!obj) return;
      if (obj.t==="web") { 
        return obj.url;
      } else return obj.url_blob;      
    });
    copyTextToClipboard(results.join(',\n'));
    this.notifySuccess(`${results.length} link(s) has been copied to clipboard!`);
  }

  _handleKeydown(e) {
    const key = e.detail;
    if (key==="Delete") this._handleDelete();
    if (key==="Enter") this._handleToggleUse();   
    if (key==="Escape") this._cancelHandler();
  }

  _handleSelectAll() {
    this._smartDragDrop.shadowRoot.querySelectorAll(".draggable").forEach(item => {
       item.classList.add("selected");
    });  
  
  }

  _handleToggleUse() {
    const targetIDs = this.getRealTargetIDs();
    if (!targetIDs) return; // nothing to work on

    const itemPatches = targetIDs.map(id => { 
      const obj = this._smartDragDrop.fullData.find(obj => obj._id === id);
      if (!obj) return;
      return  { _id: id, pick: obj.pick===true? false : true } 
    });
    // Combine update Data and UI
    this._smartDragDrop.updateItems(itemPatches);
    this.notifySuccess(`${targetIDs.length} item(s) has been updated`);    
  }


async _handleDownload() {
    const targetIDs = this.getRealTargetIDs();
    if (!targetIDs) return; // nothing to work on
    const cookedArray = [];
    targetIDs.forEach(id => {            
        const idx =  this._smartDragDrop.fullData.findIndex(i => i._id === id);
        if (idx === -1) return;
        const item =  this._smartDragDrop.fullData[idx];
        cookedArray.push(item);
    });
    // show loading Spinner for await
    this.showWorkingSpinner();

    const { success, failed } = await downloadAndSaveImages(this,this._entry.phraseID,this._entry.phrase, cookedArray);
    // console.log(success);

    // prepare patchedItems with blob-ready URL
    let totalSize = 0;
    const patchedItems = await Promise.all(success.map(async item=> { 
        totalSize = totalSize + item.meta.processed.size;
        return { ...item, t:"blob", url_blob: await getImageUrl(this._entry.phraseID,item.id)} 
      })
    );

    this._smartDragDrop.updateItems(patchedItems);   
    this.hideWorkingSpinner();
    
    if (success.length>0) 
      this.notifySuccess(`${success.length} item(s) (${(totalSize/1024/1024).toFixed(2)}MB) has been downloaded!`);

    if (failed.length>0) 
      this.notifyWarning(`${failed.length} items cannot be downloaded!`);
  }

  showWorkingSpinner() {
    this._spinner.style.display = "block";
  }

  hideWorkingSpinner() {
    this._spinner.style.display = "none";
  }

  getRealTargetIDs() {
    const highlightID = this._smartDragDrop.getHighlight();    
    const objectSelectedIDs = this._smartDragDrop.getSelectedItems();
    const selectedIDs = Object.values(objectSelectedIDs).flat();
    if (!highlightID&&selectedIDs.length<=0) return;
    let targetIDs = [];
    if (selectedIDs.length>0) { 
      targetIDs = [...selectedIDs];
    } else targetIDs = [highlightID];
    return targetIDs;
  }

  async _handleDelete() {   
    const targetIDs = this.getRealTargetIDs();
    if (!targetIDs) return; // nothing to work on
    const confirmed = await confirmDialog.show("⛔ Confirmation",`Delete ${targetIDs.length} ${targetIDs.length>1? "items" : "item"}?`);
    if (!confirmed) return;
    // proceed with deletion    
    const blobArray= [];
    targetIDs.forEach(id => {            
        const idx = this._smartDragDrop.fullData.findIndex(i => i._id === id);
        if (idx === -1) return;
        const item = this._smartDragDrop.fullData[idx];
        blobArray.push(item.id);
    });

    // Remove Blob data    
    const result = await removeImageBlobEntry(this._entry.phraseID,blobArray);

     // Combine remove javascript Data and UI
    this._smartDragDrop.removeItems(targetIDs);     
    this.notifySuccess(`${targetIDs.length} item(s) has been deleted`);    
    // sync data with this component
    // this._imageArray = this._smartDragDrop.fullData;        
  }

  disconnectedCallback() {
    this._abort.abort();   
  }
  
  exportImageData() {
    // console.log(this._smartDragDrop.fullData);
    // console.log(this._smartDragDrop.columnData);
    const exportArray = Object.values(this._smartDragDrop.columnData).flat().map(item => { //this._imageArray
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
  
  _confirmHandler() {   
    this._entry.updateAt = new Date().toISOString();
    this._entry.image.data = this.exportImageData();
    this.dispatchEvent(
      new CustomEvent('fc-image-picker-confirmed', { 
        detail: { entry: this._entry }, 
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
    // this.remove();    
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent('fc-image-picker-cancelled', {        
        bubbles: false,
        composed: true,
      }));   
    this._smart_dialog.style.display = "none";
    // this.remove();
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
}

customElements.define('fc-image-picker', FCImagePicker);

