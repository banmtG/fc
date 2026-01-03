import { getUUID } from './../js/utils/id.js';
// database.js

/**
 * Database
 * ===========================================
 * Central IndexedDB manager for users, playlists, phrases, imageBlobs, soundBlobs.
 * Provides initialization + CRUD helpers.
 */

class DatabaseClass {
  constructor ( dbName = "ADFC_DB", version = 1 ) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // Initialize DB and create stores if needed
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // --- USERS ---
        if (!db.objectStoreNames.contains("users")) {
          const usersStore = db.createObjectStore("users", { keyPath: "userID" });
          usersStore.createIndex("email", "email", { unique: true });
          usersStore.createIndex("type", "type", { unique: false });
        }

        // --- KEY ---
        if (!db.objectStoreNames.contains("info")) {
          const info = db.createObjectStore("info", { keyPath: "key" });
          // identityStore.createIndex("identity_id", "identity_id", { unique: true });         
        }

        // --- PLAYLISTS ---
        if (!db.objectStoreNames.contains("playlists")) {
          const playlistsStore = db.createObjectStore("playlists", { keyPath: "playlistID" });
          playlistsStore.createIndex("userID", "userID", { unique: false });
        }

        // --- PHRASES ---
        if (!db.objectStoreNames.contains("phrases")) {
          const phrasesStore = db.createObjectStore("phrases", { keyPath: "phraseID" });
          phrasesStore.createIndex("phrase", "phrase", { unique: false });
          phrasesStore.createIndex("type", "type", { unique: false });
        }

        // --- IMAGE BLOBS ---
        if (!db.objectStoreNames.contains("imageBlobs")) {
          const imageStore = db.createObjectStore("imageBlobs", { keyPath: "imgID" });
          imageStore.createIndex("phraseID", "phraseID", { unique: false });
        }

        // --- SOUND BLOBS ---
        if (!db.objectStoreNames.contains("soundBlobs")) {
          const soundStore = db.createObjectStore("soundBlobs", { keyPath: "soundID" });
          soundStore.createIndex("phraseID", "phraseID", { unique: false });
        }

         // --- TAGS ---
        if (!db.objectStoreNames.contains("tags")) {
           const tagStore = db.createObjectStore("tags", { keyPath: "tagID", autoIncrement: true });
           tagStore.createIndex("userID", "userID", { unique: false });
           tagStore.createIndex("tag", "tag", { unique: true });
        }

