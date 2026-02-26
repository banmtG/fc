// mirrorUpload(uuid) pushFullSync
// mirrorDownload(uuid)
// fillGapUpload(uuid)
// fillGapDownload(uuid)
// twoWayGapFill(uuid)
// deleteUpload(uuid)
// deleteDownload(uuid)

import { getAccessToken, initUserDriveForTable, ensureFolder, verifyUploadedFiles  } from "./app-drive-helpers.js";
import { uploadFile, uploadFilesBatch, deleteItem, createFolder, deleteItemsBatch, downloadFilesBatch, listFilesInFolder, downloadFile } from "./drive-helpers.js";
import Database from "../core/database.js";
/**
 * Sync a single table to Drive.
 *
 * @param {string} uuid - User ID
 * @param {string} tableName - Table name in IndexedDB (e.g. "phrases")
 * @param {string} prefix - File prefix for records (e.g. "phrases_")
 * @param {string} accessToken - Google Drive access token
 * @param {HTMLElement} dialog - ReportDialog element
 * @returns {Promise<{table:string,total:number,success:number,failed:number}>}
 */
export async function pushSyncTable(uuid, tableName, prefix, accessToken, dialog) {
  // Step 1: Init user drive
  let stepText = `Init user drive for ${tableName}`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);
  const initResult = await initUserDriveForTable(uuid, tableName, accessToken);
  if (!initResult.success) {
    dialog.finishStep(stepText, false, initResult.error);
    return { table: tableName, total: 0, success: 0, failed: 0 };
  }
  const userFolderId = initResult.data;
  dialog.finishStep(stepText, true);

  const records = await Database._getAll(tableName);

  // Step 2: Clear old folder contents instead of deleting the folder
  stepText = `Clear all records in Drive Folder ${tableName}`;
  dialog.addStep(stepText, true);
  dialog.startStep(stepText);

  const oldFolderResult = await ensureFolder(tableName, userFolderId, accessToken);
  if (!oldFolderResult.success) {
    dialog.finishStep(stepText, false, oldFolderResult.error);
    return { table: tableName, total: records.length, success: 0, failed: records.length };
  }
  const oldFolderId = oldFolderResult.data;

  // List all children in the folder
  const listFilesResult = await listFilesInFolder(oldFolderId, accessToken);
  if (!listFilesResult.success) {
    dialog.finishStep(stepText, false, listFilesResult.error);
    return { table: tableName, total: records.length, success: 0, failed: records.length };
  }
  const children = listFilesResult.data.map(f => ({ itemId: f.id }));

  // Delete children in batch with concurrency + retry
  const deleteResults = await deleteItemsBatch(children, accessToken, 20, ({ completed, total }) => {
    dialog.updateProgress(stepText, completed, total);
  });

  let successCount = 0, failCount = 0;
  let failItems = [];
  for (const res of deleteResults) {
    if (res.status === "fulfilled" && res.value.success) {
      successCount++;
    } else {
      failCount++;
      failItems.push(res.value.itemId);
      console.error("❌ Failed to delete child", res.value?.error || res.reason);
    }
  }

  dialog.finishStep(
    stepText,
    failCount === 0,
    `Deleted ${successCount} items, failed ${failCount}.`
  );
  if (failItems.length>0) {
    dialog.addDetail(`❌ Failed to delete ${failCount} records`);
    dialog.addLog(failItems.join('\n'));
  }
  // Step 3: Reuse the same folder (no need to recreate)
  const subFolderId = oldFolderId;

  // Step 4: Upload all records
  stepText = `Upload all ${tableName}`;
  dialog.addStep(stepText, true); // use ProressBar
  dialog.startStep(stepText);
  const files = records.map(r => ({
    folderId: subFolderId,
    fileName: `${prefix}${r[Database.getKeyPath(tableName)]}.json`,
    content: r
  }));

  const results = await uploadFilesBatch(files, accessToken, Math.floor(Math.random() * (6)) + 5, ({ completed, total }) => {
    dialog.updateProgress(stepText, completed, total);
  });

  // Collect successes/failures
  const metaRows = [];
  successCount = 0;
  failCount = 0;
  failItems = [];
  results.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.success) {
      successCount++;
      metaRows.push({
        id: records[i][Database.getKeyPath(tableName)],
        updatedAt: records[i].updatedAt,
        fileId: res.value.data
      });
    } else {
      failCount++;     
      failItems.push(files[i].fileName);
      const errorMsg = res.value?.error?.message || res.reason?.message || "Unknown error";
      console.error(`❌ Failed to upload record ${files[i].fileName}`, errorMsg);
    }
  });
  dialog.finishStep(stepText, successCount > 0, `Uploaded ${successCount}, failed ${failCount}.`);
  if (failCount.length>0) {
    dialog.addDetail(`❌ Failed to upload ${failCount} records`);
    dialog.addLog(failItems.join('\n'));
  }


  // Step 5: Upload meta.json
  stepText = `Send new ${tableName}_meta.json to Drive`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  // Read meta info from IndexedDB metaTable 
  const localMeta = await Database.getMeta(tableName);
  
  const metaObject = {
    table: tableName,
    lastUpdatedAt: localMeta.lastUpdatedAt || new Date().toISOString(),
    rowsCount: metaRows.length,
    rows: metaRows
  };

  const metaResult = await uploadFile(userFolderId, `${tableName}_meta.json`, metaObject, accessToken);
  if (!metaResult.success) {
    dialog.finishStep(stepText, false, metaResult.error.message);
    return { table: tableName, total: records.length, success: successCount, failed: failCount };
  }
  const metaFileId = metaResult.data;
  dialog.finishStep(stepText, true);

  // Step 6: Verify

  stepText = `Verify uploaded ${tableName}`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);
  const verifyResult = await verifyUploadedFiles(subFolderId, metaFileId, `${prefix}`, accessToken);
  if (!verifyResult.success) {
    dialog.finishStep(stepText, false, verifyResult.error);
  } else {
    const { missing, extra, driveFiles } = verifyResult.data;
    if (missing.length === 0 && extra.length === 0) {
      dialog.finishStep(stepText, true, `No. of uploaded files: ${driveFiles.length}.`);
    } else {
      console.error("Verification mismatch", { missing, extra });
      dialog.finishStep(stepText, false, `Missing: ${missing.length}, Extra: ${extra.length}`);
    }
  }

  return { table: tableName, total: records.length, success: successCount, failed: failCount };
}


