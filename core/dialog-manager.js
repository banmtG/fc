import '../components/confirm-dialog.js'; // your ConfirmDialog component
import { FocusStack } from './focus-stack.js';

class DialogManager {
  constructor() {
    // Create one global confirm-dialog instance
    this.dialog = document.createElement('confirm-dialog');
    document.body.appendChild(this.dialog);
  }

  /**
   * Show a confirmation dialog and return a Promise that resolves
   * with true (Yes) or false (Cancel).
   */
  confirm(message = 'Are you sure?') {
    return new Promise((resolve) => {
      const onYes = () => {
        cleanup();
        resolve(true);
      };
      const onNo = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        this.dialog.removeEventListener('confirm-dialog-Yes', onYes);
        this.dialog.removeEventListener('confirm-dialog-No', onNo);
        this.dialog.close();
      };

      this.dialog.addEventListener('confirm-dialog-Yes', onYes);
      this.dialog.addEventListener('confirm-dialog-No', onNo);

      this.dialog.open(message);
    });
  }
}

// Export a singleton
export const DialogManagerInstance = new DialogManager();
