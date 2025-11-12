import  { correctPos, parsePOS, CambridgeDictionaryKnownPos } from './../../js/utils/dictionary.js';

class POSBadgeGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });   
  }

  disconnectedCallback() {
  // Future-proof: clean up listeners, observers, or external references here
    this.shadowRoot.replaceChildren();
  }

  set pos(allPos) {
    //console.log(allPos);
      if (!Array.isArray(allPos)) return;
      this.render(allPos);
  }
  
  connectedCallback() {
    const raw = this.getAttribute('pos')?.trim() ?? '';

    if (!raw) {
       return;
    }
    // Create initial list
    let posList = raw.includes(',') ? raw.split(',') : [raw];

    // Normalize and parse
    posList = posList
    .map(x => x.trim().toLowerCase());
 
    let tempList = [];
    posList.forEach((x)=> { 
        tempList = [...tempList,...parsePOS(x)] 
    });
    // Deduplicate
    
    const deduped_posList = [...new Set(tempList)];
    // Debug
    // console.log('Cleaned POS list:', deduped_posList);
    // Render it!
    this.render?.(deduped_posList);
  }
 

  render(posList = []) {   
    //console.log(posList);
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        :host  {
          display: inline-block; /* or block, depending on layout */
          width: auto;
        }
          
        .badge {
          display: inline-block;
          width: 1.0rem;
          height: 1.0rem; 
          color: white;
          font-weight: 500;
          font-size: 0.7rem;
          text-align: center;
          line-height: 1.6;
          cursor: pointer;
        }
    `;
     this.shadowRoot.append(styleEl);


    const badges = posList.map(pos => {
      const modifiedPos = pos.replace(/ /g, '_'); // spaceToUnderscore      
      // the CambridgeDictionaryKnownPos is a global const from js/Utils/dictionary.js
      const color = CambridgeDictionaryKnownPos[modifiedPos] || '#90A4AE';
      const letter = pos.charAt(0).toUpperCase();
      const title = pos.charAt(0).toUpperCase() + pos.slice(1,pos.length);
      return `<sl-tooltip content="${title}"><span class="badge" style="background:${color}">${letter}</span></sl-tooltip>`;
    }).join('');

   
    const badgesElement = document.createElement('div');   
    badgesElement.style.cssText = `display:flex; align-items:center; gap:2px; flex-direction:row;`;
    badgesElement.innerHTML = badges;
    //console.log(`vao render pos Badge`);
    this.shadowRoot.append(badgesElement);  
  }


}

customElements.define('pos-badge-group', POSBadgeGroup);
