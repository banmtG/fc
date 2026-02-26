// app-drive-helpers.js
import { createFolder, uploadFile, listFilesInFolder, downloadFile } from "./drive-helpers.js";
import { CONFIG } from './../config/config.js';
import { AuthManager } from './../features/auth/manager/auth-manager.js';

/**
 * Get a valid Google Drive access token from backend.
 * Automatically handles refresh if expired.
 */
export async function getAccessToken() {
  try {
    const resp = await AuthManager.callApi(CONFIG.API_GET_GOOGLE_AT, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (resp.error) throw new Error(resp.error);
    return { success: true, data: resp.data.access_token };
  } catch (err) {
    console.error("❌ Failed to get access token:", err);
    return { success: false, error: err };
  }
}

/** Ensure folder exists, otherwise create */
export async function ensureFolder(name, parentId, accessToken) {
  try {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;

    const searchResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const searchData = await searchResp.json();

    if (!searchResp.ok || searchData.error) {
      const message = searchData.error?.message || `HTTP ${searchResp.status} ${searchResp.statusText}`;
      throw new Error(message);
    }

    if (searchData.files?.length > 0) {
      return { success: true, data: searchData.files[0].id };
    }

    // Delegate to createFolder, which itself returns { success, data, error }
    const result = await createFolder(name, parentId, accessToken);
    return result;
  } catch (err) {
    console.error(`❌ ensureFolder failed for ${name}:`, err);
    return { success: false, error: err };
  }
}


/** Initialize user drive structure */
export async function initUserDriveForTable(uuid, tableName, accessToken) {
  try {
    // Ensure root folder
    const rootResult = await ensureFolder("ADPL_DB", null, accessToken);
    if (!rootResult.success) {
      throw new Error(`Failed to ensure root folder: ${rootResult.error?.message || "Unknown error"}`);
    }
    const rootFolderId = rootResult.data;

    // Ensure user folder
    const userResult = await ensureFolder(uuid, rootFolderId, accessToken);
    if (!userResult.success) {
      throw new Error(`Failed to ensure user folder: ${userResult.error?.message || "Unknown error"}`);
    }
    const userFolderId = userResult.data;

    // Ensure table folder
    const tableResult = await ensureFolder(tableName, userFolderId, accessToken);
    if (!tableResult.success) {
      throw new Error(`Failed to ensure table folder: ${tableResult.error?.message || "Unknown error"}`);
    }

    return { success: true, data: userFolderId };
  } catch (err) {
    console.error(`❌ initUserDriveForTable failed for ${uuid}/${tableName}:`, err);
    return { success: false, error: err };
  }
}


/**
 * @param {Object} metaObject - Meta object built by your app
 */
export async function uploadMetaFile(userFolderId, metaFileName, metaObject, accessToken) {
  return await uploadFile(userFolderId, metaFileName, metaObject, accessToken, "application/json");
}


/**
 * Verify uploaded files against the meta.json stored in Drive.
 *
 * @param {string} folderId - The Drive folder ID containing the files
 * @param {string} metaFileId - The Drive file ID of the meta.json
 * @param {string} prefix - Filename prefix (e.g. "phrases_", "playlist_")
 * @param {string} accessToken - Google Drive access token
 * @param {string} mimeType - MIME type to filter (default: application/json)
 * @returns {Promise<{success:boolean, data?:object, error?:Error}>}
 */
export async function verifyUploadedFiles(folderId, metaFileId, prefix, accessToken, mimeType = "application/json") {
  try {
    // Step 1: download meta.json using the universal helper
    const metaResult = await downloadFile(metaFileId, accessToken);
    if (!metaResult.success) {
      throw new Error(`Failed to download meta.json: ${metaResult.error?.message || "Unknown error"}`);
    }
    const meta = metaResult.data;
    // Step 2: list actual files in folder
    const listResult = await listFilesInFolder(folderId, accessToken, mimeType);
    if (!listResult.success) {
      throw new Error(`Failed to list files in folder: ${listResult.error?.message || "Unknown error"}`);
    }
    const driveFiles = listResult.data;

    // Step 3: build expected names from meta.rows
    const metaNames = (meta.content.rows || []).map(r => `${prefix}${r.id}.json`);

    // Step 4: compare
    const missing = metaNames.filter(name => !driveFiles.some(f => f.name === name));
    const extra = driveFiles.filter(f => !metaNames.includes(f.name));

    const success = missing.length === 0 && extra.length === 0;

    return {
      success,
      data: {
        missing,
        extra,
        driveFiles,
        meta: meta.content
      }
    };
  } catch (err) {
    console.error(`❌ verifyUploadedFiles failed for folder ${folderId}:`, err);
    return { success: false, error: err };
  }
}

export async function DeleteFilesByDeleteFolder() {
// Step 2: Delete old folder
  stepText = `Delete old and make new Table ${tableName} in Drive`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);
  const oldFolderResult = await ensureFolder(tableName, userFolderId, accessToken);
  if (!oldFolderResult.success) {
    dialog.finishStep(stepText, false, oldFolderResult.error);
    return { table: tableName, total: records.length, success: 0, failed: records.length };
  }
  const oldFolderId = oldFolderResult.data;
  const deleteResult = await deleteItem(oldFolderId, accessToken);
  if (!deleteResult.success) {
    dialog.finishStep(stepText, false, deleteResult.error);
    return { table: tableName, total: records.length, success: 0, failed: records.length };
  }

  // Step 3: Create new folder
  const subFolderResult = await createFolder(tableName, userFolderId, accessToken);
  if (!subFolderResult.success) {
    dialog.finishStep(stepText, false, subFolderResult.error);
    return { table: tableName, total: records.length, success: 0, failed: records.length };
  }
  const subFolderId = subFolderResult.data;
  dialog.finishStep(stepText, true);
  }