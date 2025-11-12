// appState.js module
import { LocalStorageManager } from './../stores/localStorage.js';

// Define the central state object that holds global app settings
const appState = {
  requireReconfirm: false, // Whether confirmation dialogs require reconfirmation
  darkMode: false,         // Whether dark mode is enabled
  language: 'en',          // Current language setting
  // ...more app-wide settings can be added here
};

// Create a listeners object to store reactive callbacks for each key
const listenersAppState = {};

// Getter function: retrieve the current value of a state key
export function getAppState(key) {
  return appState[key];
}

// Setter function: update a state key, persist it to localStorage, and notify listeners
export function setAppState(key, value) {
  appState[key] = value;// Update the internal state
  LocalStorageManager.set(key, value);  // Persist the value to localStorage manager
  listenersAppState[key]?.forEach(fn => fn(value)); // Notify all listeners subscribed to this key
}

// Register a listener function to be called when a specific key changes
export function onChangeAppState(key, fn) {
  if (!listenersAppState[key]) listenersAppState[key] = [];// Initialize listener array if it doesn't exist
  listenersAppState[key].push(fn);// Add the callback to the list
}

// On module load: hydrate state from localStorage if values exist
Object.keys(appState).forEach(key => {
  const stored = LocalStorageManager.get(key);// Try to retrieve stored value
  if (stored !== null) appState[key] = stored;// If found, parse and apply it to state
});
