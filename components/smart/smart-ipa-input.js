import "./smart-dialog.js";
import "./smart-notification.js";
import {getAppState} from './../../controllers/appStates.js';
import { FocusStack } from './../../core/focus-stack.js';

class SmartIpaInput extends HTMLElement {
  constructor() {
    super();

    // Bind event handlers to maintain 'this' context
    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onInput = this._onInput.bind(this);


    // Prepare template with embedded styles
    const template = document.createElement("template");

    const style = `<style>
        smart-dialog {
            display: none;/*  hidden by default */
        }

        .body {
          padding: 5px;
        }

      /* Grid layout for IPA buttons */
      .char-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
        gap: 4px; /* negative gap helps collapse borders */
        margin: 10px 0;
      }

      /* Custom styling for Shoelace buttons */
      // .char-grid sl-button::part(base) {
      //   margin: 0;
      //   padding: 0;
      //   border-radius: 0;
      //   background-color: #f2f2f2;
      //   transition: background-color 0.3s ease, box-shadow 0.3s ease;
      //   border: none;
      //   box-shadow: inset 0 0 0 1px #f2f2f2; /* emulate 1px border */
      // }

      .char-grid sl-button::part(label) {
        font-size: 1.2rem;
      }


    @media screen and (min-width: 868px) { 
        /*  “Only apply the styles inside this block if the screen width is 768 pixels or wider.” */
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
                      
        smart-dialog::part(dialog) {
            max-width: 600px;
            width:50vw;
            min-width: 400px;
        }
    }

    @media screen and (max-width: 867px) {
        /* Mobile-specific styles go here */
        smart-dialog::part(dialog) {
            max-width: 400px;
            width:99vw;
        }
        .char-grid {         
          gap: 0px; /* negative gap helps collapse borders */         
        }
    }
        
    sl-input {
      margin-top: 0.5rem;
    }

    sl-input::part(input) {
      font-size: 1.6rem;
    }     

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      display: flex;
      align-item: center;
    }

    .titleExtra {
      margin-right:0;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      row-gap: 1px;   
      column-gap: 20px;   
      align-items: center;
    }
    </style>`;


    // Include styles and component structure in the template
    template.innerHTML = `${style}
    <smart-dialog esc-close overlay-close draggable>
        <div slot="header">
          <div class="header">
            <span class="title" style="font-size: 1.2rem"><b>IPA</b></span>      
            <div class="titleExtra">
              <div>
              <sl-button id="ukipaBtn" class="uk" size="small">UK</sl-button> <span class="uk" id="ukipa"></span>
              </div>
              <div>
              <sl-button id="usipaBtn" class="us" size="small">US</sl-button> <span class="us" id="usipa"></span>
              </div>
            </div>
          </div>
        </div>        
        <div slot="body" class="body">
            <div class="char-grid"></div>
            <sl-input size="medium" id="ipa_input" class="focusable"></sl-input>     
        </div>
        <div slot="footer_extra">
            <span style="font-size: 0.8rem;"><i>Use lowercase, no number</i></span>
        </div>    
        <div slot="footer" class="footer">
            <sl-button-group> 
              <sl-button size="medium" variant="primary" id="confirm" class="focusable"><sl-icon name="check-circle-fill" slot="prefix"></sl-icon>Confirm</sl-button>
              <sl-button size="medium" variant="default" id="cancel" class="focusable"><sl-icon name="x-circle" slot="prefix"></sl-icon>Cancel</sl-button>
            </sl-button-group> 
        </div>           
    </smart-dialog>     
    <smart-notification></smart-notification>
    `;

    // Attach to shadow DOM
    this.attachShadow({ mode: "open" }).appendChild(
      template.content.cloneNode(true)
    );

    // List of IPA characters
    this._ipaCharacters = [
      "i", "ɪ", "ɛ", "æ", "ɒ", "ɑ", "ʌ", "u", "ʊ", "ə", "ɚ", "ɜ", "ɝ", "ɔ", "iː", "uː", "ɜː", "ɔː", "ɑː", "eː", "ː", "aɪ", "eɪ", "ɔɪ", "aʊ", "əʊ", "ɪə", "eə", "ʊə", "ɪr", "oʊ", "ɛr", "aɪr", "aɪə", "aʊə", "s", "ʃ", "tʃ", "ʒ", "dʒ", "θ", "d", "ð", "n", "ŋ", "ɾ", "t", "t̬", "ɔr", "ˌ", "ˈ", "ʔ","." ];
  }

