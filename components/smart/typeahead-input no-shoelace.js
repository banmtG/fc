// components/typeahead-input.js
class TypeaheadInput extends HTMLElement {
  static get observedAttributes() {
    return ["placeholder", "min-chars", "limit","size"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // State
    this._query = "";
    this._open = false;
    this._highlightIndex = -1;
    this._suggestions = [];
    this._localData = [];            // array of strings
    this._fetcher = null;            // async (query) => string[] or [{label, value}]
    this._debounceMs = 200;
    this._lastRequestId = 0;

    // Config
    this._minChars = 1;
    this._limit = 8;

    this.shadowRoot.innerHTML = `
      <style>
:host {
  display: block;
  width: 100%;
}

.wrapper {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: relative;         /* anchor for absolute panel */
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: var(--sl-spacing-small) var(--sl-spacing-large);
  border: 1px solid var(--sl-color-neutral-300);
  border-radius: var(--sl-border-radius-medium);
  background: var(--sl-color-neutral-0);
  font-family: var(--sl-font-sans);
  font-size: var(--sl-font-size-medium);
  color: var(--sl-color-neutral-900);
}

/* Overlay panel aligned to wrapper edges */
.panel {
  position: absolute;
  left: 0;
  right: 0;                   /* ensures same width as input */
  top: calc(100% + var(--sl-spacing-x-small)); /* below input, with gap */
  border: 1px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background: var(--sl-color-neutral-0);
  box-shadow: var(--sl-shadow-medium);
  max-height: 240px;
  overflow: auto;
  z-index: 100;
}



.input:focus {
  border-color: var(--sl-color-primary-600);
  box-shadow: 0 0 0 3px var(--sl-color-primary-100);
  outline: none;
}

/* Size variants */
:host([size="small"]) .input {
  font-size: var(--sl-font-size-small);
  padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
  line-height: var(--sl-line-height-small);

}

:host([size="medium"]) .input {
  font-size: var(--sl-font-size-medium);
  padding: var(--sl-spacing-medium) var(--sl-spacing-medium);
  line-height: var(--sl-line-height-medium);

}

:host([size="large"]) .input {
  font-size: var(--sl-font-size-large);
  padding: var(--sl-spacing-large) var(--sl-spacing-x-large);
  line-height: var(--sl-line-height-large);
}





.item {
  padding: var(--sl-spacing-small) var(--sl-spacing-medium);
  cursor: pointer;
  font-size: inherit;
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

        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      </style>
      <div role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="listbox" aria-controls="listbox">
        <div class="wrapper"> 
          <input class="input" type="text" aria-autocomplete="list" aria-controls="listbox" />
            <div class="panel" id="panel" hidden>
              <div role="listbox" id="listbox"></div>
            </div>
          </div>
          <span class="sr-only" id="status" aria-live="polite"></span>
      </div>
    `;

    this.$input = this.shadowRoot.querySelector(".input");
    this.$panel = this.shadowRoot.querySelector("#panel");
    this.$list = this.shadowRoot.querySelector("#listbox");
    this.$combo = this.shadowRoot.querySelector("[role=combobox]");
    this.$status = this.shadowRoot.querySelector("#status");

    // Bind handlers
    this._onInput = this._onInput.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onItemClick = this._onItemClick.bind(this);
    this._debouncedQuery = this._debounce(this._runQuery.bind(this), this._debounceMs);
  }

  

  connectedCallback() {
    // Defaults
    if (!this.hasAttribute("placeholder")) this.setAttribute("placeholder", "Search…");
    this.$input.placeholder = this.getAttribute("placeholder") || "Search…";
    this._minChars = Number(this.getAttribute("min-chars") || this._minChars);
    this._limit = Number(this.getAttribute("limit") || this._limit);

    // Events
    this.$input.addEventListener("input", this._onInput);
    this.$input.addEventListener("keydown", this._onKeyDown);
    this.$input.addEventListener("blur", this._onBlur);
    this.$input.addEventListener("focus", this._onFocus);
  }

  disconnectedCallback() {
    this.$input.removeEventListener("input", this._onInput);
    this.$input.removeEventListener("keydown", this._onKeyDown);
    this.$input.removeEventListener("blur", this._onBlur);
    this.$input.removeEventListener("focus", this._onFocus);
  }

    attributeChangedCallback(name, _old, value) {
    if (name === "placeholder") this.$input.placeholder = value;
    if (name === "min-chars") this._minChars = Number(value || 1);
    if (name === "limit") this._limit = Number(value || 8);
    if (name === "size") {
        // Default to medium if not set
        if (!["small", "medium", "large"].includes(value)) {
        this.setAttribute("size", "small");
        }
    }
    }

  // Public API
  setData(arrayOfStrings = []) {
    this._localData = Array.isArray(arrayOfStrings) ? arrayOfStrings : [];
  }

  setFetcher(asyncFn) {
    // async (query) => string[] or [{label, value}]
    this._fetcher = typeof asyncFn === "function" ? asyncFn : null;
  }

  setValue(value) {
    this._query = value ?? "";
    this.$input.value = this._query;
  }

  get value() {
    return this._query;
  }

  focus() {
    this.$input.focus();
  }

  // Internal: input handlers
  _onInput(e) {
    this._query = e.target.value;
    this._emit("query-changed", { query: this._query });
    if (this._query.length < this._minChars) {
      this._close();
      return;
    }
    this._debouncedQuery(this._query);
  }

  _onKeyDown(e) {
    if (!this._open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      this._openPanel();
      return;
    }
    if (!this._open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._highlight(Math.min(this._highlightIndex + 1, this._suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._highlight(Math.max(this._highlightIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this._highlightIndex >= 0) this._select(this._suggestions[this._highlightIndex]);
    } else if (e.key === "Escape") {
      this._close();
    }
  }

  _onFocus() {
    if (this._suggestions.length) this._openPanel();
  }

  _onBlur() {
    // Slight delay so click can register
    setTimeout(() => this._close(), 150);
  }

  // Query pipeline
  async _runQuery(query) {
    const requestId = ++this._lastRequestId;
    const local = this._filterLocal(query);
    let remote = [];

    if (this._fetcher) {
      try {
        const res = await this._fetcher(query);
        remote = this._normalize(res);
      } catch (err) {
        // swallow errors for UX; could emit an error event
        remote = [];
      }
    }

    // Prefer remote if provided; otherwise local
    const merged = (this._fetcher ? remote : local).slice(0, this._limit);

    // Ignore stale responses
    if (requestId !== this._lastRequestId) return;

    this._suggestions = merged;
    if (merged.length) {
      this._renderList(merged);
      this._openPanel();
    } else {
      this._renderEmpty();
      this._openPanel();
    }
    this._highlight(-1);
    this._announce(`${merged.length} results`);
  }

  _filterLocal(query) {
    const q = query.toLowerCase().trim();
    return this._normalize(
      this._localData.filter(s => String(s).toLowerCase().includes(q))
    );
  }

  _normalize(items) {
    // Accept string[] or [{label, value}]
    if (!Array.isArray(items)) return [];
    return items.map(it => {
      if (typeof it === "string") return { label: it, value: it };
      return { label: it.label ?? String(it.value ?? ""), value: it.value ?? it.label ?? "" };
    }).filter(x => x.label && x.value);
  }

  // Rendering
  _renderList(items) {
    this.$list.innerHTML = "";
    items.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.setAttribute("role", "option");
      div.setAttribute("id", `opt-${idx}`);
      div.textContent = item.label;
      div.addEventListener("mousedown", this._onItemClick); // mousedown to beat blur
      div.__data = item;
      this.$list.appendChild(div);
    });
  }

  _renderEmpty() {
    this.$list.innerHTML = `<div class="empty" role="option" aria-disabled="true">No results</div>`;
  }

  _openPanel() {
  if (this._open) return;
  this._open = true;
  const rect = this.$input.getBoundingClientRect();
  this.$panel.style.width = rect.width + "px";
  this.$panel.hidden = false;
  this._setExpanded(true);
}


  _close() {
    if (!this._open) return;
    this._open = false;
    this.$panel.hidden = true;
    this._setExpanded(false);
    this._highlight(-1);
  }

  _highlight(index) {
    const items = Array.from(this.$list.querySelectorAll(".item"));
    items.forEach(el => el.setAttribute("aria-selected", "false"));
    this._highlightIndex = index;
    if (index >= 0 && items[index]) {
      items[index].setAttribute("aria-selected", "true");
      items[index].scrollIntoView({ block: "nearest" });
    }
  }

  _select(item) {
    this.setValue(item.value);
    this._emit("suggestion-selected", { label: item.label, value: item.value });
    this._close();
  }

  _onItemClick(e) {
    const item = e.currentTarget.__data;
    this._select(item);
  }

  // Utilities
  _setExpanded(expanded) {
    this.$combo.setAttribute("aria-expanded", String(expanded));
  }

  _debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  _announce(text) {
    this.$status.textContent = text;
  }
}

customElements.define("typeahead-input", TypeaheadInput);

