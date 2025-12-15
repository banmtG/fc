import "../../../components/smart/smart-dialog.js";
import "../../../components/smart/smart-notification.js";
import { getAppState } from "../../../controllers/appStates.js";

class UserProfileMenu extends HTMLElement {
  constructor() {
    super();

    // Bind event handlers
    this._openHandler = this._openHandler.bind(this);
    this._confirmHandler = this._confirmHandler.bind(this);
    this._cancelHandler = this._cancelHandler.bind(this);

    // Prepare template
    const template = document.createElement("template");

    const style = `<style>
      smart-dialog {
        display: none; /* hidden by default */
      }

      .trigger-btn {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: 0.5rem;
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #ccc;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #fff;
        font-size: 0.9rem;
        /* Ensure the background image covers the whole circle */
        background-size: cover;       /* scale image to cover element */
        background-position: center;  /* center the image */
        background-repeat: no-repeat; /* prevent tiling */
      }

      .email {
        font-size: 0.9rem;
        color: var(--sl-color-neutral-700);
      }

      smart-dialog::part(dialog) {
        max-width: 400px;
      }
    </style>`;

    template.innerHTML = `${style}
      <div class="trigger-btn" id="trigger">
        <div class="avatar" id="avatar"></div>
        <span class="email" id="email">Guest ahihi</span>
      </div>

      <smart-dialog esc-close draggable>
        <div slot="header">User Profile</div>
        <div slot="body" class="body">
          <sl-input size="small" id="profile_email" label="Email"></sl-input>
          <sl-input size="small" id="profile_name" label="Name"></sl-input>
        </div>
        <div slot="footer">
          <sl-button size="small" variant="primary" id="confirm">Save</sl-button>
          <sl-button size="small" variant="default" id="cancel">Cancel</sl-button>
        </div>
      </smart-dialog>
      <smart-notification></smart-notification>
    `;

    this.attachShadow({ mode: "open" }).appendChild(
      template.content.cloneNode(true)
    );
  }

  connectedCallback() {
    this.render();

    // Add listeners
    this._trigger = this.shadowRoot.getElementById("trigger");
    this._smart_dialog = this.shadowRoot.querySelector("smart-dialog");
    this._confirmBtn = this.shadowRoot.getElementById("confirm");
    this._cancelBtn = this.shadowRoot.getElementById("cancel");

    this._trigger.addEventListener("click", this._openHandler);
    this._smart_dialog.addEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.addEventListener("smart-dialog-canceled", this._cancelHandler);
  }

  disconnectedCallback() {
    // Remove listeners
    this._trigger.removeEventListener("click", this._openHandler);
    this._smart_dialog.removeEventListener("smart-dialog-confirmed", this._confirmHandler);
    this._smart_dialog.removeEventListener("smart-dialog-canceled", this._cancelHandler);

    // Clean shadow DOM
    this.shadowRoot.replaceChildren();
  }

  /**
   * Generate a fallback avatar with initials and a color.
   */
  generateAvatarFallback(nameOrEmail) {
    const avatarEl = this.shadowRoot.getElementById("avatar");
    const initials = nameOrEmail
      ? nameOrEmail.trim().charAt(0).toUpperCase()
      : "G"; // default "G" for Guest

    // Pick a background color based on hash of string
    const colors = ["#6A5ACD", "#FF6347", "#20B2AA", "#FF8C00", "#4682B4", "#32CD32"];
    const hash = [...nameOrEmail].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bgColor = colors[hash % colors.length];

    avatarEl.style.backgroundImage = "none";
    avatarEl.style.backgroundColor = bgColor;
    avatarEl.textContent = initials;
  }

  render() {
    const avatarEl = this.shadowRoot.getElementById("avatar");
    const emailEl = this.shadowRoot.getElementById("email");

    const user = this._user || { mode: "guest", email: "Guest" };

    emailEl.textContent = user.email || "Guest";

    if (user.avatarUrl) {
      avatarEl.style.backgroundImage = `url(${user.avatarUrl})`;
      avatarEl.textContent = ""; // clear initials if image exists
    } else {
      this.generateAvatarFallback(user.name || user.email || "Guest");
    }
  }

  set user(data) {
    this._user = data;
    this.render();
  }

  _openHandler() {
    this._smart_dialog.style.display = "block";
    this._smart_dialog.reconfirm = getAppState("requireReconfirm");
  }

  _confirmHandler() {
    const email = this.shadowRoot.getElementById("profile_email").value;
    const name = this.shadowRoot.getElementById("profile_name").value;

    this.dispatchEvent(
      new CustomEvent("user-profile-saved", {
        detail: { email, name },
        bubbles: true,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }

  _cancelHandler() {
    this.dispatchEvent(
      new CustomEvent("user-profile-canceled", {
        bubbles: true,
        composed: true,
      })
    );
    this._smart_dialog.style.display = "none";
  }
}

customElements.define("user-profile-menu", UserProfileMenu);