/**
 * Push all tables to Drive in full sync mode.
 *
 * @param {string} uuid - User ID
 * @param {Array<string>} tables - List of table names to sync
 * @returns {Promise<{mode:string,tables:Array}>}
 */
export async function pushFullSync(uuid, tables = ["phrases", "playlists", "soundBlobs"]) {
  // Step 0: Get access token
  const tokenResult = await getAccessToken();
  const dialog = document.querySelector("report-dialog");
  dialog.clear();
  dialog.open("Mirror Upload Process");
  
  let stepText = `Get Google Drive access token`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);
  if (!tokenResult.success) {
    dialog.finishStep(stepText, false, tokenResult.error);
    return { mode: "Mirror Upload", tables: [] };
  }
  const accessToken = tokenResult.data;
  dialog.finishStep(stepText, true);

  const results = [];
  for (const table of tables) {
    const prefix = `${table}_`; // generic prefix
    const separator = `===== Table ${table} =====`.toUpperCase();;
    dialog.addSeparator(separator); 

    const res = await pushSyncTable(uuid, table, prefix, accessToken, dialog);
    results.push(res);
    
    // Mark table step as finished based on success/failure counts
    if (res.success > 0 && res.failed === 0) {
      dialog.addLog(`Uploaded ${res.success} records.`);
    } else if (res.success > 0 && res.failed > 0) {
      dialog.addLog(`Uploaded ${res.success}, failed ${res.failed}.`);
    } else {
      dialog.addLog("No records uploaded.");
    }
  }

  dialog.announceFinish("Mirror Upload Finished");
  return { mode: "Mirror Upload", tables: results };
}


/**
 * Pull a single table from Drive, mirroring folder contents into IndexedDB.
 * Downloads into memory first, then clears and commits to IndexedDB.
 *
 * @param {string} uuid - User ID
 * @param {string} tableName - Table name in IndexedDB
 * @param {string} prefix - File prefix for records
 * @param {string} accessToken - Google Drive access token
 * @param {HTMLElement} dialog - ReportDialog element
 * @returns {Promise<{table:string,total:number,success:number,failed:number}>}
 */
