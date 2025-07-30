class SearchBox extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }); 
      this.componentCSS = `<link rel="stylesheet" href="./components/search-box.css" />`;      
      this.CSSJSlibraries =` <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/themes/light.css" />
      <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/shoelace-autoloader.js"></script>`;
      this.shadowRoot.innerHTML = `${this.componentCSS}${this.CSSJSlibraries}
         <div class="container">
            <div class="searchTop">
                <sl-input size="small" placeholder="Seperate words or phrases with comma" clearable></sl-input>
                <sl-button size="small">Add</sl-button>
      
            </div>
        </div>
      `;
        
      this._btn=this.shadowRoot.querySelector('.searchTop sl-button');
      this._searchTextBox = this.shadowRoot.querySelector('.searchTop sl-input');
      // Bind elements and methods
        // Default settings

    }
  
    connectedCallback() {
        this._btn.addEventListener('click',()=>{
            this.handleAddButton();
        })
    }
  
    disconnectedCallback() {
    
    }

    handleAddButton() {
        const phrases = this.normalizePhrases(this._searchTextBox.value);
        console.log(phrases);
        this.dispatchEvent(new CustomEvent("searchBoxEvent_phrasesAdd", {
            detail: { phrases },
            bubbles: true,
            composed: true
        }));
    }    

    normalizePhrases(rawInput) {
    return rawInput
        .split(",") // Split into phrases by comma
        .map(p =>
        p.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "") // Remove non-letters at start/end
        ).map(p => p.trim()) // Remove whitespace
        .filter(Boolean); // Remove empty strings
}

     
}
  
customElements.define('search-box', SearchBox);
  