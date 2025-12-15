// user-profile-menu-ui-helper.js
import Database from '../../../core/database.js';
import LocalStorage from '../../../core/local-storage.js';

export async function hydrateUserProfileMenu(profileMenu) {
  if (!profileMenu) return;

  const activeUser = LocalStorage.get("activeUser");

  try {
    const userRecord = activeUser ? await Database.getUser(activeUser) : null;

    profileMenu.user = userRecord
      ? {
          mode: userRecord.type,
          email: userRecord.email,
          avatarUrl: userRecord.backendMeta?.avatarUrl,
          plan: userRecord.backendMeta?.plan || "free",
          user_app_data: userRecord.backendMeta?.app || {}
        }
      : { mode: "guest" };
  } catch (err) {
    console.error("❌ hydration failed:", err);
    profileMenu.user = { mode: "guest" };
  }
}
