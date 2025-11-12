class SmartTextDialog extends HTMLElement {
  constructor() {
    super();
    this._doDrag = this._doDrag.bind(this);
    this._endDrag = this._endDrag.bind(this);
    // Prepare template with embedded styles
    const template = document.createElement('template');

    const style = `<style>
      /* Overlay for modal backdrop */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        display: none; /* hidden by default */
        align-items: center;
        justify-content: center;
        z-index: 9;
        touch-action: none;
      }

      /* The modal container itself */
      .modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        padding: 1rem;
        width: calc(100% - 40px);
        max-width:738px;        
        position: relative;
        transform: translate(0px, 0px); /* used for drag positioning */
        transition: transform 0.1s ease;
        touch-action: none;
      }

      #phrase-input {
        margin-top:15px;
      }

      /* Header area used for dragging */
      .modal-header {
        font-weight: bold;
        padding: 0.5rem;
        /* cursor: move;  /* show move cursor */
        user-select: none;
        background-color: #f2f2f2;
        touch-action: none;
        cursor: grab;
      }

        /* Footer area used for dragging */
        .modal-footer {
            cursor: grab;
            user-select: none;
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1rem;
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
      <div class="modal-overlay">        
        <div id="modal" class="modal" style="opacity:0">
          <div class="modal-header">Title</div>         
          <sl-textarea class="tabElement" id="phrase-input" resize="none"></sl-textarea>
          <div class="modal-footer">           
            <sl-button class="tabElement" variant="primary" id="confirm">Confirm</sl-button>
            <sl-button class="tabElement" variant="default" id="cancel">Cancel</sl-button>
          </div>        
        </div>
      </div>
    `;

    // Attach to shadow DOM
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    this._attachedNotification(); 
  }

  // check the device mobile or desktop then attach notification
    _attachedNotification() {
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        const notifcationDiv = document.createElement('smart-notification');
        
        if (getDeviceType()==="mobile" || getDeviceType()==="tablet") {
            const modal = this.shadowRoot.querySelector('.modal');            
            overlay.style.alignItems = "start";
            modal.append(notifcationDiv);
        } else {
            overlay.append(notifcationDiv);
        }
    }

  
  disconnectedCallback() {
      this.shadowRoot.replaceChildren();
      this.shadowRoot.innerHTML =``;
      window.removeEventListener('pointermove', this._doDrag);
      window.removeEventListener('pointerup', this._endDrag);
  }

  connectedCallback() {
    // Grab important DOM elements
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    const modal = this.shadowRoot.querySelector('.modal');
    const header = this.shadowRoot.querySelector('.modal-header');
    const footer = this.shadowRoot.querySelector('.modal-footer');
    const phrase_input = this.shadowRoot.getElementById('phrase-input');
    const confirmBtn = this.shadowRoot.getElementById('confirm');
    const cancelBtn = this.shadowRoot.getElementById('cancel');

    // Enable focus trapping for accessibility
    this._trapFocus();

    overlay.addEventListener('keydown', (e) => {
        if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    // ---------------------------------------------------------------
    // 💡 Drag support (desktop + mobile) Reuseable
    
       this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;      

      this._modal = modal;

      const startDrag = (e) => {
        this.isDragging = true;
        this.startX = e.clientX - this.offsetX;
        this.startY = e.clientY - this.offsetY;
        e.target.setPointerCapture(e.pointerId);
        e.preventDefault();
      };

        

      header.addEventListener('pointerdown', startDrag);
      footer.addEventListener('pointerdown', startDrag);

      window.addEventListener('pointermove', this._doDrag);
      window.addEventListener('pointerup', this._endDrag);

        
    // 💡 Drag support (desktop + mobile) Reuseable
    // ----------------------------------------------------------------

        // Confirm: dispatch event with input value
        confirmBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('smart-text-dialog-confirmed', {
                detail: { value: phrase_input.value },
                bubbles: true,
                composed: true
            }));
            overlay.style.display = 'none';
        });

        // Cancel: reset and close
        cancelBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('smart-text-dialog-canceled', {
                // detail: { value: phrase_input.value },
                // bubbles: true,
                // composed: true
            }));
            phrase_input.value = '';
            overlay.style.display = 'none';
        });

        phrase_input.addEventListener('keydown', (e) => {          
             if (['Enter'].includes(e.key)) {
                 confirmBtn.click(); // mimic confirm Click by endter
             }                    
        });

        // Save references for external use
        this.dialogOverlay = overlay;
        this.dialogInput = phrase_input;      

        // Give focus to input and overlay for keyboard behavior
        phrase_input.focus();
        overlay.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
        overlay.focus();
    }

     _doDrag(e) {
      if (!this.isDragging) return;
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      this._modal.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px)`;
      e.preventDefault();
    }

    _endDrag() {
      this.isDragging = false;
    }

     open(labelText = '', initialValue = '') {
        console.log(labelText);
        console.log(initialValue);
        const header = this.shadowRoot.querySelector('.modal-header');
        header.innerHTML = labelText;
        this.textArea = this.shadowRoot.querySelector('sl-textarea');
        this.textArea.value = initialValue; // Use `.value`, not `.content`

        // 🔓 Show the dialog by setting its display to 'flex'
        this.dialogOverlay.style.display = 'flex';

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
            const phrase_input = this.shadowRoot.getElementById('phrase-input');
            phrase_input.focus();

            // 🌟 Make the modal visible by setting its opacity to 1
            const modal = this.shadowRoot.getElementById('modal');
            modal.style.opacity = 1;
        });
    }


  // ------------------------
  // 🔐 Focus trap implementation
  // ------------------------
  _getFocusableElements() {
    // Return all interactable elements excluding disabled
    return Array.from(
      this.shadowRoot.querySelectorAll(
        ".tabElement" 
       // "sl-button, sl-input, textarea, select, a[href]"
      )
    ).filter(el => !el.hasAttribute("disabled"));
  }

  _trapFocus() {    
    // Keep focus contained inside the overlay when Tab is pressed
    this.shadowRoot.addEventListener("keydown", (event) => {
      const focusableElements = this._getFocusableElements();     
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.key === "Tab") {
        // Remove any visual focus indicators, if used
        for (const item of focusableElements) {
          item.classList.remove("buttonfocused");
        }

        if (event.shiftKey) {
          // Shift + Tab: cycle backwards
          if (this.shadowRoot.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: cycle forwards
          if (this.shadowRoot.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }
   
}

// Register the custom element
customElements.define('smart-text-dialog', SmartTextDialog);
