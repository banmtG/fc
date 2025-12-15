/**
 * connectivity.js
 * ============================================================
 * Connectivity utility for handling online/offline state in the browser.
 *
 * Responsibilities:
 * - Detect browser connectivity changes (`navigator.onLine`).
 * - Emit custom app-level events (`connectivity:online`, `connectivity:offline`)
 *   so features can subscribe without coupling directly to raw browser events.
 * - Provide a simple task queue mechanism:
 *   - `queueTask(taskName, payload)` stores tasks in LocalStorage when offline.
 *   - `flushQueue()` replays queued tasks as custom events once connectivity returns.
 *
 * Usage:
 *   Connectivity.registerEvents(); // start listening for online/offline
 *   Connectivity.queueTask("logout", {}); // enqueue a logout task
 *   document.addEventListener("task:logout", handler); // handle queued logout
 *
 * This design allows features like auth, sync, or uploads to gracefully handle
 * offline scenarios by queuing work and flushing it later.
 */

import LocalStorage from './../../core/local-storage.js';

const Connectivity = {
  /**
   * Check current connectivity status.
   * @returns {boolean} true if browser reports online, false otherwise.
   */
  isOnline: () => navigator.onLine,

  /**
   * Register listeners for browser online/offline events.
   * Re-emits them as app-specific events (`connectivity:online`, `connectivity:offline`)
   * so other modules can subscribe without coupling to raw browser APIs.
   */
  registerEvents() {
    window.addEventListener("online", () => {
      console.log("🌐 Browser online");
      document.dispatchEvent(new CustomEvent("connectivity:online"));
    });
    window.addEventListener("offline", () => {
      console.log("⚠️ Browser offline");
      document.dispatchEvent(new CustomEvent("connectivity:offline"));
    });
  },

  /**
   * Queue a task to be executed later when connectivity is restored.
   * Tasks are persisted in LocalStorage under the "taskQueue" key.
   *
   * @param {string} taskName - Identifier for the task (e.g. "logout", "sync").
   * @param {object} payload - Arbitrary data to pass along with the task.
   */
  queueTask(taskName, payload) {
    const queue = JSON.parse(LocalStorage.get("taskQueue") || "[]");
    queue.push({ taskName, payload });
    LocalStorage.set("taskQueue", JSON.stringify(queue));
  },

  /**
   * Flush all queued tasks.
   * Dispatches a custom event for each task (`task:<taskName>`) with its payload.
   * After flushing, clears the queue from LocalStorage.
   *
   * Example: a queued "logout" task will emit `task:logout` with payload.
   */
  async flushQueue() {
    const queue = JSON.parse(LocalStorage.get("taskQueue") || "[]");
    for (const task of queue) {
      document.dispatchEvent(new CustomEvent(`task:${task.taskName}`, { detail: task.payload }));
    }
    LocalStorage.remove("taskQueue");
  }
};

export default Connectivity;
