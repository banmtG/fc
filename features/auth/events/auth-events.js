// auth-events.js
// listen all auth-related events
// is a glue layer that listens for auth-events and coordinates persistence + UI updates.

import { AuthManager } from './../manager/auth-manager.js';
import { persistAuthenticatedUser, persistGuestUser, persistLicense } from './../storage/auth-storage.js';

export function registerAuthEvents() {
  
  document.addEventListener("login-success", async () => { 
    // the event from login-form .\features\auth\components\login-form.js
    const backendStatus = await AuthManager.bootstrapAuth();
  });

  document.addEventListener("logout-success", async () => {
    await AuthManager.logout();  
  });

   // AuthManager emits raw auth:changed from bootstrap and logout
  document.addEventListener("auth:changed", async (e) => { 
    console.log("📢 auth:changed", e.detail);
    const { mode, email } = e.detail;
    // Here you could trigger persistence logic if not already handled in auth-storage.js
    if (mode=="authenticated" && email) {
      persistAuthenticatedUser(e);
    } else {
      persistGuestUser();      
    }
    await persistLicense(e);
  });

 // Persistence layer emits after DB + LocalStorage write 
  document.addEventListener("auth:persisted", async (e) => {
    console.log("📢 auth:persisted", e.detail);    
    // after auth:persisted in LocalStorage and Database then update UI
    // setUserProfileMenuFromActiveUser();
    // After hydration or update UI, emit auth:ready
    document.dispatchEvent(new CustomEvent("auth:ready", { detail: e.detail }));
  });

  // UI glue emits when components are hydrated
  document.addEventListener("auth:ready", (e) => {
    console.log("📢 auth:ready — UI hydrated:", e.detail);
    // At this point, <user-profile-menu> should already be updated
  });

  // Catch errors from any layer
  document.addEventListener("auth:error", (e) => {
    console.error("❌ auth:error", e.detail);
    // Optionally show a notification or fallback to guest
  });

}
