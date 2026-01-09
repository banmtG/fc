// mapTableData.js
export function mapTableData(rawData) {
    return rawData.map(item => {
        let status = "ok";

        if (!item.defi || item.defi.length === 0) {
        status = "missing data";
        } else if (item.returning_phrase && item.returning_phrase !== item.phrase) {
        status = "phrase changed";
        }

        return {
        id: item.phraseID,              // normalized ID
        phrase: item.phrase,  
        ukipa: item.ukipa,     
        status,        
        createdAt: item.createdAt,
        rating: 1
        };
    });
    }


/**
 * Format a timestamp for table display:
 * - Relative time (x m/h/d ago) if within 7 days
 * - Short absolute date (Jan 4) if older
 * - Full timestamp available for tooltip/detail
 */
export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = (now - date) / 1000;

  // Relative thresholds
  if (diffSec < 60) return { display: `${Math.floor(diffSec)}s ago`, full: date.toISOString() };
  if (diffSec < 3600) return { display: `${Math.floor(diffSec / 60)}m ago`, full: date.toISOString() };
  if (diffSec < 86400) return { display: `${Math.floor(diffSec / 3600)}h ago`, full: date.toISOString() };
  if (diffSec < 604800) return { display: `${Math.floor(diffSec / 86400)}d ago`, full: date.toISOString() };

  // Older than 7 days → short absolute date
  const shortDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return { display: shortDate, full: date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }) };
}
