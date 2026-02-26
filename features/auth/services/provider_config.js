// provider_config.js
// Centralized OAuth provider configuration

export const PROVIDER_CONFIG = {
  google: {
    clientId: "842799415320-ujd4fodvctbgrc6jdfkb596opkiva859.apps.googleusercontent.com",
    redirectUri: "https://php.adapps.download/apps/fc/api/auth/login.php?provider=google",
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email"
  },
  facebook: {
    clientId: "YOUR_FACEBOOK_APP_ID",
    redirectUri: "https://php.adapps.download/apps/fc/api/auth/login.php?provider=facebook",
    scope: "email,public_profile"
  }
};
