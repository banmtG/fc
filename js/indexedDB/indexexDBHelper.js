/**
 * IndexedDBHelper
 * ===========================================
 * Modular helper for managing users and phrase data.
 * Supports multiple users, structured phrase objects, and blobs.
 */
export class IndexedDBHelper {
  // Constructor sets up database name and version
  constructor(dbName = "ADFC", version = 1) {
    this.dbName = dbName;   // Name of the IndexedDB database
    this.version = version; // Schema version (increment to trigger onupgradeneeded)
    this.db = null;         // Will hold the opened database connection
  }

  // Initialize the database connection
  async init() {
    return new Promise((resolve, reject) => {
      // Open (or create) the database with given name and version
      const request = indexedDB.open(this.dbName, this.version);

      // Runs when DB is first created or version changes
      request.onupgradeneeded = (event) => {
        const db = event.target.result; // Reference to the database

        // Create "users" store if it doesn't exist
        if (!db.objectStoreNames.contains("users")) {
          // Keyed by "userId"
          const usersStore = db.createObjectStore("users", { keyPath: "userId" });
          // Add an index on userId for quick lookup
          usersStore.createIndex("userId", "userId", { unique: true });
        }

        // Create "phrases" store if it doesn't exist
        if (!db.objectStoreNames.contains("phrases")) {
          // Composite key: [userId, id] ensures uniqueness per user
          const phrasesStore = db.createObjectStore("phrases", { keyPath: ["userId", "id"] });
          // Index on userId so we can query all phrases for a user
          phrasesStore.createIndex("userId", "userId", { unique: false });
        }
      };

      // Runs when DB successfully opens
      request.onsuccess = (event) => {
        this.db = event.target.result; // Save DB connection
        resolve(this.db);              // Resolve promise with DB
      };

      // Runs if opening DB fails
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // ============================
  // Users Info
  // ============================

  // Save or update a user record
  async saveUser(user) {
    return this._put("users", user);
  }

  // Get a single user by ID
  async getUser(userId) {
    return this._get("users", userId);
  }

  // Get all users in the store
  async getAllUsers() {
    return this._getAll("users");
  }

  // Delete a user by ID
  async deleteUser(userId) {
    return this._delete("users", userId);
  }

  // ============================
  // User Phrases
  // ============================

  // Save or update a phrase for a given user
  async savePhrase(userId, phrase) {
    // Spread phrase object and attach userId
    return this._put("phrases", { userId, ...phrase });
  }

  // Get a single phrase by userId + phraseId
  async getPhrase(userId, phraseId) {
    return this._get("phrases", [userId, phraseId]);
  }

  // Get all phrases belonging to a user
  async getUserPhrases(userId) {
    return new Promise((resolve, reject) => {
      // Start readonly transaction
      const tx = this.db.transaction("phrases", "readonly");
      const store = tx.objectStore("phrases");
      const index = store.index("userId"); // Use index to filter by userId
      const request = index.getAll(userId); // Get all phrases for this user

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Delete a phrase by userId + phraseId
  async deletePhrase(userId, phraseId) {
    return this._delete("phrases", [userId, phraseId]);
  }

  // ============================
  // Internal Helpers
  // ============================

  // Generic put (insert/update) helper
  _put(storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite"); // RW transaction
      const store = tx.objectStore(storeName);                // Get store
      const request = store.put(value);                       // Insert/update record

      request.onsuccess = () => resolve(value);               // Resolve with saved value
      request.onerror = (e) => reject(e.target.error);        // Reject on error
    });
  }

  // Generic get helper
  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");  // Readonly transaction
      const store = tx.objectStore(storeName);                // Get store
      const request = store.get(key);                         // Fetch record by key

      request.onsuccess = () => resolve(request.result);      // Resolve with result
      request.onerror = (e) => reject(e.target.error);        // Reject on error
    });
  }

  // Generic getAll helper
  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");  // Readonly transaction
      const store = tx.objectStore(storeName);                // Get store
      const request = store.getAll();                         // Fetch all records

      request.onsuccess = () => resolve(request.result);      // Resolve with array of records
      request.onerror = (e) => reject(e.target.error);        // Reject on error
    });
  }

  // Generic delete helper
  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite"); // RW transaction
      const store = tx.objectStore(storeName);                // Get store
      const request = store.delete(key);                      // Delete record by key

      request.onsuccess = () => resolve(true);                // Resolve true on success
      request.onerror = (e) => reject(e.target.error);        // Reject on error
    });
  }

// ============================
  // NEW: Generic updateFields helper
  // ============================
  _updateFields(storeName, key, updates) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      // Step 1: Get the record
      const getReq = store.get(key);

      getReq.onsuccess = () => {
        let record = getReq.result;
        if (!record) {
          reject(new Error("Record not found"));
          return;
        }

        // Step 2: Apply updates
        Object.assign(record, updates);

        // Step 3: Save back
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = (e) => reject(e.target.error);
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  }

}
