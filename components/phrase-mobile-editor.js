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
    this.componentCSS = `<link rel="stylesheet" href=".././components/phrase-mobile-editor.css" />`;
    this.shadowRoot.innerHTML = this.componentCSS + `<div class="noScroll_container"><sl-card class="card-basic" id="container"></sl-card><div id="nav" class="scroll-prompt_horizon scrollBar_hidden scroll-area"></div></div>`;   
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

  createDefiDiv(definitionsArray) {
    if (!Array.isArray(definitionsArray)) return "";
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';

    definitionsArray.forEach(({pos, definition, example}) => {
    
    const posHtml = `<pos-badge-group pos="${pos}"></pos-badge-group>`;
    const shortDef = `<div>${posHtml} ${definition} </div>`;
    const exampleArray = example?.split('\n');
    
    let exampleHtml = ``;
    exampleArray.forEach(exam=> { exampleHtml = exampleHtml + `<div class="examChild">${exam}</div>` } );


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

    container.appendChild(details);
  });

  return container.innerHTML;
}

 getLineCountStable(el, callback) {
  let lastHeight = 0;
  let sameCount = 0;

  function check() {
    const newHeight = el.scrollHeight;
    if (newHeight === lastHeight) {
      sameCount++;
    } else {
      sameCount = 0;
      lastHeight = newHeight;
    }

    if (sameCount >= 5) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      callback(Math.round(newHeight / lineHeight));
    } else {
      requestAnimationFrame(check);
    }
  }

  check();
}


  createPhraseHtml(entry) {
    let result_Html =  `<div style="margin: 5px 0; display: flex; gap:1rem; align-items: center;"><sl-button>P</sl-button><h2>${entry.phrase}</h2><pos-badge-group pos="${getAllUniquePOS(entry)}"></pos-badge-group></div>`;  
    return result_Html;
  }

  renderCard() {
    const entry = this.data[this.currentIndex];
    const container = this.shadowRoot.getElementById('container');
    //console.log(entry.user_defi.default);
    const defArray = Array.isArray(entry.user_defi.default)? this.extractFromDefiObjects(entry.user_defi.default, entry.defi) : "";

    let defi_Html = this.createDefiDiv(defArray);
    let phrase_Html = this.createPhraseHtml(entry);

    container.innerHTML = `     
        ${phrase_Html}
        <sl-button size="small">IPA</sl-button> ${entry.user_ipa ? "/" + entry.user_ipa + "/" : ""} 
        
        <sl-button size="small" onclick="this.getRootNode().host.playAudio('${entry.user_sound.default}')">🔊</sl-button> 
        <sl-divider></sl-divider>     
      <div style="display:flex; gap:5px; flex-direction:column;"><sl-button size="small">Definition</sl-button>${defi_Html}</div>
      <sl-divider></sl-divider>
      <sl-button size="small" onclick="this.getRootNode().host.emitEvent('submit')">Submit</sl-button>
      <sl-button size="small" onclick="this.getRootNode().host.emitEvent('cancel')">Cancel</sl-button>
    `;    

    //const header = container.querySelector('h2');
    //this.adjustFontSizeIfOverflow(header);

    //Garbage collection kicks in once all references to the element are dropped. 
    defi_Html = null;
    phrase_Html = null;

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
   function getDefiIndicator(defiString) {
      try {
        const defs = JSON.parse(defiString);
        if (!Array.isArray(defs)) return [];
        return defs.length >= 2 ? { default: [0, 1] } : defs.length === 1 ? { default: [0] } : [];
      } catch {
        return [];
      }
    }

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

    function simpleHash(text) {
      return [...text].reduce((hash, char) => {
        return (hash << 5) - hash + char.charCodeAt(0);
      }, 0);
    }

  // Build transformed result
  return Array.isArray(phrases)
    ? phrases.map(item => ({
        id: `w${simpleHash(item.phrase)}`,
        ...item,        
        user_ipa: isNonEmpty(item.ukipa) ? item.ukipa : '',
        user_sound: isNonEmpty(item.uks) ? { default:0 } : '',
        user_defi: isNonEmpty(item.defi) ? getDefiIndicator(item.defi) : "",
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
