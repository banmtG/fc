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
    this.renderInit();
  }

  // 🧹 Remove all listeners and cleanup when disconnected
  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    this.shadowRoot.removeEventListener('click', this._onClick);
  }

  // 🔌 Pass in data dynamically using a setter
  set setData(value) {
    console.log(value);
    this.data = value;
    console.log(this.cookUserDataFromDefault(value));
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
    if (e.ctrlKey && e.key === 'z') this.undo();
    if (e.ctrlKey && e.key === 'y') this.redo();
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

  renderChange() {
    const entry = this.data[this.currentIndex];
    const container = this.shadowRoot.getElementById('container');
    const defs = JSON.parse(entry.defi || '[]');

    const defHTML = defs.map(def => `
      <div class="def-block">
        <strong>${def.pos}</strong>: ${def.definition}
        <br><em>${def.example.replace(/\\n/g, '<br>')}</em>
      </div>
    `).join('');

    container.innerHTML = `
      <h2>${entry.phrase} </h2>
      <p><strong>UK:</strong> ${entry.ukipa} <button onclick="this.getRootNode().host.playAudio('${entry.uks}')">🔊</button></p>
      <p><strong>US:</strong> ${entry.usipa} <button onclick="this.getRootNode().host.playAudio('${entry.uss}')">🔊</button></p>
      ${defHTML}
      <button onclick="this.getRootNode().host.emitEvent('submit')">Submit</button>
      <button onclick="this.getRootNode().host.emitEvent('cancel')">Cancel</button>
    `;

    const nav = this.shadowRoot.getElementById('nav');
    nav.innerHTML = `
      <span class="nav-position">
        ${this.currentIndex + 1} / ${this.data.length}
      </span>
      ${this.data.map((entry, i) => `
        <button class="phrase-dot scroll-item ${this.currentIndex === i ? 'active' : ''}" data-index="${i}">
          ${entry.phrase}
        </button>
      `).join('')}
    `;
  }

  // cookUserDataFromDefault(phrases) {
  //   const result = [];
  //   result = phrases.map(item=> {
  //     return {
  //       ...item,
  //       user_IPA: item.ukipa? item.ukipa || {user, value: ""},
  //       user_sound: item.uks? item.uks || {user, value: ""},
  //       user_defi: item.defi? this.extractTwoFirstDefiObject(item.defi) || {user, value: ""},
  //       user_translate: item["lang-vi"]? item["lang-vi"] || {user, value: ""},
  //       user_img: isArray(item.imgUrl)?&(item.imgUrl.length>0)? { default: 0 } || {user, value: ""},
  //       user_example: isArray(extractTwoDefaultExmapleFromTwoDefaultDefiObjects(item.defi))?  isArray(extractDefaultExmaple(item.defi)) || {user, value: ""},
  //       related_phrases: []
  //     }
  //   })
  //   return result;
  // }

  cookUserDataFromDefault(phrases, userLang = 'vi') {
    const translationKey = `lang-${userLang}`;
    // Helper: safely parse definitions and extract the first two
   function getDefiIndicator(defiString) {
      try {
        const defs = JSON.parse(defiString);
        if (!Array.isArray(defs)) return [];
        return defs.length >= 2 ? { default: [1, 2] } : defs.length === 1 ? { default: [1] } : [];
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
        user_IPA: isNonEmpty(item.ukipa) ? item.ukipa : '',
        user_sound: isNonEmpty(item.uks) ? { default:0 } : '',
        user_defi: isNonEmpty(item.defi) ? { default:getDefiIndicator(item.defi)} : "",
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
