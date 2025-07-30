// utils/deviceUtils.js
export function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 600) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
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
