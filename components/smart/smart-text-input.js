import './smart-dialog.js';
import './smart-toggle.js';
import {getAppState} from './../../controllers/appStates.js';

class SmartTextInput extends HTMLElement {
  constructor() {
    super();
   
     // Bind event handlers to maintain 'this' context

    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);
    
    this._onKeyDown = this._onKeyDown.bind(this);

    // Prepare template with embedded styles
    const template = document.createElement('template');

    const style = `<style>   
        smart-dialog {
            display: none;  /*  hidden by default */
        }  

        smart-dialog::slotted(.header) {
            display:flex;
            flex-direction:row;
        }  

        .header {
          display:flex;
          flex-direction:row;     
          align-items:center;     
          justify-content: space-between;
        }


      #phrase-input {
        margin:5px;
      }   

      sl-input {
        margin-top: 0.5rem;
      }

      sl-input::part(input) {
        font-size: 1.5rem;
      }
    </style>`;

    // Include styles and component structure in the template
    template.innerHTML = `${style}
        <smart-dialog draggable esc-close>     
            <div slot="header" class="header">
              <div id="header"></div>          
            </div>
            <div slot="body">
              <sl-textarea id="phrase-input" resize="none" class="focusable"></sl-textarea>    
            </div>
            <div slot="footer">            
                <sl-button size="small" variant="primary" id="confirm" class="focusable">Confirm</sl-button>
                <sl-button size="small" variant="default" id="cancel" class="focusable">Cancel</sl-button>
            </div>   
        </smart-dialog>
          
    `;
   
    // Attach to shadow DOM
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

}
 
  disconnectedCallback() {
    // remove eventListeners   
    this._phrase_input.removeEventListener("keydown", this._onKeyDown);
 
    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);

    // remove all children
    this.shadowRoot.replaceChildren();
  }

  connectedCallback() {
    // Grab important DOM elements  
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');  
    // get Global variable requireReconfirm from './../../controllers/appStates.js';
    this._smart_dialog.reconfirm = getAppState("requireReconfirm"); 
    
    this._phrase_input = this.shadowRoot.getElementById('phrase-input');
    this._confirmBtn = this.shadowRoot.getElementById('confirm');
    this._cancelBtn = this.shadowRoot.getElementById('cancel');

    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);

    this._phrase_input.addEventListener("keydown", this._onKeyDown);

    // Give focus to input and overlay for keyboard behavior
 
    this._smart_dialog.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
    this._smart_dialog.focus();
}

_confirmHandler() {
    this.dispatchEvent(
      new CustomEvent("smart-text-input-confirmed", {
        detail: { value: this._phrase_input.value, key: this._key},
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent("smart-text-input-canceled", {
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }


  _onKeyDown(e) {
    //console.log(e.key);
    if (["Enter"].includes(e.key)) {
     //this._confirmHandler();
      this._confirmBtn.click(); // mimic confirm Click by endter
 
    }
  }
    
    open(labelText = '', initialValue = '', key="") {
      const header = this.shadowRoot.querySelector('#header');
      header.innerHTML = labelText;
      this._phrase_input.value = initialValue;  // Use `.value`, not `.content`
      this._key = key;
      // 🔓 Show the dialog by setting its display to 'flex'
      this._smart_dialog.style.display = 'flex';

      // 🕵️‍♂️ Find all Shoelace components used in the shadow DOM
      const tagsUsed = new Set(
          Array.from(this.shadowRoot.querySelectorAll('*')) // Get all elements
          .map(el => el.tagName.toLowerCase())            // Convert tag names to lowercase
          .filter(tag => tag.startsWith('sl-'))           // Keep only Shoelace tags (e.g., sl-input, sl-dialog)
      );

      // ⏳ Wait until all Shoelace components are fully defined before interacting with them
      Promise.all(
          Array.from(tagsUsed).map(tag => customElements.whenDefined(tag))
      ).then(() => {
          // 🎯 Focus the input field once components are ready          
          this._phrase_input.focus();
          // 🌟 Make the modal visible by setting its opacity to 1          
          this._smart_dialog.style.opacity = 1;
      });
  }   
}

// Register the custom element
customElements.define('smart-text-input', SmartTextInput);
