 document.addEventListener("playlist:updated", async (e) => {
    const { playlistId, list } = e.detail;
    const activeUserId = StateStore.get("activeUserId");
    await db.savePlaylist({ playlistID: playlistId, userID: activeUserId, list });
  });