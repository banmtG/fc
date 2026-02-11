const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
    }

    sl-dropdown,
    sl-input {
      width: 100%;
    }

    /* Flush panel, themed look, full width */
    sl-dropdown::part(panel) {
      min-width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--sl-color-neutral-200);
      border-radius: var(--sl-border-radius-medium);
      background: var(--sl-color-neutral-0);
      box-shadow: var(--sl-shadow-medium);
      max-height: 240px;
      overflow: auto;
      padding: 0;
    }

    .item {
      padding: var(--sl-spacing-small) var(--sl-spacing-medium);
      cursor: pointer;
      font-size: var(--sl-font-size-medium);
      color: var(--sl-color-neutral-800);
    }

    .item:hover,
    .item[aria-selected="true"] {
      background: var(--sl-color-primary-50);
      color: var(--sl-color-primary-700);
    }

    .empty {
      color: var(--sl-color-neutral-500);
      padding: var(--sl-spacing-small);
      font-style: italic;
    }

    sl-input::part(base) {
      font-size:16px;
    }
  </style>

  <sl-dropdown id="dropdown" placement="bottom-start" distance="0" hoist>
    <sl-input id="input" clearable slot="trigger"></sl-input>
    <div id="listbox" role="listbox"></div>
  </sl-dropdown>
