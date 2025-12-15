// auth-state.js
// AuthManager → AuthState.setAuthChanged() → emit auth:changed
//     ↓
// AuthStorage → persist → AuthState.setAuthPersisted() → emit auth:persisted
//     ↓
// UI → listens to state:changed or auth:ready → hydrate components

import StateStore from "./../../../core/state-store.js";

export const AuthState = {
  // Initialize default state
  init() {
    StateStore.setStateObject({
      authMode: "guest",
      currentUser: null,
      isAuthenticated: false
    });
  },

  // Update after backend bootstrap
  setAuthChanged(data) {
    StateStore.set("authMode", data.mode);
    StateStore.set("currentUser", data.user || null);
    StateStore.set("isAuthenticated", data.mode === "authenticated");
  },

  // Update after persistence
  setAuthPersisted(userRecord) {
    StateStore.set("currentUser", userRecord);
  },

  // Clear on logout
  clear() {
    StateStore.setStateObject({
      authMode: "guest",
      currentUser: null,
      isAuthenticated: false
    });
  }
};
