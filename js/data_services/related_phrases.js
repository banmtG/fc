import {tableData} from './../../Testers/phraseList.js';
import { CONFIG } from './../../config/config.js';

export async function createChips(relatedPhrases, dataset = tableData) {   
  const enrichObject = await enrichRelatedPhrases(relatedPhrases);
  const chipContainer = document.createElement('div');
  enrichObject.forEach(object=> {
    const chip = document.createElement('span');
    chip.classList.add('related_chip');
    
    chip.innerText = object.phrase;
    chip.dataset.id = object.id;
    chip.style.background = CONFIG.RELATED_TYPE.find(item=> item.type===object.type)['bg'];
    chipContainer.appendChild(chip);
  })
  return chipContainer;
}
 /**
 * Put corresponding phrases to the related_phrases array from a dataset.

 */
export async function enrichRelatedPhrases(relatedPhrases, dataset = tableData) { 
  if (!Array.isArray(relatedPhrases) || !Array.isArray(dataset)) {
    throw new TypeError("Both phraseIDs and dataset must be arrays.");
  }

  // Build a lookup map for O(1) access
  const phraseMap = new Map(dataset.map(item => [item.phraseID, item.phrase]));

  // Collect phrases in the same order as phraseIDs
  return relatedPhrases
    .map(item => {
      if (!phraseMap.has(item.id)) {
        console.warn(`PhraseID "${id}" not found in dataset.`);
        return null; // or skip, depending on requirements
      }
      return { 
        ...item,
        phrase: phraseMap.get(item.id),
      }
    })
    .filter(Boolean); // remove nulls if desired
}

 /**
 * Get phrases by IDs from a dataset.
 *
 * @param {string[]} phraseIDs - Array of phraseID strings to look up.
 * @param {Object[]} dataset - Array of objects containing phrase data.
 * @param {string} dataset[].phraseID - Unique identifier for the phrase.
 * @param {string} dataset[].phrase - The phrase text.
 * @returns {string[]} Array of phrases corresponding to the given IDs.
 */
export async function getPhraseFromPhraseID(phraseIDs, dataset = tableData) { 
  if (!Array.isArray(phraseIDs) || !Array.isArray(dataset)) {
    throw new TypeError("Both phraseIDs and dataset must be arrays.");
  }

  // Build a lookup map for O(1) access
  const phraseMap = new Map(dataset.map(item => [item.phraseID, item.phrase]));

  // Collect phrases in the same order as phraseIDs
  return phraseIDs
    .map(id => {
      if (!phraseMap.has(id)) {
        console.warn(`PhraseID "${id}" not found in dataset.`);
        return null; // or skip, depending on requirements
      }
      return phraseMap.get(id);
    })
    .filter(Boolean); // remove nulls if desired
}
