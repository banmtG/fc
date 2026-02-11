// config.js
export const CONFIG = {
  API_BOOTSTRAP:    "https://php.adapps.download/apps/fc/api/auth/bootstrap.php",
  API_PROTECTED:    "https://php.adapps.download/apps/fc/api/data/protectedAPI.php",
  API_SEARCH_DICT:  "https://php.adapps.download/apps/fc/api/data/searchDict.php",
  API_SEARCH_IMG: "https://php.adapps.download/apps/fc/api/data/searchImage.php",
  API_LOGOUT: "https://php.adapps.download/apps/fc/api/auth/logout.php",
  API_LOGIN: "https://php.adapps.download/apps/fc/api/auth/login.php",
  QUOTA_GUEST: 100,
  TOKEN_EXPIRY: 900, // seconds
  RELATED_TYPE: [ 
    { type: "S" , bg: "#a1d8fd" , legend: "Synonym"},
    { type: "A" , bg: "#E8D5B7" , legend: "Antonym"},
    { type: "R" , bg: "#D5D8DC" , legend: "Related"},
  ]
};
