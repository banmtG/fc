import { correctPos } from './../utils/dictionary.js';

export function fixPosData(dataFromServer) {
    console.log(JSON.stringify(dataFromServer.data));
    if (dataFromServer.data.matches.length>0) {
        const matches = dataFromServer.data.matches;
        matches.forEach(phrase => {
            const originalDefi = JSON.parse(phrase.defi);
            originalDefi.forEach(sense => {
                sense.pos = correctPos([sense.pos]).join(',');
            })
            phrase.defi = JSON.stringify(originalDefi);
        });   
        console.log(matches);     
        return dataFromServer;
    }
}

export function cookUserDataFromDefault(phrases, userLang = 'vi') {
    const translationKey = `lang-${userLang}`;
    // Helper: safely parse definitions and extract the first two
    function getDefi(defiString) {        
        try {
          const result = {
          selectD: false,
          user_defi: [{definition:"", example:"", pos:"", info:"" }],
          default_defi: null,
          }

          const defs = JSON.parse(defiString);
          // return { default: defs.map((_,index)=>index) }
          if (!Array.isArray(defs)) return result;
          const default_calculattion = defs.length >= 2 ? [0, 1] : defs.length === 1 ?  [0] : [];

          result.selectD = true;
          result.default_defi = default_calculattion;

          return result;
        } catch (e) {
          console.log(e);
          return [];
        }
      }

      // Helper: check if imgUrl is a valid non-empty list
      function isValidImgList(imgString) {
        return typeof imgString === 'string' && imgString.includes(',') && imgString.split(',').length > 0;
      }

      function isNonEmpty(val) {
      return val !== null && val !== undefined && val !== '';
      }

      function simpleHash(text) {  // [...'hello'] // → ['h', 'e', 'l', 'l', 'o']
        return [...text].reduce((hash, char) => {
          return (hash << 5) - hash + char.charCodeAt(0);
        }, 0);
      }

  // Build transformed result
  return Array.isArray(phrases)
    ? phrases.map(item => ({
        id: `w${simpleHash(item.phrase)}_${Date.now()}`,
        ...item,        
        user_ipa: isNonEmpty(item.ukipa) ? item.ukipa : '',
        user_sound: isNonEmpty(item.uks) ? { default:0 } : '',
        user_defi: isNonEmpty(item.defi) ? getDefi(item.defi) : getDefiNoDefault(),
        user_translate: isNonEmpty(item[translationKey]) ? item[translationKey] : '',
        user_img: isNonEmpty(item.imgUrl) && isValidImgList(item.imgUrl)
          ? { default: 0 }
          : "",
        user_note: "",
        related_phrases: []
      }))
    : [];
  }