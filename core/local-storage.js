// local-storage.js

/**
 * LocalStorage
 * ===========================================
 * Lightweight persistence layer.
 * - Stores session pointers, auth tokens, cached flags
 * - Provides safe get/set/remove helpers
 * - Namespaces keys to avoid collisions
 */

class LocalStorageClass {
  constructor(namespace = "ADFC") {
    this.ns = namespace;
  }

  // Build namespaced key
  _key(key) {
    return `${this.ns}:${key}`;
  }

  // Save value (auto JSON stringify)
  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
    } catch (err) {
      console.error("❌ LocalStorage set failed:", err);
    }
  }

  // Retrieve value (auto JSON parse)
  get(key) {
    try {
      const raw = localStorage.getItem(this._key(key));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("❌ LocalStorage get failed:", err);
      return null;
    }
  }

  // Remove a key
  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
    } catch (err) {
      console.error("❌ LocalStorage remove failed:", err);
    }
  }

  // Clear all keys under namespace
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(this.ns + ":"))
        .forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.error("❌ LocalStorage clearAll failed:", err);
    }
  }
}

// Export singleton instance
const LocalStorage = new LocalStorageClass();
export default LocalStorage;
