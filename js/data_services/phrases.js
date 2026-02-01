import {getULID} from './../utils/id.js';
import {normalizeUrlsDataFromServer} from './imgUrls.js';
/**
 * Transform raw searchDict results into phrases + soundBlob structures
 * @param {Array} finalResults - raw array from searchDict.php
 * @param {String} userID - current user UUID
 * @param {String} reminderText - from new-phrase-tab
 * @param {Array} tags - selected tags from new-phrase-tab
 * @returns {{ phrases: Array, soundBlobs: Array }}
 */
export function transformFinalResults(finalResults, userID, reminderText = "", tags = [], langCode) {
  const phrases = [];
  const soundBlobs = [];

  finalResults.forEach(entry => {
    const phraseID = `phrase-${getULID()}`;
    const now = new Date();

    const phraseObj = {
      phraseID,
      userID,
      phrase: entry.phrase,
      returning_phrase: entry.returning_phrase || "",
      ukipa: entry.ukipa || "",
      usipa: entry.usipa || "",
      // soundUrls: entry.soundUrls || [],
      // imgUrls: entry.imgUrls || [],
      defi: entry.defi || [],
      image: { 
        data: normalizeUrlsDataFromServer(entry.phrase,entry.imgUrls) 
      },
      sound: {
        data: normalizeUrlsDataFromServer(entry.phrase,entry.soundUrls), 
      },      
      lang: entry.lang || {},
      user_ipa: entry.ukipa || entry.usipa || "",
      user_defi: {
        selectDefault: (entry.defi?.length>0)? true : false,
        customized_defi: [],
        default_defi: (entry.defi?.length > 1)? [0,1] : (entry.defi?.length > 0) ? [0] : []
      },
      user_translate: entry.lang?.[langCode] || "",
      user_note: "",
      connecting_phrases: [],
      reminder_text: reminderText || null,
      tags: tags  || [],    
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      source: entry.source || null,
      status: "draft"
    };

    phrases.push(phraseObj);

    // Build soundBlob record if soundBlob exists
    if (entry.soundBlob) {
      soundBlobs.push({
        soundID: `sound-${getULID()}`,
        phrase: entry.returning_phrase || entry.phrase,
        phraseID,
        blob: Array.isArray(entry.soundBlob) ? entry.soundBlob : [entry.soundBlob]
      });
    }
  });

  return { phrases, soundBlobs };
}
