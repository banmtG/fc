export function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Modern API
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed"; // avoid scrolling to bottom
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      // console.log("Copied with fallback");
    } catch (err) {
      console.error("Fallback failed:", err);
    }
    document.body.removeChild(textarea);
  }
}
