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
 * - Uses bindKeyEvents/unbindKeyEvents to clearly scope keyboard handling.
 *
 * Usage:
 * <confirm-dialog></confirm-dialog>
 * 
 * const dialog = document.querySelector('confirm-dialog');
 * dialog.open('Delete this item?');
 * dialog.addEventListener('confirm-dialog-Yes', () => { ... });
 * dialog.addEventListener('confirm-dialog-No', () => { ... });
 */

import './smart-dialog.js';
import { FocusStack }  from './../../core/focus-stack.js';

class ConfirmDialog extends HTMLElement {
  constructor() {
    super();

    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);

    const template = document.createElement('template');
    template.innerHTML = `
      <style>   
    smart-dialog { display: none; }
    .header { 
      color: var(--sl-color-neutral-700); 
      display:flex; 
      align-items:center; 
      justify-content:center; 
    }
    .body { 
      display:flex; 
      flex-direction:row; 
      align-items:center; 
      gap:10px; 
      padding:10px; 
      color: var(--sl-color-neutral-700); 
    }
    sl-icon { 
      flex-shrink:0; 
      font-size:2rem; 
      color: var(--sl-color-warning-500); 
    }
    sl-button-group {
        width:100%;
    }
    .grid-group::part(base) {
        display: grid;
        /* Creates three columns of equal width, each taking 1 fraction of space */
        grid-template-columns: 1fr 1fr;
    }

  </style>
      <smart-dialog draggable esc-close width="280px">     
        <div slot="header" class="header"><b>Confirm</b></div>
        <div slot="body" class="body">             
          <sl-icon id="icon" name="exclamation-diamond"></sl-icon>
          <div id="header"></div>            
        </div>           
        <div slot="footer" class="footer">  
          <sl-button-group class="grid-group">
            <sl-button variant="default" id="confirm1">Yes</sl-button>
            <sl-button variant="primary" id="cancel1">Cancel</sl-button>
          </sl-button-group>
        </div>   
      </smart-dialog>   
    `;
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this._smart_dialog = this.shadowRoot.querySelector('smart-dialog');  
    this._confirmBtn = this.shadowRoot.getElementById('confirm1');
    this._cancelBtn = this.shadowRoot.getElementById('cancel1');

    this._confirmBtn.addEventListener("click", this._confirmHandler);
    this._cancelBtn.addEventListener("click", this._cancelHandler);

    this._smart_dialog.tabIndex = -1; 
  }

  disconnectedCallback() {
    console.log(`confirm-dialog disconnectCallBack`);
    this._confirmBtn.removeEventListener("click", this._confirmHandler);
    this._cancelBtn.removeEventListener("click", this._cancelHandler);
    // ensure cleanup
    // Release from FocusStack
    FocusStack.pop(this);
    this.unbindKeyEvents(); 

    // this.shadowRoot.replaceChildren();
  }

  /**
   * Attach keyboard handling for this dialog.
   */
  bindKeyEvents() {
    this.shadowRoot.addEventListener("keydown", this._onKeyDown, { capture: true });
  }

  /**
   * Detach keyboard handling for this dialog.
   */
  unbindKeyEvents() {
    this.shadowRoot.removeEventListener("keydown", this._onKeyDown, { capture: true });
  }

  _confirmHandler() {
    this.dispatchEvent(new CustomEvent("confirm-dialog-Yes", { bubbles: false, composed: true }));    
  }

  _cancelHandler() {
    this.dispatchEvent(new CustomEvent("confirm-dialog-No", { bubbles: false, composed: true }));
  }

  _onKeyDown = (e) => {
    // Only handle if this is the active component
    if (FocusStack.peek() !== this) return;

    if (e.key === "Escape") {
      this._cancelHandler();
      return;
    }

    if (e.key === "Enter") {
      // ✅ Only confirm if the Yes button is focused
      if (this.shadowRoot.activeElement === this._confirmBtn) {
        this._confirmHandler();
      }
       if (this.shadowRoot.activeElement === this._cancelBtn) {
        this._cancelHandler();
      }
    }

    // e.preventDefault();
    // e.stopPropagation();
  };

  open(labelText = 'Are you sure?') {
    const header = this.shadowRoot.querySelector('#header');
    header.innerHTML = labelText;
    
    // Show the dialog
    this._smart_dialog.style.display = 'block';
    console.log(`open and push`);
    FocusStack.push(this);
    this.bindKeyEvents(); // activate keyboard handling

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

  
    

  } 
  
  close() {
    this._smart_dialog.style.display = 'none';
    // Release from FocusStack
    FocusStack.pop(this);
    this.unbindKeyEvents(); // deactivate keyboard handling
  }
}

// Register the custom element
customElements.define('confirm-dialog', ConfirmDialog);
