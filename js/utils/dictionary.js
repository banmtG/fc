import { sortByLengthDesc } from './string.js';
import './../../components/smart/smart-notification.js';
import {appNotify} from './../../components/smart/smart-notification.js';

export const CambridgeDictionaryKnownPos = {
      noun: '#FFB74D', verb: '#4DB6AC', adjective: '#7986CB',
      adverb: '#BA68C8', pronoun: '#E57373', preposition: '#81C784',
      conjunction: '#9575CD', interjection: '#F06292', exclamation: '#64B5F6',
      idiom: '#AED581', collocation: '#DCE775',
      // 🆕 Added entries
      determiner: '#FF8A65',
      number: '#4FC3F7',
      ordinal_number: '#CE93D8',
      predeterminer: '#A1887F',
      prefix: '#90CAF9',
      suffix: '#F48FB1'
    };



export function parsePOS(rawTag) {
    if (!rawTag) return;
    // the CambridgeDictionaryKnownPos is a global const from js/Utils/dictionary.js
    const knownPOS = sortByLengthDesc(Object.keys(CambridgeDictionaryKnownPos)).map(item=>item.replace(/_/g, ' '));; // extract all known POS then sort by length
    // turn this into space, turn underscore ToSpace
    //console.log(knownPOS);
        let lower = rawTag.trim().toLowerCase();
        // console.log(lower);
        const matchedParts = [];
        for (let i=0; i<knownPOS.length; i++) {
          const pos = knownPOS[i];     
          const flag = lower.includes(pos);
          if (flag===true) {
            // console.log(`pos`,pos);
            // console.log(`flag`,flag);
            lower = lower.replace(pos, '');
            // console.log(`lower`,lower);
            matchedParts.push(pos);
          }
         
        };
        // console.log(`matchedParts`,matchedParts);
    return matchedParts.length ? matchedParts : [lower];
}

export function getAllUniquePOS(entry) {
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

export function correctPos(raw) {
    if (!raw) {
       return;
    }

    // Normalize and parse
    const posList = raw
    .map(x => x.trim().toLowerCase());
 
    let tempList = [];
    posList.forEach((x)=> { 
        tempList = [...tempList,...parsePOS(x)] 
    });
    // Deduplicate
    
    const deduped_posList = [...new Set(tempList)];
    return deduped_posList;
    // Debug
    // console.log('Cleaned POS list:', deduped_posList);
    // Render it!
    
}

export function extractFromDefiObjects(arr, defiString) {
  //console.log(arr);
//  console.log(defiString);
  if (arr.length===0) appNotify('Select definition from Dictionary first!')
    let parsedDefs = [];
    try {
      const parsed = JSON.parse(defiString);
      if (!Array.isArray(parsed)) {
        console.warn("Parsed defiString is not an array.");
        return [];
      }
      parsedDefs = parsed;
    } catch (err) {
        appNotify('No data from Dictionary!')
        //console.error("Failed to parse defiString:", err);
      return [];
    }
   // console.log(parsedDefs);
    const result = arr.filter(i => Number.isInteger(i) && i >= 0 && i < parsedDefs.length)
      .map(i => parsedDefs[i]);
   // console.log(result);
    return result;
}

