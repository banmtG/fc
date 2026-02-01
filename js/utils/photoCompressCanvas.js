export async function compressImage(source, options = {}) {
  const { maxWidth = 800, quality = 0.8, type = "image/jpeg" } = options;

  // If source is a URL string, fetch it
  let fileOrBlob;
  if (typeof source === "string") {
    const res = await fetch(source);
    fileOrBlob = await res.blob();
  } else {
    fileOrBlob = source; // File or Blob from <input>
  }

  // Send to worker for compression
  return new Promise((resolve, reject) => {
    const worker = new Worker("imageWorker.js");

    worker.onmessage = e => {
      const { blob } = e.data;
      resolve(blob);
      worker.terminate();
    };

    worker.onerror = reject;

    const reader = new FileReader();
    reader.onload = () => {
      worker.postMessage({
        dataUrl: reader.result,
        maxWidth,
        quality,
        type
      });
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

self.onmessage = async e => {
  const { dataUrl, maxWidth, quality, type } = e.data;

  const img = new Image();
  img.src = dataUrl;

  img.onload = () => {
    const scale = Math.min(maxWidth / img.width, 1);
    const width = img.width * scale;
    const height = img.height * scale;

    // Use OffscreenCanvas if available
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : new (self.HTMLCanvasElement || OffscreenCanvas)(width, height);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    canvas.convertToBlob
      ? canvas.convertToBlob({ type, quality }).then(blob => {
          self.postMessage({ blob });
        })
      : canvas.toBlob(blob => {
          self.postMessage({ blob });
        }, type, quality);
  };
};

