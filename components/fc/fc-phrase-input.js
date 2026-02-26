import './../smart/smart-dialog.js';
import { getAppState } from '../../controllers/appStates.js';

class FCPhraseInput extends HTMLElement {
  constructor() {
    super();
        // Bind event handlers to maintain 'this' context
    this._abort = new AbortController();
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
          
      .title {
        font-size: 1.2rem;
        font-weight: bold;
      }

      #phraseInput {
        margin:5px;
      }   

      sl-input {
        margin-top: 0.5rem;
      }

      sl-input::part(base) {
        font-size: 16px;
      }

      #suggestionBtn {
        display: none;
      }

      #suggestedText {
        max-width: 90%;
        overflow-x: scroll;
        text-wrap: nowrap;
      }

      #suggestedText {
        max-width: 90%;
        overflow-x: scroll;
        text-wrap: nowrap;
      }

      .titleExtra {
        width: calc(100% - 100px);
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        flex-direction: row;
        align-items: center;
        gap: 5px;
      }
      
/* scrollbar */
::-webkit-scrollbar {
  width: 1px;
  height: 1px;
}

::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  -webkit-border-radius: 10px;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  -webkit-border-radius: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
}

::-webkit-scrollbar-thumb:window-inactive {
  background: rgba(255, 255, 255, 0.3);
}

    </style>`;

    // Include styles and component structure in the template
    template.innerHTML = `${style}
        <smart-dialog draggable esc-close>     
          <div slot="header">
            <div class="header">
              <span class="title" style="font-size: 1.2rem"><b>Phrase</b></span>      
              <div class="titleExtra"> 
                <sl-button id="suggestionBtn" size="small">💡</sl-button>
                <div class="suggestedText" id="suggestedText"></div>             
              </div>
            </div>
          </div>
          <div slot="body">
            <sl-textarea id="phraseInput" resize="none" class="focusable"></sl-textarea>    
          </div>
          <div slot="footer" class="footer">
            <sl-button-group> 
              <sl-button size="medium" variant="primary" id="confirm" class="focusable"><sl-icon name="check-circle-fill" slot="prefix"></sl-icon>Confirm</sl-button>
              <sl-button size="medium" variant="default" id="cancel" class="focusable"><sl-icon name="x-circle" slot="prefix"></sl-icon>Cancel</sl-button>
            </sl-button-group> 
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
    const { signal } = this._abort;
    // Grab important DOM elements  
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');  
    // get Global variable requireReconfirm from './../../controllers/appStates.js';
    this._smart_dialog.reconfirm = getAppState("requireReconfirm"); 
    
    this._phraseInput = this.shadowRoot.getElementById('phraseInput');
    this._suggestionBtn = this.shadowRoot.querySelector('#suggestionBtn');
    this._suggestedText = this.shadowRoot.querySelector('#suggestedText');

    this._suggestionBtn.addEventListener('click',()=> {
      this._phraseInput.value = this._suggestedText.innerHTML;
    }, { signal });

    this._confirmBtn = this.shadowRoot.getElementById('confirm');
    this._cancelBtn = this.shadowRoot.getElementById('cancel');

    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);

    this._phraseInput.addEventListener("keydown", this._onKeyDown);

    // Give focus to input and overlay for keyboard behavior
 
    this._smart_dialog.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
    this._smart_dialog.focus();
}

_confirmHandler() {
    this.dispatchEvent(
      new CustomEvent("fc-phrase-input-confirmed", {
        detail: { value: this._phraseInput.value},
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent("fc-phrase-input-canceled", {
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }


  _onKeyDown(e) {
    if (["Enter"].includes(e.key)) {
     //this._confirmHandler();
      this._confirmBtn.click(); // mimic confirm Click by endter
 
    }
  }
    
    open(entry) {
      console.log(entry);
      this._phraseInput.value = entry.phrase;      
      console.log(entry.returning_phrase);
      if (entry.returning_phrase!==undefined && entry.returning_phrase!=="") {
        this._suggestionBtn.style.display = "block";
        this._suggestedText.innerHTML = entry.returning_phrase;
      }
      
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
          this._phraseInput.focus();
          // 🌟 Make the modal visible by setting its opacity to 1     
          this._smart_dialog._handleSmallScreenPosition();  
          this._smart_dialog.style.opacity = 1;
      });
  }   
}

// Register the custom element
customElements.define('fc-phrase-input', FCPhraseInput);