`;

class TypeaheadInput extends HTMLElement {
  static get observedAttributes() {
    return ["placeholder", "size", "value", "min-chars"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // State
    this._query = "";
    this._suggestions = [];
    this._localData = [];
    this._fetcher = null;
    this._highlightIndex = -1;
    this._minChars = 1;

    // Async control to prevent races/leaks
    this._abortController = null;

    // Elements
    this.$input = this.shadowRoot.querySelector("#input");
    this.$dropdown = this.shadowRoot.querySelector("#dropdown");
    this.$list = this.shadowRoot.querySelector("#listbox");

    // Bindings
    this._onInput = this._onInput.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onListClick = this._onListClick.bind(this);
    this._onResize = this._onResize.bind(this);

    // Resize observer to sync panel width robustly
    this._resizeObserver = new ResizeObserver(this._onResize);
  }

// --- Value loaded ---
connectedCallback() {
  this.$input.addEventListener("sl-input", this._onInput);
  this.$input.addEventListener("keydown", this._onKeyDown);
  this.$list.addEventListener("pointerdown", this._onListClick);
  this._resizeObserver.observe(this.$input);

  // If a value attribute was set before connect, emit value-loaded
  if (this.hasAttribute("value")) {
    this._emit("value-loaded", { value: this.getAttribute("value") , method: 'attribute' });
  }
}

  disconnectedCallback() {
    this.$input.removeEventListener("sl-input", this._onInput);
    this.$input.removeEventListener("keydown", this._onKeyDown);
    this.$list.removeEventListener("pointerdown", this._onListClick);
    this._resizeObserver.disconnect();
    this._cancelPending();
  }

  attributeChangedCallback(name, _old, value) {
    if (name === "placeholder") this.$input.placeholder = value ?? "";
    if (name === "size") this.$input.size = value; // small | medium | large
    if (name === "value") this.setValue(value);
    if (name === "min-chars") this._minChars = Number(value) || 1;
  }

  // Public API
  setData(arrayOfStrings = []) {
    this._localData = Array.isArray(arrayOfStrings) ? arrayOfStrings : [];
    this._emit("options-loaded", { value: this._localData , method: `setData` });
  }

  setFetcher(asyncFn) {
    this._fetcher = typeof asyncFn === "function" ? asyncFn : null;
  }

  get value() {
    return this._query;
  }

  // Cancel any in-flight fetcher calls
  _cancelPending() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  async _runQuery(query) {
    // Local first
    let suggestions = this._localData
      .filter(s => s.toLowerCase().includes(query.toLowerCase().trim()))
      .map(s => ({ label: s, value: s }));

    // Optional remote, cancel previous and guard against races
    if (this._fetcher) {
      this._cancelPending();
      this._abortController = new AbortController();
      try {
        const res = await this._fetcher(query, { signal: this._abortController.signal });
        suggestions = Array.isArray(res)
          ? res.map(it => (typeof it === "string" ? { label: it, value: it } : it))
          : [];
      } catch (err) {
        // Ignore abort errors; fallback to local suggestions
        if (err && err.name !== "AbortError") suggestions = [];
      } finally {
        this._abortController = null;
      }
    }

    this._suggestions = suggestions;
    if (suggestions.length) {
      this._renderList(suggestions);
      this._openPanel();
    } else {
      this._renderEmpty();
      this._openPanel();
    }
    this._highlight(-1);
  }

  // Rendering
  _renderList(items) {
    // Single listener via delegation; no per-item listeners
    this.$list.innerHTML = items
      .map(
        (item, idx) =>
          `<div class="item" role="option" data-idx="${idx}">${item.label}</div>`
      )
      .join("");
  }

  _renderEmpty() {
    this.$list.innerHTML = `<div class="empty">No suggestion</div>`;
  }

  // Dropdown control
  _openPanel() {
    this.$dropdown.show();
    // Panel sizing handled by ResizeObserver
  }

  _closePanel() {
    this.$dropdown.hide();
  }

  // Resize -> sync panel width precisely to input
  _onResize() {
    const panel = this.$dropdown.shadowRoot?.querySelector('[part="panel"]');
    if (!panel) return;
    const rect = this.$input.getBoundingClientRect();
    panel.style.width = rect.width + "px";
  }

  // Keyboard navigation
  _highlight(index) {
    const items = Array.from(this.$list.querySelectorAll(".item"));
    items.forEach(el => el.setAttribute("aria-selected", "false"));
    this._highlightIndex = index;
    if (index >= 0 && items[index]) {
      items[index].setAttribute("aria-selected", "true");
      items[index].scrollIntoView({ block: "nearest" });
    }
  }

 _onKeyDown(e) {
  const items = Array.from(this.$list.querySelectorAll(".item"));

  if (e.key === " ") {
    const inputEl = this.$input.input; // native <input> inside <sl-input>
    if (inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      const value = inputEl.value;

      // Insert a space at the cursor
      inputEl.value = value.slice(0, start) + " " + value.slice(end);

      // Move cursor forward by one
      inputEl.selectionStart = inputEl.selectionEnd = start + 1;

      // Sync your internal query
      this._query = inputEl.value;
      this._emit("query-changed", { query: this._query, method: "input" });
    }

    e.preventDefault();
    return;
  }

  if (e.key === "ArrowDown" && items.length) {
    e.preventDefault();
    this._highlight(Math.min(this._highlightIndex + 1, items.length - 1));
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault();
    this._highlight(Math.max(this._highlightIndex - 1, 0));
  } else if (e.key === "Enter" && items.length && this._highlightIndex >= 0) {
    // console.log(items);
    // console.log(this._highlightIndex);
    // console.log(items[this._highlightIndex]);
    e.preventDefault();
    // this._select(items[this._highlightIndex]);

    const item = this._suggestions[this._highlightIndex];
    if (item) this._select(item);
  } else if (e.key === "Escape") {
    e.preventDefault();
    this._closePanel();
  }
}


  // Click selection via delegation
  _onListClick(e) {
    console.log(e.target);
    const target = e.target.closest(".item");
    if (!target) return;
    const idx = Number(target.dataset.idx);
    console.log(idx);
    const item = this._suggestions[idx];
    if (item) this._select(item);
  }

  _select(item) {
    console.log(item);
    this.setValue(item.value);
    this._closePanel();
    this.dispatchEvent(new CustomEvent("suggestion-selected", { detail: item }));
  }

  // Inside your class

// Utility to emit events
_emit(type, detail) {
  this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

// --- Query changed ---
_onInput(e) {
  this._query = e.target.value;
  this._emit("query-changed", { query: this._query,  method: "input" });

  if (this._query.length < this._minChars) {
    this._closePanel();
    return;
  }
  this._runQuery(this._query);
}

// Also emit when setValue is called programmatically
setValue(value) {
  this._query = value ?? "";
  this.$input.value = this._query;
  this._emit("query-changed", { query: this._query , method: 'setValue' });
}

}

customElements.define("typeahead-input", TypeaheadInput);