export async function pullSyncTable(uuid, tableName, prefix, accessToken, dialog) {
  // Step 1: get meta.json
  let stepText = `Get ${tableName}_meta.json from Drive`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  const userFolderResult = await initUserDriveForTable(uuid, tableName, accessToken);
  if (!userFolderResult.success) {
    dialog.finishStep(stepText, false, userFolderResult.error.message);
    return { table: tableName, total: 0, success: 0, failed: 0 };
  }
  const userFolderId = userFolderResult.data;

  const listMetaResult = await listFilesInFolder(userFolderId, accessToken, "application/json");
  if (!listMetaResult.success) {
    dialog.finishStep(stepText, false, listMetaResult.error.message);
    return { table: tableName, total: 0, success: 0, failed: 0 };
  }
  const metaFileName = `${tableName}_meta.json`;
  const metaFile = listMetaResult.data.find(f => f.name === metaFileName);

  let meta = null;
  if (metaFile) {
    const metaResult = await downloadFile(metaFile.id, accessToken);
    if (metaResult.success) {
      meta = metaResult.data;
      dialog.finishStep(stepText, true);
    } else {
      dialog.finishStep(stepText, false, metaResult.error);
    }
  } else {
    dialog.finishStep(stepText, false, `Meta file ${metaFileName} not found`);
  }

  // Step 2: list all files in folder
  stepText = `Get file list in Drive Folder ${tableName}`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  const subFolderResult = await ensureFolder(tableName, userFolderId, accessToken);
  if (!subFolderResult.success) {
    dialog.finishStep(stepText, false, subFolderResult.error.message);
    return { table: tableName, total: 0, success: 0, failed: 0 };
  }
  const subFolderId = subFolderResult.data;

  const listFilesResult = await listFilesInFolder(subFolderId, accessToken, "application/json");
  if (!listFilesResult.success) {
    dialog.finishStep(stepText, false, listFilesResult.error.message);
    return { table: tableName, total: 0, success: 0, failed: 0 };
  }
  const driveFiles = listFilesResult.data;
  dialog.finishStep(stepText, true, `Found ${driveFiles.length} files in folder`);

  // Step 3: decide source of truth
  stepText = `Check consistency between meta and folder`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  let filesToDownload;
  if (meta && meta.content?.rowsCount === driveFiles.length) {
    filesToDownload = (meta.content.rows || []).map(row => {
      const fileName = `${prefix}${row.id}.json`;
      const file = driveFiles.find(f => f.name === fileName);
      return file ? { fileId: file.id } : null;
    }).filter(Boolean);
    dialog.finishStep(stepText, true, `Meta matches folder: using meta list`);
    dialog.addDetail(`Meta matches folder: using meta list. ${driveFiles.length} records`)
  } else {
    filesToDownload = driveFiles.map(f => ({ fileId: f.id }));
    dialog.finishStep(stepText, true, `Meta mismatch: using folder contents as source of truth`);
    dialog.addDetail(`Mismatch: Meta ${meta.content?.rowsCount} vs. Folder ${driveFiles.length} records. Use folder contents!`)
  }

  // Step 4: batch download into staging
  stepText = `Download files from Drive Folder ${tableName}`;
  dialog.addStep(stepText, true);
  dialog.startStep(stepText);

  const results = await downloadFilesBatch(filesToDownload, accessToken, 5, ({ completed, total }) => {
    dialog.updateProgress(stepText, completed, total);
  });

  let successCount = 0, failCount = 0;
  const stagedData = [];
  const failItems = [];
  for (const res of results) {
    if (res.status === "fulfilled" && res.value.success) {
      stagedData.push(res.value.data.content);
      successCount++;
    } else {
      failCount++;
      failItems.push(res.value?.fileId || res.reason);
      const errorMsg = res.value?.error?.message || res.reason?.message || "Unknown error";
      console.error("❌ Failed to download record", errorMsg);
    }
  }
  dialog.finishStep(stepText, successCount > 0, `Downloaded ${successCount}, failed ${failCount}.`);
  if (failCount > 0) {
    dialog.addDetail(`❌ Failed to download ${failCount} records`);
    dialog.addLog(failItems.join("\n"));
  }

  // === NEW STEP: Show metadata comparison ===
  stepText = `Compare metadata before commit`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  // Drive meta.json info
  const driveMetaRowCount = meta?.content?.rowsCount || "N/A";
  const driveMetaUpdatedAt = meta?.content?.lastUpdatedAt || "N/A";

  // Drive folder info
  const driveFolderCount = driveFiles.length;

  const driveFolderLastModified = driveFiles.reduce((latest, f) => {
    if (!f.modifiedTime) return latest;
    const mod = new Date(f.modifiedTime).getTime();
    return mod > latest ? mod : latest;
  }, 0);

  const driveFolderUpdatedAt = driveFolderLastModified
    ? new Date(driveFolderLastModified).toISOString()
    : "N/A";


  // Local IndexedDB meta info
  const localMeta = await Database._get("metaTable", tableName);
  const localRowCount = localMeta?.rowCount || "N/A";
  const lastUpdatedAt = localMeta?.lastUpdatedAt || "N/A";

  console.log("=== Metadata Comparison ===");
  console.log("Drive meta.json:", { rowCount: driveMetaRowCount, lastUpdatedAt: driveMetaUpdatedAt });
  console.log("Drive folder:", { fileCount: driveFolderCount, lastModifiedAt: driveFolderUpdatedAt });
  console.log("IndexedDB meta:", { rowCount: localRowCount, lastUpdatedAt: lastUpdatedAt });

  dialog.finishStep(stepText, true, "Metadata comparison logged to console");



  // Step 5: clear and commit to IndexedDB
  stepText = `Commit mirror into IndexedDB table ${tableName}`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);

  await Database._clear(tableName);
  for (const record of stagedData) {
    // console.log(record);
    await Database._put(tableName, record);
  }

  // After batch commit, update meta once with source timestamp 
  const commitTimestamp = driveMetaUpdatedAt || Date.now(); 
  console.log(meta);
  console.log(commitTimestamp);
  Database.updateMeta(tableName, commitTimestamp);

  dialog.finishStep(stepText, successCount > 0, `Saved ${successCount} records, failed ${failCount}.`);

  return { table: tableName, total: filesToDownload.length, success: successCount, failed: failCount };
}




