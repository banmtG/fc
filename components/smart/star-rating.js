class StarRating extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.value = 0;
    this.rowId = null;
  }

  connectedCallback() {
    if (this.hasAttribute("rating")) {
      this.value = Number(this.getAttribute("rating"));
    }
    if (this.hasAttribute("row-id")) {
      this.rowId = this.getAttribute("row-id");
    }
    this.render();
  }

  set rating(val) {
    this.value = Number(val);
    this.render();
  }
  get rating() { return this.value; }

  set id(val) { this.rowId = String(val); }
  get id() { return this.rowId; }

  render() {
    this.shadowRoot.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = i <= this.value ? "★" : "☆";
      star.dataset.value = i;

      star.addEventListener("click", () => {
        this.value = i;
        this.dispatchEvent(new CustomEvent("interactive-component-changed", {
          detail: { id: this.rowId, field: "rating", value: i },
          bubbles: true,
          composed: true
        }));
        this.render();
      });

      this.shadowRoot.appendChild(star);
    }
  }
}

customElements.define("star-rating", StarRating);
