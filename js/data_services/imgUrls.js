/**
 * Build payload for updateImage.php, including ONLY entries missing imgUrls.
 * - An entry is considered missing if imgUrls is undefined, null, or an empty array.
 * - noLiveUrls is derived from current imgUrls length (0 when missing).
 *
 * @param {Array} finalResults - entries from searchDicts
 * @returns {{ items: Array<{ phraseID:number, phrase:string, returning_phrase:string|null, defi:boolean, search_query:string, noLiveUrls:number }> }}
 */
export function buildUpdateImagePayload(finalResults) {
  const items = finalResults
    .filter(entry => {
      const urls = entry.imgUrls;
      // include if imgUrls is missing, null, or empty
      return urls == null || (Array.isArray(urls) && urls.length === 0);
    })
    .map((entry, idx) => {
      const urls = Array.isArray(entry.imgUrls) ? entry.imgUrls : [];
      const liveCount = urls.length; // simple count; could be refined if you validate URLs

      return {
        phraseID: entry.phraseID ?? idx,
        phrase: entry.phrase,
        returning_phrase: entry.returning_phrase ?? null,
        defi: !!entry.defi,
        search_query: '',           // default; can be filled if you support custom queries
        noLiveUrls: liveCount       // 0 for missing/empty, otherwise current count
      };
    });

  return { items };
}


export function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}


