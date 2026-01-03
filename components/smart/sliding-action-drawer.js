// sliding-action-row.js
// Requires Shoelace JS/CSS already loaded globally.

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      font-family: var(--sl-font-sans);
      --actions-width: 160px;
    }

    .row {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--sl-color-neutral-0);
    }

    .handle-area {
      width: 20px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sl-color-neutral-50);
      cursor: pointer;
      user-select: none;
      z-index: 4; /* above actions */
    }


    .handle-area sl-icon {
      pointer-events: none;
    }

    .actions {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 3px;
      min-width: var(--actions-width);
      background: var(--sl-color-neutral-50);
      box-shadow: -2px 0 6px rgba(0,0,0,0.08);
      transform: translateX(100%);
      transition: transform 0.18s ease-out;
      z-index: 3;
      pointer-events: auto;
    }
    :host(.revealed) .actions {
      display: flex;
      transform: translateX(0);
      right: 20px;
    }



  </style>

  <div class="row">
    <div class="handle-area" part="handle">
      <sl-icon name="grip-vertical"></sl-icon>
    </div>
    <div class="actions" part="actions">
      <slot name="actions"></slot>
    </div>
  </div>

  <sl-dialog id="confirmDialog" label="Confirm action">
    <p id="confirmText">Are you sure?</p>
    <sl-button slot="footer" variant="default" id="cancelBtn">Cancel</sl-button>
    <sl-button slot="footer" variant="primary" id="okBtn">OK</sl-button>
  </sl-dialog>
`;

class SlidingActionDrawer extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));

    this.handleArea = this.shadowRoot.querySelector(".handle-area");
    this.actionsEl = this.shadowRoot.querySelector(".actions");

    this.confirmDialog = this.shadowRoot.querySelector("#confirmDialog");
    this.confirmText = this.shadowRoot.querySelector("#confirmText");
    this.cancelBtn = this.shadowRoot.querySelector("#cancelBtn");
    this.okBtn = this.shadowRoot.querySelector("#okBtn");

    this._pendingAction = null;

    this._onHandleClick = (e) => this._toggleReveal(e);
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onActionsClick = (e) => this._handleActionsClick(e);
  }

  connectedCallback() {
    this.handleArea.addEventListener("click", this._onHandleClick);
    this.shadowRoot.addEventListener("keydown", this._onKeyDown);
    this.actionsEl.addEventListener("click", this._onActionsClick);

    this.cancelBtn.addEventListener("click", () => this.confirmDialog.hide());
    this.okBtn.addEventListener("click", () => {
      if (this._pendingAction) {
        this._emit("sl-action", { action: this._pendingAction });
      }
      this.confirmDialog.hide();
      this._pendingAction = null;
    });
  }

  disconnectedCallback() {
    this.handleArea.removeEventListener("click", this._onHandleClick);
    this.shadowRoot.removeEventListener("keydown", this._onKeyDown);
    this.actionsEl.removeEventListener("click", this._onActionsClick);
  }

reveal() {
  this.classList.add("revealed");
  this._emit("sl-reveal");
  const actions = [...this.querySelectorAll('[slot="actions"]')];
  if (actions[0]) actions[0].focus();
}

hide() {
  this.classList.remove("revealed");
  this._emit("sl-hide");
  this.handleArea.focus();
}


  _toggleReveal(e) {
    e.stopPropagation();
    if (this.classList.contains("revealed")) this.hide();
    else this.reveal();
  }

  _handleKeyDown(e) {
  if (!this.classList.contains("revealed")) return;

  const actions = [...this.querySelectorAll('[slot="actions"]')];
  if (!actions.length) return;

  const active = document.activeElement;
  const idx = actions.indexOf(active);

  if (e.key === "Tab") {
    e.preventDefault();
    e.stopPropagation();

    if (e.shiftKey) {
      // cycle backwards
      if (idx > 0) actions[idx - 1].focus();
      else actions[actions.length - 1].focus();
    } else {
      // cycle forwards
      if (idx >= 0 && idx < actions.length - 1) actions[idx + 1].focus();
      else actions[0].focus();
    }
  }

  if (e.key === "Escape" || e.key === "ArrowRight") {
    this.hide();
  }

  if (e.key === "Enter" || e.key === " ") {
    const target = active?.closest?.('[slot="actions"][data-action]');
    if (target) {
      const action = target.getAttribute("data-action");
      const needsConfirm = target.getAttribute("data-confirm") === "true";
      if (needsConfirm) {
        this._pendingAction = action;
        this.confirmText.textContent = `Confirm ${action}?`;
        this.confirmDialog.show();
      } else {
        target.click();
      }
    }
  }
}


  _handleActionsClick(e) {
    const target = e.target.closest('[slot="actions"][data-action]');
    if (!target) return;

    const action = target.getAttribute("data-action");
    const needsConfirm = target.getAttribute("data-confirm") === "true";
    if (needsConfirm) {
      this._pendingAction = action;
      this.confirmText.textContent = `Confirm ${action}?`;
      this.confirmDialog.show();
    } else {
      this._emit("sl-action", { action });
    }
    e.stopPropagation();
  }

  _emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}

customElements.define("sliding-action-drawer", SlidingActionDrawer);