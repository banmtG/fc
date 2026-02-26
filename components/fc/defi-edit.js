import {getDeviceType_Robust} from './../../js/utils/deviceUtils_ex.js';
import {CambridgeDictionaryKnownPos, parsePOS} from './../../js/utils/dictionary.js';
import './../smart/smart-dialog.js';
import './item-editor.js';
import './dragdrop-box.js';

class DefiEdit extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });     
    this.componentCSS = `<link rel="stylesheet" href=".././components/fc/defi-edit.css" />`;
    this.entryData = {};
    // Include styles and component structure in the template

    const template = document.createElement('template');

    // Include styles and component structure in the template
    template.innerHTML =`${this.componentCSS}
      <smart-dialog esc-close overlay-close draggable>     
        <div slot="header" class="header"> 
          <span style="font-size: 1.2rem"><b>Definition Editor</b></span>            
        </div>
        <div slot="body">
        <div class="bodyContainer noScrollable_container">
          <div id="selectEditMode">      
            <span id="userDefine_span" class="defi_option">User define</span>
            <smart-toggle id="toggle" values='[true,false]' icons='["arrow-right-circle","arrow-left-circle"]' 
            colors='["#009999","#009999"]' fontSize="1.5rem" > </smart-toggle>  
            <span id="dictionary_span" class="defi_option">Dictionary</span>
          </div>
          <div id="dragdropScreen" class="screen noScrollable_container">
              <dragdrop-box></dragdrop-box>
          </div>
          <div id="manualScreen" class="screen noScrollable_container">                
          </div>
        </div>
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
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    // this._attachedNotification(); 
  }

  disconnectedCallback() {

    this._smart_dialog.removeEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.removeEventListener("smart-dialog-canceled", this._cancelHandler);

      // this._confirmBtn.removeEventListener("click", this._confirmHandler);
      // this._cancelBtn.removeEventListener("click", this._cancelHandler);

      this.shadowRoot.replaceChildren();
      //window.removeEventListener('keydown', this._boundHandleShortcuts);   

  }
 
  connectedCallback() {
    // Grab important DOM elements
    this._smart_dialog = this.shadowRoot.querySelector("smart-dialog");
    this._smart_dialog.style.display = "none";
    this._confirmBtn = this.shadowRoot.getElementById('confirm');
    this._cancelBtn = this.shadowRoot.getElementById('cancel');

    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);

    this._userDefineSpan = this.shadowRoot.getElementById("userDefine_span");
    //console.log(this._userDefineSpan);
    this._dictionarySpan = this.shadowRoot.getElementById("dictionary_span");
    //console.log(this._dictionarySpan);

    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);
    // this._confirmBtn.addEventListener("click", this._confirmHandler);
    // this._cancelBtn.addEventListener("click", this._cancelHandler);


    // Enable focus trapping for accessibility
    this.toggle = this.shadowRoot.getElementById('toggle');
    // console.log(this.toggle);
    this.dragdropScreen = this.shadowRoot.getElementById('dragdropScreen');
    this.manualScreen = this.shadowRoot.getElementById('manualScreen');

    this.toggle.callbacks ={
      0: () => { 
       // console.log(`toggle value: `,this.toggle.getValue);
        this.entryData.user_defi.selectDefault = true;       
        this._toggleTitle();
        this.dragdropScreen.classList.toggle('active'); 
        this.manualScreen.classList.toggle('active');
       //this.renderDragdropDefiScreen();
        
      },
      1: () => { 
     //   console.log(`toggle value: `,this.toggle.getValue);
        this.entryData.user_defi.selectDefault = false;
        this._toggleTitle();
        this.manualScreen.classList.toggle('active');
        this.dragdropScreen.classList.toggle('active'); 
       // this.renderCustomizeDefiScreen(); //this.renderDragdropDefiScreen();
      },      
    }    
          
    this._smart_dialog.tabIndex = -1; //This makes the overlay element programmatically focusable, but not tabbable.
  }

  _toggleTitle() {
      this._userDefineSpan.classList.toggle('defi_option_selected');
      this._dictionarySpan.classList.toggle('defi_option_selected');
  }
  
_confirmHandler() {
  //console.log(`defi-edit-dialog-confirmed event emitted`);
    console.log(this.entryData.user_defi);
    this.dispatchEvent(new CustomEvent('defi-edit-dialog-confirmed', {    
          detail: { user_defi: this.entryData.user_defi },
          bubbles: false,
          composed: true
    }));
    this._smart_dialog.style.display = "none";
    //this.remove();
  }

  _cancelHandler() {
      //console.log(`defi-edit-dialog-canceled event emitted`);
     // console.log(this.entryData.user_defi);
      this.dispatchEvent(new CustomEvent('defi-edit-dialog-canceled', {
          detail: { user_defi: this.entryData.user_defi },
          bubbles: false,
          composed: true
      }));    
    this._smart_dialog.style.display = "none";
    //this.remove();
  }

    renderDragdropDefiScreen() {

      // console.log(this.entryData.defi);
      if (this.entryData.defi?.length===0) {
        this.dragdropScreen.innerHTML = `<div style="margin: 10px; display: flex; justify-content:center">No data from dictionary</div>`;
        return;
      }
      try {
        if (!Array.isArray(this.entryData.defi)&& this.entryData.defi == []) {
      
          return;          
        }
      } catch (e) {
        return;
      }    
      //console.log(`vaof redner`);
      //this.manualScreen.innerHTML="";
      // console.log('continue after return');
      this.dragdropScreen.replaceChildren();
      this.dragdropScreen.innerHTML = `
      <dragdrop-box></dragdrop-box>`;

      const dragdrop_box = this.dragdropScreen.querySelector("dragdrop-box");
      let arrayObjects = this.entryData.defi;
      
      arrayObjects = arrayObjects.map(item=> {        
        const newPos = parsePOS(item.pos);
        return  {...item,
                   pos: newPos
                }
      })
   
      const renderDefi_callBack = (d, zone) => {
          const infoText = d?.info? `| ${d.info}` : "";
          return `
              <div class="draggable smallScrollBar" draggable="true" data-id="${d._id}">
                <span class="info">${d?.pos} ${infoText}</span><br>
                ${d?.definition}<br>
                <span class="info">${d?.example.split(`\n`).join('<br>')}</span>
              </div>
          `;
      }  

      dragdrop_box.addEventListener("dragdrop-box-changed", e => {
        this.entryData.user_defi.default_defi =  e.detail.indexSelected;
        //console.log("Selected items in order:", e.detail.indexSelected);
      });    
            //console.log(this.entryData.user_defi.default_defi);
      dragdrop_box.data = {arr: arrayObjects, defaultItems: this.entryData.user_defi.default_defi, renderItem:renderDefi_callBack };
      
    }

    renderCustomizeDefiScreen() {
      this.manualScreen.replaceChildren();
      this.manualScreen.innerHTML = `<item-editor></item-editor>`;
      const editor = this.manualScreen.querySelector('item-editor');
      const knownPOS = Object.keys(CambridgeDictionaryKnownPos).map(item=> item.charAt(0).toUpperCase() + item.slice(1,item.length)); // extract all known POS 

      let pos_html =  ``;
      knownPOS.forEach(element => { pos_html = pos_html + 
            `<sl-option value="${element}">${element}</sl-option>`
      });

      const cookPos = (pos) => {        
        if (!Array.isArray(pos)) {
        const result = parsePOS(pos).map(item=> item.replace(/ /g, '_')).map(item=> item.charAt(0).toUpperCase() + item.slice(1,item.length)).join(' ');
        return result;  
      } else return pos.join(" "); 
        //console.log(result);
   
      };

      editor.template = (item) => `
        <sl-input class="focusable" size="medium" placeholder="Definition" value="${item.definition || ''}" name="definition"></sl-input>        
        <sl-textarea class="focusable" rows="2" size="medium" placeholder="Example" value="${item.example || ''}" name="example"></sl-textarea>        
        <sl-select class="focusable" size="medium" value="${item.pos? cookPos(item.pos) : ''}" placeholder="Word/phrase type" multiple clearable maxOptionsVisible=3 hoist=true name="pos">         
          ${pos_html}
        </sl-select>        
        <sl-input class="focusable" name="info" size="medium" placeholder="Info" value="${item.info || ''}" name="info"></sl-input>        
      `;

      //console.log(this.entryData.user_defi.user_defi);
      editor.data = this.entryData;
      
      //console.log(editor.data);
      editor.addEventListener('item-editor-changed', (e)=> {
       // console.log(e.detail.data);
        this.entryData.user_defi.customized_defi = e.detail.data;
      })
    }

    loadInitData(initialValue = {}) {
      this.entryData = initialValue;     
     // this.toggle.setValue = this.entryData.user_defi.selectDefault;
      this.renderDragdropDefiScreen();
      this.renderCustomizeDefiScreen();
      // console.log(`2 screen pre render`);
    }

    open(initialValue = {}) {
      // console.log(initialValue);  
      this.entryData = JSON.parse(JSON.stringify(initialValue));
      //console.log(this.entryData);
      // console.log(this.entryData);

      this.toggle.setValue = this.entryData.user_defi.selectDefault;
      console.log(this.entryData.user_defi.selectDefault);
     // console.log(this.toggle.getValue);
     // console.log(typeof this.toggle.getValue, this.toggle.getValue);
      // console.log(this.toggle.value);
      if (this.toggle.getValue === false) {
          this._dictionarySpan.classList.remove('defi_option_selected');
          this.dragdropScreen.classList.remove('active');
        
          this._userDefineSpan.classList.add('defi_option_selected');
          this.manualScreen.classList.add('active'); 
         // console.log(this.manualScreen.classList);
        //  console.log(this.dragdropScreen.classList);
      } else {
          this._userDefineSpan.classList.remove('defi_option_selected');
          this.manualScreen.classList.remove('active'); 


          this._dictionarySpan.classList.add('defi_option_selected');
          this.dragdropScreen.classList.add('active');
          // this._toggleTitle();
          //    console.log(this.manualScreen.classList);
         // console.log(this.dragdropScreen.classList);
      }
      // console.log(this.toggle.value);
      this.renderDragdropDefiScreen();
      this.renderCustomizeDefiScreen();

     

      // 🔓 Show the dialog by setting its display to 'flex'
      this._smart_dialog.style.display = "block";

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
          this._smart_dialog.style.opacity = 1;
          this._smart_dialog.focus();
          //console.log('last');
                
        requestAnimationFrame(() => {        
          this._smart_dialog.dispatchEvent(new CustomEvent("host_inform_slots_loaded"));
        });
      });
  }
}

customElements.define('defi-edit', DefiEdit);
