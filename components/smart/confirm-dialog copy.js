/**
 * ConfirmDialog Web Component
 * ---------------------------
 * A reusable confirmation dialog built on top of <smart-dialog>.
 *
 * Features:
 * - Displays a modal dialog with a header, body, and footer.
 * - Provides "Yes" and "Cancel" buttons for user confirmation.
 * - Emits custom events ("confirm-dialog-Yes" and "confirm-dialog-No") 
 *   when the user interacts with the buttons.
 * - Can be opened programmatically with a custom label text.
 * - Cleans up event listeners and shadow DOM on disconnect to prevent memory leaks.
 *
 * Usage:
 * <confirm-dialog></confirm-dialog>
 * 
 * const dialog = document.querySelector('confirm-dialog');
 * dialog.open('Delete this item?');
 * dialog.addEventListener('confirm-dialog-Yes', () => { ... });
 * dialog.addEventListener('confirm-dialog-No', () => { ... });
 */


import  './smart-dialog.js';

class ConfirmDialog extends HTMLElement {
  constructor() {
    super();

    // Bind event handlers so 'this' always refers to the component instance
    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);

    // Prepare template with embedded styles
    const template = document.createElement('template');

    const style = `<style>   
        smart-dialog {
            display: none;  /* hidden by default */
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
                <div id="header"></div>            
            </div>           
            <div slot="footer" class="footer">  
                <sl-button-group>          
                    <sl-button class="focusable" size="small" variant="default" id="confirm1" style="flex: 1">Yes</sl-button>
                    <sl-button class="focusable" size="small" variant="primary" id="cancel1" style="flex: 1">Cancel</sl-button>
                </sl-button-group>
            </div>   
        </smart-dialog>   
    `;

    // Attach template to shadow DOM
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    // Grab important DOM elements
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');  
    this._confirmBtn = this.shadowRoot.getElementById('confirm1');
    this._cancelBtn = this.shadowRoot.getElementById('cancel1');

    // Attach event listeners for buttons
    this._confirmBtn.addEventListener("click", this._confirmHandler);
    this._cancelBtn.addEventListener("click", this._cancelHandler);

    // Capture keyboard events inside the dialog
    this._smart_dialog.addEventListener("keydown", this._onKeyDown, { capture: true });

    // Make the dialog focusable for keyboard navigation
    this._smart_dialog.tabIndex = -1; 
    this._smart_dialog.focus();
  }

  disconnectedCallback() {
    // Clean up event listeners to prevent memory leaks
    this._confirmBtn.removeEventListener("click", this._confirmHandler);
    this._cancelBtn.removeEventListener("click", this._cancelHandler);

    this._smart_dialog.removeEventListener("keydown", this._onKeyDown, { capture: true });
    // Remove all children from shadow DOM
    this.shadowRoot.replaceChildren();
  }

  /**
   * Handler for "Yes" button click.
   * Emits a custom event to notify parent components.
   */
  _confirmHandler() {
    this.dispatchEvent(
      new CustomEvent("confirm-dialog-Yes", {    
        bubbles: false,
        composed: true,
      })
    );
  }

  /**
   * Handler for "Cancel" button click.
   * Emits a custom event to notify parent components.
   */
  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent("confirm-dialog-No", {
        bubbles: false,
        composed: true,
      })
    );
  }

  _onKeyDown = (e) => {
  // Always stop Escape from leaking
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    this._cancelHandler();
    return;
  }

  // Do NOT block Tab — let browser move focus
  if (e.key === "Tab") {
    return; // native focus handling
  }

  // Do NOT block Enter/Space — let focused button handle it
  // If you want a default action when focus is on the dialog itself:
  if ((e.key === "Enter" || e.key === " ") && this.shadowRoot.activeElement === this._smart_dialog) {
    e.preventDefault();
    this._confirmBtn.focus(); // move focus to Yes
  }
};
  /**
   * Opens the dialog with a custom label text.
   * @param {string} labelText - The message to display in the dialog body.
   */
  open(labelText = 'Are you sure?') {
    const header = this.shadowRoot.querySelector('#header');
    header.innerHTML = labelText;
    
    // Show the dialog
    this._smart_dialog.style.display = 'block';

    // Ensure Shoelace components are defined before interacting
    const tagsUsed = new Set(
      Array.from(this.shadowRoot.querySelectorAll('*'))
        .map(el => el.tagName.toLowerCase())
        .filter(tag => tag.startsWith('sl-'))
    );

    Promise.all(
      Array.from(tagsUsed).map(tag => customElements.whenDefined(tag))
    ).then(() => {
      // Focus the dialog once components are ready
      this._smart_dialog.focus();        
    });

    const focusedEl = document.activeElement;
    console.log(focusedEl);

  } 
  
  close() {
    this._smart_dialog.style.display = 'none';
  }
}

// Register the custom element
customElements.define('confirm-dialog', ConfirmDialog);
