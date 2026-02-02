// core/events/phrase-tab-events.js

import { AuthManager } from './../../features/auth/manager/auth-manager.js';
import { CONFIG } from './../../config/config.js';
import Database from './../database.js';
import LocalStorage from '../local-storage.js';

export function registerNewPhraseTabEvents(controller) {
     // new-phrase-tab events
    document.addEventListener('fc-image-picker-fetch-requested', async (e) => {
      console.log(e);
      const { payload, origin } = e.detail;

      const data = await AuthManager.callApi(CONFIG.API_SEARCH_IMAGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      });

      // ✅ Emit result back to the originating component
      origin.dispatchEvent(new CustomEvent('fc-image-picker-fetched', {
        detail: { data }
      }));

      console.log('emit images-fetched event to', origin.tagName);
    });

    document.addEventListener('phrases-fetch', async (e) => {
      const { batch, origin } = e.detail;
      const targetLang = "th";

      const data = await AuthManager.callApi(CONFIG.API_SEARCH_DICT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch, targetLang })
      });

      // ✅ Emit result back to the originating component
      origin.dispatchEvent(new CustomEvent('phrases-fetched', {
        detail: { data }
      }));

      console.log('emit phrases-fetched event to', origin.tagName);
    });

 // Handle tags-requested
  document.addEventListener('tags-requested', async (e) => {
    console.log(`tags-requested event received`);
    const { origin } = e.detail;
    const userID = LocalStorage.get('activeUser');
    console.log(userID);
    // Fetch tags from IndexedDB
    const tags = await Database.getTagsByUser(userID);
    console.log(tags);

    // Prepare options + selection
    const options = tags.map(t => t.text);
    const selection = tags.filter(t => t.select).map(t => t.text);

    // Emit back to the requesting component
    origin.dispatchEvent(new CustomEvent('tags-received', {
      detail: { options, selection }
    }));
  });
  

  // Tag created
  document.addEventListener('tag-created', async (e) => {
    const { value } = e.detail;
     const userID = LocalStorage.get('activeUser');

    const newTag = {
      userID,
      text: value,
      select: false,
      createdAt: Date.now()
    };

    await Database.addTag(newTag);
    document.dispatchEvent(new CustomEvent('tag-saved', { detail: newTag }));
  });

  // Tag deleted
  document.addEventListener('tag-deleted', async (e) => {
    const { value } = e.detail;
    const userID = LocalStorage.get('activeUser');

    // Find tag by userID + text, then delete
    const tags = await Database.getTagsByUser(userID);
    const tag = tags.find(t => t.text === value);
    if (tag) {
      await Database.deleteTag(tag.tagID);
      document.dispatchEvent(new CustomEvent('tag-removed', { detail: tag }));
    }
  });

// Tag(s) selected — value is an array of tag texts
document.addEventListener('tags-selected', async (e) => {
  const selectedTexts = Array.isArray(e.detail.value) ? e.detail.value : [];
  const userID = LocalStorage.get('activeUser');

  // Fetch all tags for user
  const tags = await Database.getTagsByUser(userID);

  // Build a lookup for quick membership checks
  const selectedSet = new Set(selectedTexts);

  // Track updates we’ll apply
  const updates = [];

  // Compute new select flags
  for (const tag of tags) {
    const shouldSelect = selectedSet.has(tag.text);
    if (tag.select !== shouldSelect) {
      // only update if changed
      updates.push(Database.updateTag(tag.tagID, { select: shouldSelect }));
    }
  }

  // Apply updates in parallel
  if (updates.length) {
    await Promise.all(updates);
  }

  // Refetch to provide the latest state (optional, but useful for UI)
  const tagsAfter = await Database.getTagsByUser(userID);
  const options = tagsAfter.map(t => t.text);
  const selection = tagsAfter.filter(t => t.select).map(t => t.text);

  // Emit a single consolidated event
  document.dispatchEvent(new CustomEvent('tags-updated', {
    detail: { options, selection, userID }
  }));
  console.log('tags-selected → tags-updated', { selection });
});


 // Handle reminders-requested

  // Listen for reminder-query-changed events bubbling up from <new-phrase-tab>
  document.addEventListener('reminder-query-changed', async (e) => {
    const { query, method, origin } = e.detail;
    const userID = LocalStorage.get('activeUser');

    console.log(`reminder-query-changed received: "${query}" via ${method}`);

    // Check if a draft reminder already exists for this user
    const reminders = await Database.getRemindersByUser(userID);
    const draft = reminders.find(r => r.isDraft);
    console.log(draft);
    if (draft) {
      // Update existing draft row
      await Database.updateReminder(draft.reminderID, {
        tempText: query,
        createdAt: new Date()
      });
    } else {
      // Create new draft row
      await Database.addReminder({
        userID,
        tempText: query,
        isDraft: true,   // mark this as the draft row
        createdAt: new Date()
      });
    }

    // Notify the origin component that persistence succeeded
    // origin.dispatchEvent(new CustomEvent('reminder-draft-saved', {
    //   detail: { query, method },
    //   bubbles: true,
    //   composed: true
    // }));
  });




document.addEventListener('reminders-requested', async (e) => {
  console.log(`reminders-requested event received`);
  const { origin } = e.detail;
  const userID = LocalStorage.get('activeUser');
  console.log(userID);

  // Fetch reminders from IndexedDB
  const reminders = await Database.getRemindersByUser(userID);
  console.log(reminders);

  // Separate committed reminders vs draft
  const committed = reminders.filter(r => !r.isDraft);
  const draft = reminders.find(r => r.isDraft);

  // Prepare options from committed reminders
  const suggestions = committed.map(r => r.text);

  // Value comes from draft row if present
  const value = draft ? draft.tempText : null;

  // Emit back to the requesting component
  origin.dispatchEvent(new CustomEvent('reminders-received', {
    detail: { suggestions, value }
  }));
});

}