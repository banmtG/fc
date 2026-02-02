// my-app.js

import { AuthManager } from './../features/auth/manager/auth-manager.js';
import { CONFIG } from './../config/config.js';

// Import UI components
import "./../features/auth/components/login-form.js";
import './../features/auth/components/user-profile-menu.js';
import '../components/fc/new-phrase-tab.js';
import './../components/smart/image-picker.js';

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

        .header_rest{
          display:flex;
          flex-direction: row;
          align-items: center;
          gap:5px;
          color: var(--sl-color-neutral-700);
          font-size: 0.9rem;
          cursor: pointer;
        }

        /* Add a separator (vertical bar) to every item except the first one */
        .flex-item::before {
          content: '|';
          margin: 0 5px; /* Same as the container's gap value */
          color: #ccc; /* Style the separator color */
        }

        .flex-item:first-child::before {
          content: none; /* Hide the separator for the first item */
        }

        .row {
          margin: 0.5rem 0;
        }

        sl-tab-panel::part(base) {
          padding:0;
        }

      </style>

      <header>
        <div class="logo">
            <img src="./images/logo_long.png" alt="logo">
        </div>
        <div class="header_rest">
            <!-- User info + actions -->
            <user-profile-menu class="flex-item"></user-profile-menu>
            <span id="loginBtn" class="flex-item">Login</span>
            
        </div>
    </header>
    <main>
        <sl-tab-group>
            <sl-tab slot="nav" panel="new_entry">Add new entry</sl-tab>
            <sl-tab slot="nav" panel="playlist">Playlist</sl-tab>
            <sl-tab slot="nav" panel="setting">Setting</sl-tab>
          
            <sl-tab-panel name="new_entry" class="wordlist_container">
              <new-phrase-tab></new-phrase-tab>
                  

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
            
            </sl-tab-panel>
            <sl-tab-panel name="playlist">
                This is the flashcard tab panel.
                <image-picker></image-picker>
            </sl-tab-panel>
            <sl-tab-panel name="setting">This is the setting tab panel.</sl-tab-panel>
        </sl-tab-group>          
    </main>  

    <login-form
        options="google"
        dialog-title="Login AD Flash Card"
        auto-close></login-form> 
    `;
  }

  // -------------------------------------------------------
  // 2. Setup event handlers (replaces inline JS in HTML)
  // -------------------------------------------------------
  setupEventHandlers() {
    this.loginForm = this.shadowRoot.querySelector("login-form");
    const userInfo = this.shadowRoot.querySelector("#user-info");
    const output = this.shadowRoot.querySelector("#output");
    this.loginBtn = this.shadowRoot.querySelector("#loginBtn");
   
    // ✅ Protected API call
    this.shadowRoot.querySelector("#btnProtected").addEventListener("click", async () => {
      console.log('call Protected API');
      const data = await AuthManager.callApi(CONFIG.API_PROTECTED);
      output.textContent = JSON.stringify(data, null, 2);
    });

    this.loginBtn.addEventListener("click", ()=> {
      console.log(`open login`);

      this.loginForm.setAttribute('open', '');
    })

    // ✅ SearchImageM
    this.shadowRoot.querySelector("#btnSearch").addEventListener("click", async () => {
      const input = this.shadowRoot.querySelector("#searchBatchInput").value;
      const batch = input.split(",").map(p => p.trim()).filter(Boolean);

      const items = batch.map(p=> { return {
        phrase:p,
        query: "aspire the desire",
        defi: false,        
      }
      })
      if (batch.length === 0) {
        alert("Please enter at least one phrase.");
        return;
      }

      const data = await AuthManager.callApi(CONFIG.API_SEARCH_IMG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
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
