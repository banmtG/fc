class AudioCacher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.button = document.createElement('button');
    this.button.textContent = 'Cache & Play';
    this.shadowRoot.appendChild(this.button);
  }

  connectedCallback() {
    this.button.addEventListener('click', () => this.cacheAndPlay());
  }

  async cacheAndPlay() {
    const url = this.getAttribute('url');
    if (!url) return;

    const cache = await caches.open('audio-cache-v1');
    const response = await fetch(url);
    await cache.put(url, response.clone());

    const audio = new Audio(url);
    audio.play();

    this.dispatchEvent(new CustomEvent('cached-path', {
      detail: { path: url },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('audio-cacher', AudioCacher);
