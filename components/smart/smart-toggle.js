/* <body>
    <smart-toggle
      id="tog3"
      values='["On","Off"]'
      icons='["toggle-on","toggle-off"]'
      colors='["red","#999999"]'
      fontSize='2.5rem'>
    </smart-toggle>    
    <script>
      const toggle = document.querySelectorAll("smart-toggle");  
      toggle.forEach((eachtog) => { 
          eachtog.callbacks ={
              0: () => console.log(`${eachtog.id} Toggle value ${eachtog.value} `),
              1: () => console.log(`${eachtog.id} Toggle value ${eachtog.value} `),       
          }    
      });  
    </script> 
    </body>
*/
class SmartToggle extends HTMLElement {
  constructor() {
    super(); // Call the parent constructor

    this._onToggle = this._onToggle.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
    
    // 🔢 Current selected index, initiall set to 0
    this._index = 0;
    this._lastClick =0;

    // 🔁 Map of callback functions for each state
    this.callbacks = {};   
    
    this.tabIndex = -1; // Allows the host to receive focus
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
  
  disconnectedCallback() {     
    this._button.removeEventListener('click', this._onToggle);
    this._button.removeEventListener('keydown', this._onKeydown);
    this.shadowRoot.replaceChildren();
  }
 
  // Lifecycle method called when element is added to the DOM
  connectedCallback() {
    // Parse values and icons from element attributes
    this.valuesArray = JSON.parse(this.getAttribute("values") || '[true,false]');
    this.iconsArray = JSON.parse(this.getAttribute("icons") || '["check",""]');
    this.colorsArray = JSON.parse(this.getAttribute("colors") || '["#999999","#0000FF"]');  
    this.tooltipsArray = JSON.parse(this.getAttribute("tooltips") || '[]');   

    this.fontSize = this.getAttribute("fontSize") || '1.6rem'  ;
    //console.log(this.fontSize);

    this.id =this.getAttribute("id") || 'Toggle_id'  ; // Check id of this toggle or just call "Toggle"
    
    this.btnBorder = this.hasAttribute("btnBorder"); // True or false if btnBorder of this toggle or just set no border
    this.btnHover =  this.hasAttribute("btnBorder"); // True or false if btnBorder of this toggle to set Hover color on button 
 
    this.value = this.valuesArray[this._index];  // Store the value of status for external references

    // Prepare template with embedded styles
    const template = document.createElement("template");


     /*this to add border and hover effect to smart-toggle with button style*/    
      /* Space between ring and button edge */
    const styleBtn = this.btnBorder? `
    button {
        padding:2px;
        background-color: var(--sl-color-neutral-0); 
        border: var(--sl-input-border-width) solid var(--sl-input-border-color);
    }

    @media (hover: hover) and (pointer: fine) {
        button:hover {
            border-color: var(--sl-focus-ring-color);
            background-color: var(--sl-color-primary-50);                            
        }
    }
    ` : "";

    //console.log(this.btnBorder);

    const style = `<style>
        :host{
            display:flex;
            align-items:center;
            justify-content: center;
        }       

        button {
            all: unset;
            cursor: pointer;
            display:flex;
            align-items: center;
            justify-content: center;
            padding: 0;        
            border-radius: 4px;  
            font-size: ${this.fontSize}
        }    

        button:focus-visible {     
            outline: var(--sl-focus-ring-style) 2px var(--sl-focus-ring-color);
        }

        ${styleBtn}
    </style>`;
    //console.log(this.iconsArray[this._index]);

    // Include styles and component structure in the template  
    template.innerHTML = `${style}
        <button part="base" tabindex="0">
            <sl-icon part="icon"></sl-icon>
        </button>
    `;        
 
    // Attach to shadow DOM
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    this._button = this.shadowRoot.querySelector('button');
    this._icon = this.shadowRoot.querySelector('sl-icon');

    this._button.addEventListener('click', this._onToggle);
    this._button.addEventListener('keydown', this._onKeydown);

    if (this.tooltipsArray.length>0) {
        if (!(this._button.parentNode instanceof HTMLElement && this._button.parentNode.tagName.toLowerCase() === 'sl-tooltip')) {//🔧 Fix: Before wrapping, check if the button is already inside a tooltip:
          const tooltipWrapper = document.createElement("sl-tooltip");
          this._button.parentNode.insertBefore(tooltipWrapper, this._button);
          tooltipWrapper.append(this._button);          
        }
        this._tooltip = this.shadowRoot.querySelector('sl-tooltip');
    }  
    
    // Initial rendering of the button
    this.render_UI(); 
  }

  set setValue(newValue) {
    // console.log(this.valuesArray);
    // console.log(newValue);
    const index = this.valuesArray.findIndex(v => String(v) === String(newValue));
    // console.log(index);
    if (index === -1) {
      console.warn(`smart-toggle: Invalid value "${newValue}"`);
      return;
    }

    this._index = index;
    this.value = newValue;

    this.render_UI();

    // Optionally trigger callback
    const cb = this.callbacks?.[index];
    if (typeof cb === "function") cb();

    // Optionally emit event
    this.emitChange();
}

  get getValue() {
    const val = this.value;
   // console.log(typeof val, val);
    return val; // Default to string
  }

  _onToggle(e) {
    // prevent double clicks or accidentally clicking so fast
        const now = Date.now();
        if (now - this._lastClick < 100) { 
            //console.log(`click too fastt`); 
        return;  }// Ignore if too fast
        this._lastClick = now;  
   
    // Move to next index (looping back if needed)
    this._index = (this._index + 1) % this.valuesArray.length;

    this.value = this.valuesArray[this._index];

    // Call associated callback if available
    const cb = this.callbacks[this._index];

    if (typeof cb === "function") cb();
    this.render_UI();
  
    // Emit custom event with new state
    this.emitChange();
  }

  setDefaultValue() {
    this._index=0;
    this.render_UI();
  }

 render_UI() {     
    const color = this.colorsArray[this._index] || "";
    const iconName = this.iconsArray[this._index] || "";    
    this._icon.setAttribute("name", iconName);
    this._icon.style.color = color;     

    if (this.tooltipsArray.length>0) // there is at least a tooltip
    {
        const tooltip_content = this.tooltipsArray[this._index]? this.tooltipsArray[this._index] : "";
        this._tooltip.setAttribute("content", tooltip_content);
    }
 }    
  
  // ⌨️ Keyboard accessibility handler (Space or Enter triggers toggle)
  _onKeydown(e) {

    // 🎹 Listen for Ctrl/Command + Z/Y for undo/redo
    const isMac = navigator.platform.includes("Mac"); // Detect platform
    const cmd = isMac ? e.metaKey : e.ctrlKey;         // Use Command (Mac) or Ctrl (Win)

    // Ctrl+Z or Cmd+Z = undo
    if (cmd && e.key.toLowerCase() === "z") {
      this.undo();
      e.preventDefault();
    }

    // Ctrl+Y or Cmd+Y = redo
    if (cmd && e.key.toLowerCase() === "y") {
      this.redo();
      e.preventDefault();
    }

    // shortcut with Spacebar or Enter to toggle
    if (e.key === " " || e.key === "Enter") {
      this._onToggle();
      e.preventDefault(); // Prevent default scroll or submit
    }

  }

  // 📡 Emit custom event "toggle-change" with current value and index
  emitChange() {      
    //console.log(`smart-toggle-change ${this.id} emit ${this.value}`);
    this.dispatchEvent(new CustomEvent("smart-toggle-change", {
      detail: {
        id: this.id,
        value: this.value,
        index: this._index
      },
      bubbles: false,
      composed: true
    }));
  }

}

// 🌐 Register the custom element
customElements.define("smart-toggle", SmartToggle);
