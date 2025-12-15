import { CONFIG } from '../../../config/config.js';  // API endpoints + constants    
import LocalStorage from "../../../core/local-storage.js"; // lightweight persistence
import Connectivity from './../../../js/utils/connectivity.js';
import Database from './../../../core/database.js';
/**
 * AuthManager
 * ===========================================
 * Centralized authentication + quota manager.
 * Handles authenticate after login (bootstrap server), refresh, logout, and guest fallback.
 * Handle retry API calls 
 * Emits canonical events (auth:state, auth:ready).
   Does not update UI directly. 
 */
export class AuthManager {
  // Bootstrap auth state from backend
  static async bootstrapAuth() {
    try {
      // Read identity_id from IndexedDB helper
      const key = await Database.getLicenseKey();
      const res = await fetch(CONFIG.API_BOOTSTRAP, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dvn: key || null
        })
      });

      const data = await res.json();      
      console.log(data);      
      document.dispatchEvent(new CustomEvent("auth:changed", { detail: data }));
      // return { isLoggedIn: data.mode === "authenticated", meta: data };
    } catch (err) {
      console.error("❌ Auth bootstrap failed:", err);    
      return { isLoggedIn: false, meta: null };
    }
  }

  // Refresh token if expired (cookies handle tokens, so just re-run bootstrap)
  static async refreshIfNeeded() {
    return await this.bootstrapAuth();
  }

  static async callApi(url, options = {}) {
    const opts = { ...options, credentials: "include" };
    const activeUser = LocalStorage.get("activeUser");

    try {  

      let res = await fetch(url, opts);

      if (res.status === 401) {
        console.warn("⚠️ Unauthorized, retrying after bootstrap...");
        await this.bootstrapAuth();
        res = await fetch(url, opts);
      }

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error("❌ API call failed:", err);
      throw err;
    }
  }

  // Logout flow
  static async logout() {
    console.log(`vao AuthManager.logout`);
    try {
      const res = await fetch(CONFIG.API_LOGOUT, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();

      console.log("🚪 Logout successful, switched to guest mode.", data);
      document.dispatchEvent(new CustomEvent("auth:changed", { detail: data }));
      return data;
    } catch (err) {
      console.error("❌ Logout from server failed:", err);    
      document.dispatchEvent(new CustomEvent("auth:changed", { detail: err })); 
      Connectivity.queueTask("logout", {});    
    }
  }
}
    