import { initSelectionLogic, initDragLogic, saveHistory } from './smart-dragdrop-core.js';
import { normalizeOrders, applyLayout, applyColumnView,
         _addItem, _removeItems, _moveItems,
         _insertElement, _removeElements, _moveElements } from './smart-dragdrop-helpers.js';
import './../smart-toggle.js';
import './../smart-button-group.js';

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
      }
    }, { signal: this._abort.signal });
  }

  set data({ idKey ="_id", arr, renderItem, columns = [] }) {
    this.renderItem = renderItem || this._defaultRenderer;

    this._idKey = idKey;
    console.log(this._idKey);
    // Normalize items with zone + order
    this.fullData = normalizeOrders(arr, columns);
    this.columns = columns;

    // Initialize columnData: group items by zone and sort by order
    this.columnData = {};
    this.columns.forEach(config => {
      this.columnData[config.id] = this.fullData
        .filter(item => item.zone === config.id)
        .sort((a, b) => a.order - b.order);
    });

    saveHistory(this);

    this._renderInit();
    this._renderChange();
    this._loadExternalStyleSheet_thenTurnOnContent();

    const layout = this.getAttribute("layout") || "auto";
    applyLayout(this.component_container, layout);

    initDragLogic(this, this.shadowRoot.getElementById("component-container"), this._abort.signal);
    initSelectionLogic(this, this._abort.signal);

    this._bindViewControls();
  }

  // -------------------------------
  // Public item-related handlers
  // -------------------------------

  addItem(item, zoneId, atOrder) {
    const newItem = _addItem(this, item, zoneId, atOrder);
    _insertElement(this, newItem);
    return newItem;
  }

  removeItems(itemIds) {
    const removed = _removeItems(this, itemIds);
    _removeElements(this, removed);
    return removed;
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
          <sl-range min="0" max="100" step="1" tooltip="bottom"></sl-range>
          <sl-dropdown>
            <sl-icon-button slot="trigger" name="grid-3x3-gap"></sl-icon-button>
            <sl-menu>
              <sl-menu-item>List</sl-menu-item>
              <sl-menu-item>Detail</sl-menu-item>
              <sl-menu-item>Icon</sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        </div>
        <div id="${id}-container" class="container ${id}-container"
             data-view="${view}" 
             style="--icon-size:${defaultIconSize || 120}px"></div>
      </div>`;
  }

  _renderInit() {
    const template = document.createElement("template");
    template.innerHTML = `
      <div id="component-container">
        ${this.columns.map(col => this._createColumn(col)).join("")}
        <div id="lasso"></div>
      </div>`;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.component_container = this.shadowRoot.getElementById("component-container");
  }

  _renderChange() {
    this.columns.forEach(config => {
      const container = this.shadowRoot.getElementById(`${config.id}-container`);
      if (container) {
        const items = this.columnData[config.id] || [];
        container.innerHTML = items.map(item => this.renderItem(item, config.id)).join("");
      }
    });
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

  _bindViewControls() {
    this.columns.forEach(config => {
      const container = this.shadowRoot.getElementById(`${config.id}-container`);
      const range = container.parentElement.querySelector("sl-range");
      const triggerIcon = container.parentElement.querySelector("sl-icon-button[slot='trigger']");
      const menuItems = container.parentElement.querySelectorAll("sl-menu-item");

      menuItems.forEach(item => {
        item.addEventListener("click", () => {
          config.view = item.textContent.toLowerCase();
          applyColumnView(container, config, triggerIcon, range);
        }, { signal: this._abort.signal });
      });

      if (range) {
        range.style.display = "none";
        range.tooltipFormatter = value => {
          const size = 50 + value * 2;
          return `${size} x ${size}`;
        };

        if (typeof config.rangeValue === "number") {
          range.value = config.rangeValue;
          container.style.setProperty("--icon-size", `${50 + config.rangeValue * 20}px`);
        }

        range.addEventListener("input", e => {
          const step = e.target.value;
          const size = 50 + step * 2;
          config.rangeValue = step;
          container.style.setProperty("--icon-size", `${size}px`);
        }, { signal: this._abort.signal });
      }

      applyColumnView(container, config, triggerIcon, range);
    });
  }
}

customElements.define('smart-dragdrop', SmartDragdrop);
