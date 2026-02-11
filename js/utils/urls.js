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

export async function urlExists(urlString) {
  try {
    const controller = new AbortController();
    const response = await fetch(urlString, { method: "HEAD", signal: controller.signal });
    if (response.ok) return true;

    // fallback: try GET
    const getResponse = await fetch(urlString, { method: "GET", signal: controller.signal });
    controller.abort(); // stop downloading body
    return getResponse.ok;
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

// Audio / 🎥 Video Checker
// ✔ Handles streaming headers
// ✔ No CORS problems

export function checkMedia(url, type = "audio", timeout = 5000) {
  return new Promise(resolve => {
    const el = document.createElement(type);
    let done = false;

    const finish = status => {
      if (!done) {
        done = true;
        resolve(status);
      }
    };

    el.onloadedmetadata = () => finish("alive");
    el.onerror = () => finish("dead");

    setTimeout(() => finish("dead"), timeout);

    el.src = url;
    el.load();
  });
}


function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
}


// Image Link Checker (MOST RELIABLE)
// Works even when CORS blocks fetch.
// Works with:
// CDN images
// Cloudflare
// S3
// Hotlink-protected sites (most

export function checkImage(url, timeout = 5000) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;

    const finish = status => {
      if (!done) {
        done = true;
        resolve(status);
      }
    };

    img.onload = () => finish("alive");
    img.onerror = () => finish("dead");

    setTimeout(() => finish("dead"), timeout);

    // cache-buster avoids false positives
    img.src = url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
  });
}

// 🌐 Generic Link Checker (HTML / API / Files)
// This is best-effort, not perfect.

export async function checkLink(url, timeout = 5000) {
  try {
    const controller = new AbortController();

    const fetchPromise = fetch(url, {
      method: "HEAD",
      mode: "cors",
      signal: controller.signal
    });

    const res = await Promise.race([
      fetchPromise,
      timeoutPromise(timeout)
    ]);

    return res.ok ? "alive" : "dead";

  } catch (e) {
    // fallback for CORS-blocked servers
    try {
      await Promise.race([
        fetch(url, { mode: "no-cors" }),
        timeoutPromise(timeout)
      ]);
      return "unknown"; // reachable but restricted
    } catch {
      return "dead";
    }
  }
}

// Smart Auto-Detector (Recommended)
// This chooses the correct strategy automatically.
// Why “unknown” Is IMPORTANT
// Some servers:
// Return 200
// Block headers
// Block JS access
// Only allow <img> or <video>
// If you treat those as “dead”, your app breaks.
// Industry rule:
// alive → safe
// unknown → warn user
// dead → block/remove
// 🧠 What You CANNOT Do (Frontend)
// ❌ Read HTTP status without CORS
// ❌ Detect hotlink block reliably
// ❌ Bypass signed URL checks
// ❌ Detect auth-required URLs

// Only a backend can do that properly.

export async function checkURL(url, timeout = 5000) {
  const ext = url.split(".").pop().toLowerCase();

  if (["png","jpg","jpeg","gif","webp","avif","svg"].includes(ext)) {
    return await checkImage(url, timeout);
  }

  if (["mp3","wav","ogg","aac","m4a"].includes(ext)) {
    return await checkMedia(url, "audio", timeout);
  }

  if (["mp4","webm","mov"].includes(ext)) {
    return await checkMedia(url, "video", timeout);
  }

  return await checkLink(url, timeout);
}

