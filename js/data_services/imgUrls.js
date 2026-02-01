import { getUUID } from './../utils/id.js';
import { processImage } from "./../imageProcessor/imageProcessor.js"; // your pipeline helper
import Database from './../../core/database.js';


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


export async function checkImagesAlive(arrOfObjects) {
  
  let totalAlive = 0, totalCompactAlive =0;
  
  try {
    // Map to promises
    const promises = arrOfObjects.map(async (item, index) => {
      const result = await checkImage(item.url, { mode: "head", timeout: 3000 });
      if (result.ok) {
        totalAlive++;
        if (item.source==="compact") totalCompactAlive++;
        return item;
      } else {
        console.log("Image is broken:", result.url);
        return null; // or skip
      }
    });

    // Wait for all promises to resolve
    const resolved = await Promise.all(promises);
    console.log(totalAlive);
    console.log(totalCompactAlive);
    // Filter out nulls
    return { 
        aliveItems: resolved.filter(Boolean),
        totalAlive,
        totalCompactAlive
    };
  } 
  catch (e) {
    console.log(e);
  }
}

/**
 * Check if an image URL is alive.
 * @param {string} url - The image URL to check.
 * @param {object} options - { mode: "head" | "full", timeout: number }
 * @returns {Promise<{url: string, ok: boolean, timeout?: boolean}>}
 * // Fast header check, 1 second timeout
const result1 = await checkImage("https://example.com/img.jpg", { mode: "head", timeout: 1000 });
console.log(result1); // { url: "...", ok: true/false, timeout?: true }

// Full load check, 5 second timeout
const result2 = await checkImage("https://example.com/img.jpg", { mode: "full", timeout: 5000 });
console.log(result2); // { url: "...", ok: true/false, timeout?: true }

 */
export async function checkImage(url, { mode = "head", timeout = 3000 } = {}) {
  if (mode === "head") {
    // Fast HEAD request
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { method: "HEAD", signal: controller.signal });
      clearTimeout(id);
      return { url, ok: res.ok };
    } catch (err) {
      clearTimeout(id);
      return { url, ok: false, timeout: err.name === "AbortError" };
    }
  } else {
    // Full image load
    return new Promise((resolve) => {
      const img = new Image();
      let timer = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve({ url, ok: false, timeout: true });
      }, timeout);

      img.onload = () => {
        clearTimeout(timer);
        resolve({ url, ok: true });
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve({ url, ok: false });
      };

      img.src = url;
    });
  }
}



export function normalizeUrlsDataFromServer(phrase,arr) {
  const result = [];  

  arr?.forEach(url => {    
    if (url.includes("http")) {
      result.push( {
        id: `${phrase.slice(0,phrase.length<8? phrase.length : 8)}_${getUUID(6)}`,
        t: "web",
        url: url
      });
    } else {      
      result.push( {
        id: `${phrase.slice(0,phrase.length<8? phrase.length : 8)}_${getUUID(6)}`,
        t: "web",
        source: "compact",
        url: reverseTransform(url)       
      });
    }
  });
  return result;
}


function reverseTransform(shortCode) {
  try {
  const [style, payload] = shortCode.split(":"); // Split into style and identifier

  // Match expected pattern: e.g., "tse1_OIP.abc123"
  const match = payload?.match(/^(tse\d+)_([A-Z]{3})\.([A-Za-z0-9%._\-]+)/);
  if (!match) throw new Error("Invalid short code format");

  const tse = match[1];   // tse server identifier
  const type = match[2];  // typically OIP or OIF
  const id = match[3];    // encoded image ID

  // URL suffix with common image rendering parameters
  const suffix = "?w=400&c=7&r=0&o=5&pid=1.7";

  // Return different base URLs depending on the style type
  if (style === "p") {
    return `https://${tse}.mm.bing.net/th/id/${type}.${id}${suffix}`;
  } else if (style === "q") {
    return `https://${tse}.mm.bing.net/th?id=${type}.${id}${suffix}`;
  } else {
    throw new Error("Unknown style type in short code"); // Error handling
  }
  } catch (e) {
    console.log(e);
  }

}



/**
 * Download an image from a URL, reduce it (resize/convert/compress),
 * and save into IndexedDB.
 *
 * @param {IDBDatabaseHelper} dbHelper - your helper instance with saveImageBlob()
 * @param {string} phraseID
 * @param {string} phrase
 * @param {Array} items - array of { id, phraseID, phrase, url, title }
 * @returns {Promise<{success: Array, failed: Array}>}
 */
export async function downloadAndSaveImages(component, phraseID, phrase, items) {
  const success = [];
  const failed = [];

  await Database.init();

  // Step 1: check if we already have a record for this phrase
  const existingRecords = await Database.getImagesByPhrase(phraseID);
  let record = existingRecords[0]; // assume one per phraseID

  if (!record) {
    record = {
      imgID: `${phrase.slice(0, phrase.length < 10 ? phrase.length : 10)}_${getUUID(10)}`,
      phraseID,
      phrase,
      blob: []
    };
  }

  // Step 2: loop items
  for (const item of items) {
    try {
      const res = await fetch(item.url, { mode: "cors" });
      if (!res.ok) throw new Error("Network error");
      const rawBlob = await res.blob();

      // 🔑 Run through pipeline BEFORE saving
      const { blob: reducedBlob, meta } = await processImage(rawBlob, {
        maxWidth: 1200,
        quality: 85,
        convert: true // or false depending on your needs
      });

      // check if this id already exists in blob array
      const existing = record.blob.find(b => b.id === item.id);
      if (existing) {
        existing.blob = reducedBlob; // update existing blob with reduced version
      } else {
        record.blob.push({ id: item.id, blob: reducedBlob });
      }

      await Database.saveImageBlob(record);
      success.push({ ...item, meta });
    } catch (err) {
      failed.push(item);
    }
  }

  return { success, failed };
}


export async function removeImageBlobEntry(phraseID, blobIDs) {
  try {
    await Database.init();
    const records = await Database.getImagesByPhrase(phraseID);
    if (!records || !records.length) return false;
    const record = records[0];
    // Build a Set for O(1) lookups
    const removeSet = new Set(blobIDs);
    // Filter once
    // console.log(removeSet);
    record.blob = record.blob.filter(b => !removeSet.has(b.id));
    // console.log(record);
    await Database.saveImageBlob(record);
    return true;
  } catch (e) {
    return `Error: ${e}`;
  }
  
}

export async function getImageUrl(phraseID, blobID) {
  await Database.init();
  const records = await Database.getImagesByPhrase(phraseID);
  const record = records[0];
  if (!record) return null;

  const blobObj = record.blob.find(b => b.id === blobID);
  if (!blobObj) return null;
  const url = URL.createObjectURL(blobObj.blob);
  return url;
}

export async function normalizeBlobItems(entry) {
  const cooked = await Promise.all(entry.image.data.map(async item => {
    if (item.t === "web") {
      return { ...item, url: item.url };
    } else {
      const blobUrl = await getImageUrl(entry.phraseID, item.id); // returns blob:... URL
      return { ...item, url_blob: blobUrl };
    }
  }));
  return { ...entry, image: { data: cooked } };
}
