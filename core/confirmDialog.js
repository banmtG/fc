class ConfirmDialog {
  constructor() {
    // Create dialog element
    this.dialog = document.createElement("dialog");
    this.dialog.classList.add("confirm-dialog");

    // Build inner content
    const form = document.createElement("form");
    form.method = "dialog";



    const confirmTitle = document.createElement("div");
    confirmTitle.id = "confirmTitle";

    const confirmBody = document.createElement("div"); 
    confirmBody.id = "confirmBody"; 

    const message = document.createElement("div");
    message.id = "confirmMessage";

    const confirmMenu = document.createElement("menu");
    confirmMenu.id = "confirmMenu";

    const cancelBtn = document.createElement("button");
    cancelBtn.value = "cancel";
    cancelBtn.textContent = "Cancel";

    const okBtn = document.createElement("button");
    okBtn.value = "ok";
    okBtn.textContent = "Confirm";

    confirmMenu.append(okBtn, cancelBtn);
    confirmBody.append(message);
    form.append(confirmTitle,confirmBody,confirmMenu);
    this.dialog.append(form);

    document.body.appendChild(this.dialog);

    // Inject styles once
    const style = document.createElement("style");
    style.textContent = `
      .confirm-dialog {
        border: none;
        border-radius: 8px;   
        width: 75%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        padding: 0;
        color: #3F3F46;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 1.2rem;
      }
      
      .confirm-dialog::backdrop {
        background: rgba(0,0,0,0.4);
      }

      .confirm-dialog #confirmTitle {
        padding: 10px;
        background: #F0F0F0;
      }
      
      .confirm-dialog #confirmBody {
        padding: 1rem;
      }

      .confirm-dialog #confirmMessage {
      }

      .confirm-dialog #confirmMenu {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 10px;
        margin:0;
      }

      .confirm-dialog button {
        all: unset;
        padding: 6px 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .confirm-dialog button:focus {
        background: #0284C7;
        color: white;
        box-shadow: 0 0 2px 2px #0284C7;
      }

    `;
    document.head.appendChild(style);

    // Basic focus trap
    this.dialog.addEventListener("keydown", e => {
      if (e.key === "Tab") {
        const focusable = this.dialog.querySelectorAll("button");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  async show(title ='Confirmation', message = 'Are you sure?') {
    this.dialog.querySelector("#confirmTitle").innerHTML = title;
    this.dialog.querySelector("#confirmMessage").innerHTML = message;
    this.dialog.showModal();

    return new Promise(resolve => {
      this.dialog.addEventListener(
        "close",
        () => resolve(this.dialog.returnValue === "ok"),
        { once: true }
      );
    });
  }
}

// Export singleton
export const confirmDialog = new ConfirmDialog();
