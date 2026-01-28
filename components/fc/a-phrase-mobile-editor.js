import './pos-badge-group.js';
import './defi-edit.js';
import './connecting-phrase.js';
import { getPhraseFromPhraseID } from './../../js/data_services/local_data.js';
import  { correctPos, getAllUniquePOS, extractFromDefiObjects } from '../../js/utils/dictionary.js';
import '../smart/smart-ipa-input.js';
import '../smart/smart-text-input.js';
import  './../smart/advanced-combobox/combo-input.js';

class APhraseMobileEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.componentCSS = `<link rel="stylesheet" href=".././components/fc/a-phrase-mobile-editor.css" />`;
    this._abort = new AbortController();

    this.entry = {};

    const template = document.createElement('template');

    template.innerHTML = `${this.componentCSS}
    <div class="noScroll_container">
      <sl-card class="card-basic" id="container">
        <div style="margin: 0px 0; display: flex; gap:0.5rem; align-items: ">
          <sl-button size="small" id="phrase" style="width: 100%;" class="multiline editElement"></sl-button>
         
        </div>
        <sl-divider class="editElement"></sl-divider>  
          <sl-button size="small" id="ipaEditBtn" class="editElement">IPA</sl-button>
          <span id="ipa"></span>
          <sl-button size="small" id="soundEditBtn" class="editElement">🔊</sl-button> 
          <pos-badge-group id="posBadgeGroup"></pos-badge-group>
        <sl-divider class="editElement"></sl-divider>     
        <div style="display:flex; gap:5px; flex-direction:column;">
          <sl-button size="small" id="definitionEditBtn" class="editElement">Definition</sl-button>
          <div id="definition"></div>
        </div>
        <sl-divider class="editElement"></sl-divider>
          <sl-input class="label-on-left" label="Translate" size="small" id="translateEditInput" placeholder="Add your own translation"></sl-input>
        <sl-divider class="editElement"></sl-divider>
          <sl-input class="label-on-left" label="Note" size="small" id="noteEditInput" placeholder="Add your own note"></sl-input>
        <sl-divider class="editElement"></sl-divider>          
        <sl-input class="label-on-left" label="Connect" size="small" id="connectingPhrases" placeholder="Connecting phrases" rows="1" resize="auto"></sl-input>
        <sl-divider class="editElement"></sl-divider>          
        <sl-input class="label-on-left" label="Image" size="small" id="image" placeholder="Photo link" rows="1"></sl-input>
        <sl-divider class="editElement"></sl-divider>

      </sl-card>
    </div>
    
    <smart-text-input></smart-text-input>  
    <smart-ipa-input></smart-ipa-input>  
    <defi-edit></defi-edit>    
    <connecting-phrase></connecting-phrase>

    `;
   
    // Attach to shadow DOM
    const sR = this.shadowRoot;
    sR.appendChild(template.content.cloneNode(true));


    this._phrase = sR.getElementById("phrase");  
    this._posBadgeGroup = sR.getElementById("posBadgeGroup");
    this._ipa= sR.getElementById("ipa");  
    this._definition= sR.getElementById("definition");         
    this._user_translate= sR.getElementById("translation");     
    this._user_note= sR.getElementById("note");     
    this._connect= sR.getElementById("connect"); 
    this._image= sR.getElementById("image");  
  }


  connectedCallback() {
    
  }

  disconnectedCallback() {
     this._abort.abort();

  }

  // 🔌 Pass in data dynamically using a setter
  set setData(entry) {
    //console.log(value);
    this.entry = entry; 
    this._initAssignBtnFunction();
    // this._initRender(this.entry).catch(err => console.error(err));
    this._initRender(this.entry);
  }

  async _initRender(entry) {
    // console.log(entry);
    //entry.phrase = entry.returning_phrase? entry.returning_phrase : entry.phrase;
    //this._phrase.innerHTML = entry.returning_phrase? entry.returning_phrase : entry.phrase;
    this._renderPhraseTitle(entry);
    const allRawPos = correctPos(getAllUniquePOS(entry));   
    this._posBadgeGroup.innerHTML = "";
    this._posBadgeGroup.pos = allRawPos;
    this._ipa.innerText = entry.user_ipa? `/${entry.user_ipa}/`: "";    
    this._definition.innerHTML = this._createDefiDivHtml(entry);
    // this._user_translate.innerHTML = entry.user_translate? entry.user_translate : "";
    this._translateEditInput .value = entry.user_translate? entry.user_translate : "";
    // this._user_note.innerHTML = entry.user_note? entry.user_note : "";
    this._noteEditInput.value = entry.user_note? entry.user_note : "";
    // console.log(this.entry.connecting_phrases);
    const valueC = (await getPhraseFromPhraseID(this.entry.connecting_phrases));
    // console.log(valueC);
    this._connectingPhrases.value = (await getPhraseFromPhraseID(this.entry.connecting_phrases)).join(', ');
  }

  _initAssignBtnFunction() {
    const { signal } = this._abort;
    const sR = this.shadowRoot;
    // this._phrase = sR.getElementById("phraseEditBtn");    
    this._ipaEditBtn = sR.getElementById("ipaEditBtn");    
    this._soundEditBtn = sR.getElementById("soundEditBtn");
    this._definitionEditBtn = sR.getElementById("definitionEditBtn");   
    // this._translateEditBtn = sR.getElementById("translateEditBtn");

    this._translateEditInput = sR.getElementById("translateEditInput");

    // this._noteEditBtn = sR.getElementById("noteEditBtn");
    this._noteEditInput = sR.getElementById("noteEditInput");

    this._connectingPhrases = sR.getElementById("connectingPhrases");
    this._connectingPhrases.addEventListener('click', (e) => this._handleConnectingPhraseEdit(), { signal });

    this._imageEditBtn = sR.getElementById("imageEditBtn");

    this._textEditDialog =  this.shadowRoot.querySelector('smart-text-input');
    this._phraseIPAialog = this.shadowRoot.querySelector('smart-ipa-input');
    this._defiEditDialog = this.shadowRoot.querySelector('defi-edit');
    this._connectingPhraseDialog = this.shadowRoot.querySelector('connecting-phrase');

    this._handlePhraseEdit = this._handlePhraseEdit.bind(this);
    this._phrase.addEventListener('click',this._handlePhraseEdit, { signal });

    this._handleIPAEdit = this._handleIPAEdit.bind(this);
    this._ipaEditBtn.addEventListener('click',this._handleIPAEdit, { signal });

    this._handleDefinitionEdit = this._handleDefinitionEdit.bind(this);

    this._defiEditDialog.loadInitData(this.entry);    

    this._definitionEditBtn.addEventListener('click',this._handleDefinitionEdit ,{ signal });

    // this._handleTranslateEdit = this._handleTranslateEdit.bind(this);
    // this._translateEditBtn.addEventListener('click',this._handleTranslateEdit);

    // this._handleNoteEdit = this._handleNoteEdit.bind(this);
    // this._noteEditBtn.addEventListener('click',this._handleNoteEdit);

    this._phraseIPAialog.addEventListener("smart-ipa-input-confirmed", (e) => {
      this.entry.user_ipa = e.detail.value;
      this._ipa.innerText = this.entry.user_ipa? `/${this.entry.user_ipa}/`: "";   
    });

    this._connectingPhraseDialog.addEventListener("connecting-phrase-updated", async (e) => {
        console.log(e.detail);
        this.entry.connecting_phrases = e.detail;
        this._connectingPhrases.value = (await getPhraseFromPhraseID(this.entry.connecting_phrases)).join(', ');
    }, { signal });


    this._defiEditDialog.addEventListener("defi-edit-dialog-confirmed", (e) => {
      this.entry.user_defi = e.detail.user_defi;
      this._definition.innerHTML = this._createDefiDivHtml(this.entry);
    }, { signal });

    this._textEditDialog.addEventListener("smart-text-input-confirmed", (e) => {
      const key = e.detail.key;
      this.entry[e.detail.key] = e.detail.value;
      this[`_${key}`].innerHTML = this.entry[key];
    },{ signal });

  }

  _handleConnectingPhraseEdit() {
    this._connectingPhraseDialog.open(this.entry);
  }

  _handlePhraseEdit() {
    this._textEditDialog.open("Phrase",this.entry.phrase,"phrase");    
  }

  // _handleTranslateEdit() {
  //   this._textEditDialog.open("Translate",this.entry.user_translate,"user_translate");    
  // }

  // _handleNoteEdit() {
  //   this._textEditDialog.open("Note",this.entry.user_note,"user_note");    
  // }

  _handleIPAEdit() {
    this._phraseIPAialog.open(this.entry);    
  }

  _handleDefinitionEdit() {
    this._defiEditDialog.open(this.entry);    
  }

  _renderPhraseTitle(entry) {    
    console.log(`vao render title`);
    this._phrase.textContent  = entry.phrase;
  }

  _createDefiDivHtml(entry) {   
    // console.log(entry);

    let defArray = entry.defi? entry.defi : [];
    if (entry.user_defi?.selectDefault===true) {
      defArray = Array.isArray(entry.user_defi.default_defi)? extractFromDefiObjects(entry.user_defi.default_defi, entry.defi) : [];
    } else {
      defArray = Array.isArray(entry.user_defi.customized_defi)? this.entry.user_defi.customized_defi : [];
    }
    
    console.log(defArray);
    if (!Array.isArray(defArray)) return "";

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
   
    defArray.forEach(({pos, info, definition, example}) => {    
    if (definition!=="") {
      const posHtml = `<pos-badge-group pos="${pos}"></pos-badge-group>`;
      const infoHtml = info? `<i style="font-size: 0.9rem; color:#fff; padding: 0 5px; background: #ccc">${info}</i>` : "";
      const shortDef = `${posHtml} ${infoHtml} <span class="defi">${definition}</span>`;
      const exampleArray = example?.split('\n');
      
      let exampleHtml = ``;
      exampleArray?.forEach(exam=> { exampleHtml = exampleHtml + `<div class="examChild">${exam}</div>` } );
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
    }
  });

  const result_html = container.innerHTML;
  container.replaceChildren();
  container.remove();
  return result_html;
}

}

customElements.define('a-phrase-mobile-editor', APhraseMobileEditor);
