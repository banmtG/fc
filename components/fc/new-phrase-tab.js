// new-phrase-tab.js
// Requires Shoelace JS/CSS already loaded globally
import '../smart/advanced-combobox/advanced-combobox.js';
import './../smart/typeahead-input.js';
import { NotificationManagerInstance } from './../../core/notification-manager.js';
import {buildUpdateImagePayload, chunkArray} from './../../js/data_services/imgUrls.js';
import { CONFIG } from '../../config/config.js';
import { AuthManager } from './../../features/auth/manager/auth-manager.js';
import { transformFinalResults } from './../../js/data_services/phrases.js';
import LocalStorage from '../../core/local-storage.js';
// assume you have <a-phrase-mobile-editor> defined elsewhere

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: var(--sl-font-sans);
    }    
    .row {
      margin-bottom: 0.5rem;
      display:flex;
      flex-direction: column;
      gap:5px;
    }

    #output {
      background: #111;
      color: #0f0;
      padding: 1rem;
      margin-top: 1rem;
      white-space: pre-wrap;
      border-radius: 6px;
    }
       
    .editor-container {
      margin-top: 1rem;
    }

    typeahead-input {
        z-index:11000;
    }

    advanced-combobox {
        z-index:10;
    }
  </style>
  <span>Add reminder text / tags for new entries in batch!</span>
  <typeahead-input size="medium" id="reminderText" placeholder="Reminder text. For example: Dexter SS3 Eps1!" min-chars="3" limit="8" size="small"></typeahead-input> 
  <advanced-combobox id="tagSelection" max-height="200px" allow-delete confirm-delete></advanced-combobox>

  <sl-divider style="--width: 4px;"></sl-divider>

  <div class="row">
    <sl-textarea rows="2" label="New entries" id="searchBox" placeholder="Words, phrases or terms"></sl-textarea>
    <sl-button style="width: 100%;" id="searchBtn" variant="primary">Fetch and Add</sl-button>
  </div>
  <pre id="output"></pre>
