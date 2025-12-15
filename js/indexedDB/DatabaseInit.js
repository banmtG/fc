function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("myAppDB", 1); // bump version if schema changes

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // --- USERS ---
      if (!db.objectStoreNames.contains("users")) {
        const usersStore = db.createObjectStore("users", { keyPath: "userId" });
        usersStore.createIndex("email", "email", { unique: true });
        usersStore.createIndex("type", "type", { unique: false });
      }

      // --- PLAYLISTS ---
      if (!db.objectStoreNames.contains("playlists")) {
        const playlistsStore = db.createObjectStore("playlists", { keyPath: "playlistID" });
        playlistsStore.createIndex("userID", "userID", { unique: false });
      }

      // --- PHRASES ---
      if (!db.objectStoreNames.contains("phrases")) {
        const phrasesStore = db.createObjectStore("phrases", { keyPath: "phraseId" });
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
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject("Database error: " + event.target.errorCode);
    };
  });
}
