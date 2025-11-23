// authService.js
// Centralized authentication service for local, Google, Facebook, etc.

import { PROVIDER_CONFIG } from "./provider_config.js";
import { getUUID } from './../utils/id.js';

const BACKEND_BASE = "https://php.adapps.download/fc/api";

export function getOAuthUrl(provider) {
  const { clientId, redirectUri, scope } = PROVIDER_CONFIG[provider];
  const state = getUUID();

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
  const res = await fetch(`${BACKEND_BASE}/login.php`, {
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
  return new Promise((resolve, reject) => {
    const popup = window.open(
       getOAuthUrl(provider),   // ✅ use provider OAuth URL
      `${provider}-login`,
      "width=500,height=600"
    );

    let handled = false;

    // Listen for postMessage from popup
    const messageHandler = (event) => {
      if (event.data === `${provider}-login-success` && !handled) {
        handled = true;
        window.removeEventListener("message", messageHandler);

        // Verify session with backend
        fetch(`${BACKEND_BASE}/session-check.php`, {
          method: "GET",
          credentials: "include"
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.loggedIn) {
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
