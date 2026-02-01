// imageProcessor.js
export async function processImage(source, { maxWidth = 800, quality = 75, convert = true } = {}) {
  let blob;
  if (typeof source === "string") {
    const res = await fetch(source);
    blob = await res.blob();
  } else {
    blob = source;
  }

  return new Promise((resolve, reject) => {
  const worker = new Worker(new URL("./workers/pipelineWorker.js", import.meta.url), { type: "module" });
   
    worker.onmessage = e => {
      resolve({ blob: e.data.blob, meta: e.data.meta });
      worker.terminate();
    };

    worker.onerror = reject;

    worker.postMessage({ blob, maxWidth, quality, convert });
  });
}
