import { loginLocal, loginWithProvider, loginGuest } from '../services/authService.js';

class LoginForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.options = (this.getAttribute('options') || 'local').split(',');
    this.theme = this.getAttribute('theme') || 'light';
    this.dialogTitle = this.getAttribute('dialog-title') || 'Sign in';
    this.autoClose = this.hasAttribute('auto-close');
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `      
      <style>
        .error { color: red; font-size: 0.9em; }
        .loading { display: flex; align-items: center; gap: 0.5rem; }
      </style>
      <sl-dialog label="${this.dialogTitle}" open>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${this.options.includes('local') ? this.renderLocalLogin() : ''}
          ${this.renderProviderButtons()}
          ${this.options.includes('guest') ? this.renderGuestLogin() : ''}
          ${this.options.includes('signup') ? this.renderSignupToggle() : ''}
          <div id="error" class="error"></div>
        </div>
      </sl-dialog>
    `;

    this.shadowRoot.querySelector('#local-login-btn')?.addEventListener('click', () => this.handleLocalLogin());
    this.shadowRoot.querySelector('#guest-btn')?.addEventListener('click', () => this.emitLogin('guest'));
    this.shadowRoot.querySelector('#signup-toggle')?.addEventListener('click', () => this.toggleSignup());

    this.options.forEach(provider => {
      const btn = this.shadowRoot.querySelector(`#${provider}-btn`);
      if (btn) {
        btn.addEventListener('click', () => this.handleProviderLogin(provider));
      }
    });
  }

 async handleLocalLogin() {
  const username = this.shadowRoot.querySelector('#username').value;
  const password = this.shadowRoot.querySelector('#password').value;
  const errorEl = this.shadowRoot.querySelector('#error');

  if (!username || !password) {
    errorEl.textContent = 'Username and password are required.';
    return;
  }

  this.setLoading(true);
  try {
    const data = await loginLocal(username, password); // call backend
    this.emitLogin('local', data);
  } catch (err) {
    errorEl.textContent = 'Local login failed.';
    console.error(err);
  } finally {
    this.setLoading(false);
  }
}

async handleProviderLogin(provider) {
  this.setLoading(true);
  let handled = false;

  const onFocus = () => {
    if (!handled) {
      handled = true;
      this.setLoading(false);
      this.showError(`User returned without completing ${provider} login.`);
      window.removeEventListener('focus', onFocus);
    }
  };
  window.addEventListener('focus', onFocus);

  try {
    const data = await loginWithProvider(provider); // opens popup
    // console.log(data);
    handled = true;
    window.removeEventListener('focus', onFocus);
    this.emitLogin(provider, data);
  } catch (err) {
    if (!handled) {
      this.showError(`Login with ${provider} failed.`);
      console.error(err);
    }
  } finally {
    this.setLoading(false);
  }
}



  async handleGuestLogin() {
    const data = await loginGuest();
    this.emitLogin('guest', data);
  }

  emitLogin(provider, detail = {}) {
    // console.log(`emit detail`, detail);
    this.dispatchEvent(new CustomEvent('login-success', {
      detail: { provider, ...detail },
      bubbles: true,
      composed: true
    }));

    if (this.autoClose) {
      this.shadowRoot.querySelector('sl-dialog').hide();
    }
  }
  
  setLoading(isLoading) {
    const errorEl = this.shadowRoot.querySelector('#error');
    errorEl.textContent = '';
    if (isLoading) {
      errorEl.innerHTML = `<div class="loading"><sl-spinner></sl-spinner> Authenticating...</div>`;
    } else {
      errorEl.innerHTML = '';
    }
  }

  showError(message) {
    const errorEl = this.shadowRoot.querySelector('#error');
    errorEl.textContent = message;
  }

  toggleSignup() {
    const dialog = this.shadowRoot.querySelector('sl-dialog');
    dialog.label = dialog.label.includes('Sign up') ? this.dialogTitle : 'Sign up';
  }

  renderLocalLogin() {
    return `
      <sl-input id="username" label="Username"></sl-input>
      <sl-input id="password" type="password" label="Password"></sl-input>
      <sl-button id="local-login-btn" variant="primary">Login</sl-button>
    `;
  }

  renderProviderButtons() {
    const icons = {
      google: 'google',
      facebook: 'facebook',
      linkedin: 'linkedin',
      apple: 'apple',
      microsoft: 'windows'
    };

    return this.options
      .filter(opt => !['local', 'guest', 'signup'].includes(opt))
      .map(opt => `
        <sl-button id="${opt}-btn" variant="default" size="medium">
          <sl-icon name="${icons[opt] || 'person'}" slot="prefix"></sl-icon>
          Continue with ${opt.charAt(0).toUpperCase() + opt.slice(1)}
        </sl-button>
      `).join('');
  }

  renderGuestLogin() {
    return `
      <sl-button id="guest-btn" variant="text">Continue as Guest</sl-button>
    `;
  }

  renderSignupToggle() {
    return `
      <sl-button id="signup-toggle" variant="text">Sign up</sl-button>
    `;
  }



}

customElements.define('login-form', LoginForm);