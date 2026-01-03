// auth-storage.js

import Database from './../../../core/database.js';
import LocalStorage from './../../../core/local-storage.js';
import { getUUID } from './../../../js/utils/id.js';
export const FIXED_GUEST_ID = "user-0";  // 🔒 fixed ID

// Ensure guest session exists (called once at bootstrap)
export async function ensureGuestSession() {
  const users = await Database.getAllUsers();
  let guest = users.find(u => u.type === "guest");
//   console.log("guest", guest);

  if (!guest) {
    guest = {
      userID: FIXED_GUEST_ID,
      type: "guest",
      email: null,
      preferences: { theme: "light", language: "en", notifications: true },
      playlistIDs: [],
      backendMeta: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await Database.saveUser(guest);

    const activeUser = LocalStorage.get('activeUser');
    if (!activeUser) LocalStorage.set('activeUser', guest.userID);
  }


  return guest;
}


export async function persistAuthenticatedUser(e) {
  
  const { email, uuid, avatarUrl, plan, user_app_data } = e.detail;
  // Check if user already exists in IndexedDB

  const dbUsers = await Database.findByField("users","email","equal",email);
  let dbUser = dbUsers[0];
//   const existingUsers = await Database.getAllUsers();
//   let dbUser = existingUsers.find(u => u.email === email);

  if (!dbUser) {
    const newUser = {
      userID: "user-" + uuid,
      type: "login",
      email,
      preferences: {},
      playlistIDs: [],
      backendMeta: {
        app: user_app_data,
        avatarUrl,
        plan
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await Database.saveUser(newUser);
    dbUser = newUser;
    console.log("✅ New user saved to DB:", dbUser);
  } else {
    console.log("ℹ️ User already exists in DB:", dbUser);
    // Optionally refresh updatedAt or merge preferences
  }

  LocalStorage.set("activeUser", dbUser.userID);
  console.log(dbUser.userID);
  // Emit persistence event
  document.dispatchEvent(new CustomEvent("auth:persisted", { detail: dbUser }));

  return dbUser;
}

export function persistGuestUser() {
  LocalStorage.set("activeUser", FIXED_GUEST_ID);
  document.dispatchEvent(new CustomEvent("auth:persisted", { detail: { mode: "guest" } }));
}

export async function persistLicense(e) {
  console.log("Event detail:", e.detail);
  const key = e.detail.dvn;
  const existing = await Database.getLicenseKey();

  // console.log("Existing license in DB:", existing);

  // Only persist if we received a valid identity_id and none is stored yet
  if (key && !existing) {
    Database.createLicenseKey(key);
    // const newLicense = await Database.getLicenseKey();
    // console.log("Persisted new license:", newLicense);
  }
}


// login-form → dispatch("login-success")
//     ↓
// AuthManager.bootstrapAuth() → backend
//     ↓
// dispatch("auth:state", {mode, user})
//     ↓
// Persistence Layer → save to LocalStorage + IndexedDB
//     ↓
// dispatch("auth:persisted", {activeUserId, user})
//     ↓
// UI Layer → user-profile-menu updated

//  /src/features/auth/
//   components/
//     login-form.js
//     user-profile-menu.js
//   services/
//     auth-service.js
//   managers/
//     auth-manager.js
//   events/
//     auth-events.js
//   storage/
//     auth-storage.js   # wraps LocalStorage/IndexedDB for auth

// /src/core/
//   database.js        # IndexedDB abstraction
//   local-storage.js   # LocalStorage wrapper
//   state-store.js     # reactive in-memory store
//   app-controller.js  # orchestrates app startup

// 3. Event‑driven flow
// Use a canonical event bus (or state store) so features don’t race each other:

// auth:state → emitted by AuthManager.

// auth:persisted → emitted by persistence layer after DB/LocalStorage update.

// auth:ui-ready → emitted when UI has hydrated.

// This makes flows predictable and testable.

// /src/features/playlists/
//   components/
//     playlist-list.js        # Web component to render all playlists
//     playlist-editor.js      # Web component to edit a single playlist
//     playlist-card.js        # Small reusable card for one playlist

//   services/
//     playlist-service.js     # Low-level API calls (fetch playlists, save, delete)

//   managers/
//     playlist-manager.js     # Orchestrates playlist state, caching, sync with DB

//   events/
//     playlist-events.js      # Listens for playlist actions, wires UI to manager

//   storage/
//     playlist-storage.js     # IndexedDB helpers for playlists (CRUD, indexing)


// Recommended naming set for Auth
// Event name	Emitted by	Meaning
// auth:changed	AuthManager	Raw state change from backend bootstrap/refresh (user logged in/out).
// auth:persisted	Persistence layer	State has been written to LocalStorage/IndexedDB, safe for other layers.
// auth:ready	UI glue/events	UI has been hydrated with active user and is ready to render.
// auth:error	Any layer	Something failed (bootstrap, persistence, hydration).

// How state fits in
// AuthManager → emits auth:changed (raw backend truth).

// AuthStorage → persists to LocalStorage + Database → emits auth:persisted.

// StateStore → listens to auth:persisted and updates in‑memory reactive state (currentUser, isAuthenticated).

// UI → listens to state-store changes or auth:ready events to hydrate components.

