function isValidUrl(urlString) {
  try {
    console.log(urlString);
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
}

function isAllowedProtocol(urlString) {
  try {
    const url = new URL(urlString);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

async function urlExists(urlString) {
  try {
    const response = await fetch(urlString, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function cleanUrl(urlString) {
  // Trim whitespace and remove leading/trailing quotes
  return urlString.trim().replace(/^['"]+|['"]+$/g, "");
}


export function normalizeUrl(urlString) {
  const cleaned = cleanUrl(urlString);
  try {
    const url = new URL(cleaned);
    return url.href; // normalized, valid URL
  } catch {
    return null; // invalid
  }
}


export async function verifyUrl(urlString) {
  if (!isValidUrl(urlString)) return { valid: false, reason: "Invalid format" };
  if (!isAllowedProtocol(urlString)) return { valid: false, reason: "Disallowed protocol" };

  // const exists = await urlExists(urlString);
  // if (!exists) return { valid: false, reason: "Unreachable" };

  return { valid: true };
}
