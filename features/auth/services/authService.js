// authService.js
// Low-level functions that talk to backend or OAuth providers.
// Return raw data (tokens, user info).
// No state management, no UI.

// Centralized authentication service for local, Google, Facebook, etc.

import { PROVIDER_CONFIG } from "./provider_config.js";
import { getUUID } from '../../../js/utils/id.js';
import { CONFIG } from '../../../config/config.js'; // get GOOGLE LOGIN REDIRECT URL
import Database from './../../../core/database.js';

//const BACKEND_BASE = "https://php.adapps.download/apps/fc/api/auth";

export async function getOAuthUrl(provider) {
  const { clientId, redirectUri, scope } = PROVIDER_CONFIG[provider];
//   const statePayload = JSON.stringify({
//   csrf: getUUID(),
//   identity_id: identity_id || null
// });

 const key = await Database.getLicenseKey();

  // const state = getUUID();
   const state = JSON.stringify({
    csrf: getUUID(),
    dvn: key || null
  });

  if (provider === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&state=${state}`;
  }
  if (provider === "facebook") {
    return `https://www.facebook.com/v12.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(scope)}&state=${state}`;
  }
  throw new Error("Unsupported provider");
}

/**
 * 🔑 Local login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} user info or error
 */
export async function loginLocal(email, password) {
  const res = await fetch(CONFIG.API_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ provider: "local", email, password }),
    credentials: "include"
  });
  if (!res.ok) throw new Error("Local login failed");
  return res.json();
}

/**
 * 🌐 Start OAuth flow in popup for Google/Facebook
 * @param {string} provider - 'google' or 'facebook'
 * @returns {Promise<object>} user info from session-check
 */
export function loginWithProvider(provider) {
  return new Promise(async (resolve, reject) =>  {
    const OAuth_Url = await getOAuthUrl(provider);
    const popup = window.open(
       OAuth_Url,   // ✅ use provider OAuth URL
      `${provider}-login`,
      "width=500,height=600"
    );

    let handled = false;

    // Listen for postMessage from popup
    const messageHandler = (event) => {
      if (event.data === `${provider}-login-success` && !handled) {
        handled = true;
        window.removeEventListener("message", messageHandler);
        // console.log(`vao authService`);
        // Verify session with backend
        fetch(CONFIG.API_BOOTSTRAP, {
        //  fetch(`${BACKEND_BASE}/session-check.php`, {
          method: "GET",
          credentials: "include"
        })
          .then((res) => res.json())
          .then((data) => {
   
            if (data.mode="authenticated") {
              // console.log(`resolve`,data);
              resolve(data);
            } else {
              reject("Session check failed");
            }
          })
          .catch((err) => reject(err));
      }
    };

    window.addEventListener("message", messageHandler);

    // Optional: detect popup closure
    const checkClosed = setInterval(() => {
      if (!handled && popup.closed) {
        handled = true;
        clearInterval(checkClosed);
        window.removeEventListener("message", messageHandler);
        reject("Login popup closed by user");
      }
    }, 1000);
  });
}

/**
 * 👤 Guest login (no credentials)
 */
export function loginGuest() {
  return Promise.resolve({ provider: "guest", guest: true });
}
