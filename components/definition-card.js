class DefinitionCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }); 
      this.componentCSS = `<link rel="stylesheet" href="./components/definition-card.css" />`;            
      this.CSSJSlibraries =` <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/themes/light.css" />
      <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/shoelace-autoloader.js"></script>`;
      this.shadowRoot.innerHTML = `${this.componentCSS}${this.CSSJSlibraries}
        <div class="container">

        </div>
      `;
        
      this._btn=this.shadowRoot.querySelector('.searchTop sl-button');
      this._searchTextBox = this.shadowRoot.querySelector('.searchTop sl-input');
      // Bind elements and methods
        // Default settings
    }
  
    connectedCallback() {
        this._btn.addEventListener('click',()=>{
            main_objecttree.renderTree(this._searchTextBox.value);
        })
    }
  
    disconnectedCallback() {
    
    }
    
     
  }
  
  customElements.define('definition-card', DefinitionCard);
  