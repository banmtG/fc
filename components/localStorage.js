class LocalStorageManager {
    static prefix = ""; // Optional prefix to avoid key collisions
  
    static get(key) {
      const storedValue = localStorage.getItem(`${this.prefix}${key}`);
      return storedValue ? JSON.parse(storedValue) : null;
    }
  
    static set(key, value) {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    }
  
    static remove(key) {
      localStorage.removeItem(`${this.prefix}${key}`);
    }
  
    static exists(key) {
      return localStorage.getItem(`${this.prefix}${key}`) !== null;
    }
  
    static clear() {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.prefix))
        .forEach((key) => localStorage.removeItem(key));
    }
  
    static async fetchAndSet(key, fetchFunction) {
      const data = await fetchFunction();
      this.set(key, data);
      return data;
    }
  }