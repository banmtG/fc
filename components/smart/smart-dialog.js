/**
 * SmartDialog Web Component
 * =========================
 * A customizable, stylable modal dialog built with Shadow DOM.
 * Features:
 * - Slot-based content injection (header, body, footer)
 * - Optional draggable and resizable behavior
 * - ESC key and overlay click to close
 * - Focus trap for accessibility
 * - Responsive positioning for mobile/tablet
 * - External styling via ::part selectors
 *
 * Usage Example:
  <smart-dialog draggable resizable esc-close overlay-close reconfirm="true">
    <div slot="header">My Title</div>
    <div slot="body">Main content here</div>
    <div slot="footer">
      <sl-button id="confirm">OK</sl-button>
      <sl-button id="cancel">Cancel</sl-button>
   </div>
  </smart-dialog>

  <script>
  this._confirmHandler = this._confirmHandler.bind(this);
  this._cancelHandler = this._cancelHandler.bind(this);

  this._confirmBtn = this.shadowRoot.getElementById('confirm');
  this._cancelBtn = this.shadowRoot.getElementById('cancel');
  this._confirmBtn.addEventListener("click", this._confirmHandler);
  this._cancelBtn.addEventListener("click", this._cancelHandler);

  this._confirmBtn.removeEventListener("click", this._confirmHandler);
  this._cancelBtn.removeEventListener("click", this._cancelHandler);

  </script>
 */

import { getDeviceType_Robust } from './../../js/utils/deviceUtils_ex.js';
import  { trapFocus1 } from './../../js/utils/focus-trap.js';
import './confirm-dialog.js';

class SmartDialog extends HTMLElement {
  static activeDialogs = [];

  constructor() {
    super();
    //this.tabIndex = -1; // Make the host element focusable
    this.attachShadow({ mode: "open" }); // Encapsulate styles and markup

    // Bind event handlers to maintain 'this' context
    this._startDrag = this._startDrag.bind(this);
    this._onDrag = this._onDrag.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onFocusTrap = this._onFocusTrap.bind(this);
    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);
    this._onFooterSlotChange = this._onFooterSlotChange.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this._confirmDialogOpen = this._confirmDialogOpen.bind(this);
    this._dissolveConfirmDiv = this._dissolveConfirmDiv.bind(this);

    // Drag state
    this._isDragging = false;
    this._startX = 0;
    this._startY = 0;
    this._offsetX = 0;
    this._offsetY = 0;
    this._pointerStartedInsideDialog = false;

