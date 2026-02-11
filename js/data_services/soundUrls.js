
import { checkMedia } from './../utils/urls.js';
import { getUUID } from './../utils/id.js';
import Database from './../../core/database.js';

// Define a mapping of domain substrings to provider names
const ORIGIN_MAP = {
  "cambridge.org": "Cambridge",
  "oxforddictionaries.com": "Oxford",
  "onelook.com": "OneLook",
  "yourdictionary.com": "YourDictionary",
  "sfdict.com": "SFDict",
  "tfd.com": "TFD",
  "amazonaws.com": "Vocabulary (AWS)"
};

function normalizeUrlOrId(item) {
  // If it's a blob or has no URL, fall back to its id
  if (!item.url || item.t !== "web") {
    return item.id;
  }
  try {
    const url = new URL(item.url.trim());
    return url.hostname + "/" + url.pathname.split("/").pop();
  } catch {
    return item.url;
  }
}

export function getUniqueLinks(soundArray) {
  const unique = Array.from(
    new Map(
      soundArray.map(item => [normalizeUrlOrId(item), item])
    ).values()
  );
  return unique;
}


export async function mapTableSoundData(phraseID, soundArray) {

  await Database.init();
  // Step 1: load blobs for this phraseID
  const blobRecords = await Database.getSoundsByPhrase(phraseID);
  console.log(blobRecords);

  const blobItems = blobRecords[0]?.blob || [];
  console.log(blobItems);
  // Step 2: collect IDs already present in soundArray
  const existingIds = new Set(soundArray.map(item => item.id));

  // Step 3: add missing blob items
  const merged = [
    ...soundArray,
    ...blobItems.filter(b => !existingIds.has(b.id))
  ];

  console.log(merged);

  // Step 4: deduplicate by URL
  const unique = getUniqueLinks(merged);

  // Step 5: enrich with origin/accent/alive/order
  const results = await Promise.all(
    unique.map(async (item, index) => {
      const { origin, accent } = await getSoundOriginAndAccent(item);
      let alive;
      if (item.t==="web") alive = await checkMedia(item.url,"audio",500);

      return { ...item, origin, accent, order: index, ...(alive? { alive: alive} : {}) };
    })
  );

  return results;
}

export async function getSoundOriginAndAccent(item) {
  if (item.t!=="web") return { origin: item.origin, accent: item.accent};  
  // console.log(item);
  if (item.origin && item.accent) return { origin: item.origin, accent: item.accent};  
  console.log(`getSoundOriginAndAccent`);
  const url = item.url;
  if (!url) return { origin:"-", accent:"-",alive: "-"};
  let origin = "-";
  let accent = "?";
  let alive = false;

  // Normalize URL for easier matching
  const lowerUrl = url.toLowerCase();

  // 1. Try to match against known providers
  for (const [key, value] of Object.entries(ORIGIN_MAP)) {
    if (lowerUrl.includes(key)) {
      origin = value;
      break;
    }
  }

  // 2. If no match, guess origin from hostname
  if (origin === "-") {
    try {
      const hostname = new URL(url).hostname;
      // Take the main domain part (e.g. dictionary.cambridge.org → cambridge.org)
      const parts = hostname.split(".");
      origin = parts.slice(-2).join("."); // fallback like "example.com"
    } catch {
      origin = "-";
    }
  }

  // 3. Guess accent from path or filename
  if (lowerUrl.includes("/us/") || lowerUrl.includes("american") || lowerUrl.includes("us_pron")) {
    accent = "US";
  } else if (lowerUrl.includes("/uk/") || lowerUrl.includes("british") || lowerUrl.includes("uk_pron")) {
    accent = "UK";
  }

  // 4. Check if URL is alive 
  alive = await checkMedia(url,"audio",500);
  return { origin, accent };
}

/**
 * Download a sound from a URL, optionally process/convert,
 * and save into IndexedDB.
 *
 * @param {IDBDatabaseHelper} dbHelper - your helper instance with saveSoundBlob()
 * @param {string} phraseID
 * @param {string} phrase
 * @param {Array} items - array of { id, phraseID, phrase, url, title }
 * @returns {Promise<{success: Array, failed: Array}>}
 */