//  , "playlists", "soundBlobs"
/**
 * Pull all tables from Drive in full sync mode.
 *
 * @param {string} uuid - User ID
 * @param {Array<string>} tables - List of table names to sync
 * @returns {Promise<{mode:string,tables:Array}>}
 */
export async function pullFullSync(uuid, tables = ["phrases"]) {
  // Step 0: Get access token
  
  const tokenResult = await getAccessToken();
  const dialog = document.querySelector("report-dialog");
  dialog.clear();
  dialog.open("Mirror Download Process");

  let stepText = `Get Google Drive access token`;
  dialog.addStep(stepText);
  dialog.startStep(stepText);
  if (!tokenResult.success) { 
    dialog.finishStep(stepText, false, tokenResult.error.message);
    return { mode: "Mirror Download", tables: [] };
  }
  const accessToken = tokenResult.data;
  dialog.finishStep(stepText, true);

  const results = [];
  for (const table of tables) {
    const prefix = `${table}_`;

    const separator = `===== Table ${table} =====`.toUpperCase();
    dialog.addSeparator(separator);

    const res = await pullSyncTable(uuid, table, prefix, accessToken, dialog);
    results.push(res);

    // Mark table step as finished based on success/failure counts
    if (res.success > 0 && res.failed === 0) {
      dialog.addLog(`Downloaded ${res.success} records.`);
    } else if (res.success > 0 && res.failed > 0) {
      dialog.addLog(`Downloaded ${res.success}, failed ${res.failed}.`);
    } else {
      dialog.addLog("No records downloaded.");
    }
  }

  dialog.announceFinish("Mirrow Download Finished");
  return { mode: "Mirror Download", tables: results };
}


export async function testAddPhraseAndSync(uuid) {


  // const report = await pushFullSync(uuid, ({ table, completed, total }) => {
  //   const progressBar = document.querySelector(`#progress-${table}`);
  //   if (progressBar) {
  //     progressBar.value = (completed / total) * 100;
  //     progressBar.textContent = `${Math.round(progressBar.value)}%`;
  //   }
  // });
  // await pushFullSync(uuid);
  //await pullFullSync(uuid);
  // return report;
}

