// my-app.js

import { AuthManager } from './../features/auth/manager/auth-manager.js';
import { CONFIG } from './../config/config.js';

// Import UI components
import "./../features/auth/components/login-form.js";
import './../features/auth/components/user-profile-menu.js';


// import app-controller.js
import './../core/app-controller.js';

// import my-app related helpers
import { registerAuthUIEvents } from './ui-events/auth-ui-events.js';
import { hydrateUserProfileMenu } from './../features/auth/ui-helper/user-profile-menu-ui-helper.js';

class MyApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.registerUIEvents();  
    this.setupEventHandlers();
  }

  registerUIEvents() {
    registerAuthUIEvents(this);  // pass <my-app> instance
  }

  async updateUserProfileMenu() {
    const userProfileMenu = this.shadowRoot.querySelector("user-profile-menu");
    await hydrateUserProfileMenu(userProfileMenu);
  }
  // -------------------------------------------------------
  // 1. Render UI (equivalent to your test HTML)
  // -------------------------------------------------------
  render() {
    this.shadowRoot.innerHTML = `
      <link href="./css/base.css" rel="stylesheet">
      <link href="./css/my-app.css" rel="stylesheet">
      <link href="./css/shoelace_customized.css" rel="stylesheet">
      
      <style>
        :host {
          display: block;
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

      <header>
        <div class="logo">
            <img src="./images/logo_long.png" alt="logo">
        </div>
        <div class="header_rest">
            <!-- User info + actions -->
            <user-profile-menu></user-profile-menu>
        </div>
    </header>
    <main>
        <sl-tab-group>
            <sl-tab slot="nav" panel="wordlist">Add new entry</sl-tab>
            <sl-tab slot="nav" panel="flashcard">Play the list</sl-tab>
            <sl-tab slot="nav" panel="setting">Setting</sl-tab>
          
            <sl-tab-panel name="wordlist" class="wordlist_container">
              <search-box></search-box>
              <phrase-mobile-editor></phrase-mobile-editor>
                  

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
              <!-- <word-form></word-form>
              <object-tree></object-tree> -->
            
            </sl-tab-panel>
            <sl-tab-panel name="flashcard">
                This is the flashcard tab panel.
                <image-picker></image-picker>
            </sl-tab-panel>
            <sl-tab-panel name="setting">This is the setting tab panel.</sl-tab-panel>
        </sl-tab-group>          
    </main>

      <!-- Login dialog -->
      <login-form
        options="google"
        dialog-title="Login AD Flash Card"
        auto-close
      ></login-form>

    `;
  }

  // -------------------------------------------------------
  // 2. Setup event handlers (replaces inline JS in HTML)
  // -------------------------------------------------------
  setupEventHandlers() {
    const loginForm = this.shadowRoot.querySelector("login-form");
    const userInfo = this.shadowRoot.querySelector("#user-info");
    const output = this.shadowRoot.querySelector("#output");

    // ✅ Protected API call
    this.shadowRoot.querySelector("#btnProtected").addEventListener("click", async () => {
      console.log('call Protected API');
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
    });
  }
}

customElements.define("my-app", MyApp);
