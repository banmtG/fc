class POSBadgeGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const raw = this.getAttribute('pos')?.trim() ?? '';

    if (!raw) {
        this.remove();return;
    }
    // Create initial list
    let posList = raw.includes(',') ? raw.split(',') : [raw];

    // Normalize and parse
    posList = posList
    .map(x => x.trim().toLowerCase());
 
    let tempList = [];
    posList.forEach((x)=> { 
        tempList = [...tempList,...this.parsePOS(x)] 
    });
    // Deduplicate
    
    const deduped_posList = [...new Set(tempList)];
    // Debug
    // console.log('Cleaned POS list:', deduped_posList);
    // Render it!
    this.render?.(deduped_posList);
  }

  parsePOS(rawTag) {
    const knownPOS = [
        'noun',
        'verb',
        'adjective',
        'adverb',
        'pronoun',
        'preposition',
        'conjunction',
        'interjection',
        'exclamation',
        'idiom',
        'collocation'
    ];
        const lower = rawTag.trim().toLowerCase();

        // Check for exact match
        if (knownPOS.includes(lower)) {
            return [lower];
        }

        // Find all known POS parts inside the string
        const matchedParts = knownPOS.filter(pos => lower.includes(pos));

    return matchedParts.length ? matchedParts : [lower];
    }

  render(posList) {
    const colors = {
      noun: '#FFB74D', verb: '#4DB6AC', adjective: '#7986CB',
      adverb: '#BA68C8', pronoun: '#E57373', preposition: '#81C784',
      conjunction: '#9575CD', interjection: '#F06292', exclamation: '#64B5F6',
      idiom: '#AED581', collocation: '#DCE775'
    };

    const style = `
      <style>
        .badge {
          display: inline-block;
          width: 1.5rem;
          height: 1.5rem; 
          color: white;
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          line-height: 1.5rem;
          cursor: pointer;
        }
      </style>
    `;

    const badges = posList.map(pos => {
      //console.log(pos);
      const color = colors[pos] || '#90A4AE';
      const letter = pos.charAt(0).toUpperCase();
      const title = pos.charAt(0).toUpperCase() + pos.slice(1,pos.length);
      return `<sl-tooltip content="${title}"><span class="badge" style="background:${color}">${letter}</span></sl-tooltip>`;
    }).join('');

    this.shadowRoot.innerHTML = style + badges;
  }
}

customElements.define('pos-badge-group', POSBadgeGroup);
