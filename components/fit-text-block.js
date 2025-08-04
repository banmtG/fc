class FitTextBlock extends HTMLElement {
  static get observedAttributes() {
    return ['text', 'font-size', 'font-family', 'line-height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wrapper = document.createElement('div');
    this.shadowRoot.append(this.wrapper);
    this.resizeObserver = null;
  }

  connectedCallback() {
    this.wrapper.style.display = 'flex';
    this.wrapper.style.alignItems = 'center';
    this.wrapper.style.justifyContent = 'center';
    this.wrapper.style.textAlign = 'center';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';

    this.updateStyles();
    this.observeResize();
  }

  attributeChangedCallback() {
    this.updateStyles();
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  updateStyles() {
    const text = this.getAttribute('text') || '';
    const fontFamily = this.getAttribute('font-family') || 'sans-serif';
    const lineHeight = parseFloat(this.getAttribute('line-height')) || 1.2;

    // Get font size in rem and convert to px
    const fontSizeRem = parseFloat(this.getAttribute('font-size')) || 1.5; // Default: 1.5rem
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let fontSizePx = fontSizeRem * rootFontSize;

    this.wrapper.innerHTML = `<span style="white-space: pre-wrap; word-break: break-word;">${text}</span>`;
    const span = this.wrapper.querySelector('span');
    span.style.fontFamily = fontFamily;
    span.style.lineHeight = lineHeight;

    this.adjustFontSize(span, fontSizePx);
  }

  adjustFontSize(span, startingPx) {
    const container = this.wrapper.getBoundingClientRect();
    const maxWidth = container.width;
    const maxHeight = container.height;

    let fontSize = startingPx;
    span.style.fontSize = `${fontSize}px`;

    while (span.scrollWidth > maxWidth || span.scrollHeight > maxHeight) {
      fontSize -= 1;
      if (fontSize <= 5) break;
      span.style.fontSize = `${fontSize}px`;
    }
  }

  observeResize() {
    this.resizeObserver = new ResizeObserver(() => this.updateStyles());
    this.resizeObserver.observe(this);
  }
}

customElements.define('fit-text-block', FitTextBlock);
