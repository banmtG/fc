class SmartNav extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._menuItems = [];
      this._variant = 'primary'; // default variant
      this._activeKey = null;
      this.callbackPromise = null;
    }

    connectedCallback() {
      this._variant = this.getAttribute('variant') || 'primary';
      this.renderInit();
    }

    set items(menuItems) {
      //wait for shoelace sl-button to finish loading before passing data
      customElements.whenDefined('sl-button').then(() => {
        this._menuItems = menuItems;
        this.renderInit(); // full re-render on item set
      });  
    }

    renderInit() {
      const _style = `<style>
        :host {
          display: block;
          overflow-x: auto;
          padding: 8px;
        }
        .container {
          display: flex;
          gap: 0;
          flex-wrap: nowrap;
        }
        sl-button::part(base) {
          margin: 0;
          padding: 0;
          border-radius:0;
          border-left:none;
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }
        sl-button:first-of-type::part(base) {            
          border-left:var(--sl-input-border-color) var(--sl-input-border-width) solid;
        }
          
        sl-button::part(base):hover {
          background-color: var(--sl-color-success-400);
          color: #000;
          border-color:var(--sl-input-border-color);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);          
        }

        /* scrollBar hidden */
        .scrollBar_hidden {
          overflow: auto;            /* Enables scrolling */
          scrollbar-width: none;     /* Firefox */
          -ms-overflow-style: none;  /* IE 10+ */
        }

        /* Chrome, Safari, Edge (WebKit) */
        .scrollBar_hidden::-webkit-scrollbar {
          display: none;
        }

        </style>`;
      this.shadowRoot.innerHTML = `
        ${_style}
        <div class="container scrollBar_hidden">
          ${this._menuItems.map(({ key, phrase },index) => `
            <sl-button variant="default" data-key="${key}" data-level0-index="${index}">${phrase}</sl-button>
          `).join('')}
        </div>
      `;
      this.initButtonClickLogic();
    }

    initButtonClickLogic() {
      this.shadowRoot.querySelectorAll('sl-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this._activeKey = key;
          this.emitEvent('smart-nav-btn-click');
          this.renderChange();
        });
      });
    }

    emitEvent(name) {
      this.dispatchEvent(new CustomEvent(name, {
        detail: {key: this._activeKey},
        bubbles: true,
        composed: true,
      }));
    }

    addListeners() {
      document.addEventListener('keydown', this._onKeydown);
      // this.shadowRoot.addEventListener('click', this._onClick);
    }

    // 🧠 These handlers are separated for clean removal
    _onKeydown(e) {   
      if (e.key === 'ArrowLeft') { this.moveLeft_theNavList(); return; }  // Navigate Left (previous phrase)
      if (e.key === 'ArrowRight') {  this.moveRight_theNavList(); return;   }  // Navigate Right (next phrase)
    }

    _onClick(e) {
      const index = e.target.dataset?.level0-index;
      if (index !== undefined) {
        this.currentIndex = Number(index);
        this.history.push(this.currentIndex);
        this.renderChange();
        this.emitEvent('select');
      }
    }

    moveLeft_theNavList() {``
      if (this.currentIndex > 0) {
        this.currentIndex -= 1;
        this.history.push(this.currentIndex);
        this.renderChange();
        this.emitEvent('select');
      } 
    }

    moveRight_theNavList() {
      if (this.currentIndex < this.data.length - 1) {
          this.currentIndex += 1;
          this.history.push(this.currentIndex);
          this.renderChange();
          this.emitEvent('select');
      }
    }

    renderChange() {
      this.shadowRoot.querySelectorAll('sl-button').forEach(btn => {
        const key = btn.getAttribute('data-key');
        const isActive = key === this._activeKey; //This line compares key and this._activeKey then give true/false to isActive
        btn.variant = isActive ? this._variant : 'default';
        if (isActive) {
          // scroll into view if active
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    }


  }

  customElements.define('smart-nav', SmartNav);