function parsePOS(rawTag) {
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

function getAllUniquePOS(entry) {
    const posSet = new Set();
      try {
        const definitions = entry.defi? JSON.parse(entry.defi) : "";
        if (definitions.length>0)
        definitions.forEach(def => {
          const rawPos = def.pos?.trim();
          if (rawPos) {
            posSet.add(rawPos);
          }
        });
      } catch (e) {
        console.warn("Invalid JSON in defi:", e);
      }
    return [...posSet];
  }
