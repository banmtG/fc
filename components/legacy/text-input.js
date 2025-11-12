class TextInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.dialog = this.shadowRoot.querySelector('sl-dialog');
    console.log(this.dialog);
    this.form = this.shadowRoot.querySelector('form');
    this.cancelBtn = this.shadowRoot.querySelector('#cancel-btn');

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const detail = {
        label: this.textArea.label,
        content: this.textArea.value
      };
      this.dialog.hide();
      this.dispatchEvent(new CustomEvent('text-popup-confirmed', {
        detail,
        bubbles: true
      }));
    });

    this.cancelBtn.addEventListener('click', () => {
      this.dialog.hide();
      this.dispatchEvent(new CustomEvent('text-popup-canceled', {
        bubbles: true
      }));
    });
  }

 open(labelText = '', initialValue = '') {
  this.textArea = this.form.querySelector('sl-textarea');
  this.textArea.label = labelText;
  this.textArea.value = initialValue; // Use `.value`, not `.content`

  customElements.whenDefined('sl-dialog').then(() => {
    this.dialog.show();

    // Wait until everything is fully rendered
    this.textArea.updateComplete.then(() => {
      requestAnimationFrame(() => {
        const innerTextarea = this.textArea.shadowRoot?.querySelector('textarea');
        if (innerTextarea) {
          innerTextarea.focus();
        } else {
          console.warn('Could not find inner <textarea>');
        }
      });
    });
  });
}

  render() {
    const style = `
    <style>
        sl-textarea::part(form-control-label) {
            font-weight:bold;
        }    
        sl-textarea::part(base) {
            font-weight:bold;
        }   
    </style>
    `;
    this.shadowRoot.innerHTML = `${style}
      <sl-dialog label="Edit text" class="popup-input" no-header>
        <form style="display: flex; flex-direction: column; gap: 1rem;">      
          <sl-textarea name="content" label="Text"></sl-textarea>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <sl-button type="button" variant="default" id="cancel-btn">Cancel</sl-button>
            <sl-button type="submit" variant="primary">Confirm</sl-button>
          </div>
        </form>
      </sl-dialog>
    `;
  }
}

customElements.define('text-input', TextInput);
