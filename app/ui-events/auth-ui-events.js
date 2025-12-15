// /app/ui-events/auth-ui-events.js

import { hydrateUserProfileMenu } from "../../features/auth/ui-helper/user-profile-menu-ui-helper.js";

/**
 * Register UI-related auth events.
 * This module is UI-only and should be imported by <my-app>.
 *
 * @param {HTMLElement} app - The <my-app> instance
 */
export function registerAuthUIEvents(app) {

  //
  // ✅ When the app finishes bootstrapping
  //    (AppController emits app:ready)
  //
  document.addEventListener("app:ready", () => {
    console.log("🎨 UI: app:ready → hydrate user-profile-menu");
    app.updateUserProfileMenu();
  });


  //
  // ✅ When auth persistence finishes
  //    (auth-events.js emits auth:persisted)
  //
  document.addEventListener("auth:persisted", () => {
    console.log("🎨 UI: auth:persisted → hydrate user-profile-menu");
    app.updateUserProfileMenu();
  });


  //
  // ✅ When auth is fully ready
  //    (auth-events.js emits auth:ready)
  //
  document.addEventListener("auth:ready", () => {
    console.log("🎨 UI: auth:ready → hydrate user-profile-menu");
    app.updateUserProfileMenu();
  });


  //
  // ✅ Optional: When logout happens
  //    (login-form or user-profile-menu emits logout-success)
  //
  document.addEventListener("logout-success", () => {
    console.log("🎨 UI: logout-success → hydrate user-profile-menu");
    app.updateUserProfileMenu();
  });
}
