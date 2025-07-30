/**
 * LocalStorageManager
 * ====================
 * Utility class to manage persistent storage using browser's localStorage.
 * Designed to be reusable across any JS application with optional namespacing.
 */
class LocalStorageManager {
    static prefix = ""; // Optional prefix to avoid key collisions between projects/modules

    /**
     * Retrieve and parse an item from localStorage
     * @param {string} key - storage key
     * @returns {any|null}
     */
    static get(key) {
        const storedValue = localStorage.getItem(`${this.prefix}${key}`);
        return storedValue ? JSON.parse(storedValue) : null;
    }

    /**
     * Store a value in localStorage (automatically JSON-stringified)
     * @param {string} key
     * @param {any} value
     */
    static set(key, value) {
        localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    }

    /**
     * Remove a key from localStorage
     * @param {string} key
     */
    static remove(key) {
        localStorage.removeItem(`${this.prefix}${key}`);
    }

    /**
     * Check if a key exists in localStorage
     * @param {string} key
     * @returns {boolean}
     */
    static exists(key) {
        return localStorage.getItem(`${this.prefix}${key}`) !== null;
    }

    /**
     * Remove all keys with the current prefix
     */
    static clear() {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(this.prefix))
            .forEach((key) => localStorage.removeItem(key));
    }

    /**
     * Run an async fetch operation, save the result in localStorage, and return the data.
     *
     * ✅ Typical usage:
     * Useful when you want to cache data from a remote source (API call or heavy computation)
     * so you don't need to repeat the fetch every time the page loads.
     *
     * @param {string} key - The key under which to store the fetched result in localStorage
     * @param {Function} fetchFunction - A function that returns a Promise resolving with the data
     * 
     * @returns {Promise<any>} - The resolved data from fetchFunction
     *
     * 📘 Example:
     * await LocalStorageManager.fetchAndSet("userProfile", () => fetch("/api/profile").then(res => res.json()));
     * Then later you can just do:
     * const cached = LocalStorageManager.get("userProfile");
     */
    static async fetchAndSet(key, fetchFunction) {
        const data = await fetchFunction();
        this.set(key, data);
        return data;
    }
}
