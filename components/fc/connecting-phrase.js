import  './../smart/extended-smart-table/extended-smart-table.js';
import { tableData } from './../../Testers/phraseList.js';
import Sortable from './../lib/sortableJS/sortable.complete.esm.js';
    

class ConnectingPhrase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // AbortController for cleanup
    this._abort = new AbortController();
    this._data = [];
    this._entry = {};
    // internal state
    this._chips = [];
    this.render();
  }

  set data(entry) {
    this._entry = entry;
    console.log(this._entry);
    this._loadPhrasesFromDataBase();    
    this._hydrateTable();
  }
  
  get data() { return this._entry }

  _loadPhrasesFromDataBase() {
    this._data = tableData;
    console.log(this._data.length);
    this._connecting_phraseID = this._entry.connecting_phrases? this._entry.connecting_phrases : [];
    this._connecting_phrases = this._data.filter(item => { 
      return this._connecting_phraseID.includes(item.phraseID); 
    });        
    this._unConnecting_phrases = this._data.filter(item => { 
      return !this._connecting_phraseID.includes(item.phraseID); 
    });       
    console.log(this._connecting_phraseID); 
    console.log(this._connecting_phrases);
    console.log(this._unConnecting_phrases);
    console.log(this._entry.phrase);
    console.log(this._unConnecting_phrases);
    let suggested_ConnectingPhrases =this._findRelatedPhrases("caprice", this._unConnecting_phrases);
    console.log(suggested_ConnectingPhrases);
  }

  _hydrateTable() {
    this._smartTable = this._suggestBtn = this.shadowRoot.querySelector('extended-smart-table');
    this._smartTable.data = this._data;
    console.log(this._data.length);
    // Pass down columns
    this._smartTable.setColumns([ 
  {
    key: "phrase",
    label: "Phrase",
    width_set: {
      value: "4fr",      // fit content width
      min: "100px",
      resizable: false     // allow drag resizing
    },
    render: (val, obj) => {
      const div = document.createElement("div");      
      div.style.width = "100%;"
      div.style.height = "100%;"
      div.innerHTML =  obj.linked? `<i>🔗 ${val}</i>` : `${val}`;
      // defer until after append
      setTimeout(() => {
        if (div.parentNode) {
            div.parentNode.parentNode.classList.add('connectedPhrase');    
        }
      });
      return div;
    }
  },
    {
    key: "user_translate",
    label: "Translate",
    width_set: {
      value: "4fr",      // fit content width
      min: "100px",
      resizable: false     // allow drag resizing
    }
  },
  {
    key: "_actions",
    sortable: false,
    label: "-",
    width_set: {       
      value: "78px",      // fit content width
      resizable: false
    },
    interactive: true,
    render: (_, obj) => {
      const div = document.createElement("div");
      div.className = "actions";
      div.innerHTML = `
        <button class="btn btn-link" data-id="${obj.phraseID}">🔗</button>
        <button class="btn btn-unlink" data-id="${obj.phraseID}">⛓️‍💥</button>        
      `;
      setTimeout(() => {
        if (div.parentNode) {    
            div.parentNode.style.padding = "0px";
            div.parentNode.style.justifyContent = "center";
        }        
      });

      return div;
    },
    events: {
      click: (e, row, obj) => {
        if (e.target.classList.contains("btn-link")) {
          row.dispatchEvent(new CustomEvent("link-requested", {
            detail: { id: obj.phraseID },
            bubbles: true,
            composed: true
          }));
        }
        if (e.target.classList.contains("btn-unlink")) {
          row.dispatchEvent(new CustomEvent("unlink-requested", {
            detail: { id: obj.phraseID },
            bubbles: true,
            composed: true
          }));
        }
      }
    }
  }
]);

    this._smartTable.setConfig({
      sortKey: "phrase",
      sortDir: "asc",
      pageSize: "all",
      tableMaxHeight: "50vh",
      columnToSearch: ["phrase","user_translate","defi","user_defi"],
      idKey: "phraseID",
      cellPading: "5px 7px"
    })

    this._smartTable.addEventListener('highlight-changed', (e) => {
      console.log("highlight-changed", e.detail.id);      
    })
    this._smartTable.addEventListener('link-requested', (e) => {
      console.log("link-requested", e.detail.id);      
      this._smartTable._updateRowData(e.detail.id, { linked: true });
      this._smartTable.updateRowUI(e.detail.id);
      console.log(this._smartTable.data);
    })
    this._smartTable.addEventListener('unlink-requested', (e) => {
      console.log("unlink-requested", e.detail.id);    
      this._smartTable._updateRowData(e.detail.id, { linked: false });
      this._smartTable.updateRowUI(e.detail.id);
      console.log(this._smartTable.data);  
    })

    const connectedPhrase = this._smartTable.shadowRoot.getElementById("tbl").shadowRoot.getElementById("tableBody");
    
    new Sortable(connectedPhrase, {
      animation: 150,      
      scroll: true,             // Enable scrolling
      scrollSensitivity: 40,    // Pixels from edge to start scroll
      scrollSpeed: 10,          // Speed of scroll (pixels/tick)
      fallbackTolerance: 9,     // Start drag after 3px movement
      delay: 200,               // time in ms to hold before drag starts
      delayOnTouchOnly: true,   // only apply delay on touch devices
      touchStartThreshold: 5,   // px of movement before drag starts 
    });
  }

  // updateRowUI(id) { //call this after _updateRowData()   
  // }

  connectedCallback() {
    const { signal } = this._abort;

    // Example: button to suggest chips
    this._suggestBtn = this.shadowRoot.querySelector('#suggest-btn');
    this._suggestBtn.addEventListener('click', () => this._suggestChips(), { signal });

    // Example: confirm/cancel buttons
    this.shadowRoot.querySelector('#confirm').addEventListener('click', () => this._confirm(), { signal });
    this.shadowRoot.querySelector('#cancel').addEventListener('click', () => this._cancel(), { signal });
  }

  disconnectedCallback() {
    // abort all listeners
    this._abort.abort();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .chip { display:inline-block; padding:4px 8px; margin:2px; background:#eee; border-radius:4px; }
      </style>
      <extended-smart-table id="smart-table" search="true" pagination="3,all"></extended-smart-table>
      
      <button id="suggest-btn">Suggest Related Phrases</button>
      <div id="chip-list"></div>
      <button id="confirm">Confirm</button>
      <button id="cancel">Cancel</button>
    `;
  }


// Levenshtein distance function
_levenshtein(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

// Refactored finder with tunable options
_findRelatedPhrases(target, inputArray, options = {}) {
  const {
    maxDistance = 2,       // maximum Levenshtein distance allowed
    minOverlap = 6,        // minimum substring overlap length
    lengthTolerance = 5    // allow near misses if length difference ≤ this
  } = options;

  const results = [];
  const t = target.toLowerCase();

  inputArray.forEach(obj => {
    const p = obj.phrase?.toLowerCase();
    if (!p || p === t) return;

    const dist = this._levenshtein(t, p);

    // substring overlap check
    const hasLongOverlap =
      p.includes(t.slice(0, minOverlap)) ||
      p.includes(t.slice(-minOverlap));

    if (
      dist <= maxDistance &&
      (hasLongOverlap || Math.abs(p.length - t.length) <= lengthTolerance)
    ) {
      results.push({ phraseID: obj.phraseID, phrase: obj.phrase });
    }
  });

  return results;
}



  _suggestChips() {
    const query = this.shadowRoot.querySelector('#smart-table').value; // or however you get query
    // const suggestions = this._findRelatedPhrases(query);

    this._chips.push(...suggestions);
    this._renderChips();
  }

  // _findRelatedPhrases(query) {
  //   // placeholder: implement your special rules
  //   // e.g. find words with ≥3 consecutive letters in common, or same length with one char diff
  //   return ["scuff", "scoff", "snuff"]; // demo
  // }

  _renderChips() {
    const chipList = this.shadowRoot.querySelector('#chip-list');
    chipList.innerHTML = '';
    this._chips.forEach((chip, idx) => {
      const el = document.createElement('span');
      el.className = 'chip';
      el.textContent = chip;
      el.addEventListener('click', () => this._removeChip(idx), { signal: this._abort.signal });
      chipList.appendChild(el);
    });
  }

  _removeChip(idx) {
    this._chips.splice(idx, 1);
    this._renderChips();
  }

  _confirm() {

    this.dispatchEvent(new CustomEvent('chips-confirmed', { detail: this._chips }));
  }

  _cancel() {
    this._chips = [];
    this._renderChips();
    this.dispatchEvent(new CustomEvent('chips-cancelled'));
  }
}

customElements.define('connecting-phrase', ConnectingPhrase);

