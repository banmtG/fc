import './pos-badge-group.js';
import './defi-edit.js';
import './connecting-phrase.js';
import './fc-image-picker.js';
import './fc-sound-picker.js';
import './fc-phrase-input.js';
import { getPhraseFromPhraseID, enrichRelatedPhrases, createChips } from './../../js/data_services/related_phrases.js';
import  { correctPos, getAllUniquePOS, extractFromDefiObjects } from '../../js/utils/dictionary.js';
import '../smart/smart-ipa-input.js';
import './../smart/advanced-combobox/advanced-combobox.js';
import './../smart/typeahead-input.js';
import { getBlobImageUrl } from './../../js/data_services/imgUrls.js';
import { checkDefiExist } from './../../js/data_services/phrases.js';


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
        <sl-button id="phrase" style="width: 100%;" class="multiline editElement"></sl-button>         
        <div class="lineInfo">
          <sl-button-group label="Alignment">
            <sl-button size="small" id="definitionEditBtn" class="editElement">Definition
            </sl-button>
            <sl-button size="small" id="ipaEditBtn" class="editElement">IPA</sl-button>           
            <sl-button size="small" id="soundEditBtn" class="editElement">🔊</sl-button>
            
          </sl-button-group>   
          <sl-dropdown placement="top-start" class="rating">
            <sl-button size="small" slot="trigger" caret id="ratingButton">1 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-button>
            <sl-menu id="ratingMenu">
              <sl-menu-item value="1">1 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-menu-item>
              <sl-menu-item value="2">2 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-menu-item>
              <sl-menu-item value="3">3 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-menu-item>
              <sl-menu-item value="4">4 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-menu-item>
              <sl-menu-item value="5">5 <sl-icon name="star-fill" label="Add to favorites"></sl-icon></sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        </div>


 <div id="definition"></div>
        <div class="gridInfo">
            <div class="gridInfo-title gridInfo-item">Translate</div>
            <sl-input class="gridInfo-item" size="small" id="translateEditInput" placeholder="Add your own translation"></sl-input>

            <span class="gridInfo-title gridInfo-item">Note</span>
            <sl-input class="gridInfo-item" size="small" id="noteEditInput" placeholder="Add your own note"></sl-input>           

            <span class="gridInfo-title gridInfo-item">Related</span>
            <div id="relatedPhrases"><span class="placeHolder">Connect other phrases</span></div>

            <span class="gridInfo-title gridInfo-item">Reminder</span>
            <typeahead-input size="small" id="reminderText" placeholder="E.g. Heroes SS3 Eps1!" min-chars="3" limit="8" size="small"></typeahead-input> 

            <span class="gridInfo-title gridInfo-item">Tags</span>
            <advanced-combobox size="small" id="tagSelection" max-height="200px" allow-delete confirm-delete></advanced-combobox>  
        </div>
        <div id="imageInput">
          <div id="imageContainer">
          </div>
          <sl-icon-button id="imageInputBtn" name="pencil" label="Edit"></sl-icon-button>
        </div>
      </sl-card>
    </div>
    
    <fc-phrase-input></fc-phrase-input>  
    <smart-ipa-input></smart-ipa-input>  
    <defi-edit></defi-edit>    
    <connecting-phrase></connecting-phrase>
    <fc-image-picker></fc-image-picker>
    <fc-sound-picker></fc-sound-picker>
    `;
   
    // Attach to shadow DOM
    const sR = this.shadowRoot;
    sR.appendChild(template.content.cloneNode(true));

    this._phrase = sR.getElementById("phrase");  
    // this._posBadgeGroup = sR.getElementById("posBadgeGroup");
    this._ipa= sR.getElementById("ipa");  

    this._ratingBtn = sR.getElementById("ratingButton");
    this._ratingMenu = sR.getElementById("ratingMenu");

    this._ipaEditBtn = sR.getElementById("ipaEditBtn");    
    this._soundEditBtn = sR.getElementById("soundEditBtn");
    this._fcSoundPicker = sR.querySelector("fc-sound-picker");
    this._definitionEditBtn = sR.getElementById("definitionEditBtn");   

    this._definition= sR.getElementById("definition");   
    this._translateEditInput = sR.getElementById("translateEditInput");
    
    this._imageContainer = sR.getElementById("imageContainer");     
    this._imageInputBtn = sR.getElementById("imageInputBtn");     
    this._initAssignBtnFunction();
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
    // this._initRender(this.entry).catch(err => console.error(err));
    this._initRender(this.entry);
  }

  async _initRender(entry) {
    // console.log(entry);
    this._setPhraseTitle(entry);
    // const allRawPos = correctPos(getAllUniquePOS(entry));   
    // this._posBadgeGroup.innerHTML = "";
    // this._posBadgeGroup.pos = allRawPos;
    // this._ipa.innerText = entry.user_ipa? `/${entry.user_ipa}/`: "";    
    this._definition.innerHTML = this._createDefiDivHtml(entry);
    this._defiEditDialog.loadInitData(this.entry);    
    this._translateEditInput .value = entry.user_translate? entry.user_translate : "";
    this._noteEditInput.value = entry.user_note? entry.user_note : "";

    this._setDefinitionEditBtnStatus(this.entry);
    this._setIPAEditBtnStatus(this.entry);
    this._setSoundEditBtnStatus(this.entry);
    // set related Chips
    await this._setRelatedChips();
    // photo
    this._setImage(this.entry.image.data);    
    // console.log(this.entry.image);
  }

  _setIPAEditBtnStatus(entry) {
    if (entry.user_ipa.length>0) {this._ipaEditBtn.innerHTML = `IPA`; } else {
    this._ipaEditBtn.innerHTML = `IPA<sl-icon style="font-size:20px;" name="patch-exclamation-fill" slot="suffix"></sl-icon>`;}
  }

  _setSoundEditBtnStatus(entry) {
    console.log(entry);
    if (entry.sound.data?.length>0) {this._soundEditBtn.innerHTML = `🔊`; } else {
    this._soundEditBtn.innerHTML = `🔊<sl-icon style="font-size:20px;" name="patch-exclamation-fill" slot="suffix"></sl-icon>`;}
  }

  _setDefinitionEditBtnStatus(entry) {
    if (checkDefiExist(entry)) { this._definitionEditBtn.innerHTML = `Definition`; } else {
    this._definitionEditBtn.innerHTML = `Definition <sl-icon style="font-size:20px;" name="patch-exclamation-fill" slot="suffix"></sl-icon>`; }
  }

  async _setRelatedChips() {
    // related phrases
    const newChipsDiv = await createChips(this.entry.related_phrases); 
     if (newChipsDiv.firstChild===null)  { this._relatedPhrases.innerHTML= `<span class="placeHolder">Connect other phrases</span>`; }
    else { 
      this._relatedPhrases.innerHTML="";
      while (newChipsDiv.firstChild) { 
        this._relatedPhrases.appendChild(newChipsDiv.firstChild); 
      }
    }
  }

  _setImage(photoData) {  
    this._imageContainer.innerHTML=``;
    const phraseID = this.entry.phraseID;
    if (!Array.isArray(photoData) || photoData.length <= 0) {
      this._imageContainer.innerHTML=`<sl-icon name="camera"></sl-icon>`;
      return;
    }
    const _appendImage = async (object) =>  {
      this._imageContainer.innerHTML=``;    
      const img = document.createElement('img');  
      const type = document.createElement('span');
      if (object.t==="web") { 
        img.src = object.url;
        type.innerHTML = "🌍";
      }
      if (object.t==="blob") {
        img.src = await getBlobImageUrl(phraseID,object.id);
        type.innerHTML = "💾";
      }
      this._imageContainer.appendChild(img);
      this._imageContainer.appendChild(type);
    }

    const pickedImages = photoData.filter(object=> object.pick === true);
    if (pickedImages.length>0) {
      _appendImage(pickedImages[0]); // set the first image from pickedImages
    } else {
      _appendImage(photoData[0]);  // set the first image from the whole data array
    }     
  }

  _initAssignBtnFunction() {
    const { signal } = this._abort;
    const sR = this.shadowRoot;
    // this._phrase = sR.getElementById("phraseEditBtn");    
    
    this._soundEditBtn.addEventListener('click', (e) => this._soundSelection(), { signal });


    this._ratingMenu.addEventListener('sl-select', event => {
      this._ratingBtn.innerHTML = event.detail.item.innerHTML;
      this.entry.rating = event.detail.item.value;
    }, {signal});
    this._noteEditInput = sR.getElementById("noteEditInput");
    this._relatedPhrases = sR.getElementById("relatedPhrases");
    this._relatedPhrases.addEventListener('click', (e) => this._handleRelatedPhraseEdit(), { signal });

    this._imageInputBtn.addEventListener('click', (e) => this._imageSelection(), { signal });
    
    this._fcPhraseInput =  this.shadowRoot.querySelector('fc-phrase-input');
    this._phraseIPAialog = this.shadowRoot.querySelector('smart-ipa-input');
    this._defiEditDialog = this.shadowRoot.querySelector('defi-edit');
    this._relatedPhraseDialog = this.shadowRoot.querySelector('connecting-phrase');

    this._handlePhraseEdit = this._handlePhraseEdit.bind(this);
    this._phrase.addEventListener('click',this._handlePhraseEdit, { signal });

    this._handleIPAEdit = this._handleIPAEdit.bind(this);
    this._ipaEditBtn.addEventListener('click',this._handleIPAEdit, { signal });

    this._handleDefinitionEdit = this._handleDefinitionEdit.bind(this);

    this._definitionEditBtn.addEventListener('click',this._handleDefinitionEdit ,{ signal });

    this._fcImagePicker = this.shadowRoot.querySelector('fc-image-picker');

    this._fcImagePicker.init();
    this._fcImagePicker.addEventListener("fc-image-picker-confirmed", (e) => {    
      this.entry.image = e.detail.entry.image;
      this._setImage(this.entry.image.data);
      // this._ipa.innerText = this.entry.user_ipa? `/${this.entry.user_ipa}/`: "";   
    }, { signal });

    // this._handleTranslateEdit = this._handleTranslateEdit.bind(this);
    // this._translateEditBtn.addEventListener('click',this._handleTranslateEdit);

    // this._handleNoteEdit = this._handleNoteEdit.bind(this);
    // this._noteEditBtn.addEventListener('click',this._handleNoteEdit);

    this._fcSoundPicker.addEventListener("fc-sound-picker-updated", (e) => {
      this.entry.sound.data = e.detail.value;
      console.log(this.entry.sound.data);
      this._setSoundEditBtnStatus(this.entry);
    });

    this._phraseIPAialog.addEventListener("smart-ipa-input-confirmed", (e) => {
      this.entry.user_ipa = e.detail.value;
      this._setIPAEditBtnStatus(this.entry);
    });

    this._relatedPhraseDialog.addEventListener("related-phrases-updated", async (e) => {
        this.entry.related_phrases = e.detail;
        await this._setRelatedChips();
    }, { signal });

    this._defiEditDialog.addEventListener("defi-edit-dialog-confirmed", (e) => {
      this.entry.user_defi = e.detail.user_defi;
      this._setDefinitionEditBtnStatus(this.entry);
      this._definition.innerHTML = this._createDefiDivHtml(this.entry);
    }, { signal });

    this._fcPhraseInput.addEventListener("fc-phrase-input-confirmed", (e) => {
      this.entry.phrase = e.detail.value;
      this._setPhraseTitle(this.entry);
    }, { signal });
  }

  _soundSelection(e) {
    console.log(this.entry.image);
    this._fcSoundPicker.open(this.entry);
  }

  _imageSelection(e) {
    console.log(this.entry.image);
    this._fcImagePicker.open(this.entry);
  }

  _handleRelatedPhraseEdit() {
    this._relatedPhraseDialog.open(this.entry);
  }

  _handlePhraseEdit() {
    this._fcPhraseInput.open(this.entry);    
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

  _setPhraseTitle(entry) {    
    // console.log(`vao render title`);
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
    
    // console.log(defArray);
    if (!Array.isArray(defArray)) return "";

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
   
    defArray.forEach(({pos, info, definition, example}) => {    
    if (definition!=="") {
      const posHtml = `<pos-badge-group pos="${pos}"></pos-badge-group>`;
      const infoHtml = info? `<i style="font-size: 1rem; color:#fff; padding: 0px 3px 1px; background: #ababab">${info}</i>` : "";
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
