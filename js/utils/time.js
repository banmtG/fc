export const supportedLanguages = [
  { 
    "code": "en", 
    "englishLang": "English", 
    "nativeLang": "English", 
    "codeForLocaleString": "en-US", 
    "direction": "ltr", 
    "region": "US" 
  },

  { "code": "zh", "englishLang": "Mandarin Chinese", "nativeLang": "中文", "codeForLocaleString": "zh-CN", "direction": "ltr", "region": "CN" },
  { "code": "hi", "englishLang": "Hindi", "nativeLang": "हिन्दी", "codeForLocaleString": "hi-IN", "direction": "ltr", "region": "IN" },
  { "code": "es", "englishLang": "Spanish", "nativeLang": "Español", "codeForLocaleString": "es-ES", "direction": "ltr", "region": "ES" },
  { "code": "fr", "englishLang": "French", "nativeLang": "Français", "codeForLocaleString": "fr-FR", "direction": "ltr", "region": "FR" },
  { "code": "ar", "englishLang": "Arabic", "nativeLang": "العربية", "codeForLocaleString": "ar-SA", "direction": "rtl", "region": "SA" },
  { "code": "bn", "englishLang": "Bengali", "nativeLang": "বাংলা", "codeForLocaleString": "bn-BD", "direction": "ltr", "region": "BD" },
  { "code": "ru", "englishLang": "Russian", "nativeLang": "Русский", "codeForLocaleString": "ru-RU", "direction": "ltr", "region": "RU" },
  { "code": "pt", "englishLang": "Portuguese", "nativeLang": "Português", "codeForLocaleString": "pt-BR", "direction": "ltr", "region": "BR" },
  { "code": "ur", "englishLang": "Urdu", "nativeLang": "اردو", "codeForLocaleString": "ur-PK", "direction": "rtl", "region": "PK" },
  { "code": "id", "englishLang": "Indonesian", "nativeLang": "Bahasa Indonesia", "codeForLocaleString": "id-ID", "direction": "ltr", "region": "ID" },
  { "code": "de", "englishLang": "German", "nativeLang": "Deutsch", "codeForLocaleString": "de-DE", "direction": "ltr", "region": "DE" },
  { "code": "ja", "englishLang": "Japanese", "nativeLang": "日本語", "codeForLocaleString": "ja-JP", "direction": "ltr", "region": "JP" },
  { "code": "mr", "englishLang": "Marathi", "nativeLang": "मराठी", "codeForLocaleString": "mr-IN", "direction": "ltr", "region": "IN" },
  { "code": "te", "englishLang": "Telugu", "nativeLang": "తెలుగు", "codeForLocaleString": "te-IN", "direction": "ltr", "region": "IN" },
  { "code": "tr", "englishLang": "Turkish", "nativeLang": "Türkçe", "codeForLocaleString": "tr-TR", "direction": "ltr", "region": "TR" },
  { "code": "ko", "englishLang": "Korean", "nativeLang": "한국어", "codeForLocaleString": "ko-KR", "direction": "ltr", "region": "KR" },
  { "code": "vi", "englishLang": "Vietnamese", "nativeLang": "Tiếng Việt", "codeForLocaleString": "vi-VN", "direction": "ltr", "region": "VN" },
  { "code": "ta", "englishLang": "Tamil", "nativeLang": "தமிழ்", "codeForLocaleString": "ta-IN", "direction": "ltr", "region": "IN" },
  { "code": "it", "englishLang": "Italian", "nativeLang": "Italiano", "codeForLocaleString": "it-IT", "direction": "ltr", "region": "IT" },
  { "code": "th", "englishLang": "Thai", "nativeLang": "ไทย", "codeForLocaleString": "th-TH", "direction": "ltr", "region": "TH" },
  { "code": "gu", "englishLang": "Gujarati", "nativeLang": "ગુજરાતી", "codeForLocaleString": "gu-IN", "direction": "ltr", "region": "IN" },
  { "code": "pl", "englishLang": "Polish", "nativeLang": "Polski", "codeForLocaleString": "pl-PL", "direction": "ltr", "region": "PL" },
  { "code": "uk", "englishLang": "Ukrainian", "nativeLang": "Українська", "codeForLocaleString": "uk-UA", "direction": "ltr", "region": "UA" },
  { "code": "ro", "englishLang": "Romanian", "nativeLang": "Română", "codeForLocaleString": "ro-RO", "direction": "ltr", "region": "RO" },
  { "code": "nl", "englishLang": "Dutch", "nativeLang": "Nederlands", "codeForLocaleString": "nl-NL", "direction": "ltr", "region": "NL" },
  { "code": "fa", "englishLang": "Persian (Farsi)", "nativeLang": "فارسی", "codeForLocaleString": "fa-IR", "direction": "rtl", "region": "IR" },
  { "code": "ms", "englishLang": "Malay", "nativeLang": "Bahasa Melayu", "codeForLocaleString": "ms-MY", "direction": "ltr", "region": "MY" },
  { "code": "zh-CN", "englishLang": "Cantonese (Simplified)", "nativeLang": "粤语", "codeForLocaleString": "zh-CN", "direction": "ltr", "region": "CN" },
  { "code": "zh-TW", "englishLang": "Cantonese (Traditional)", "nativeLang": "粵語", "codeForLocaleString": "zh-TW", "direction": "ltr", "region": "TW" },
  { "code": "km", "englishLang": "Khmer (Cambodian)", "nativeLang": "ភាសាខ្មែរ", "codeForLocaleString": "km-KH", "direction": "ltr", "region": "KH" },
  { "code": "lo", "englishLang": "Lao (Laotian)", "nativeLang": "ລາວ", "codeForLocaleString": "lo-LA", "direction": "ltr", "region": "LA" }
]


export function getCommitTimestampUTC(date = new Date()) {
  return date.toISOString();
}

export function formatLocalTime(utcString, locale = "en-US", options = { timeZoneName: "short" }) {
  return new Date(utcString).toLocaleString(locale, options);
}

// Example
// const utcString = getCommitTimestampUTC();
// console.log("UTC:", utcString); 
// // "2026-02-25T07:12:33.482Z"

// console.log("Local:", formatLocalTime(utcString, "en-US", { timeZoneName: "short" }));
// // e.g. "2/25/2026, 2:12:33 PM GMT+7" in Vietnam
