// start-dragdrop.js
import { initSelectionLogic, initDragLogic, saveHistory } from './smart-dragdrop-core.js';
import '../../smart/smart-toggle.js';
import '../../smart/smart-button-group.js';

class SmartDragdrop extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // State
    this.fullData = [];
    this.selected = [];
    this.available = [];
    this.lastSelectedIndex = null;
    this.historyStack = [];
    this.historyIndex = -1;

    // AbortController for cleanup
    this._abort = new AbortController();
  }

  connectedCallback() {
    // You can add any lifecycle setup here if needed
  }

  disconnectedCallback() {
    // Abort all listeners bound with { signal }
    this._abort.abort();
    this.shadowRoot.replaceChildren();
  }

  set data({ arr, defaultItems = [], renderItem }) {
    this.renderItem = renderItem || this._defaultRenderer;
    this.fullData = arr.map((def, i) => ({ ...def, _id: def._id || `def-${i}` }));

    this._defaultSelection(defaultItems);
    saveHistory(this);

    this._renderInit();
    this._renderChange();
    this._loadExternalStyleSheet_thenTurnOnContent();

    // Pass signal to core logic so listeners are bound with { signal }
    initDragLogic(this, this._columns, this._abort.signal);
    initSelectionLogic(this, this._abort.signal);
  }

  _defaultSelection(defaultItems) {
  const mode = this.getAttribute('mode') || 'dual';

  if (mode === 'single') {
    // In single mode, show all items
    this.selected = [...this.fullData];
    this.available = [];
  } else {
    if (!defaultItems.length) {
      const count = Math.min(2, this.fullData.length);
      this.selected = this.fullData.slice(0, count);
      this.available = this.fullData.slice(count);
    } else {
      this.selected = defaultItems.map(pos => this.fullData[pos]);
      this.available = this.fullData.filter(item => !this.selected.includes(item));
    }
  }
  saveHistory(this);
}


  _defaultRenderer(item, zone) {
    return `<div class="draggable" data-zone="${zone}" data-id="${item._id}">
      ${item.text || item.label || item.name || 'Unnamed'}
    </div>`;
  }

  _renderInit() {
    const mode = this.getAttribute('mode') || 'dual';
    const template = document.createElement("template");

    if (mode === 'dual') {
      template.innerHTML = `
        <div id="component-container">
          <div class="columns">
            <div class="column">
              <div class="header">
                <span id="selectedColumnTitle">selected</span>             
              </div>
              <div id="selected-container" class="container selected-container"></div>
            </div>
            <div class="column">
              <div class="header">
                <span id="availableColumnTitle">available</span>              
              </div>
              <div id="available-container" class="container available-container"></div>
            </div>
          </div>
         
          <div id="lasso"></div>
        </div>`;
    } else {
      template.innerHTML = `
        <div id="component-container">
          <div class="single-container">
            <div class="header">
              <span id="singleColumnTitle">items</span>            
            </div>
            <div id="single-container" class="container single-container"></div>
          </div>        
          <div id="lasso"></div>
        </div>`;
    }

    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._assignElements();
   }

  _assignElements() {
    this._component_content = this.shadowRoot.getElementById("component-container");
    this._columns = this.shadowRoot.querySelector(".columns") || this.shadowRoot.querySelector(".single-container");
    this._selected_container = this.shadowRoot.getElementById("selected-container");
    this._available_container = this.shadowRoot.getElementById("available-container");
    this._single_container = this.shadowRoot.getElementById("single-container");
  }

  _renderChange() {
    if (this._selected_container) {
      this._selected_container.innerHTML = this.selected.map(item => this.renderItem(item, "selected")).join("");
    }
    if (this._available_container) {
      this._available_container.innerHTML = this.available.map(item => this.renderItem(item, "available")).join("");
    }
    if (this._single_container) {
      this._single_container.innerHTML = this.selected.map(item => this.renderItem(item, "single")).join("");
    }
  }

  _loadExternalStyleSheet_thenTurnOnContent() {
    const styleLink = document.createElement("link");
    const path = `./smart-dragdrop.css`;
    styleLink.setAttribute("rel", "stylesheet");
    styleLink.setAttribute("href", path);
    styleLink.setAttribute("type", "text/css");
    if (!this.shadowRoot.querySelector(`link[href="${path}"]`)) {
      this.shadowRoot.appendChild(styleLink);
      styleLink.onload = () => {
        this._component_content.style.visibility = "visible";
      };
    }
  }
}

customElements.define('smart-dragdrop', SmartDragdrop);
