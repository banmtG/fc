// my-app.js

import { AuthManager } from './features/auth/manager/auth-manager.js';

import { CONFIG } from './config/config.js';
// Import UI components
import "./features/auth/components/login-form.js";
import './features/auth/components/user-profile-menu.js';
import './core/app-controller.js';


class MyApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.setupEventHandlers();
  }

  // -------------------------------------------------------
  // 1. Render UI (equivalent to your test HTML)
  // -------------------------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
          font-family: system-ui, sans-serif;
        }
        #output {
          background: #111;
          color: #0f0;
          padding: 1rem;
          margin-top: 1rem;
          white-space: pre-wrap;
          border-radius: 6px;
        }
        .row {
          margin: 0.5rem 0;
        }
      </style>

      <!-- Login dialog -->
      <login-form
        options="google"
        dialog-title="Login AD Flash Card"
        auto-close
      ></login-form>

      <!-- User info + actions -->
      <div id="user-info" class="row"></div>
      <user-profile-menu></user-profile-menu>

      <div class="row">
        <button id="btnProtected">Call API</button>
        <button id="btnLogout">Logout</button>
      </div>

      <!-- Phrase search -->
      <div class="row">
        <input id="searchBatchInput" type="text" placeholder="Enter phrases, separated by commas" style="width: 60%;" />
        <button id="btnSearch">SearchImageM</button>
      </div>

      <pre id="output"></pre>
    `;
  }

  // -------------------------------------------------------
  // 2. Setup event handlers (replaces inline JS in HTML)
  // -------------------------------------------------------
  setupEventHandlers() {
    const loginForm = this.shadowRoot.querySelector("login-form");
    const userInfo = this.shadowRoot.querySelector("#user-info");
    const output = this.shadowRoot.querySelector("#output");

    // // ✅ Login success event
    // loginForm.addEventListener("login-success", async (e) => {
    //   const { provider, email, userId, token } = e.detail;

    //   if (token) {
    //     AuthManager.setToken(token);
    //   }

    //   await AuthManager.bootstrap();

    //   userInfo.textContent = email
    //     ? `Welcome, ${email}`
    //     : `Guest mode`;
    // });

    // ✅ Protected API call
    this.shadowRoot.querySelector("#btnProtected").addEventListener("click", async () => {
      const data = await AuthManager.callApi(CONFIG.API_PROTECTED);
      output.textContent = JSON.stringify(data, null, 2);
    });

    // ✅ SearchImageM
    this.shadowRoot.querySelector("#btnSearch").addEventListener("click", async () => {
      const input = this.shadowRoot.querySelector("#searchBatchInput").value;
      const batch = input.split(",").map(p => p.trim()).filter(Boolean);

      if (batch.length === 0) {
        alert("Please enter at least one phrase.");
        return;
      }

      const data = await AuthManager.callApi(CONFIG.API_SEARCH_DICT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch })
      });

      output.textContent = JSON.stringify(data, null, 2);
    });

    // ✅ Logout
    this.shadowRoot.querySelector("#btnLogout").addEventListener("click", async () => {
      await AuthManager.logout();
      userInfo.textContent = "Guest mode";
    });
  }
}

customElements.define("my-app", MyApp);
