import { initSelectionLogic, initDragLogic, saveHistory } from './smart-dragdrop-core.js';
import { normalizeOrders, applyLayout, applyColumnView,
         _addItem, _removeItems, _moveItems,
         _insertElement, _removeElements, _moveElements, 
        _computeGridTemplate,
        _getSelectedItems, _getHighlight, _setHighlight,
        _updateItems, 
        _convertFullDataToColumnData } from './smart-dragdrop-helpers.js';
import { getMatrix, _handleKeydown } from './smart-dragdrop-navigation.js';
import './../smart-toggle.js';
import './../smart-button-group.js';

const cssUrl = new URL("./smart-dragdrop.css", import.meta.url);


class SmartDragdrop extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.fullData = [];
    this.selected = [];
    this.available = [];
    this.lastSelectedIndex = null;
    this.historyStack = [];
    this.historyIndex = -1;    

    this._abort = new AbortController();
    this.columns = [];
    this.columnData = {}; // keyed by column id
  }

  disconnectedCallback() {
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
    this.shadowRoot.replaceChildren();
  }

  static get observedAttributes() {
    return ["layout"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "layout") {
      applyLayout(this.component_container, newValue);
    }
  }

  connectedCallback() {
    window.addEventListener("resize", () => {
      if (this.getAttribute("layout") === "auto") {
        applyLayout(this.component_container, "auto");     

        this.columns.forEach(config => {
          const container = this.shadowRoot.getElementById(`${config.id}-container`);
          this._applyDetailGridColumns(container, this._detailCols);   
        });
      }    
    }, { signal: this._abort.signal });
  }
  
  set setupColumns({ idKey ="_id", arr = [], renderFields, detailCols, renderItem, columns = [], viewOption }) {
    this.renderItem = renderItem || this._defaultRenderer;
    this._renderFields = renderFields;
    this._detailCols = detailCols;
    this._idKey = idKey;
    this._viewOption = viewOption? viewOption : ["list","dedail","icon"];
    // Normalize items with zone + order
    this.fullData = normalizeOrders(arr, columns);
    // console.log(this.fullData);
    this.columns = columns;
    // Initialize columnData: group items by zone and sort by order
    this.columnData = {};

    _convertFullDataToColumnData(this); // prepare each column data

    // console.log(this.columns);
    saveHistory(this);

    this._renderInit();
    this._renderChange();

    this._highlightIndex = 0;

    const layout = this.getAttribute("layout") || "auto";
    applyLayout(this.component_container, layout);
    initDragLogic(this, this.shadowRoot.getElementById("component-container"), this._abort.signal);
    initSelectionLogic(this, this._abort.signal);
    this._bindSelectModeControls();
    this._bindViewControls();
  }


  set data({ arr }) {   
    this.fullData = normalizeOrders(arr, this.columns);
    this.columnData = {};
    _convertFullDataToColumnData(this); // prepare each column data
    saveHistory(this);
    this._renderChange();
    this._highlightIndex = 0;
  }

  // -------------------------------
  // Public item-related handlers
  // -------------------------------

  addItem(item, zoneId, atOrder) {
    console.log(item, zoneId, atOrder);
    const newItem = _addItem(this, item, zoneId, atOrder);
    console.log(newItem);
    _insertElement(this, newItem);
    return newItem;
  }

  updateColumnData() {
    _convertFullDataToColumnData(this);
  }

  removeItems(itemIds) {
    //1. remove Data
    const removed = _removeItems(this, itemIds); // remove Data
    //2. remove Elements using those IDs
    _removeElements(this, removed);

    _convertFullDataToColumnData(this);
    return removed;
  }

  getSelectedItems() {
    return _getSelectedItems(this);
  }

  getHighlight() {
    return _getHighlight(this);
  }

  setHighlight(itemId) {
    _setHighlight(this,itemId);
  }

  updateItems(itemPatches) { // { id, patchData }
    return _updateItems(this, itemPatches);
  }

  moveItems(itemIds, newZoneId, startOrder) {
    const moved = _moveItems(this, itemIds, newZoneId, startOrder);
    _moveElements(this, moved);
    return moved;
  }

  // -------------------------------

  _defaultRenderer(item, zone) {
    return `<div class="draggable" draggable="true" data-zone="${zone}" data-id="${item._id}">
      ${item.text || item.label || item.name || 'Unnamed'}
    </div>`;
  }

  _createColumn(config) {
    const { id, title, view, defaultIconSize, height } = config;
    return `
      <div class="column-wrapper" style="max-height:${height || 'auto'}px">
        <div class="header">
          <span>${title}</span>
          <sl-range min="10" max="125" step="1" tooltip="bottom"></sl-range>
          <div class="header_right">
            <div id="selectionMode" class="mode-toggle" data-mode="0">
              <sl-icon></sl-icon>
            </div>
            <sl-dropdown size="small">
              <sl-icon-button slot="trigger" name="grid-3x3-gap"></sl-icon-button>
              <sl-menu>
                ${this._viewOption.includes("list")? `<sl-menu-item>List</sl-menu-item>` : ""}
                ${this._viewOption.includes("detail")? `<sl-menu-item>Detail</sl-menu-item>` : ""}
                ${this._viewOption.includes("icon")? `<sl-menu-item>Icon</sl-menu-item>` : ""}
              </sl-menu>
            </sl-dropdown>
          </div>
        </div>
        <div id="${id}-container" class="container ${id}-container"
             data-view="${view}" 
             style="--icon-size:${defaultIconSize || 120}px"></div>
      </div>`;
  }

  _renderInit() {
    const template = document.createElement("template");
    template.innerHTML = `
      <link rel="stylesheet" href="${cssUrl}">
      <div id="component-container">
        ${this.columns.map(col => this._createColumn(col)).join("")}
        <div id="lasso"></div>
      </div>`;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.component_container = this.shadowRoot.getElementById("component-container");
    this.component_container.addEventListener('keydown', e => this.handleKeydown(e),  { signal: this._abort.signal });
    this.component_container.setAttribute('tabindex', '0');
  }

  handleKeydown(e) {
    e.stopPropagation();
    // console.log(e);
    _handleKeydown(this,e);
  }

  _renderChange() {
    this.columns.forEach(config => {
      const container = this.shadowRoot.getElementById(`${config.id}-container`);
      if (container) {
        const items = this.columnData[config.id] || [];
        container.innerHTML = items.map(item => this.renderItem(item, config.id, config.view)).join("");
      }
    });

    // Attach lazy loading after batch render
    const imgs = this.shadowRoot.querySelectorAll("img[data-src]");
    imgs.forEach(img => this._enableLazyLoading(img));
  }

  _enableLazyLoading(imgEl) {
    const url = imgEl.getAttribute("data-src");
    // Find closest draggable parent
    const parent = imgEl.closest(".draggable");    
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => {
            // imgEl.src = ""; // fallback
            parent.querySelector('.spinner')?.remove();
            imgEl.replaceWith(document.createTextNode(`❌ Loading too long ${imgEl.dataset.src}`));
            // this._markBroken(itemId, zone);
            observer.unobserve(imgEl);
          }, 5000); // 5s timeout

          imgEl.onload = () => {
            clearTimeout(timer);
            parent.querySelector('.spinner')?.remove();
            // this._markAlive(itemId, zone);
            observer.unobserve(imgEl);
          };
          imgEl.onerror = () => {
            clearTimeout(timer);
            parent.querySelector('.spinner')?.remove();            
            imgEl.replaceWith(document.createTextNode(`❌ Broken ${imgEl.dataset.src}`));
            // this._markBroken(itemId, zone);
            observer.unobserve(imgEl);
          };

          imgEl.src = url; // start loading
          const spinnerDiv = document.createElement('div');
          spinnerDiv.classList.add('spinner');
          spinnerDiv.innerHTML = "<sl-spinner></sl-spinner>";
          parent.appendChild(spinnerDiv);
        }
      });
    });

    observer.observe(imgEl);
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
        this.shadowRoot.getElementById("component-container").style.visibility = "visible";
      };
    }
  }

  _calculateDetailGridColumn(dataset,container, viewMode, renderFields) {
    // Compute grid-template-columns
    const fields = renderFields[viewMode]; // e.g. ["img","title","id"]
    const gridCols = _computeGridTemplate(dataset, fields,container);
    console.log(gridCols);
    container.style.setProperty("--grid-cols", gridCols);
    //container.style.setProperty("--grid-cols", "100px 60px auto");
  }

  _applyDetailGridColumns(container, detailCols) {
  const width = container.getBoundingClientRect().width;
  let gridCols;

  // Iterate through conditions
  for (const cond in detailCols) {
    if (cond.startsWith("<")) {
      const max = parseInt(cond.slice(1), 10);
      if (width < max) {
        gridCols = detailCols[cond];
        break;
      }
    } else if (cond.startsWith(">")) {
      const min = parseInt(cond.slice(1), 10);
      if (width > min) {
        gridCols = detailCols[cond];
        break;
      }
    }
  }

  // fallback: largest rule
  if (!gridCols) {
    gridCols = detailCols[Object.keys(detailCols).pop()];
  }

  container.style.setProperty("--grid-cols", gridCols);
}


  _bindViewControls() {
    this.columns.forEach((config) => {
      const container = this.shadowRoot.getElementById(`${config.id}-container`);
      const range = container.parentElement.querySelector("sl-range");
      const triggerIcon = container.parentElement.querySelector("sl-icon-button[slot='trigger']");
      const menuItems = container.parentElement.querySelectorAll("sl-menu-item");

      // bind View layout
      menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
          config.view = item.textContent.toLowerCase();
          
          applyColumnView(container, config, triggerIcon, range);
          this._renderChange();
          if (config.view==="detail") this._applyDetailGridColumns(container, this._detailCols);       
          requestAnimationFrame(()=>{
            this._matrix = getMatrix(container,config);
            container.focus();       // refocus to container
          });
          
        }, { signal: this._abort.signal });
      });

  
       // bind Range logic
      if (range) {
        range.style.display = "none";
        range.tooltipFormatter = value => {
          const size = 50 + value * 2;
          return `${size} x ${size}`;
        };

        if (typeof config.rangeValue === "number") {
          range.value = config.rangeValue;
          container.style.setProperty("--icon-size", `${50 + config.rangeValue * 2}px`);
        }

        range.addEventListener("input", e => {
          const step = e.target.value;
          const size = 50 + step * 2;
          config.rangeValue = step;
          container.style.setProperty("--icon-size", `${size}px`);
          requestAnimationFrame(()=>{
             this._matrix  = getMatrix(container,config);
            container.focus();       // refocus to container 
          });      

        }, { signal: this._abort.signal });
      }
      // initial calculating Matrix
      requestAnimationFrame(()=>{
        this._matrix  = getMatrix(container,config);
        // console.log( this._matrix );
        container.focus();       // refocus to container 
      });
      applyColumnView(container, config, triggerIcon, range);
    });
  }

_bindSelectModeControls() {
  this.columns.forEach(config => {
    const container = this.shadowRoot.getElementById(`${config.id}-container`);
    this._applyDetailGridColumns(container, this._detailCols);
    const toggle = container.parentElement.querySelector(".mode-toggle");
    if (!toggle) return;

    // initialize from config if present
    if (typeof config.selectionMode === "number") {
      toggle.setAttribute("data-mode", config.selectionMode);
    } else {
      config.selectionMode = 0;
      toggle.setAttribute("data-mode", 0);
    }

    toggle.addEventListener("click", () => {
      // cycle 0 → 1 → 2 → 0
      config.selectionMode = (config.selectionMode + 1) % 3;
      this.lastSelectedIndex = null; // reset range start
      toggle.setAttribute("data-mode", config.selectionMode);

      const icon = toggle.querySelector("sl-icon");
      if (icon) {
        icon.name = config.selectionMode === 1 ? "check2" :
                    config.selectionMode === 2 ? "arrows" : "";
      }
    }, { signal: this._abort.signal });
  });
}

}

customElements.define('smart-dragdrop', SmartDragdrop);