export async function downloadAndSaveSound(component, phraseID, phrase, items) {
  console.log(items);
  const success = [];
  const failed = [];

  await Database.init();

  // Step 1: check if we already have a record for this phrase
  const existingRecords = await Database.getSoundsByPhrase(phraseID);
  console.log(existingRecords);
  let record = existingRecords[0];

  if (!record) {
    record = {
      soundID: `${phrase.slice(0, phrase.length < 10 ? phrase.length : 10)}_${getUUID(10)}`,
      phraseID,
      phrase,
      blob: []
    };
  }

  // Step 2: loop items
for (const item of items) {
  try {
    let rawBlob;

    try {
      // Try direct fetch first
      const res = await fetch(item.url, { mode: "cors" });
      if (!res.ok) throw new Error("Network error");
      rawBlob = await res.blob();
      console.log('success get Blob',rawBlob);
    } catch (fetchErr) {
      // Fallback: capture via MediaRecorder
      // rawBlob = await captureAudioWithMediaRecorder(item.url);
      const captured = await proceedToCapture(item.url, item.id); 
      if (!captured) throw new Error("Capture failed"); 
      rawBlob = captured.blob;
      console.log('success get Blob  fallback proceedToCapture',rawBlob);
    }

    console.log(`record`,record);
    const processedBlob = rawBlob;

    const meta = { size: rawBlob.size, type: rawBlob.type };
    console.log(`meta`,meta);
    const existing = record.blob.find(b => b.id === item.id);
    console.log(`existing`,existing);
    if (existing) {
      existing.blob = processedBlob;
    } else {
      record.blob.push({ id: item.id, blob: processedBlob });
    }

    console.log(`record`,record);

    await Database.saveSoundBlob(record);
    success.push({ ...item, meta });
  } catch (err) {
    failed.push(item);
  }
}


  return { success, failed };
}

export async function removeSoundBlobEntry(phraseID, blobIDs) {
  try {
    await Database.init();
    const records = await Database.getSoundsByPhrase(phraseID);
    if (!records || !records.length) return false;
    const record = records[0];
    const removeSet = new Set(blobIDs);
    record.blob = record.blob.filter(b => !removeSet.has(b.id));
    await Database.saveSoundBlob(record);
    console.log(`success`);
    return true;
  } catch (e) {
    console.log(`error`);
    return `Error: ${e}`;
  }
}

export async function getSoundUrl(phraseID, blobID) {
  await Database.init();
  const records = await Database.getSoundsByPhrase(phraseID);
  const record = records[0];
  if (!record) return null;

  const blobObj = record.blob.find(b => b.id === blobID);
  if (!blobObj) return null;

  const url = URL.createObjectURL(blobObj.blob);
  return url;
}

 export async function captureAudioWithMediaRecorder(url) {
      return new Promise((resolve, reject) => {
        console.log("[captureAudio] starting with URL:", url);
        try {
          const audio = new Audio(url);
          audio.crossOrigin = "anonymous";

          const ctx = new AudioContext();
          console.log("[captureAudio] AudioContext created");

          const source = ctx.createMediaElementSource(audio);
          const dest = ctx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(ctx.destination);
          console.log("[captureAudio] audio source connected");

          const recorder = new MediaRecorder(dest.stream);
          const chunks = [];

          recorder.ondataavailable = e => {
            console.log("[captureAudio] dataavailable event:", e.data.size);
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            console.log("[captureAudio] recorder stopped, chunks:", chunks.length);
            const blob = new Blob(chunks, { type: "audio/webm" });
            console.log("[captureAudio] blob created, size:", blob.size);
            resolve(blob);
          };

          recorder.onerror = e => {
            console.error("[captureAudio] recorder error:", e.error);
            reject(e.error);
          };

          recorder.start();
          console.log("[captureAudio] recorder started");

          audio.onplay = () => console.log("[captureAudio] audio started playing");
          audio.onended = () => {
            console.log("[captureAudio] audio ended, stopping recorder");
            recorder.stop();
            ctx.close();
          };
          audio.onerror = e => {
            console.error("[captureAudio] audio error:", e);
            reject(e);
          };

          audio.play().catch(err => {
            console.error("[captureAudio] play() failed:", err);
            reject(err);
          });
        } catch (err) {
          console.error("[captureAudio] exception:", err);
          reject(err);
        }
      });
    }

