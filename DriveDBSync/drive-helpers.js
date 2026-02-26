// drive-helpers.js

/** Create a folder */
export async function createFolder(name, parentId, accessToken) {
  try {
    const metadata = { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : [] };
    const resp = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    return { success: true, data: data.id };
  } catch (err) {
    console.error("❌ createFolder failed:", err);
    return { success: false, error: err };
  }
}


/** Delete a folder or file by ID */
export async function deleteItem(itemId, accessToken) {
  try {
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    // Google Drive DELETE returns 204 No Content on success
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const message = data.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
      throw new Error(message);
    }

    return { success: true };
  } catch (err) {
    console.error(`❌ deleteItem failed for ${itemId}:`, err);
    return { success: false, itemId: itemId, error: err };
  }
}

/** Delete multiple items in batch with concurrency + retry. */
export async function deleteItemsBatch(items, accessToken, concurrency = 5, onProgress = null) {
  const tasks = items.map(item => {
    return async () => {
      const deleteFn = async () => {
        return await deleteItem(item.itemId, accessToken);
        // deleteItem returns { success, error }
      };

      try {
        const result = await retryAsync(deleteFn, 3);
        return result; // flattened: { success:true } or { success:false, error }
      } catch (err) {
        console.error("❌ deleteItemsBatch failed:", err);
        return { success: false, error: err };
      }
    };
  });

  return await runWithConcurrency(tasks, concurrency, onProgress);
}


/** Rename a folder or file */
export async function renameItem(itemId, newName, accessToken) {
  try {
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: newName })
    });

    const data = await resp.json();

    if (!resp.ok || data.error) {
      const message = data.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
      throw new Error(message);
    }

    return { success: true, data };
  } catch (err) {
    console.error(`❌ renameItem failed for ${itemId}:`, err);
    return { success: false, error: err };
  }
}


/** List files in a folder with pagination */
export async function listFilesInFolder(folderId, accessToken, mimeType = null) {
  try {
    let files = [];
    let pageToken = null;

    do {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      let q = `'${folderId}' in parents and trashed=false`;
      if (mimeType) q += ` and mimeType='${mimeType}'`;
      url.searchParams.set("q", q);
      url.searchParams.set(
        "fields",
        "nextPageToken, files(id,name,mimeType,modifiedTime)"
      );
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const resp = await fetch(url, { headers: { "Authorization": `Bearer ${accessToken}` } });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        const message = data.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
        throw new Error(message);
      }

      files = files.concat(data.files || []);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return { success: true, data: files };
  } catch (err) {
    console.error(`❌ listFilesInFolder failed for folder ${folderId}:`, err);
    return { success: false, error: err };
  }
}

/** Retry wrapper with exponential backoff for Drive API calls */
export async function retryAsync(taskFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await taskFn(); // return raw result directly
    } catch (err) {
      const reason = err?.errors?.[0]?.reason;
      if (err.code === 403 && reason === "userRateLimitExceeded") {
        // exponential backoff
        await new Promise(r => setTimeout(r, (i + 1) * 1000));
      } else {
        throw err;
      }
    }
  }
  return { success: false, error: new Error("retryAsync: retries exhausted") };
}




/** Upload or update a file in Drive */
export async function uploadFile(folderId, fileName, content, accessToken, mimeType = "application/json") {
  try {
    // Step 1: locate existing file
    const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const searchResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const searchData = await searchResp.json();
    if (!searchResp.ok || searchData.error) {
      const message = searchData.error?.message || `HTTP ${searchResp.status} ${searchResp.statusText}`;
      throw new Error(message);
    }
    let fileId = searchData.files?.[0]?.id || null;

    // Step 2: prepare content
    let fileBlob;
    if (content instanceof Blob || content instanceof File) {
      fileBlob = content;
    } else {
      fileBlob = new Blob([JSON.stringify(content)], { type: mimeType });
    }

    // Metadata: only include parents when creating
    const metadata = { name: fileName };
    if (!fileId) {
      metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", fileBlob);

    // Step 3: upload or update
    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const resp = await fetch(url, {
      method: fileId ? "PATCH" : "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: form
    });
    const data = await resp.json();

    if (!resp.ok || data.error) {
      const message = data.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
      throw new Error(message);
    }

    return { success: true, data: data.id };
  } catch (err) {
    console.error(`❌ uploadFile failed for ${fileName}:`, err);
    return { success: false, error: err };
  }
}

/** Upload multiple files in batch with concurrency + retry. */
export async function uploadFilesBatch(files, accessToken, concurrency = 5, onProgress = null) {
  const tasks = files.map(file => {
    const { folderId, fileName, content, mimeType } = file;
    return async () => {
      const uploadFn = async () => {
        const result = await uploadFile(folderId, fileName, content, accessToken, mimeType);
        // uploadFile itself returns { success, data, error }
        return result;
      };
      const safeResult = await retryAsync(uploadFn, 3);
      return safeResult; // { success, data, error }
    };
  });

  // runWithConcurrency returns Promise.allSettled, so each entry has {status, value}
  return await runWithConcurrency(tasks, concurrency, onProgress);
}

/**
 * Run tasks with limited concurrency.
 *
 * @param {Array<Function>} tasks - Array of async functions returning a promise
 * @param {number} limit - Max number of concurrent tasks
 * @param {Function} onProgress - Optional callback({completed,total})
 * @returns {Promise<Array>} - Results via Promise.allSettled, each value is { success, data, error }
 */
export async function runWithConcurrency(tasks, limit, onProgress) {
  let completed = 0;
  const total = tasks.length;
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = (async () => {
      try {
        const res = await task(); // return raw result directly
        completed++;
        if (onProgress) onProgress({ completed, total });
        return res;
      } catch (err) {
        completed++;
        if (onProgress) onProgress({ completed, total });
        console.error("❌ Task failed:", err);
        return { success: false, error: err };
      }
    })();

    results.push(p);

    const e = p.finally(() => executing.delete(e));
    executing.add(e);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

/**
 * Download a single file from Drive.
 *
 * @param {string} fileId - Drive file ID
 * @param {string} accessToken - Google Drive access token
 * @returns {Promise<{fileId:string, name:string, content:any}>}
 */
export async function downloadFile(fileId, accessToken) {
  try {
    // Step 1: get metadata (name, mimeType)
    const metaResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const meta = await metaResp.json();

    // Step 2: download content
    const contentResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );

    let content;
    if (meta.mimeType === "application/json") {
      content = await contentResp.json();
    } else {
      content = await contentResp.blob();
    }
    return { success: true, data: { fileId: meta.id, name: meta.name, content } };    
  } catch (err) { 
      console.error(`❌ downloadFile failed for ${fileId}:`, err); 
      return { success: false, itemId: fileId, error: err }; 
  }
}

/** Download multiple files in batch with concurrency + retry. */
export async function downloadFilesBatch(
  files,
  accessToken,
  concurrency = 5,
  onProgress = null
) {
  const tasks = files.map(file => {
    return async () => {
      const downloadFn = async () => {
        return await downloadFile(file.fileId, accessToken);
        // downloadFile returns { success, data, error }
      };

      try {
        const result = await retryAsync(downloadFn, 3);
        // Flatten here: if success, return the inner data directly
        return result; // flattened: { success:true } or { success:false, error }

      } catch (err) {
        console.error("❌ downloadFilesBatch failed:", err);
        return { success: false, error: err };
      }
    };
  });

  return await runWithConcurrency(tasks, concurrency, onProgress);
}

