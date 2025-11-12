import './smart-dialog.js';

class ConfirmDialog extends HTMLElement {
  constructor() {
    super();
   
     // Bind event handlers to maintain 'this' context
    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);   

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
            color: var(--sl-color-neutral-700);
            display:flex;
            align-items: center;
            justify-content: center;
            user-select:none;
        }

        .body {
            display:flex;
            flex-direction:row;     
            align-items:center;
            gap:10px;
            padding:10px;
            color: var(--sl-color-neutral-700);
            user-select:none;
        }

        sl-icon {
            flex-shrink: 0;
            font-size: 2rem;
            color: var(--sl-color-warning-500);
        }

        sl-button-group {
            width:100%;       
            color: var(--sl-color-neutral-700);   
        }

        sl-button::part(base) {
            flex: 1;  
        }
    
    </style>`;

    // Include styles and component structure in the template
    template.innerHTML = `${style}
        <smart-dialog draggable esc-close width="250px">     
            <div slot="header" class="header">
                <b>Confirm</b>
            </div>
            <div slot="body" class="body">             
                <sl-icon id="icon" name="exclamation-diamond"></sl-icon>
                <div id="header">Are you sure? In App.vue (or in the template file for Nuxt.js (layout/default.vue)) 
                </div>            
            </div>           
            <div slot="footer" class="footer">  
                <sl-button-group>          
                    <sl-button class="focusable" size="small" variant="default" id="confirm1" style="flex: 1">Yes</sl-button>
                    <sl-button class="focusable" size="small" variant="primary" id="cancel1" style="flex: 1">Cancel</sl-button>
                </sl-button-group>
            </div>   
        </smart-dialog>   
    `;
   
    // Attach to shadow DOM
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

}
 
    disconnectedCallback() {
        // remove eventListeners
        this._smart_dialog.removeEventListener("smart-dialog-confirmed", this._confirmHandler);
        this._smart_dialog.removeEventListener("smart-dialog-canceled", this._cancelHandler);   
        // remove all children
        this.shadowRoot.replaceChildren();
    }

    connectedCallback() {
        // Grab important DOM elements  
        this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');  
        this._confirmBtn = this.shadowRoot.getElementById('confirm1');
        this._cancelBtn = this.shadowRoot.getElementById('cancel1');

        this._confirmBtn.addEventListener("click", this._confirmHandler);
        this._cancelBtn.addEventListener("click", this._cancelHandler);

        // Give focus to input and overlay for keyboard behavior

        this._smart_dialog.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
        this._smart_dialog.focus();
    }

    _confirmHandler() {
        this.dispatchEvent(
            new CustomEvent("confirm-dialog-Yes", {    
            bubbles: false,
            composed: true,
            })
        );
       // console.log(`vao confirm dialog confirmed`);
    // this._smart_dialog.style.display = "none";
        //this.remove();  
    }

    _cancelHandler() {
        this.dispatchEvent(
            new CustomEvent("confirm-dialog-No", {
            bubbles: false,
            composed: true,
            })
        );
    // this._smart_dialog.style.display = "none";
        //console.log(`vao confirm dialog canceled`);
        //this.remove();  
    }

    
    open(labelText = 'Are you sure?') {
        const header = this.shadowRoot.querySelector('#header');
        header.innerHTML = labelText;
        
        // 🔓 Show the dialog by setting its display to 'flex'
        //console.log(this._smart_dialog);
        this._smart_dialog.style.display = 'block';

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
            // 🌟 Make the modal visible by setting its opacity to 1  
                this._smart_dialog.focus();        
            // this._smart_dialog.style.opacity = 1;
        });
    }   
}

// Register the custom element
customElements.define('confirm-dialog', ConfirmDialog);
