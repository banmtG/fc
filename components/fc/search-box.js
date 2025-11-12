class SearchBox extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }); 
      this.componentCSS = `<link rel="stylesheet" href="./components/fc/search-box.css" />`; 
      this.shadowRoot.innerHTML = `${this.componentCSS}
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
        .split(",")
        .map(p =>
            p.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "") // Keep all Unicode letters, strip rest
        )
        .map(p => p.trim())
        .filter(Boolean);
    }


     
}
  
customElements.define('search-box', SearchBox);
  