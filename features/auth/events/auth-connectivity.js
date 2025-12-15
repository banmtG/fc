// features/auth/auth-connectivity.js
import LocalStorage from '../../../core/local-storage.js';
import Connectivity from './../../../js/utils/connectivity.js';
import { AuthManager } from './../manager/auth-manager.js';
import { FIXED_GUEST_ID } from './../storage/auth-storage.js';

export function registerAuthConnectivity() {
  // Register global connectivity listeners
  Connectivity.registerEvents();

  // When connectivity returns, flush queued tasks
  document.addEventListener("connectivity:online", async () => {
    console.log("🌐 Back online, flushing task queue if conditions meet...");    
    const activeUser = LocalStorage.get('activeUser');
    await AuthManager.bootstrapAuth();
    if (activeUser==FIXED_GUEST_ID) await Connectivity.flushQueue();
  });

  // Handle logout task
  document.addEventListener("task:logout", async () => {
    console.log("🔄 Executing queued logout...");
    try {
      await AuthManager.logout(); // clears cookie + device token
    } catch (err) {
      console.error("❌ Logout failed, will re-queue", err);
      Connectivity.queueTask("logout", {}); // re-queue if still failing
    }
  });
}
