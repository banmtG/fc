// app-drive-helpers.js
import { createFolder, uploadFile, listFilesInFolder, downloadFile } from "./drive-helpers.js";
import { CONFIG } from './../config/config.js';
import { AuthManager } from './../features/auth/manager/auth-manager.js';
import './../components/simple/simple-table.js';

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
    console.log(metaResult);
    if (!metaResult.success) {
      throw new Error(`Failed to download meta.json: ${metaResult.error?.message || "Unknown error"}`);
    }
    const meta = metaResult.data;
    // Step 2: list actual files in folder
    const listResult = await listFilesInFolder(folderId, accessToken, mimeType);
       console.log(listResult);
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

export function getGridHtml(input) {
  const theTable = document.createElement('simple-table');
  theTable.input = input;  
  theTable.render();  
  const stringHtml = theTable.shadowRoot.innerHTML;  
  theTable.remove();
  return stringHtml;
}

export async function getTableSyncInfo(uuid, tableName, accessToken, dialog = null) {
  let stepText = `getTableSyncInfo for ${tableName}`;
  dialog?.addStep(stepText);
  dialog?.startStep(stepText);
  // Step A: get meta.json

  const userFolderResult = await initUserDriveForTable(uuid, tableName, accessToken);

  if (!userFolderResult.success) {
    dialog?.addDetail(`initUserDriveForTable FAILED:`, userFolderResult.error);
    return { success: false, error: userFolderResult.error };
  }
  
  dialog?.addDetail(`initUserDriveForTable SUCCESS`);
  const userFolderId = userFolderResult.data;

  const listMetaResult = await listFilesInFolder(userFolderId, accessToken, "application/json");
  if (!listMetaResult.success) {
    dialog?.addDetail(`listFilesInFolder ${userFolderId} FAILED:`, userFolderResult.error);
    return { success: false, error: listMetaResult.error };
  }

  dialog?.addDetail(`listFilesInFolder ${userFolderId} SUCCESS`);

  const metaFileName = `${tableName}_meta.json`;
  const metaFile = listMetaResult.data.find(f => f.name === metaFileName);
  let meta = null;
  if (!metaFile)  dialog.addDetail(`cannot find metafile FAILED`);
  if (metaFile) {
    const metaResult = await downloadFile(metaFile.id, accessToken);
    if (metaResult.success) {
      dialog?.addDetail(`${metaFileName} DOWNLOADED`);
      meta = metaResult.data;
    } else {
      dialog?.addDetail(`download ${metaFileName} FAILED`, metaResult.itemId);
      return { success: false, error: metaResult.error };
    }
  } 

  // Step B: list folder contents
  const subFolderResult = await ensureFolder(tableName, userFolderId, accessToken);
  if (!subFolderResult.success) {
    dialog?.addDetail(`ensureFolder ${tableName} FAILED`);
    return { success: false, error: subFolderResult.error };
  }

  dialog?.addDetail(`ensureFolder ${tableName} SUCCESS`);
  const subFolderId = subFolderResult.data;

  const listFilesResult = await listFilesInFolder(subFolderId, accessToken, "application/json");

  if (!listFilesResult.success) {
    dialog?.addDetail(`listFilesInFolder ${tableName} FAILED:`, userFolderResult.error);
    return { success: false, error: listFilesResult.error.message };
  }

  dialog?.addDetail(`listFilesInFolder ${tableName} SUCCESS`);

  const driveFiles = listFilesResult.data;

  // Step C: local meta
  const localMeta = await Database._get("metaTable", tableName);

  // Step D: build comparison object
  const driveMetaRowCount = meta?.content?.rowsCount || "N/A";
  const driveMetaUpdatedAt = meta?.content?.lastUpdatedAt || "N/A";
  const driveFolderCount = driveFiles.length;

  const driveFolderUpdatedAt = driveFiles.reduce((latest, f) => {
    if (!f.modifiedTime) return latest;
    const mod = new Date(f.modifiedTime).getTime(); // 👈 converts to ms number
    return mod > latest ? mod : latest;             // 👈 keeps the largest ms number
  }, 0);
  
  //  convert to ISO time format
  const driveFolderLastUpdatedAtISO = driveFolderUpdatedAt ? new Date(driveFolderUpdatedAt).toISOString() : "N/A";

  const localRowCount = localMeta?.rowCount || "N/A";
  const localUpdatedAt = localMeta?.lastUpdatedAt || "N/A";

  return {
    success: true,
    meta,
    driveFiles,
    localMeta,
    tableSyncInfo: {
      meta: {driveMetaRowCount, driveMetaUpdatedAt},
      drive:  {driveFolderCount, driveFolderLastUpdatedAtISO},
      local: {localRowCount, localUpdatedAt},
    }
  };
}

function verifyingFilenameMismatch(meta, driveFiles, dialog, prefix = "") {
  if (!meta || !meta.content?.rows) {
    dialog?.addDetail("Meta file missing or invalid");
    return { success: false, error: "Meta file missing or invalid" };
  }
  // Build expected filenames from meta
  const expectedFiles = meta.content.rows.map(row => `${prefix}${row.id}.json`);
  // Actual filenames from Drive
  const actualFiles = driveFiles.map(f => f.name);
  // Missing: in meta but not in Drive
  const missing = expectedFiles.filter(name => !actualFiles.includes(name));
  // Extra: in Drive but not in meta
  const extra = actualFiles.filter(name => !expectedFiles.includes(name));

  if (missing.length === 0 && extra.length === 0) {
    dialog?.addDetail("All filenames match between meta and Drive folder");
    return { success: true };
  } else {
    dialog?.addDetail("Filename mismatch detected");
    dialog?.addDetail(`Missing in Drive: ${missing.length}, Extra in Drive: ${extra.length}`);
    if (missing.length > 0) dialog?.addLog("Missing:\n" + missing.join("\n"));
    if (extra.length > 0) dialog?.addLog("Extra:\n" + extra.join("\n"));
    return { success: false, missing, extra };
  }
}


function cookGridInput(tableName, tableSyncInfo) {

  let {driveMetaRowCount, driveMetaUpdatedAt} = tableSyncInfo.meta;
  let {driveFolderCount, driveFolderUpdatedAt} = tableSyncInfo.drive;
  let {localRowCount, localUpdatedAt} = tableSyncInfo.local;

  const gridInput = {
        tableName: `Table ${tableName}`,
        gridTemplateColumns: `auto auto auto`,
        columnAlignments: { source: "left", rowCount: "center", updatedAt: "left" },
        data: [
        { source: `Drive: Meta`, rowCount: driveMetaRowCount, updatedAt: formatLocalTime(driveMetaUpdatedAt,'en-UK') , 
          // _styles: { //   Status: { bg: "red", color: "white" } // Only 'High' is red        // }   
        },
        { source: `Drive: Folder`, rowCount: driveFolderCount, updatedAt: formatLocalTime(driveFolderUpdatedAt,'en-UK') },
        { source: `Local`, rowCount: localRowCount, updatedAt: formatLocalTime(lastUpdatedAt,'en-UK') }
      ]
    };
  return gridInput;
}

function decideSourceOfTruth(syncType, syncInfo) {
  const { meta, driveFiles, localMeta } = syncInfo;

  switch(syncType) {
    case "mirrorDownload":
      // trust Drive folder
      return driveFiles.map(f => ({ fileId: f.id }));

    case "upload":
      // trust local IndexedDB
      return Database.getAll(localMeta.tableName);

    case "partialSync":
      // maybe just compare meta vs local, no folder trust needed
      return { meta, localMeta };

    default:
      throw new Error("Unknown sync type");
  }
}
