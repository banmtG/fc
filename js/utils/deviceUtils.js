// utils/deviceUtils.js

function getDeviceType() {
  // Modern userAgentData API
  if (navigator.userAgentData) {
    if (navigator.userAgentData.mobile) return "mobile";
    return "desktop";
  }

  // Legacy userAgent fallback
  const ua = navigator.userAgent;

  const isMobileUA = /Mobi|Android|iPhone|BlackBerry|IEMobile|Silk/i.test(ua);
  const isTabletUA = /Tablet|iPad|Nexus 7|Nexus 10|KFAPWI/i.test(ua);

  // Touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Screen dimensions
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  // Heuristic logic
  if (isTabletUA || (hasTouch && width >= 600 && width <= 1024)) {
    return "tablet";
  }
  if (isMobileUA || (hasTouch && width < 600)) {
    return "mobile";
  }
  return "desktop";
}


function measureTextSize(text, styles = {}) {
  const el = document.createElement('div');

  // Apply base styles
  Object.assign(el.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre', // preserve spacing
    top: '-9999px',
    left: '-9999px',
    ...styles
  });

  el.textContent = text;
  document.body.appendChild(el);

  const rect = el.getBoundingClientRect();
  document.body.removeChild(el);

  return {
    width: rect.width,
    height: rect.height
  };
}




// Save scroll position before reload
window.addEventListener("beforeunload", () => {
  localStorage.setItem("scrollY", window.scrollY);
});

// Restore scroll after reload
window.addEventListener("load", () => {
  const y = localStorage.getItem("scrollY");
  if (y) window.scrollTo(0, parseInt(y));
});
