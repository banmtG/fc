// class WordForm extends HTMLElement {
//     constructor() {
//       super();
//       this.attachShadow({ mode: 'open' }); 
//       this.componentCSS = `<link rel="stylesheet" href="./components/search-box.css" />`;      
//       this.CSSJSlibraries =` <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/themes/light.css" />
//       <script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/shoelace-autoloader.js"></script>`;
//       this.shadowRoot.innerHTML = `${this.componentCSS}${this.CSSJSlibraries}
//          <div class="container">
//             <sl-input size="small" placeholder="Word or phrase" name="phrase"></sl-input>
//             <sl-input size="small" placeholder="IPA" name="ipa"></sl-input>
//             <sl-input size="small" placeholder="Definition" name="definition"></sl-input>
//             <sl-input size="small" placeholder="Note" name="note"></sl-input>
//             <sl-input size="small" placeholder="Related" name="related"></sl-input>
//             <sl-input size="small" placeholder="Examples" name="examples"></sl-input>
//             <sl-input size="small" placeholder="Illustration" name="illustration"></sl-input>           
//          </div>
//       `;
        
//       this._btn=this.shadowRoot.querySelector('.searchTop sl-button');
//       this._searchTextBox = this.shadowRoot.querySelector('.searchTop sl-input');
//       // Bind elements and methods
//         // Default settings
//     }
  
//     connectedCallback() {
//         this._btn.addEventListener('click',()=>{
//             main_objecttree.renderTree(this._searchTextBox.value);
//         })
//     }
  
//     disconnectedCallback() {
    
//     }
    
     
//   }
  
//   customElements.define('word-form', WordForm);
  