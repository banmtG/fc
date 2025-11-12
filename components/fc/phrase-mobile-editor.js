import './pos-badge-group.js';
import './defi-edit.js';
import  { getAllUniquePOS } from './../../js/utils/dictionary.js';
import './../smart/smart-ipa-input.js';
import './../smart/smart-text-input.js';

class PhraseMobileEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = [];
    this.currentIndex = 0;
    this.history = [0];

    // 🧼 Bind the global key handler so we can unbind later
    this._onKeydown = this._onKeydown.bind(this);
    // 📍 We'll track the click handler for removal too
    this._onClick = this._onClick.bind(this);
  }

  connectedCallback() {
    
  }

  // 🧹 Remove all listeners and cleanup when disconnected
  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    this.shadowRoot.removeEventListener('click', this._onClick);
  }

  // 🔌 Pass in data dynamically using a setter
  set setData(value) {
    //console.log(value);
    this.data = this.cookUserDataFromDefault(value);    
    console.log(this.data);
    this.renderInit();
    this.renderNavInit();
    this.currentIndex = 0;
    this.history = [0];
    this.renderChange();
    this.addListeners();
  }

  emitEvent(name) {
    this.dispatchEvent(new CustomEvent(name, {
      detail: this.data[this.currentIndex],
      bubbles: true,
      composed: true,
    }));
  }

  // 🧠 These handlers are separated for clean removal
  _onKeydown(e) {
  if (e.ctrlKey && e.key === 'z') {    this.undo();    return;  }  // Undo: Ctrl + Z
  if (e.ctrlKey && e.key === 'y') {    this.redo();    return;  }   // Redo: Ctrl + Y
  if (e.key === 'ArrowLeft') { this.moveLeft_theNavList(); return; }  // Navigate Left (previous phrase)
  if (e.key === 'ArrowRight') {  this.moveRight_theNavList(); return;   }  // Navigate Right (next phrase)
}

  _onClick(e) {
    const index = e.target.dataset?.index;
    if (index !== undefined) {
      this.currentIndex = Number(index);
      this.history.push(this.currentIndex);
      this.renderChange();
      this.emitEvent('select');
    }
  }

  moveLeft_theNavList() {if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.history.push(this.currentIndex);
      this.renderChange();
      this.emitEvent('select');
    } 
  }

  moveRight_theNavList() {
    if (this.currentIndex < this.data.length - 1) {
        this.currentIndex += 1;
        this.history.push(this.currentIndex);
        this.renderChange();
        this.emitEvent('select');
    }
  }

  addListeners() {
    document.addEventListener('keydown', this._onKeydown);
    this.shadowRoot.addEventListener('click', this._onClick);
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      this.currentIndex = this.history[this.history.length - 1];
      this.renderChange();
    }
  }

  redo() {
    const next = this.currentIndex + 1;
    if (next < this.data.length) {
      this.currentIndex = next;
      this.history.push(next);
      this.renderChange();
    }
  }

  playAudio(src) {
    new Audio(`https://dict.naver.com/${src}`).play();
  }

  renderInit() {  
    this.componentCSS = `<link rel="stylesheet" href=".././components/fc/phrase-mobile-editor.css" />`;
    this.shadowRoot.innerHTML = this.componentCSS + `<div class="noScroll_container"><sl-card class="card-basic" id="container"></sl-card><div id="nav" class="scroll-prompt_horizon scrollBar_hidden scroll-area"></div></div><ipa-input></ipa-input>`;
   
    
    // const ipa_pop =  this.shadowRoot.querySelector('ipa-input');
    // ipa_pop.open("Phrases", "abscond");

    // ipa_pop.addEventListener('ipa-input-confirmed', (e) => {
    //   console.log("Confirmed:", e.detail);
    // });

    // ipa_pop.addEventListener('ipa-input-canceled', () => {
    //   console.log("User cancelled input");
    // });
    
  }

  renderNavInit() {
    const nav = this.shadowRoot.getElementById('nav');
      nav.innerHTML = `
        <span class="nav-position">
          ${this.currentIndex + 1} / ${this.data.length}
        </span>
        ${this.data.map((entry, i) => `
          <sl-button class="phrase-dot scroll-item" variant="${this.currentIndex === i ? 'primary' : 'default'}" data-index="${i}">
            ${entry.phrase}
          </sl-button>
        `).join('')}
      `;
      //console.log(nav);
  }

  initDragLogic() {

  }

  _createDefiDivHtml(entry) {   
    let defArray;
    if (entry.user_defi?.selectD===true) {
      defArray = Array.isArray(entry.user_defi.default_defi)? this.extractFromDefiObjects(entry.user_defi.default_defi, entry.defi) : "";
    } else {
      defArray = Array.isArray(entry.user_defi.user_defi)? this.entry.user_defi.user_defi : "";
    }
   
    if (!Array.isArray(defArray)) return "";
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
    defArray.forEach(({pos, info, definition, example}) => {    
      const posHtml = `<pos-badge-group pos="${pos}"></pos-badge-group>`;
      const infoHtml = info? `<i style="color:#fff; padding: 0 5px; margin:3px; background: #ccc">${info}</i>` : "";
      const shortDef = `<div style="color: black;">${posHtml} ${infoHtml} ${definition}</div>`;
      const exampleArray = example?.split('\n');
      
      let exampleHtml = ``;
      exampleArray.forEach(exam=> { exampleHtml = exampleHtml + `<div class="examChild">${exam}</div>` } );
      //console.log(exampleArray);
      const details = document.createElement('sl-details');
      // Create and assign a summary slot
        const summary = document.createElement('div');
        summary.setAttribute('slot', 'summary');
        summary.innerHTML = `${shortDef}`;      
        details.appendChild(summary);
        // Create and append content
        const content = document.createElement('div');
        content.innerHTML = `${exampleHtml} `;
        content.classList.add('scrollBar_hidden');
        details.appendChild(content);
        if (example==="") { 
          // console.log(`vaof 0`);
          details.setAttribute('disabled',true); 
        }
        else {
          details.setAttribute('open',true);
        }
      container.appendChild(details);
  });

  const result_html = container.innerHTML;
  container.replaceChildren();
  container.remove();
  return result_html;
}

  hasVerticalScroll(el) {
    return el.scrollHeight > el.clientHeight;
  }

  measureTextSize(text, styles = {}) {
      const el = document.createElement('div');

      // Apply base styles
      Object.assign(el.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre', // preserve spacing
        top: '-9999px',
        left: '-9999px',
        ...styles
      });

      el.textContent = text;
      document.body.appendChild(el);

      const rect = el.getBoundingClientRect();
      document.body.removeChild(el);

      return {
        width: rect.width,
        height: rect.height
      };
  }

  adjustHeaderFont(el) {
    // setTimeout(() => {
      let lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      let fontSize = parseFloat(getComputedStyle(el).fontSize);
      console.log(fontSize);
      let lineCount = Math.floor(el.scrollHeight / lineHeight);
      let hasScroll = this.hasVerticalScroll(el);
      
      
       let interval =  setInterval(() => {
        requestAnimationFrame(() => {
          if (hasScroll && fontSize >= 16) {
            console.log(el.offsetWidth);
            console.log(el.getBoundingClientRect());
            console.log(el.outerWidth);
            console.log(JSON.stringify(getComputedStyle(el)["-moz-transform-origin"]));
            console.log(getComputedStyle(el)["-moz-transform-origin"]);
            console.log(getComputedStyle(el));
            console.log(getComputedStyle(el).width);

            fontSize -= 1;
            console.log(fontSize);
            el.style.fontSize = `${fontSize}px`;
            // After changing font size, recalculate line height and line count
            lineHeight = parseFloat(getComputedStyle(el).lineHeight);
            lineCount = Math.floor(el.scrollHeight / lineHeight) - 1;      
            hasScroll = this.hasVerticalScroll(el);   
            console.log(hasScroll);  
          } else clearInterval(interval);

          });
        }, 200);
        
    
    // }, 400);
  }

  _createPhraseTitleHtml(entry) {
    let result_Html =  `<div style="overflow: hidden; max-height: 65px; margin: 0px 0; display: flex; gap:0.5rem; align-items: center;"><sl-button size="small" id="phraseEditBtn">></sl-button><h2>${entry.phrase}</h2><pos-badge-group pos="${getAllUniquePOS(entry)}"></pos-badge-group></div>`;  // use getAllUniquePOS function from utils/dictionary.js
    return result_Html;
  }

  renderCard() {

    const entry = this.data[this.currentIndex];
    //console.log(entry);
    const container = this.shadowRoot.getElementById('container');
    container.replaceChildren();
    //console.log(entry.user_defi.default);

    let defi_Html = this._createDefiDivHtml(entry);
    let phrase_Html = this._createPhraseTitleHtml(entry);

    container.innerHTML = `     
        ${phrase_Html}
        <sl-divider></sl-divider>  
        <sl-button size="small" id="ipaEditBtn">IPA</sl-button> ${entry.user_ipa ? "/" + entry.user_ipa + "/" : ""}         
        <sl-button size="small" onclick="this.getRootNode().host.playAudio('${entry.user_sound.default}')">🔊</sl-button> 
        <sl-divider></sl-divider>     
        <div style="display:flex; gap:5px; flex-direction:column;"><sl-button size="small" id="definitionEditBtn">Definition</sl-button>${defi_Html}</div>
        <sl-divider></sl-divider>
        <sl-button size="small">Translate</sl-button> ${entry.user_translate}
        <sl-divider></sl-divider>
        <sl-button size="small">Note</sl-button> ${entry.user_note}
        <sl-divider></sl-divider>
        <sl-button size="small">Connected</sl-button> ${entry.related_phrases}
        <sl-divider></sl-divider>
        <sl-button size="small">Image</sl-button> ${entry.user_img}
        <sl-divider></sl-divider>
        <sl-button size="small" onclick="this.getRootNode().host.emitEvent('submit')">Submit</sl-button>
        <sl-button size="small" onclick="this.getRootNode().host.emitEvent('cancel')">Cancel</sl-button>
    `;    


      // setTimeout(() => {
      //   console.log(this.getLineCount(header));
      // }, (500));
   
    // const header = container.querySelector('h2');
    // this.adjustFontSizeIfOverflow(header);

    //Garbage collection kicks in once all references to the element are dropped. 
    defi_Html = null;
    phrase_Html = null;

    const header = container.querySelector('h2');

    this._handlePhraseTitleEdit(entry.phrase);
    this._handleIPAEdit(entry.user_ipa);
    this._handleDefinitionEdit(entry);

    this.adjustHeaderFont(header);
  }

  _handleIPAEdit(current_ipa) {
    const btn = this.shadowRoot.getElementById('ipaEditBtn');
    btn.addEventListener('click',()=>{
      const IPAEditPopUp = document.createElement('smart-ipa-input');
      this.shadowRoot.append(IPAEditPopUp);       

        IPAEditPopUp.open(current_ipa);
        IPAEditPopUp.addEventListener('smart-ipa-input-confirmed', (e) => {
          console.log("Confirmed:", e.detail);    
          this.data[this.currentIndex].user_ipa = e.detail.value;
          this.renderCard();
          IPAEditPopUp.replaceChildren();
          IPAEditPopUp.remove();
        });

        IPAEditPopUp.addEventListener('smart-ipa-input-canceled', () => {
          console.log("User cancelled input");
          IPAEditPopUp.replaceChildren();
          IPAEditPopUp.remove();
        });
    })      
  }

  _handlePhraseTitleEdit(current_phraseTitle) {    
    const btn = this.shadowRoot.getElementById('phraseEditBtn');
    btn.addEventListener('click',()=>{
      this._PhraseEditPopUp = document.createElement('smart-text-input');
      this.shadowRoot.append(this._PhraseEditPopUp);        
          this._PhraseEditPopUp.open("Phrase Editor", current_phraseTitle);
          this._PhraseEditPopUp.addEventListener('smart-text-input-confirmed', (e) => {
            console.log("Confirmed:", e.detail);    
            const header = this.shadowRoot.querySelector('h2');
            header.style.fontSize = `2.5rem`;
            this.data[this.currentIndex].phrase = e.detail.value;
            this.renderCard();
            this._PhraseEditPopUp.replaceChildren();
            this._PhraseEditPopUp.remove();
          });
          this._PhraseEditPopUp.addEventListener('smart-text-input-canceled', () => {
            console.log("User cancelled input");
            this._PhraseEditPopUp.replaceChildren();
            this._PhraseEditPopUp.remove();
          });
      
    })
    
  }

  _handleDefinitionEdit(current_entry) {
    const btn = this.shadowRoot.getElementById('definitionEditBtn');
    btn.addEventListener('click',()=>{
      const definitionEditorPopUp = document.createElement('defi-edit');
      this.shadowRoot.append(definitionEditorPopUp);     
      
      definitionEditorPopUp.open(current_entry);
      
      // definitionEditorPopUp.open(current_ipa);
        // IPAEditPopUp.addEventListener('ipa-input-confirmed', (e) => {
        //   console.log("Confirmed:", e.detail);    
        //   this.data[this.currentIndex].user_ipa = e.detail.value;
        //   this.renderCard();
        //   IPAEditPopUp.remove();
        // });

        // IPAEditPopUp.addEventListener('ipa-input-canceled', () => {
        //   console.log("User cancelled input");
        //   IPAEditPopUp.remove();
        // });
    })    

  }

  renderNavChange() {
    const nav = this.shadowRoot.getElementById('nav');
    const activeDot = nav.querySelector(`[data-index="${this.currentIndex}"]`);
    //console.log(activeDot);
      if (activeDot) {
        nav.querySelectorAll(`sl-button`).forEach(but=> but.setAttribute('variant','default'));
        activeDot.setAttribute('variant','active');
        setTimeout(()=>{
          this.ensureInView(activeDot,{
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        },10);
    }
  }


  renderChange() {    
    this.renderCard();
    this.renderNavChange();
  }

  ensureInView(element, options = { behavior: 'smooth', block: 'nearest', inline: 'center' }) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const isVisible =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isVisible) {
      element.scrollIntoView(options);
    }
  }

  extractFromDefiObjects(arr, defiString) {
    let parsedDefs = [];
    try {
      const parsed = JSON.parse(defiString);
      if (!Array.isArray(parsed)) {
        console.warn("Parsed defiString is not an array.");
        return [];
      }
      parsedDefs = parsed;
    } catch (err) {
      console.error("Failed to parse defiString:", err);
      return [];
    }
    const result = arr.filter(i => Number.isInteger(i) && i >= 0 && i < parsedDefs.length)
      .map(i => parsedDefs[i]);
    return result;
}

  cookUserDataFromDefault(phrases, userLang = 'vi') {
    const translationKey = `lang-${userLang}`;
    // Helper: safely parse definitions and extract the first two
    function getDefi(defiString) {        
        try {
          const result = {
          selectD: false,
          user_defi: [{definition:"", example:"", pos:"", info:"" }],
          default_defi: null,
          }

          const defs = JSON.parse(defiString);
          // return { default: defs.map((_,index)=>index) }
          if (!Array.isArray(defs)) return result;
          const default_calculattion = defs.length >= 2 ? [0, 1] : defs.length === 1 ?  [0] : [];

          result.selectD = true;
          result.default_defi = default_calculattion;

          return result;
        } catch (e) {
          console.log(e);
          return [];
        }
      }

      // function getDefiNoDefault() {        
      //   try {
      //     const defs = JSON.parse(defiString);
      //     return { default: defs.map((_,index)=>index) }
      //     if (!Array.isArray(defs)) return [];
      //     return defs.length >= 2 ? { default: [0, 1] } : defs.length === 1 ? { default: [0] } : [];
      //   } catch {
      //     return [];
      //   }
      // }


      // Helper: extract examples from definitions
      function extractTwoDefaultExamples(defiString) {
        const defs = extractTwoFirstDefiObjects(defiString);
        return defs.flatMap(def => {
          if (def.example) {
            return def.example.split('\\n').slice(0, 2);
          }
          return [];
        });
      }

      // Helper: check if imgUrl is a valid non-empty list
      function isValidImgList(imgString) {
        return typeof imgString === 'string' && imgString.includes(',') && imgString.split(',').length > 0;
      }

      function isNonEmpty(val) {
      return val !== null && val !== undefined && val !== '';
      }

      function simpleHash(text) {  // [...'hello'] // → ['h', 'e', 'l', 'l', 'o']
        return [...text].reduce((hash, char) => {
          return (hash << 5) - hash + char.charCodeAt(0);
        }, 0);
      }

  // Build transformed result
  return Array.isArray(phrases)
    ? phrases.map(item => ({
        id: `w${simpleHash(item.phrase)}_${Date.now()}`,
        ...item,        
        user_ipa: isNonEmpty(item.ukipa) ? item.ukipa : '',
        user_sound: isNonEmpty(item.uks) ? { default:0 } : '',
        user_defi: isNonEmpty(item.defi) ? getDefi(item.defi) : getDefiNoDefault(),
        user_translate: isNonEmpty(item[translationKey]) ? item[translationKey] : '',
        user_img: isNonEmpty(item.imgUrl) && isValidImgList(item.imgUrl)
          ? { default: 0 }
          : "",
        user_note: "",
        related_phrases: []
      }))
    : [];
  }
}

customElements.define('phrase-mobile-editor', PhraseMobileEditor);
