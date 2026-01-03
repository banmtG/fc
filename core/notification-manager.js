import './../components/smart/smart-notification.js';

class NotificationManager {
  constructor() {
    // Create one global smart-notification instance
    this.host = document.createElement('smart-notification');
    document.body.appendChild(this.host);
  }

  /**
   * Show a notification with given options.
   */
  show({ label, icon = 'info-circle', color = '--sl-color-primary-300', timer = 2500 }) {
    this.host.show({ label, icon, color, timer });
  }
}

// Export a singleton
export const NotificationManagerInstance = new NotificationManager();