  disconnectedCallback() {
    // remove eventListener
    this._smart_dialog.removeEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.removeEventListener("smart-dialog-canceled", this._cancelHandler);
    
    // this._ipa_input.removeEventListener("keydown", this._onKeyDown);
    this._ipa_input.removeEventListener("input", this._onInput);

    // remove Children elements
    this.shadowRoot.querySelector(".char-grid").replaceChildren();
    this.shadowRoot.replaceChildren();
      
    // Ensure keyboard handling is detached and stack is updated
    this.unbindKeyEvents();
    this._abort.abort(); // removes all listeners tied to this signal
    FocusStack.pop(this);
  }
  

  connectedCallback() {
    this.render();
    this._abort = new AbortController();
    const { signal } = this._abort;

    this._ukipaBtn.addEventListener('click', ()=>this._insertAvailableIPA(this._ukipa.textContent), {signal});
    this._usipaBtn.addEventListener('click', ()=>this._insertAvailableIPA(this._usipa.textContent), {signal});



    // add EventListeners
    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);
    
    // this._ipa_input.addEventListener("keydown", this._onKeyDown);
    this._ipa_input.addEventListener("input", this._onInput);
  }

    /**
   * Attach keyboard handling for this component (keydown listener).
   */
  bindKeyEvents() {
    // Attach to the input (primary keyboard target) and optionally the dialog
    this._ipa_input.addEventListener("keydown", this._onKeyDown, { capture: true });
   
  }

  /**
   * Detach keyboard handling for this component.
   */
  unbindKeyEvents() {
    this._ipa_input.removeEventListener("keydown", this._onKeyDown, { capture: true });
   
  }

  render() {
    // Grab important DOM elements
    this._smart_dialog = this.shadowRoot.querySelector("smart-dialog");
    // get Global variable requireReconfirm from './../../controllers/appStates.js';
    this._smart_dialog.reconfirm = getAppState("requireReconfirm"); 
    this._confirmBtn = this.shadowRoot.getElementById("confirm");
    this._cancelBtn = this.shadowRoot.getElementById("cancel");

    this._ipa_input = this.shadowRoot.getElementById("ipa_input");
    this._grid = this.shadowRoot.querySelector(".char-grid");


    this._ukipaBtn = this.shadowRoot.getElementById("ukipaBtn");
    this._ukipa = this.shadowRoot.getElementById("ukipa");

    this._usipaBtn = this.shadowRoot.getElementById("usipaBtn");
    this._usipa = this.shadowRoot.getElementById("usipa");


    // Build grid of character buttons
    this._ipaCharacters.forEach((char) => {
      const btn = document.createElement("sl-button");
      btn.setAttribute("size", "small");
      btn.classList.add('focusable');
      btn.textContent = char;

      btn.addEventListener("click", () => {
        const inputEl = this._ipa_input.shadowRoot.querySelector("input");

        const value = inputEl.value;
        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd;

        // Insert character at caret or replace highlighted text
        const charToInsert = btn.textContent;
        inputEl.value = value.slice(0, start) + charToInsert + value.slice(end);

        // Move caret after inserted character
        inputEl.selectionStart = inputEl.selectionEnd =
          start + charToInsert.length;

        // Sync outer Shoelace value
        this._ipa_input.value = inputEl.value;

        // Keep keyboard active
        inputEl.focus();
      });

      this._grid.append(btn);
    });

    // Give focus to input and overlay for keyboard behavior

    this._smart_dialog.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
    this._smart_dialog.focus();
  }

  _confirmHandler() {
    this.dispatchEvent(
      new CustomEvent("smart-ipa-input-confirmed", {
        detail: { value: this._ipa_input.value },
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent("smart-ipa-input-canceled", {
        bubbles: false,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }


  _onKeyDown(e) {
     // Only handle if this is the active component
    if (FocusStack.peek() !== this) return;
    if (["Enter"].includes(e.key)) {
      this._confirmBtn.click(); // mimic confirm Click by endter
    }
  }

  _onInput() {
    const inputEl = this._ipa_input.shadowRoot.querySelector("input");
    const raw = inputEl.value;

    // Combine IPA characters with lowercase a-z letters
    const allowedSet = new Set([
      ..."abcdefghijklmnopqrstuvwxyz ",
      ...this._ipaCharacters.join("").split(""),
    ]);

    // Filter valid characters
    const filtered = [...raw].filter((c) => allowedSet.has(c)).join("");

    // Update value
    inputEl.value = filtered;
    this._ipa_input.value = filtered;

    // Check for invalid characters
    const hasInvalid = [...raw].some((c) => !allowedSet.has(c));
    if (hasInvalid) {
      const host = this.shadowRoot.querySelector("smart-notification");
      if (host) {
        host.show({
          label: "Invalid IPA character!!",
          icon: "info-circle",
          color: "--sl-color-warning-300",
          timer: 2500,
        });
      }
    }
  }

  _insertAvailableIPA (text) {
    this._ipa_input.value = text;
    this._ipa_input.focus();
  }

  open(entry) {
    const current_ipa = entry.user_ipa;
    const ukipa = entry.ukipa? entry.ukipa : null;
    if (ukipa===null) {
      this._ukipaBtn.style.display = "none";
      this._ukipa.style.display = "none";
    } else {
      this._ukipaBtn.style.display = "inline-block";
      this._ukipa.style.display = "inline-block";
      this._ukipa.innerText = `${ukipa}`;
    }
    const usipa = entry.usipa? entry.usipa : null;
    if (usipa===null) {
      this._usipaBtn.style.display = "none";
      this._usipa.style.display = "none";
    } else {
      this._usipaBtn.style.display = "inline-block";
      this._usipa.style.display = "inline-block";
      this._usipa.innerText = `${usipa}`;
    }

    // 🔓 Show the dialog by setting its display to 'flex'
    // this.render();
    this._smart_dialog.style.display = "block";
    // 🧹 Clear any previous input in the dialog's input field
    this._ipa_input.value = current_ipa;

    // 🕵️‍♂️ Find all Shoelace components used in the shadow DOM
    const tagsUsed = new Set(
      Array.from(this.shadowRoot.querySelectorAll("*")) // Get all elements
        .map((el) => el.tagName.toLowerCase()) // Convert tag names to lowercase
        .filter((tag) => tag.startsWith("sl-")) // Keep only Shoelace tags (e.g., sl-input, sl-dialog)
    );

    // console.log(tagsUsed);
    // ⏳ Wait until all Shoelace components are fully defined before interacting with them
    Promise.all(
      Array.from(tagsUsed).map((tag) => customElements.whenDefined(tag))
    ).then(() => {
      // 🎯 Focus the input field once components are ready
      this._ipa_input.focus();

      // 🌟 Make the modal visible by setting its opacity to 1
      this._smart_dialog._handleSmallScreenPosition();

      this._smart_dialog.style.opacity = 1;
      // Register with FocusStack when opened
      FocusStack.push(this);
    });
  }

  close() {
    this._smart_dialog.style.display = "none";
    // Release from FocusStack when closed
    FocusStack.pop(this);
  }
}

// Register the custom element
customElements.define("smart-ipa-input", SmartIpaInput);