/**
 * Try to capture audio from a URL if it's playable.
 * Uses checkMedia first, then captureAudioWithMediaRecorder.
 *
 * @param {string} url - audio file URL
 * @param {string} id - blob ID
 * @returns {Promise<{id: string, blob: Blob, meta: object} | null>}
 */
export async function proceedToCapture(url, id) {
  console.log("[proceedToCapture] checking media:", url);
  const status = await checkMedia(url, "audio");
  if (status !== "alive") {
    console.warn("[proceedToCapture] media not playable:", url);
    return null;
  }

  try {
    const blob = await captureAudioWithMediaRecorder(url);
    const meta = { size: blob.size, type: blob.type };
    console.log("[proceedToCapture] capture success:", meta);
    return { id, blob, meta };
  } catch (err) {
    console.error("[proceedToCapture] capture failed:", err);
    return null;
  }
}

/**
 * Play a sound directly from a URL.
 * @param {string} url - The audio file URL
 */
export function playSoundFromUrl(url) {
  const audio = new Audio();
  audio.src = url;
  audio.controls = true; // optional, shows controls if appended to DOM

  audio.onplay = () => console.log("[playSound] started:", url);
  audio.onended = () => console.log("[playSound] finished:", url);
  audio.onerror = e => console.error("[playSound] error:", e);

  
  audio.play().catch(err => {
    console.error("[playSound] play() failed:", err);
  });

  return audio; // return the element if you want to attach controls
}

export async function playSoundFromURLorBlob(component, phraseID, targetID) {
  const targetObject = component._smartTable._raw.find(obj => obj.id === targetID);
  if (!targetObject) {
    console.warn("No object found for id:", targetID);
    return;
  }
  // console.log(targetObject);
  if (targetObject.t === "web") {
    // Play directly from URL
    // console.log("Playing web sound:", targetObject.url);
    playSoundFromUrl(targetObject.url);
  } else if (targetObject.t !== "web") {
    // Load blob from database
    try {
      const records = await Database.getSoundsByPhrase(phraseID);
      if (!records || !records.length) return false;
      const record = records[0];
      const soundBlobs = record.blob.find(b => b.id === targetID);
      if (soundBlobs) {
        const blob = soundBlobs.blob;
        const blobUrl = URL.createObjectURL(blob);
        // console.log("Playing blob sound:", blobUrl);
        playSoundFromUrl(blobUrl);
      } else {
        console.warn("No blob found for id:", targetObject.id);
      }
    } catch (err) {
      console.error("Error loading blob:", err);
    }
  } else {
    console.warn("Unknown sound type:", targetObject.t);
  }
}



export function normalizeSoundUrlsDataFromServer(phrase, arr) {
  const result = [];

  arr?.forEach(url => {
    const id = `${phrase.slice(0, phrase.length < 8 ? phrase.length : 8)}_${getUUID(6)}`;

    if (url.startsWith("http")) {
      // Remote sound file
      result.push({
        id,
        t: "web",
        url
      });
    } else {
      result.push({
        id,
        t: "blob",
        ...(url ? { url: url } : {}), // only add if true
      });
    }
  });

  return result;
}


export function insertWithFractionalOrder(arr, index, obj) {
  const prev = arr[index - 1]?.order ?? 0;
  const next = arr[index]?.order ?? prev + 1;
  obj.order = (prev + next) / 2;
  arr.splice(index, 0, obj);
  return arr;
}

/**
 * Calculate the new order value for an item to be inserted.
 *
 * Rules:
 * - If inserting at position 0, new order = (first.order) - 1
 * - If inserting between two items, new order = (prev.order + next.order) / 2
 * - If inserting at the end, new order = (last.order) + 1
 *
 * @param {Array} arr - array of objects with an `order` property
 * @param {number} position - index where the new item will be inserted
 * @returns {number} the calculated order value
 */
export function calculateNewOrder(arr, position) {
  if (arr.length === 0) {
    return 0; // first item in an empty array
  }

  if (position <= 0) {
    // Insert at the beginning
    return arr[0].order - 1;
  }

  if (position >= arr.length) {
    // Insert at the end
    return arr[arr.length - 1].order + 1;
  }

  // Insert between two items
  const prevOrder = arr[position - 1].order;
  const nextOrder = arr[position].order;
  return (prevOrder + nextOrder) / 2;
}
