import { CONFIG } from '../../../config/config.js';  // API endpoints + constants    
import LocalStorage from "../../../core/local-storage.js"; // lightweight persistence
import Connectivity from './../../../js/utils/connectivity.js';
import Database from './../../../core/database.js';
import { Spinner } from './../../../components/smart/spinner.js';
import { NotificationManagerInstance } from './../../../core/notification-manager.js';

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

static async callApi(url, options = {}) {
  const opts = { ...options, credentials: "include" };

  try {
    Spinner.show(); // show loading icon

    let res = await fetch(url, opts);

    if (res.status === 401) {
      console.warn("⚠️ Unauthorized, retrying after bootstrap...");
      await this.bootstrapAuth();
      res = await fetch(url, opts);
    }

    // Parse JSON first
    const finalData = await res.json();
    console.log(finalData);

    // Handle quota error returned in JSON body
    if (finalData.error) {
      NotificationManagerInstance.show({
        label: `❌ ${finalData.error} (used ${finalData.used}/${finalData.limit})`,
        icon : 'exclamation-diamond-fill', 
        color : '--sl-color-danger-600',
        timer: 4000
      });
      throw new Error(`API error: ${finalData.error}`);
    }

    // Handle quota info if present
    if (finalData?.quota?.quota_applied?.[1]) {      
      const metrics = finalData.quota.quota_applied[1].metrics.daily_calls;
      console.log(metrics);  
      NotificationManagerInstance.show({
        label: `Quota left ${metrics.used} / ${metrics.limit}`,
        icon : 'info-circle-fill', 
        color : '--sl-color-primary-600',
        timer: 4000
      });
    }

    return finalData;
  } catch (err) {
    console.error("❌ API call failed:", err);
    throw err;
  } finally {
    Spinner.hide(); // always hide spinner
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
    