        // REMINDER TEXT
        const reminderStore = db.createObjectStore("reminders", { keyPath: "reminderID", autoIncrement: true });
        reminderStore.createIndex("userID", "userID", { unique: false });
        reminderStore.createIndex("text", "text", { unique: true });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => reject(event.target.error);
    });
  }

  // ============================
  // Generic Helpers
  // ============================

  _put(storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  _updateFields(storeName, key, updates) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      console.log(updates);
      getReq.onsuccess = () => {
        let record = getReq.result;
        if (!record) {
          reject(new Error("Record not found"));
          return;
        }
        Object.assign(record, updates);
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = (e) => reject(e.target.error);
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  // ============================
  // Domain-Specific Helpers
  // ============================
  // Tags
// Add or update a tag
  addTag(tagObj) {
    // tagObj = { userID, tag }
    return this._put("tags", tagObj);
  }

  // Get tag by primary key (tagID)
  getTag(tagID) {
    return this._get("tags", tagID);
  }

  // Get all tags
  getAllTags() {
    return this._getAll("tags");
  }

  // Get all tags for a specific user
  getTagsByUser(userID) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tags", "readonly");
      const store = tx.objectStore("tags");
      const index = store.index("userID");
      const req = index.getAll(userID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Delete tag by ID
  deleteTag(tagID) {
    return this._delete("tags", tagID);
  }

  // Update tag fields by ID
  updateTag(tagID, updates) {
    console.log(updates);
    return this._updateFields("tags", tagID, updates);
  }

 // ============================
// Domain-Specific Helpers
// ============================

// Reminders
// Add or update a reminder
addReminder(reminderObj) {
  // reminderObj = { userID, text, select, createdAt }
  return this._put("reminders", reminderObj);
}

// Get reminder by primary key (reminderID)
getReminder(reminderID) {
  return this._get("reminders", reminderID);
}

// Get all reminders
getAllReminders() {
  return this._getAll("reminders");
}

// Get all reminders for a specific user
getRemindersByUser(userID) {
  return new Promise((resolve, reject) => {
    const tx = this.db.transaction("reminders", "readonly");
    const store = tx.objectStore("reminders");
    const index = store.index("userID");
    const req = index.getAll(userID);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Delete reminder by ID
deleteReminder(reminderID) {
  return this._delete("reminders", reminderID);
}

// Update reminder fields by ID
updateReminder(reminderID, updates) {
  return this._updateFields("reminders", reminderID, updates);
}


  // Users
  saveUser(user) { return this._put("users", user); }
  getUser(userID) { return this._get("users", userID); }
  getUserByEmail(email) { return this._get("users", email); }
  getAllUsers() { return this._getAll("users"); }
  deleteUser(userID) { return this._delete("users", userID); }

  // indentityID
// Simple reversible obfuscation helpers
  obfusKey(key) {
    const salt = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    return btoa(`${key}::${salt}`);
  }

 deobfusKey(obf) {
  try {
    const decoded = atob(obf);
    return decoded.split("::")[0]; // extract original dvn
  } catch (e) {
    return null;
  }
}

// Identity helpers with obfuscation
createLicenseKey(dvn) {
  const obf = this.obfusKey(dvn);
  return this._put("info", { key: obf });
}

async getLicenseKey() {
  const records = await this._getAll("info");
  if (!records || records.length === 0) return null;

  const obf = records[records.length - 1].key;
  return this.deobfusKey(obf);
}

deleteLicenseKey(key = null) {
  if (key) {
    // identityID is raw dvn, so we must find the obfuscated version
    this._getAll("info").then(records => {
      records.forEach(r => {
        const raw = this.deobfusKey(r.key);
        if (raw === key) {
          this._delete("info", r.key);
        }
      });
    });
  } else {
    // Clear all
    this._getAll("info").then(records => {
      records.forEach(r => this._delete("info", r.key));
    });
  }
}


  // Playlists
  savePlaylist(playlist) { return this._put("playlists", playlist); }
  getPlaylist(id) { return this._get("playlists", id); }
  getUserPlaylists(userID) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("playlists", "readonly");
      const store = tx.objectStore("playlists");
      const index = store.index("userID");
      const req = index.getAll(userID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  deletePlaylist(id) { return this._delete("playlists", id); }

  // Phrases
  savePhrase(phrase) { return this._put("phrases", phrase); }
  getPhrase(id) { return this._get("phrases", id); }
  getAllPhrases() { return this._getAll("phrases"); }
  deletePhrase(id) { return this._delete("phrases", id); }

  // Image Blobs
  saveImageBlob(blob) { return this._put("imageBlobs", blob); }
  getImageBlob(id) { return this._get("imageBlobs", id); }
  getImagesByPhrase(phraseID) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("imageBlobs", "readonly");
      const store = tx.objectStore("imageBlobs");
      const index = store.index("phraseID");
      const req = index.getAll(phraseID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  deleteImageBlob(id) { return this._delete("imageBlobs", id); }

  // Sound Blobs
  saveSoundBlob(blob) { return this._put("soundBlobs", blob); }
  getSoundBlob(id) { return this._get("soundBlobs", id); }
  getSoundsByPhrase(phraseID) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("soundBlobs", "readonly");
      const store = tx.objectStore("soundBlobs");
      const index = store.index("phraseID");
      const req = index.getAll(phraseID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  deleteSoundBlob(id) { return this._delete("soundBlobs", id); }

  /**
 * Find records in a store by field and operator
 * @param {string} storeName - The object store name
 * @param {string} field - The field to check
 * @param {string} operator - "equal" | "contains" | "lessThan" | "greaterThan"
 * @param {any} value - The value to compare against
 * @returns {Promise<Array>} - Matching records
 */
findByField(storeName, field, operator, value) {
  return new Promise((resolve, reject) => {
    const tx = this.db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();

    req.onsuccess = () => {
      const results = (req.result || []).filter(record => {
        const fieldValue = record[field];
        if (fieldValue === undefined) return false;

        switch (operator) {
          case "equal":
            return fieldValue === value;
          case "contains":
            return typeof fieldValue === "string" && fieldValue.includes(value);
          case "lessThan":
            return fieldValue < value;
          case "greaterThan":
            return fieldValue > value;
          default:
            return false;
        }
      });
      resolve(results);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

}

// Export singleton instance
const Database = new DatabaseClass();
export default Database;

