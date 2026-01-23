export const StatusColorData = {
  '1missing': { legend: "Missing definition", bgColor: "#D5AA9F", color: "white"},  
  '2changed': { legend: "Different phrase", bgColor: "#AEC3B0", color: "#000000"},
  '3found': { legend: "Found definition",  bgColor: "#E3EFD3", color: "#000000"},   
}

export const oldDataBgColor = { legend: "Old drafts", bgColor: "#8e8e8e", color: "#ffffff"};

export function aPhraseNormalise_NewPhraseTab(item) {
    let status = "3found";
    if (!item.defi || item.defi.length === 0) {
      status = "1missing";
    } else if (item.returning_phrase && item.returning_phrase !== item.phrase) {
      status = "2changed";
    }

    return {
      phraseID: item.phraseID,       // normalized ID
      phrase: item.phrase,
      ukipa: item.ukipa,
      status,
      cellBgColor: {
        // phrase: "white",
      },      
      orderBgcolor: item.oldData? oldDataBgColor : null,
      statusBgColor: formatStatusBgColor(status, StatusColorData),
      rating: 1
    };
}
export function mapTableData(rawData) {
  // const total = rawData.length;
  return rawData.map((item, index) => {
      return { ...aPhraseNormalise_NewPhraseTab(item), 
        order: index+1,
       };
  });
}

/**
 * Format a timestamp into relative/absolute display and compute a bgColor
 * interpolated between two hex colors based on row index.
 *
 * @param {string} isoString - ISO date string
 * @param {string} colorStart - hex color for first row (index 0)
 * @param {string} colorEnd - hex color for last row
 * @param {number} index - current row index
 * @param {number} total - total number of rows
 * @returns {{display:string, full:string, bgColor:string}}
 */

export function formatTimestamp(isoString, colorStart, colorEnd, index, total) {
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = (now - date) / 1000;

  // Relative display text
  let display, full;
  if (diffSec < 60) {
    display = `${Math.floor(diffSec)}s ago`;
    full = date.toISOString();
  } else if (diffSec < 3600) {
    display = `${Math.floor(diffSec / 60)}m ago`;
    full = date.toISOString();
  } else if (diffSec < 86400) {
    display = `${Math.floor(diffSec / 3600)}h ago`;
    full = date.toISOString();
  } else if (diffSec < 604800) {
    display = `${Math.floor(diffSec / 86400)}d ago`;
    full = date.toISOString();
  } else {
    display = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    full = date.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  // console.log(interpolateColor("#ffffff", "#000080", 0)); // #ffffff 
  // console.log(interpolateColor("#ffffff", "#000080", 0.5)); // #808040 
  // console.log(interpolateColor("#ffffff", "#000080", 1)); // #000080
  // Index-based ratio for gradient
  const ratio = total > 1 ? index / (total - 1) : 0;
  // console.log(colorStart,colorEnd,ratio);
  const bgColor = interpolateColor(colorStart, colorEnd, ratio);

  return { display, full, bgColor };
}

/**
 * Interpolate between two hex colors.
 */
function interpolateColor(start, end, ratio) {
  ratio = Math.min(Math.max(ratio, 0), 1);
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const r = Math.round(s.r + (e.r - s.r) * ratio);
  const g = Math.round(s.g + (e.g - s.g) * ratio);
  const b = Math.round(s.b + (e.b - s.b) * ratio);
  return rgbToHex(r, g, b);
}



function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function formatStatusBgColor(status, data) {
  return data[status];
}