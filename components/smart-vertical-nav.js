class PhraseNavBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.nodes = [];
    this.nodeMap = new Map();
    this.selectedKey = null;
    this.highlightedKey = null;
    this.history = [];
    this.future = [];
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  static get observedAttributes() {
    return ['layout'];
  }

  attributeChangedCallback(name, _, value) {
    if (name === 'layout') this.renderChange();
  }

  connectedCallback() {
    this.setAttribute('tabindex', '0'); // Make it focusable
    this.addEventListener('keydown', this.handleKeyDown);
    this.renderInit();
  }

  disconnectedCallback() {
    this.shadowRoot.innerHTML = '';
    this.nodeMap.clear();
    this.removeEventListener('keydown', this.handleKeyDown);
  }

  setData(rawNodes) {
    this.nodes = rawNodes.map(this.normalizeNode);
    this.nodeMap.clear();
    this.nodes.forEach(node => this.indexNode(node));
    this.renderInit();
  }

  normalizeNode = (node) => ({
    key: node.key,
    phrase: node.phrase,
    callback: node.callback ?? (() => Promise.resolve()),
    className: node.className ?? '',
    autoOpen: node.autoOpen ?? false,
    children: (node.children ?? []).map(this.normalizeNode)
  });

  indexNode(node) {
    this.nodeMap.set(node.key, node);
    node.children.forEach(child => this.indexNode(child));
  }

  async selectKey(key) {
    const node = this.nodeMap.get(key);
    if (!node || key === this.selectedKey) return;

    this.emit('select-start', { key });

    try {
      const result = await node.callback();
      this.history.push(this.selectedKey);
      this.future = [];
      this.selectedKey = key;
      this.highlightedKey = key;
      this.emit('select-success', { key, result });
    } catch (error) {
      this.emit('select-fail', { key, error });
      console.error(`selectKey failed for ${key}`, error);
    }
    this.renderChange();
  }

  undo() {
    if (!this.history.length) return;
    this.future.push(this.selectedKey);
    this.selectedKey = this.history.pop();
    this.emit('undo', { key: this.selectedKey });
    this.renderChange();
  }

  redo() {
    if (!this.future.length) return;
    this.history.push(this.selectedKey);
    this.selectedKey = this.future.pop();
    this.emit('redo', { key: this.selectedKey });
    this.renderChange();
  }

  clear() {
    this.selectedKey = null;
    this.highlightedKey = null;
    this.history = [];
    this.future = [];
    this.emit('clear');
    this.renderChange();
  }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  renderInit() {
    const layout = this.getAttribute('layout') ?? 'vertical';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; }
        .node {
          display: ${layout === 'horizontal' ? 'inline-block' : 'block'};
          margin: ${layout === 'horizontal' ? '0 8px' : '4px 0'};
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
        }
        .selected { background-color: #ddd; }
        .highlighted { outline: 2px solid dodgerblue; }
      </style>
    `;
    const wrapper = document.createElement('div');
    this.shadowRoot.appendChild(wrapper);
    wrapper.append(...this.renderNodes(this.nodes));
  }

  renderChange() {
    [...this.shadowRoot.querySelectorAll('.node')].forEach(el => {
      const key = el.dataset.key;
      el.classList.toggle('selected', key === this.selectedKey);
      el.classList.toggle('highlighted', key === this.highlightedKey);
    });
  }

  renderNodes(nodes, level = 0) {
    return nodes.map(node => {
      const el = document.createElement('div');
      el.classList.add('node');
      if (node.className) el.classList.add(node.className);
      el.dataset.key = node.key;
      el.innerHTML = node.phrase;
      el.style.marginLeft = `${level * 10}px`;
      el.onclick = () => this.selectKey(node.key);

      const children = node.autoOpen
        ? this.renderNodes(node.children, level + 1)
        : [];

      return [el, ...children];
    }).flat();
  }

  handleKeyDown(e) {
    const flatKeys = [...this.nodeMap.keys()];
    console.log(flatKeys);
    const idx = flatKeys.indexOf(this.highlightedKey ?? this.selectedKey ?? flatKeys[0]);
    let next = idx;

    if (e.ctrlKey && e.key.toLowerCase() === 'z') return this.undo();
    if (e.ctrlKey && e.key.toLowerCase() === 'y') return this.redo();

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (idx + 1) % flatKeys.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (idx - 1 + flatKeys.length) % flatKeys.length;

    if (e.key === ' ' || e.key === 'Enter') this.selectKey(flatKeys[idx]);
    else {
      this.highlightedKey = flatKeys[next];
      this.renderChange();
    }

    e.preventDefault();
  }
}

customElements.define('phrase-nav-bar', PhraseNavBar);
