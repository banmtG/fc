class IpaInput extends HTMLElement {
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
        }

      /* Grid layout for IPA buttons */
      .char-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
        gap: 1px; /* negative gap helps collapse borders */
        margin: 10px 0;
      }

      /* Custom styling for Shoelace buttons */
      .char-grid sl-button::part(base) {
        margin: 0;
        padding: 0;
        border-radius: 0;
        background-color: #f2f2f2;
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
        border: none;
        box-shadow: inset 0 0 0 1px #f2f2f2; /* emulate 1px border */
      }

      .char-grid sl-button::part(label) {
        font-size: 1.2rem;
      }

      @media screen and (min-width: 768px) {
            .char-grid sl-button[size="small"]::part(base) {
                padding:0;          
                min-height:  0;  
                height:25px;
                line-height:1;
                font-size:0.7rem;
            }      
            .char-grid sl-button {
                height: 24px;
            }
        }

      sl-input {
        margin-top: 0.5rem;
      }

      sl-input::part(input) {
        font-size: 1.5rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }
    </style>`;

    // Include styles and component structure in the template
    template.innerHTML = `${style}
      <div class="modal-overlay">        
        <div id="modal" class="modal" style="opacity:0">
          <div class="modal-header">IPA (lowercase)</div>
          <div class="char-grid"></div>
          <sl-input class="tabElement" id="ipa_input"></sl-input>
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

    // List of IPA characters
    this.ipaCharacters = [
      'i','ɪ','ɛ','æ','ɒ','ɑ','ʌ','u','ʊ','ə','ɜ','ɔ',
      'iː','uː','ɜː','ɔː','ɑː','eː','ː',
      'aɪ','eɪ','ɔɪ','aʊ','əʊ','ɪə','eə','ʊə','ɪr','oʊ','ɛr','aɪr','aɪə','aʊə',
      's','ʃ','tʃ','ʒ','dʒ','θ','d','ð','n','ŋ','ɾ','t','t̬',
      'ɝ','ɚ','ɔr','ˌ','ˈ','ʔ'
    ];
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
      this.shadowRoot.querySelector('.char-grid').replaceChildren();
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
    const ipa_input = this.shadowRoot.getElementById('ipa_input');
    const grid = this.shadowRoot.querySelector('.char-grid');
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

    // Build grid of character buttons
    this.ipaCharacters.forEach(char => {
        const btn = document.createElement('sl-button');
        btn.setAttribute('size', 'small');
        btn.textContent = char;

        btn.addEventListener('click', () => {
          const inputEl = ipa_input.shadowRoot.querySelector('input');

          const value = inputEl.value;
          const start = inputEl.selectionStart;
          const end = inputEl.selectionEnd;

          // Insert character at caret or replace highlighted text
          const charToInsert = btn.textContent;
          inputEl.value = value.slice(0, start) + charToInsert + value.slice(end);

          // Move caret after inserted character
          inputEl.selectionStart = inputEl.selectionEnd = start + charToInsert.length;

          // Sync outer Shoelace value
          ipa_input.value = inputEl.value;

          // Keep keyboard active
          inputEl.focus();
        });

        grid.append(btn);
    });

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
            this.dispatchEvent(new CustomEvent('ipa-input-confirmed', {
                detail: { value: ipa_input.value },
                bubbles: true,
                composed: true
            }));
            overlay.style.display = 'none';
            this.replaceChildren();
            this.remove();
        });

        // Cancel: reset and close
        cancelBtn.addEventListener('click', () => {
           this.dispatchEvent(new CustomEvent('ipa-input-canceled', {              
                bubbles: true,
                composed: true
            }));          
           overlay.style.display = 'none';
          this.replaceChildren();
          this.remove();
        });

        // Save references for external use
        this.dialogOverlay = overlay;
        this.dialogInput = ipa_input;
        
        ipa_input.addEventListener('keydown', (e) => {          
             if (['Enter'].includes(e.key)) {
                 confirmBtn.click(); // mimic confirm Click by endter
             }                    
        });

        ipa_input.addEventListener('input', () => {
            const inputEl = ipa_input.shadowRoot.querySelector('input');
            const raw = inputEl.value;

            // Combine IPA characters with lowercase a-z letters
            const allowedSet = new Set([
                ...'abcdefghijklmnopqrstuvwxyz ',
                ...this.ipaCharacters.join('').split('')
            ]);

            // Filter valid characters
            const filtered = [...raw].filter(c => allowedSet.has(c)).join('');

            // Update value
            inputEl.value = filtered;
            ipa_input.value = filtered;

            // Check for invalid characters
            const hasInvalid = [...raw].some(c => !allowedSet.has(c));
            if (hasInvalid) {
                const host = this.shadowRoot.querySelector('smart-notification');
                    if (host) {
                        host.show({
                            label: 'Invalid IPA character!!',
                            icon: 'info-circle',
                            color: '--sl-color-warning-300',
                            timer: 2500
                        });
                    }
                //this.showInvalidCharPopup(); // Trigger your notification
            }
        });

        // Give focus to input and overlay for keyboard behavior
        ipa_input.focus();
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

    open(current_ipa) {
        // 🔓 Show the dialog by setting its display to 'flex'
        this.dialogOverlay.style.display = 'flex';
        // 🧹 Clear any previous input in the dialog's input field
        this.dialogInput.value = current_ipa;

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
            const ipa_input = this.shadowRoot.getElementById('ipa_input');
            ipa_input.focus();

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
      // Simple popup function (can customize as needed)
    showInvalidCharPopup() {
        alert('⚠️ Invalid characters detected! Only IPA symbols and lowercase a–z are allowed.');
    }
}

// Register the custom element
customElements.define('ipa-input', IpaInput);