    // Shadow DOM template
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.4);
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        /* Overlay for modal backdrop */
        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9;
            touch-action: none;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .dialog {
            opacity:0;
            position: absolute;
            top: 50%;
            left: 50%;   
            background: white;
            border-radius: 4px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;     
            width:100px;                
            min-height:100px;
            min-width: 100px;
            max-width: 650px;
            max-height: 95vh;
            overflow: hidden;            
        }

        
        @media screen and (min-width: 768px) { 
        /*  “Only apply the styles inside this block if the screen width is 768 pixels or wider.” */     
        .dialog {
            max-width:100vw;
            width:72vw;
        }
    }

        @media screen and (max-width: 767px) {
            /* Mobile-specific styles go here */
            .dialog {
                max-width:100vw;
                width: calc(100vw - 10px);
            }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .header {
          padding: 0.5rem 0.6rem 0.3rem 0.6rem;
          background: #f0f0f0;      
          flex: 0 0 auto;
        }

        .body {
          flex: 1 1 auto;
          min-height:0;
        }

        .footer {
          flex: 0 0 auto;
          padding: 5px;
          background: #f9f9f9;        
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }

        .footer_extra {
          margin-left: 0;
        }

        .footer_button {
          margin-right: 0;
        }

        ::slotted(sl-button) {
          margin-left: 0.5rem;
        }

        /* No Scrollable Style */
        .noScrollable_container {
          overflow: hidden;     /* Core scroll prevention */
          overscroll-behavior: contain; /* Prevent scroll chaining */
          width: 100%;
          -webkit-overflow-scrolling: touch; /* iOS safari quirk */
          scrollbar-width: none;   /* Firefox: hide scrollbar */
        }

        /* Hide scrollbar for WebKit-based browsers (Chrome, Safari) */
        .noScrollable_container::-webkit-scrollbar {
          display: none;
        }
      </style>
      <div class="overlay" part="overlay">
        <div class="dialog" part="dialog">        
          <div class="header" part="header">
            <slot name="header">Dialog Title</slot>
          </div>
          <div class="body noScrollable_container" part="body">
            <slot name="body">
            </slot>
          </div>
          <div class="footer" part="footer"> 
            <slot class="footer_extra" name="footer_extra"><span></span>
            </slot>
            <slot class="footer_button" name="footer">
            </slot>
          </div>
        </div>
      </div>
      <div id="reConfirmDiv"></div>
    `;
  }

  static get observedAttributes() {
    return ['reconfirm'];
  }

  get reconfirm() {
    return this._reconfirm;
  }

  set reconfirm(val) {
    this._reconfirm = val === true || val === 'true';
    //this.updateUI(); // Optional: react to change
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'reconfirm') {
      this._reconfirm = newVal;
      console.log(this._reconfirm);
    }
  }

  _initializeState() {
    // setTimeout(() => {
    requestAnimationFrame(() => {    
        this._handleSmallScreenPosition();
        // console.log(`host inform something`);
       // console.log(this._getDeepFocusableElementsRecursively(this._dialog));
        this._getDeepFocusableElementsRecursively(this._dialog)[0]?.focus();       
    }); 
    // }, 0);

  }

  connectedCallback() {
    // Cache DOM references

    this.addEventListener("host_inform_slots_loaded", this._initializeState);
    
    this._overlay = this.shadowRoot.querySelector(".overlay");
    this._dialog = this.shadowRoot.querySelector(".dialog");
    this._bodySlot = this.shadowRoot.querySelector('slot[name="body"]');  
    this._header = this.shadowRoot.querySelector(".header");
    this._footer = this.shadowRoot.querySelector(".footer");
    this._reConfirmDiv = this.shadowRoot.querySelector("#reConfirmDiv");

    // this._confirm = this.shadowRoot.querySelector("confirm-dialog");
    // this._confirm.addEventListener("confirm-dialog-Yes", this._confirmHandler);

    // Enable dragging if attribute is present
    if (this.hasAttribute("draggable")) {
      this._header.addEventListener("pointerdown", this._startDrag);
      this._footer.addEventListener("pointerdown", this._startDrag);

      window.addEventListener("pointermove", this._onDrag);
      window.addEventListener("pointerup", this._onDragEnd);

      this._header.style.cursor = "move";
      this._footer.style.cursor = "move";
    }

    // Enable resizing if attribute is present
    if (this.hasAttribute("resizable")) {
      this._dialog.style.resize = "both";
    }

    // Enable ESC key to close
    if (this.hasAttribute("esc-close")) {
       this._dialog.addEventListener("keydown", this._onKeyDown);
    }

    // Enable overlay click to close
    if (this.hasAttribute("overlay-close")) {
      document.addEventListener("pointerdown", this._onPointerDown, {
        passive: true,
      });
      document.addEventListener("pointerup", this._onPointerUp);
      this._overlay.addEventListener("click", this._onOverlayClick);
    }

    // Trap focus inside dialog
    this._dialog.addEventListener("keydown", this._onFocusTrap);

    // Watch for footer slot changes
    this._footerSlot = this.shadowRoot.querySelector('slot[name="footer"]');
    this._footerSlot?.addEventListener("slotchange", this._onFooterSlotChange);

    // Position dialog responsively
    this._handleSmallScreenPosition = this._handleSmallScreenPosition.bind(this);

    // setup custom width
      this._width = this.getAttribute('width')? this.getAttribute('width') : null;
      //console.log(this._width);
      if (this._width!==null) {
       // console.log(`custom width`);
        this._dialog.style.width = this._width;
      }


    //this._bodySlot.addEventListener('slotchange', this._handleSmallScreenPosition);  


    // Track active dialogs for stacking
    SmartDialog.activeDialogs.push(this);
    this.style.zIndex = 1000 + SmartDialog.activeDialogs.length;

    // Focus dialog for accessibility
    //this._dialog.focus();
    //console.log('LLLLAST');
  }

  disconnectedCallback() {
    // Clean up event listeners
    if (this.hasAttribute("draggable")) {
      window.removeEventListener("pointermove", this._onDrag);
      window.removeEventListener("pointerup", this._onDragEnd);
      this._header.removeEventListener("pointerdown", this._startDrag);
      this._footer.removeEventListener("pointerdown", this._startDrag);
    }

    if (this.hasAttribute("esc-close")) {
      this._dialog.removeEventListener("keydown", this._onKeyDown);
    }

    if (this.hasAttribute("overlay-close")) {
      document.removeEventListener("pointerdown", this._onPointerDown);
      document.removeEventListener("pointerup", this._onPointerUp);
      this._overlay.removeEventListener("click", this._onOverlayClick);
    }

    this._dialog.removeEventListener("keydown", this._onFocusTrap);

    // Remove button listeners
    if (this._confirmBtn && this._confirmHandler) {
      this._confirmBtn.removeEventListener("click", this._confirmHandler);
    }
    if (this._cancelBtn && this._cancelHandler) {
      this._cancelBtn.removeEventListener("click", this._cancelHandler);
    }

    //this._bodySlot.removeEventListener('slotchange', this._handleSmallScreenPosition);  


    // Remove slot listener
    if (this._footerSlot && this._onSlotChange) {
      this._footerSlot.removeEventListener(
        "slotchange",
        this._onFooterSlotChange
      );
      this._footerSlot = null;
      this._onSlotChange = null;
    }

    // Clear references
    this._confirmBtn = null;
    this._cancelBtn = null;
    this._confirmHandler = null;
    this._cancelHandler = null;

    // Remove from active dialogs
    SmartDialog.activeDialogs = SmartDialog.activeDialogs.filter(
      (d) => d !== this
    );
  }

  _onPointerDown(e) {
    // Track if pointer started inside dialog to prevent accidental close
    const path = e.composedPath();
    this._pointerStartedInsideDialog = path.includes(this._dialog);
  }

  _onPointerUp(e) {
    // Optional: reset pointer flag if needed
  }

  _onOverlayClick(e) {
    // Only close if pointer started outside dialog and target is overlay
    if (this._pointerStartedInsideDialog) return;
    if (e.target === this._overlay) this._cancelHandler();
  }

  async _onFooterSlotChange() {
    // Get all elements assigned to the footer slot (flattened to include nested slotting)
    const assigned = this._footerSlot.assignedElements({ flatten: true });
   
    // Find all <sl-button> elements inside the assigned footer content
    const slottedButtons = assigned.flatMap((el) =>
      Array.from(el.querySelectorAll("sl-button"))
    );

    // Wait until all <sl-button> elements are defined as custom elements
    await Promise.all(
      slottedButtons.map((btn) => customElements.whenDefined("sl-button"))
    );

    // Ensure each <sl-button> has its shadowRoot initialized before proceeding
    await Promise.all(
      slottedButtons.map((btn) => {
        return new Promise((resolve) => {
          if (btn.shadowRoot) {
            resolve(); // Already initialized
          } else {
            // Wait for shadowRoot to appear using MutationObserver
            const observer = new MutationObserver(() => {
              if (btn.shadowRoot) {
                observer.disconnect();
                resolve();
              }
            });
            observer.observe(btn, { childList: true });
          }
        });
      })
    );

   this._handleSmallScreenPosition();
    //this._dialog.focus();
    // Once buttons are ready, reveal the dialog visually
    // this._dialog.style.visibility = "visible";


    // Loop through assigned footer elements to find confirm/cancel buttons
    for (const el of assigned) {
      const confirm = el.querySelector("#confirm");
      const cancel = el.querySelector("#cancel");     

      // Attach confirm button handler if not already bound
      if (confirm && !this._confirmBound) {
        this._confirmBtn = confirm;
        this._confirmBtn.addEventListener("click", this._confirmDialogOpen);
        this._confirmBound = true;
      }

      // Attach cancel button handler if not already bound
      if (cancel && !this._cancelBound) {
        this._cancelBtn = cancel;
        this._cancelBtn.addEventListener("click", this._cancelHandler);
        this._cancelBound = true;
      }
    }
    //console.log(this._getDeepFocusableElementsRecursively(this._dialog));
  }

  _handleSmallScreenPosition() {
    setTimeout(() => {        
      requestAnimationFrame(() => {
        const parentRect = this.shadowRoot.host.getBoundingClientRect(); // Host element bounds
        const dialogRect = this._dialog.getBoundingClientRect(); // Dialog bounds

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // console.log(`parentRect.width`,parentRect.width);
        // console.log(`parentRect.height`,parentRect.height);
        // console.log(`dialogRect.width`,dialogRect.width);
        // console.log(`dialogRect.height`,dialogRect.height);
        // console.log(`screenWidth`,screenWidth);
        // console.log(`screenHeight`,screenHeight);

        // Center the dialog horizontally and vertically
        const initialLeft = parentRect.width / 2 - dialogRect.width / 2;
        const initialTop = parentRect.height / 2 - dialogRect.height / 2;

        this._dialog.style.left = `${initialLeft}px`;
        this._dialog.style.top = `${initialTop}px`;

        // console.log(`left`,this._dialog.style.left);
        // console.log(`top`,this._dialog.style.top);

        // Adjust top position for mobile/tablet to avoid edge clipping
        if (
          getDeviceType_Robust() === "mobile" ||
          getDeviceType_Robust() === "tablet"
        ) {
          console.log(`small screen`);
          this._dialog.style.top = `10px`;
        } else {        
          console.log(`big screen`);
        }
      });
      this._dialog.style.opacity = 1;
      //console.log(`finish handleSmallScreen`);      
    },0);
  }

  _startDrag(e) {
    // Prevent dragging if pointer starts on a button
    if (e.target.closest("button, sl-button")) return;
    // Prevent smart-toggle to be non-clickable 
    if (e.target.closest('smart-toggle')) {
      // console.log(`click on smart toggle`);
      return; // Let toggle handle its own events
    }

    this._isDragging = true;
    this._dragMoved = false;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._currentTransformX = 0;
    this._currentTransformY = 0;

    this._dialog.setPointerCapture(e.pointerId); // Lock pointer to dialog

    // Get initial position from computed style
    const style = window.getComputedStyle(this._dialog);
    this._initialLeft = parseFloat(style.left);
    this._initialTop = parseFloat(style.top);
  }

  _onDrag(e) {
    if (!this._isDragging) return; // Exit if drag hasn't started

    const dx = e.clientX - this._dragStartX; // Horizontal distance moved since drag started
    const dy = e.clientY - this._dragStartY; // Vertical distance moved since drag started

    this._currentTransformX = dx; // Store current horizontal offset
    this._currentTransformY = dy; // Store current vertical offset

    //  Apply transform only if movement exceeds threshold
    //  Apply visual movement using transform (doesn't affect layout)
    //if (dx > 1 || dy > 1) {
      this._dragMoved = true;
      this._dialog.style.transform = `translate(${dx}px, ${dy}px)`;
   // }
  }

  _onDragEnd(e) {
    if (!this._isDragging) return; // Exit if drag wasn't active
    this._isDragging = false; // Reset drag state

    setTimeout(() => {
      this._dragMoved = false;
    }, 0); // Reset drag flag on next tick

    this._dialog.style.transition = "none"; // Prevent flashing

    const rect = this._dialog.getBoundingClientRect();
    // Get the dialog's current position on screen (includes transform visually, but not in layout)

    const parentRect = this.shadowRoot.host.getBoundingClientRect();
    // Get the position of the host element (used as reference for calculating relative position)

    //   const newLeft = rect.left - parentRect.left + this._currentTransformX;
    // ❗ This line is problematic:
    // `rect.left` already includes the visual offset from transform,
    // so adding `this._currentTransformX` again causes double movement.
    // Instead, you should use the original left value before transform.
    //   const newTop = rect.top - parentRect.top + this._currentTransformY;
    // ❗ Same issue here — `rect.top` already reflects the visual position.

    // Calculate new position based on initial offset and drag delta
    const newLeft = this._initialLeft + this._currentTransformX;
    const newTop = this._initialTop + this._currentTransformY;

    // Apply final position and reset transform
    this._dialog.style.left = `${newLeft}px`; // Commit new horizontal position
    this._dialog.style.top = `${newTop}px`; // Commit new vertical position
    this._dialog.style.transform = `translate(0, 0)`; // Reset transform to zero after using it to move
  }

  _confirmDialogOpen () {
    //console.log(`vao _confirmDialogOpen`);    
    if (this._reconfirm) {  
      this._confirm = document.createElement('confirm-dialog');
      this._reConfirmDiv.append(this._confirm);
      this._confirm.addEventListener("confirm-dialog-Yes", this._confirmHandler);     
      this._confirm.addEventListener("confirm-dialog-No", this._dissolveConfirmDiv);
      this._confirm.open("Are you sure?");
    } else {
      this._confirmHandler();
    }
  }

  _dissolveConfirmDiv() {
    if (this._reconfirm) {  
      this._confirm?.removeEventListener("confirm-dialog-Yes", this._confirmHandler);
      this._confirm?.removeEventListener("confirm-dialog-No", this._dissolveConfirmDiv);
      this._confirm?.remove();  
    }
  }

  _confirmHandler() {
    this._dissolveConfirmDiv();
   // console.log(`Smart dialog wrapper confirmed emitted -------------- `); // Optional debug log
    // Emit a custom event to notify parent components that the dialog was confirmed
    this.dispatchEvent(
      new CustomEvent("smart-dialog-confirmed", {
        bubbles: false, // Allows the event to bubble up through the DOM
        composed: true, // Enables the event to cross shadow DOM boundaries
      })
    );
  }

  _cancelHandler() {
    this._dissolveConfirmDiv();
   //console.log(`Smart dialog wrapper canceled emitted --`); // Optional debug log

    // Emit a custom event to notify cancellation
    this.dispatchEvent(
      new CustomEvent("smart-dialog-canceled", {
        bubbles: false,
        composed: true,
      })
    );
  }

  _onKeyDown(e) { // handle ESCAPE Key
    console.log(e);
    if (e.key !== 'Escape') return;
    if (e.key === "Escape") {
      let el = this._getDeepActiveElement();
      // console.log(el);
      // Traverse up the DOM tree to find the closest smart-dialog
      while (el && el !== document.body) {
        // console.log(el);
        if (el.tagName === 'SMART-DIALOG') {
          el._cancelHandler?.(); // Call cancel if available
          break;
        }
        el = el.parentNode || el.host; // Support shadow DOM traversal
      }
    }
  }

  _getDeepActiveElement(doc = document) { //this function will get the deep active element inside shadowDOM
    let active = doc.activeElement;
    while (active?.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  }

  _onFocusTrap(e) {
    if (e.key === "Escape") return;
    if (e.key !== 'Tab' ) return;
    trapFocus1(e, this._getDeepFocusableElementsRecursively(this._dialog));
  }

  _getFocusableElementsFromClass(el) {
      const slots = el.querySelectorAll('slot');
      console.log(slots);
      const assignedElements = Array.from(slots).flatMap(slot =>
          slot.assignedElements({ flatten: true })
      );
      console.log(assignedElements);
  
      const allFocusableElements = assignedElements.flatMap((d) =>Array.from(d.querySelectorAll(".focusable"))).filter(el=>this._isTrulyVisible(el));
      
      console.log(allFocusableElements);
      return allFocusableElements;
  }

 _getDeepFocusableElementsRecursively(root) {
  const focusables = [];

  const isFocusable = (el) =>
    el.classList?.contains('focusable') && this._isTrulyVisible(el);

  const traverse = (node) => {
    if (isFocusable(node)) {
      focusables.push(node);
    }

    // If it's a slot, traverse its assigned elements
    if (node.tagName === 'SLOT') {
      node.assignedElements({ flatten: true }).forEach(traverse);
    }

    // If it has a shadow root, traverse inside it
    if (node.shadowRoot) {
      node.shadowRoot.childNodes.forEach(traverse);
    }

    // Traverse regular child nodes
    node.childNodes.forEach(traverse);
  };

  traverse(root);
  // console.log(focusables);
  return focusables;
}



  _getFocusableElements(el) {
      const slots = el.querySelectorAll('slot');
      const assignedElements = Array.from(slots).flatMap(slot =>
          slot.assignedElements({ flatten: true })
      );
      // console.log(assignedElements);
  
      const allElements = assignedElements.flatMap((d) =>Array.from(d.querySelectorAll("*"))
          );

      //    console.log(allElements);
          
      const focusable = allElements.filter(el => {
          // Native focusable elements
          const isNativeFocusable = el.matches(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]'
          );

          console.log(isNativeFocusable);
        //  console.log(isNativeFocusable);

          // Custom elements like sl-button (Shoelace) or others
          const isCustomFocusable =
          el.tagName.startsWith('SL-') && typeof el.focus === 'function';

          console.log(isCustomFocusable);
        //  console.log(isCustomFocusable);

          // Must be visible
          const isVisible = true;
          //const isVisible = el.offsetParent !== null;
          // console.log(isVisible);

          return (isNativeFocusable || isCustomFocusable) && isVisible;
      });

      console.log(focusable);
      return focusable;
  }

  _isVisible(el) {
    return !!(el && el.offsetParent !== null);
  }

  _isTrulyVisible(el) {
    // console.log(this._isVisible(el));
    // console.log(this._hasSize(el));
    // console.log(this._isInViewport(el));
    return this._hasSize(el) && this._isInViewport(el);
  }

  _isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  _hasSize(el) {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  focus() {
    // Option 1: Focus the host element itself
    super.focus?.(); // Call native focus if available

  // Option 2: Focus an internal element (like an input or button)
    const focusTarget = this.shadowRoot?.querySelector('[tabindex]');
    if (focusTarget) {
      focusTarget.focus();
    }
  }
  
}


customElements.define("smart-dialog", SmartDialog);
