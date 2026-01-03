import './confirm-dialog.js';

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
  </style>

  <sl-button size="small" variant="neutral" circle id="deleteBtn" aria-label="Delete">
    <sl-icon name="trash"></sl-icon>
  </sl-button>
`;

class DeleteButton extends HTMLElement {
  static get observedAttributes() {
    return ["confirm-delete"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));

    this.deleteBtn = this.shadowRoot.querySelector("#deleteBtn");

    // Create dialog once
    this.confirmDialog = document.createElement('confirm-dialog');
    this.shadowRoot.appendChild(this.confirmDialog);

    // Bind handlers
    this._onDeleteClick = this._onDeleteClick.bind(this);
    this._onConfirmYes = this._onConfirmYes.bind(this);
    this._onConfirmNo = this._onConfirmNo.bind(this);
  }

  connectedCallback() {
    console.log(`delete-button connectedCallBack`);
    this.deleteBtn.addEventListener("click", this._onDeleteClick);
    this.confirmDialog.addEventListener("confirm-dialog-Yes", this._onConfirmYes);
    this.confirmDialog.addEventListener("confirm-dialog-No", this._onConfirmNo);
  }

  disconnectedCallback() {
    this.deleteBtn.removeEventListener("click", this._onDeleteClick);
    this.confirmDialog.removeEventListener("confirm-dialog-Yes", this._onConfirmYes);
    this.confirmDialog.removeEventListener("confirm-dialog-No", this._onConfirmNo);
  }

  _onDeleteClick(e) {
    e.stopPropagation();
    if (this.hasAttribute("confirm-delete")) {
      console.log(`confirmDialog.open("Are you sure to delete?");`);

      this.confirmDialog.open("Are you sure to delete?");
    } else {
      this._emitConfirmed();
    }
  }

  _onConfirmYes() {
    this.confirmDialog.close();
    this.confirmDialog.remove();
    this._emitConfirmed();
  }

  _onConfirmNo() {
    this.confirmDialog.close();
    // user canceled, do nothing
  }

  _emitConfirmed() {
    this.dispatchEvent(new CustomEvent("delete-confirmed", {
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define("delete-button", DeleteButton);