`;

class NewPhraseTab extends HTMLElement {
  constructor() {
  super();
  this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

  this.tagSelection = this.shadowRoot.querySelector('#tagSelection');
  this.reminderText = this.shadowRoot.querySelector('#reminderText');
  this.searchBox = this.shadowRoot.querySelector('#searchBox');
  this.searchBtn = this.shadowRoot.querySelector('#searchBtn');
  this.output = this.shadowRoot.getElementById('output');

  // bind handlers
  this._onSearchClick = this._onSearchClick.bind(this);
  this._onTagSelectionChange = this._onTagSelectionChange.bind(this);
  this._onReminderTextChange = this._onReminderTextChange.bind(this);
  this._onPhraseFetched = this._onPhraseFetched.bind(this);
  this._onTagsReceived = this._onTagsReceived.bind(this);
  this._onRemindersReceived = this._onRemindersReceived.bind(this);
  this._onAppReady = this._onAppReady.bind(this);

  // NEW: bind re‑emit handlers
  this._onReminderQueryChanged = this._onReminderQueryChanged.bind(this);
  this._onReminderSuggestionSelected = this._onReminderSuggestionSelected.bind(this);
  this._onReminderOptionsLoaded = this._onReminderOptionsLoaded.bind(this);

  this._onTagDeleted = this._onTagDeleted.bind(this);
  this._onTagsSelected = this._onTagsSelected.bind(this);
  this._onTagCreated = this._onTagCreated.bind(this);

  this._meta = { tags: [], notes: '' };
}


  connectedCallback() {

    this.searchBtn.addEventListener('click', this._onSearchClick);

    // NEW: listen for typeahead-input events 
    this.reminderText.addEventListener('query-changed', this._onReminderQueryChanged); 
    this.reminderText.addEventListener('suggestion-selected', this._onReminderSuggestionSelected); 
    this.reminderText.addEventListener('options-loaded', this._onReminderOptionsLoaded);

    this.tagSelection.addEventListener('combobox-item-deleted', this._onTagDeleted); 
    this.tagSelection.addEventListener('combobox-selection-changed', this._onTagsSelected); 
    this.tagSelection.addEventListener('combobox-item-created', this._onTagCreated);

    this.addEventListener('phrases-fetched', this._onPhraseFetched);
    this.addEventListener('tags-received', this._onTagsReceived);
    this.addEventListener('reminders-received', this._onRemindersReceived);

    document.addEventListener('app:ready', this._onAppReady);
  }

  disconnectedCallback() {
    this.searchBtn.removeEventListener('click', this._onSearchClick);

  // NEW: remove typeahead-input listeners 
    this.reminderText.removeEventListener('query-changed', this._onReminderQueryChanged);
    this.reminderText.removeEventListener('suggestion-selected', this._onReminderSuggestionSelected); 
    this.reminderText.removeEventListener('options-loaded', this._onReminderOptionsLoaded);

    
    this.tagSelection.removeEventListener('combobox-item-deleted', this._onTagDeleted);
    this.tagSelection.removeEventListener('combobox-selection-changed', this._onTagsSelected);
    this.tagSelection.removeEventListener('combobox-item-created', this._onTagCreated);

    this.removeEventListener('phrases-fetched', this._onPhraseFetched);
    this.removeEventListener('tags-received', this._onTagsReceived);
    this.removeEventListener('reminders-received', this._onRemindersReceived);

    document.removeEventListener('app:ready', this._onAppReady);
  }

  // collect metadata from combo and tag-note
  _onTagSelectionChange(e) {
    this._meta.tags = e.detail.value || [];
  }

  _onReminderTextChange(e) {
    this._meta.notes = e.target.value;
  }

  async _onPhraseFetched(e) {   
    const data = e.detail.data.data;
    console.log(data);

    const activeUser = LocalStorage.get('activeUser');
    const reminderText = this.reminderText.value;
    const tags = this.tagSelection.value;
    const { phrases, soundBlobs } = transformFinalResults(data, activeUser, reminderText, tags,'es');
    console.log(`phrases`,phrases);
    console.log(`soundBlobs`,soundBlobs);
    // Example usage:
    const payload = buildUpdateImagePayload(phrases);
    const batches = chunkArray(payload.items, 20);
    console.log(payload);
    console.log(batches);
    for (const batch of batches) {
       const data = await AuthManager.callApi(CONFIG.API_UPDATE_IMGURL, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: batch })
      });
      console.log(data);
    }

    this.output.textContent = JSON.stringify(data, null, 2);
}

  async _onSearchClick() {
    const input = this.searchBox.value.trim();
    const batch = input.split(",").map(p => p.trim()).filter(Boolean);

    if (batch.length === 0) {
      // 🔹 Use NotificationManager instead of local notifier
      NotificationManagerInstance.show({
        label: 'Nothing to fetch!',
        icon: 'check',
        color: '--sl-color-warning-600',
        timer: 1500
      });
      return;
    }

    // ✅ Emit event instead of calling API directly
    this.dispatchEvent(new CustomEvent('phrases-fetch', {
      detail: { batch, origin: this },
      bubbles: true,
      composed: true
    }));

    console.log(`emit phrases-fetch event`);
  }

  _onTagsReceived (e) {
      const { options, selection } = e.detail;
      this.tagSelection.options = options;
      this.tagSelection.value = selection;
  }

  _onRemindersReceived (e) {
      const { suggestions, value } = e.detail;
      console.log(e.detail);
      this.reminderText.setData(suggestions); // local suggestions
      this.reminderText.setValue(value); // sets default text
  }

  _onAppReady () {
    this._hydrateTagsAndRiminerFromIndexDB();
  }

  _hydrateTagsAndRiminerFromIndexDB() {
    // ✅ Emit event instead of calling API directly
    console.log(`dispatech Event tags-requested`);    
    this.dispatchEvent(new CustomEvent('tags-requested', {
      detail: { origin: this },
      bubbles: true,
      composed: true
    }));   

    this.dispatchEvent(new CustomEvent('reminders-requested', {
      detail: { origin: this },
      bubbles: true,
      composed: true
    }));  
  }

    _onReminderQueryChanged(e) {
    const { query, method } = e.detail;
    this.dispatchEvent(new CustomEvent('reminder-query-changed', {
      detail: { query, method, origin: this },
      bubbles: true,
      composed: true
    }));
  }

  _onReminderSuggestionSelected(e) {
    const { label, value } = e.detail;
    this.dispatchEvent(new CustomEvent('reminder-suggestion-selected', {
      detail: { label, value, origin: this },
      bubbles: true,
      composed: true
    }));
  }

  _onReminderOptionsLoaded(e) {
    const { value, method } = e.detail;
    this.dispatchEvent(new CustomEvent('reminder-options-loaded', {
      detail: { value, method, origin: this },
      bubbles: true,
      composed: true
    }));
  }

  _onTagDeleted(e) {
    this.dispatchEvent(new CustomEvent('tag-deleted', {
      detail: { value: e.detail.value, options: e.detail.options, origin: this },
      bubbles: true,
      composed: true
    }));
  }

  _onTagsSelected(e) {
    this.dispatchEvent(new CustomEvent('tags-selected', {
      detail: { value: e.detail.value, origin: this },
      bubbles: true,
      composed: true
    }));
  }

  _onTagCreated(e) {
    this.dispatchEvent(new CustomEvent('tag-created', {
      detail: { value: e.detail.value, options: e.detail.options, origin: this },
      bubbles: true,
      composed: true
    }));
  }

}

customElements.define('new-phrase-tab', NewPhraseTab);
