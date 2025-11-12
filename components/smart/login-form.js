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

  handleLocalLogin() {
    const username = this.shadowRoot.querySelector('#username').value;
    const password = this.shadowRoot.querySelector('#password').value;
    const errorEl = this.shadowRoot.querySelector('#error');

    if (!username || !password) {
      errorEl.textContent = 'Username and password are required.';
      return;
    }

    this.setLoading(true);
    setTimeout(() => {
      this.emitLogin('local', { username, password });
      this.setLoading(false);
    }, 1000); // simulate async
  }

//   handleProviderLogin(provider) {
//     this.setLoading(true);
//     // this.handleProviderLogin(provider);
//     // setTimeout(() => {
//     //   this.emitLogin(provider, { token: null }); // token can be handled externally
//     //   this.setLoading(false);
//     // }, 1000);
//   }

  emitLogin(provider, detail = {}) {
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

  async handleProviderLogin(provider) {
    this.setLoading(true);
    try {
        const token = await this.startOAuthFlow(provider); // real login logic
        this.emitLogin(provider, { token });
    } catch (err) {
        //this.showError(`Login with ${provider} failed.`);
        console.error(err);
    } finally {
        this.setLoading(false);
    }
    }


startOAuthFlow(provider) {
  return new Promise((resolve, reject) => {
    const popup = window.open(this.getOAuthUrl(provider), '_blank', 'width=500,height=600');

    const messageHandler = (event) => {
      if (event.data === 'google-login-success') {
        window.removeEventListener('message', messageHandler);
        popup.close();

        // ✅ Background session check
        fetch('https://php.adapps.download/api/session-check.php', {
            method: 'GET',
            credentials: 'include' // 🔑 This is essential
        })
          .then(res => res.json())
          .then(data => {
            if (data.loggedIn) {
              this.emitLogin(provider, {
                email: data.email,
                userId: data.userId
              });
              resolve(data);
            } else {
              reject('Session check failed');
            }
          })
          .catch(err => reject(err));
      }
    };

    window.addEventListener('message', messageHandler);
  });
}




    getOAuthUrl(provider) {
        const clientId = '842799415320-ujd4fodvctbgrc6jdfkb596opkiva859.apps.googleusercontent.com';
        const redirectUri = 'https://php.adapps.download/api/login.php';
        const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';
        const state = crypto.randomUUID(); // optional but recommended

        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&state=${state}`;
    }


}

customElements.define('login-form', LoginForm);