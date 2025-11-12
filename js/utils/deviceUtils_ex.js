
export function getDeviceType() {
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

export function getDeviceType_Robust() {
  // ✅ Modern API (Chrome, Edge)
  if (navigator.userAgentData?.mobile !== undefined) {
    return navigator.userAgentData.mobile ? "mobile" : "desktop";
  }

  // 📜 Legacy UA detection
  const ua = navigator.userAgent;
  const isMobileUA = /Mobi|Android|iPhone|BlackBerry|IEMobile|Silk/i.test(ua);
  const isTabletUA = /Tablet|iPad|Nexus 7|Nexus 10|KFAPWI/i.test(ua);

  // 📱 Touch capability via media query
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // 📐 Screen dimensions
  const width = window.innerWidth;

  // 🧠 Heuristic logic
  if (isTabletUA || (isCoarsePointer && width >= 600 && width <= 1024)) {
    return "tablet";
  }
  if (isMobileUA || (isCoarsePointer && width < 600)) {
    return "mobile";
  }
  return "desktop";
}

