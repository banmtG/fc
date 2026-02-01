// pipelineWorker.js
import encodeJpeg from "../../lib/jSquash/encode.js";

self.onmessage = async e => {
  const { blob, maxWidth, quality, convert } = e.data;

  // Original metadata
  const originalType = blob.type;
  const originalSize = blob.size;
  const bitmap = await createImageBitmap(blob);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  // Step 1: Resize
  const scale = Math.min(maxWidth / bitmap.width, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  let outBlob;
  let processedType;

  if (convert || originalType === "image/jpeg") {
    // Step 2: Convert to JPEG + compress
    const imageData = ctx.getImageData(0, 0, width, height);
    const compressedBuffer = await encodeJpeg(imageData, { quality });
    outBlob = new Blob([compressedBuffer], { type: "image/jpeg" });
    processedType = "image/jpeg";
  } else {
    // Step 2: Keep original type (e.g. PNG), just resize
    outBlob = await canvas.convertToBlob({ type: originalType });
    processedType = originalType;
  }

  // Processed metadata
  const processedSize = outBlob.size;
  const processedWidth = width;
  const processedHeight = height;

  self.postMessage({
    blob: outBlob,
    meta: {
      original: {
        type: originalType,
        size: originalSize,
        width: originalWidth,
        height: originalHeight
      },
      processed: {
        type: processedType,
        size: processedSize,
        width: processedWidth,
        height: processedHeight
      }
    }
  });
};
