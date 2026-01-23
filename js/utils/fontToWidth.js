export function getTextWidth(text, font = "16px Arial") {
  // Create a canvas context (offscreen)
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // Set the font to match your CSS
  context.font = font;

  // Measure the text
  const metrics = context.measureText(text);
  return metrics.width; // pixel value without px
}

// // Usage
// console.log(getTextWidth("item2", "14px Roboto")); // returns width in pixels
// console.log(getTextWidth("https://example.com/long/url", "14px Roboto"));
