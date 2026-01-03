// app-controller.js

import Database from './database.js';
import { ensureGuestSession } from './../features/auth/storage/auth-storage.js';
import { registerAuthEvents } from '../features/auth/events/auth-events.js';
import { registerAuthConnectivity } from './../features/auth/events/auth-connectivity.js';
import { registerNewPhraseTabEvents } from './events/new-phrase-tab-events.js';
import LocalStorage from './local-storage.js';


/**
 * Central AppController
 *   startup
 * - Orchestrates bootstrap
 * - Listens for global events (login/logout, playlist updates, etc.)
 * - Routes state changes into StateStore
 */
export class AppController {
  constructor() {
    this.db = null;
    this.currentUserID = null;
  }

  async bootstrap() {
    try {
      // 1. Initialize IndexedDB
      this.db = await Database.init();

      console.log("✅ Database ready:", this.db.name);


      // 2. Ensure guest session exists
      await ensureGuestSession(this.db);

      // 3. Register database event listeners (pass db instance)
      
      //registerDatabaseEvents(this.db); // in .\core\events\database-events.js
      registerAuthEvents();  // './../features/auth/events/auth-events.js'
      registerAuthConnectivity(); // './../features/auth/events/auth-connectivity.js';
      this.currentUserID = LocalStorage.get('activeUser');
      console.log(this.currentUserID);
      this.initEventListeners(); // Register event listeners
      // 3. Bootstrap backend (auth + quota)
      // const backendStatus = await AuthManager.bootstrapAuth();

      // ✅ 4. Emit app:ready so <my-app> can hydrate UI
      document.dispatchEvent(new CustomEvent("app:ready"));

      // setUserProfileMenuFromActiveUser();


      console.log("🚀 Bootstrap complete!");
    } catch (err) {
      console.error("❌ App bootstrap failed:", err);
    }
  }

  /**
   * Listen for app‑wide events and route them
   */
  initEventListeners() {

    registerNewPhraseTabEvents(this);

    // document.addEventListener("logout-success", async () => {
    //   await AuthManager.logout();
    //   LocalStorage.remove("authToken");
    //   StateStore.set("userType", "guest");
    //   StateStore.set("backendMeta", null);

    //   document.dispatchEvent(
    //     new CustomEvent("auth:changed", {
    //       detail: { isLoggedIn: false, user: null, mode: "guest" },
    //     })
    //   );
    // });

   
    // document.addEventListener("playlist:updated", (e) => {
    //   const { playlistId, list } = e.detail;
    //   console.log("🎵 Playlist updated:", playlistId, list);
    //   // Persist change into IndexedDB via database.js helper
    // });

  }
}

// Run bootstrap on app start
const controller = new AppController();
controller.bootstrap();
