class ImagePicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.componentCSS = `<link rel="stylesheet" href="./components/fc/image-picker.css" />`;
   
    this.shadowRoot.innerHTML = `${this.componentCSS}
      <div class="container">
        <div class="imagePicker searchTop">
          <sl-input size="small" placeholder="Paste compressed image links..." clearable></sl-input>
          <sl-button size="small">Search</sl-button>
        </div>
        <div class="thumbnailGrid"></div>
        <div class="overlay hidden">
          <span class="close-btn">✖</span>
          <img class="overlay-img" src="" />
        </div>
      </div>
    `;

    this._btn = this.shadowRoot.querySelector(".searchTop sl-button");
    this._searchInput = this.shadowRoot.querySelector(".searchTop sl-input");
    this._grid = this.shadowRoot.querySelector(".thumbnailGrid");
    this._overlay = this.shadowRoot.querySelector(".overlay");
    this._overlayImg = this.shadowRoot.querySelector(".overlay-img");
    this._closeBtn = this.shadowRoot.querySelector(".close-btn");
  }

  connectedCallback() {
  this._btn.addEventListener("click", () => {
    const raw = this._searchInput.value || "";
     // Remove surrounding brackets if present
    const cleaned = raw.trim().replace(/^\[|\]$/g, "");
    const compressedLinks = cleaned
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, "")) // remove quotes
      .filter(Boolean);
    this.renderThumbnails(compressedLinks);
  });

  // ✖ Close overlay when X is clicked
  this._closeBtn.addEventListener("click", () => {
    this._overlay.classList.add("hidden");
    this._overlayImg.src = ""; // 🔧 Clear image instantly
  });

  // 🔒 Listen for Escape key to close preview
  this.shadowRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      this._overlay.classList.add("hidden");
      this._overlayImg.src = "";
    }
  });

  // Ensure the shadow root is focusable for keyboard events
  this.shadowRoot.querySelector(".container").tabIndex = 0;
}

renderThumbnails(compressedArray) {
  this._grid.innerHTML = "";

  compressedArray.forEach((compressed, index) => {
    const img = document.createElement("img");
    img.src = reverseTransform(compressed);
    img.className = "thumbnail";
    img.dataset.index = index;

    img.addEventListener("click", () => {
      this._grid.querySelectorAll(".thumbnail").forEach((el) =>
        el.classList.remove("selected")
      );
      img.classList.add("selected");

      // 🔧 Clear old image before assigning new one
      this._overlayImg.src = "";
      this._overlay.classList.remove("hidden");
      setTimeout(() => {
        this._overlayImg.src = img.src.replace("w=400&c=7&r=0&o=5&pid=1.7", "");
      }, 10); // 💡 Optional slight delay for smoother UX
    });

    this._grid.appendChild(img);
  });
}

  disconnectedCallback() {
    this._btn?.removeEventListener("click", this._onSearch);
    this._closeBtn?.removeEventListener("click", this._onClose);
  }
}

// Register the custom element so it can be used in HTML as <image-picker>
customElements.define("image-picker", ImagePicker);

function reverseTransform(shortCode) {
  const [style, payload] = shortCode.split(":"); // Split into style and identifier

  // Match expected pattern: e.g., "tse1_OIP.abc123"
  const match = payload.match(/^(tse\d+)_([A-Z]{3})\.([A-Za-z0-9%._\-]+)/);
  if (!match) throw new Error("Invalid short code format");

  const tse = match[1];   // tse server identifier
  const type = match[2];  // typically OIP or OIF
  const id = match[3];    // encoded image ID

  // URL suffix with common image rendering parameters
  const suffix = "w=400&c=7&r=0&o=5&pid=1.7";

  // Return different base URLs depending on the style type
  if (style === "p") {
    return `https://${tse}.mm.bing.net/th/id/${type}.${id}?${suffix}`;
  } else if (style === "q") {
    return `https://${tse}.mm.bing.net/th?id=${type}.${id}&${suffix}`;
  } else {
    throw new Error("Unknown style type in short code"); // Error handling
  }
}
