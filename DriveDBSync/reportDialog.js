import './../components/smart/smart-dialog.js';
import { NotificationManagerInstance } from './../core/notification-manager.js';

class ReportDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._abort = new AbortController();
    const { signal } = this._abort;
    this.steps = {};
    this.stepCounter = 0;
    this.totalStartTime = null;
    this._logs = [];   // store logs per step

    this.shadowRoot.innerHTML = `
      <style>
        .report-container {
          padding: 5px;
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid #ccc;
          border-radius: 4px;
          overflow: hidden;
        }
        .report-step {
          display: grid;
          grid-template-columns: 5fr 2fr 20px 35px;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #ddd;
          padding: 4px 6px;
        }
        .report-step:last-child {
          border-bottom: none;
        }
        .step-title { font-weight: 400; }
        .step-progress { width: 100%; }
        .step-status { text-align: center; }
        .step-time { text-align: right; font-size: 0.9em; color: #555; }
        .finish-row { margin-top: 12px; font-weight: bold; text-align: center; }
        .headerTop { display: flex; flex-direction: row; justify-content: space-between; align-items: center; }
        #title { font-weight: bold; }
        smart-dialog { padding: 5px; color: var(--sl-color-neutral-700); font-family: var(--sl-input-font-family); }
        @media screen and (min-width: 768px) { 
            smart-dialog::part(dialog) { max-width: 600px; width:50vw; min-width: 550px; }
        }
        @media screen and (max-width: 767px) {
            smart-dialog::part(dialog) { max-width: 600px; width:99vw; }
        }
        .download-link { margin-top: 8px; display: block; }
        .hidden { display: none; }
        .container {
          max-height: 400px;
          overflow-y: scroll;          
        }
        .report-separator {
          text-align: center; 
          text-weight: bold;
          margin: 8px 0;
        }

        .htmlDetailContent {
          color: blue;
          margin: 2px 0 2px 10px;
        }
          
/* scrollbar */
::-webkit-scrollbar {
  width: 1px;
  height: 1px;
}

::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  -webkit-border-radius: 10px;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  -webkit-border-radius: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.3);
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.5);
}

::-webkit-scrollbar-thumb:window-inactive {
  background: rgba(255, 255, 255, 0.3);
}

      </style>
      <smart-dialog draggable id="bingDiv" class="hidden">             
        <div slot="header">    
          <div class="headerTop">
            <span id="title">Sync Progress</span>
            <sl-button size="small" id="closeBtn">✖️</sl-button>
          </div>          
        </div>        
        <div slot="body" class="body">         
          <div class="container">
            <div class="report-container"></div>
            <div class="finish-row" hidden></div>
            <sl-button class="download-link hidden" id="logDownload">Download detailed logs</sl-button>
        </div>
        </div>   
        <div slot="footer" class="footer"></div>   
      </smart-dialog>
    `;
    this._smart_dialog = this.shadowRoot.querySelector("smart-dialog");
    this._title =  this.shadowRoot.querySelector("#title");
    this._closeBtn =  this.shadowRoot.querySelector("#closeBtn");
    this._closeBtn.addEventListener('click',()=> { 
      if (this._finished===true) {         
        this._smart_dialog.classList.add('hidden')
      } else {
        NotificationManagerInstance.show({
          label: "Syncing... do not close to avoid data loss.", 
          icon : 'radioactive', 
          color : '--sl-color-danger-600', 
          timer : 3500 
        }) 
      }
    }, { signal });
    this.container = this.shadowRoot.querySelector(".report-container");
    this.finishRow = this.shadowRoot.querySelector(".finish-row");
    this.logDownload = this.shadowRoot.querySelector("#logDownload");
  }

  disconnectedCallback() {
    this._abort.abort();   
    this.steps = {};
    this.container.innerHTML = "";
    this.stepCounter = 0;
    this.totalStartTime = null;
    this._logs = [];
  }

  addStep(name, useProgress = false) {
    this.stepCounter++;
    if (!this.totalStartTime) {
      this.totalStartTime = performance.now();
    }

    const stepEl = document.createElement("div");
    stepEl.className = "report-step";
    stepEl.innerHTML = `
      <span class="step-title">${this.stepCounter}. ${name}</span>
      ${useProgress ? '<sl-progress-bar class="step-progress" value="0"></sl-progress-bar>' : '<span></span>'}
      <span class="step-status"></span>
      <span class="step-time"></span>
    `;
    this.container.appendChild(stepEl);
    stepEl.scrollIntoView({  behavior: "smooth", block: "nearest" });
    this.steps[name] = { el: stepEl, startTime: null };
  }

  startStep(name) {
    const step = this.steps[name];
    if (step) {
      step.startTime = performance.now();
      const status = step.el.querySelector(".step-status");
      status.textContent = "⏳";
    }
  }

  updateProgress(name, completed, total) {
    const step = this.steps[name];
    if (step) {
      const bar = step.el.querySelector(".step-progress");
      if (bar) {
        bar.value = (completed / total) * 100;
        bar.textContent = `${Math.round(bar.value)}%`;
      }
    }
  }

  finishStep(name, success = true, log = "") {
    const step = this.steps[name];
    if (step) {
      const durationMs = performance.now() - step.startTime;
      const durationSec = (durationMs / 1000).toFixed(1);

      const status = step.el.querySelector(".step-status");
      status.textContent = success ? "✅" : "❌";

      const timeEl = step.el.querySelector(".step-time");
      timeEl.textContent = `${durationSec}s`;

      // store log
      this._logs.push(`${this.stepCounter}. ${name} - ${success ? "SUCCESS" : "!!!! FAIL !!!!"} (${durationSec}s)\n${log}`);
    }
  }

  announceFinish(message) {
    const totalDurationMs = performance.now() - this.totalStartTime;
    const totalDurationSec = (totalDurationMs / 1000).toFixed(1);
    this.finishRow.textContent = `✅ ${message} (Total: ${totalDurationSec}s)`;
    this.finishRow.hidden = false;

    this._finished = true;
    this._logs.push(this.finishRow.textContent);

    const fullLog = this._logs.join("\n");
    this.logDownload.classList.remove("hidden");
    this.logDownload.scrollIntoView({  behavior: "smooth", block: "nearest" });
    this.logDownload.onclick = async () => {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "sync-log.txt",
          types: [{ description: "Text Files", accept: { "text/plain": [".txt"] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(fullLog);
        await writable.close();
      } catch (err) {
        console.error("❌ Failed to save log file:", err);
      }
    };
  }

  addLog(log) {
    this._logs.push(log);
  }

  addDetail(htmlDetailContent) { 
    const sepEl = document.createElement("div"); 
    sepEl.className = "htmlDetailContent"; 
    sepEl.innerHTML = htmlDetailContent; 
    this.container.appendChild(sepEl); 
    sepEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // store separator log 
    this._logs.push(htmlDetailContent);
  }

  /** Insert a separator row (arbitrary HTML/text) without incrementing step counter */ 
  addSeparator(htmlContent) { 
    const sepEl = document.createElement("div"); 
    sepEl.className = "report-separator"; 
    sepEl.innerHTML = htmlContent; 
    this.container.appendChild(sepEl); 
    sepEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // store separator log 
    this._logs.push(htmlContent);
  }

  open(title) {
    this._title.innerHTML = title;
    this._finished = false;
    this._smart_dialog.classList.remove('hidden');
  }

  clear() {
    this._finished = false;
    this.container.innerHTML="";
    this.finishRow.innerHTML="";
    this.logDownload.classList.add("hidden");
    this._logs = [];
    this.stepCounter = 0;
  }
}

if (!customElements.get("report-dialog")) {
  customElements.define("report-dialog", ReportDialog);
}
