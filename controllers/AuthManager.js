import { CONFIG } from './../config/config';
import { StateStore } from './../stores/states.js';
import { LocalStorageManager } from './../stores/localStorage.js';

/**
 * AuthManager
 * ===========================================
 * Centralized authentication + quota manager.
 * Handles login, refresh, logout, and guest fallback.
 */
export class AuthManager {
  static async bootstrap() {
    try {
      const res = await fetch(CONFIG.API_BOOTSTRAP, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();

      // Save to StateStore
      StateStore.setState("isAuthenticated", !!data.auth_user);
      StateStore.setState("authUser", data.auth_user || null);
      StateStore.setState("mode", data.mode || "guest");
      StateStore.setState("quotaRemaining", data.quota?.remaining ?? CONFIG.QUOTA_GUEST);
      StateStore.setState("expiresAt", Date.now() + (data.expires_in || CONFIG.TOKEN_EXPIRY) * 1000);

      // Persist to LocalStorage
      LocalStorageManager.set("auth", StateStore.getStateObject());

      return data;
    } catch (err) {
      console.error("❌ Bootstrap failed:", err);
      return { mode: "guest", quotaRemaining: 100 };
    }
  }

  static async refreshIfNeeded() {
    const expiresAt = StateStore.getState("expiresAt");
    if (expiresAt && Date.now() > expiresAt) {
      console.log("🔄 Access token expired, refreshing...");
      return await this.bootstrap();
    }
    return StateStore.getStateObject();
  }

  static async callApi(url, options = {}) {
    const opts = { ...options, credentials: 'include' };

    // Refresh proactively if needed
    await this.refreshIfNeeded();

    let res = await fetch(url, opts);

    // Safety net: retry if server rejects
    if (res.status === 401) {
      console.warn("⚠️ Unauthorized, retrying after refresh...");
      await this.bootstrap();
      res = await fetch(url, opts);
    }

    const data = await res.json();

    // Update quota if provided
    if (data.quota) {
      StateStore.setState("quotaRemaining", data.quota.remaining);
    }

    return data;
  }

  static async logout() {
    const res = await fetch(CONFIG.API_LOGOUT, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();

    // Reset state
    StateStore.setState("isAuthenticated", false);
    StateStore.setState("authUser", null);
    StateStore.setState("mode", "guest");
    StateStore.setState("quotaRemaining", 100);
    StateStore.setState("expiresAt", null);

    // ✅ Remove only auth/session keys from LocalStorage
    LocalStorageManager.remove("auth");   // instead of clear()
    LocalStorageManager.remove("session");

    // Keep user data caches intact
    console.log("🚪 Logout successful, switched to guest mode.");
    return data;
  }  catch (err) {
    console.error("❌ Logout failed:", err);
    // Still force client to guest mode
    StateStore.setState("isAuthenticated", false);
    StateStore.setState("authUser", null);
    StateStore.setState("mode", "guest");
    StateStore.setState("quotaRemaining", CONFIG.QUOTA_GUEST);
    StateStore.setState("expiresAt", null);
    LocalStorageManager.remove("auth");
    LocalStorageManager.remove("session");
  }
}
