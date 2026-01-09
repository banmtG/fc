/**
 * ScrollIndicator
 * ----------------
 * A dockable custom scrollbar overlay component.
 * Features:
 * - Works with hidden native scrollbars.
 * - Dockable: place as sibling to your scrollable element inside a wrapper.
 * - Auto-hide after inactivity.
 * - Drag thumb to scroll.
 * - Click track to jump.
 * - Supports vertical (y) and horizontal (x) directions.
 *   - Set attribute: <scroll-indicator direction="x" ...>
 *   - Or auto-detect based on scrollable dimensions.
 */
class ScrollIndicator extends HTMLElement {
  constructor() {
    super();
    this._target = null;       // the scrollable element we track
    this._header = null;       // optional header sibling (for vertical offset)
    this._onScroll = this._onScroll.bind(this);

    this._dragging = false;    // drag state
    this._dragStartPos = 0;    // initial mouse position (x or y)
    this._scrollStart = 0;     // initial scroll offset
    this._hideTimer = null;    // auto-hide timer

    // Shadow DOM for encapsulated styles
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          pointer-events: none; /* let thumb/track handle events */
          opacity: 0;
          transition: opacity 1.3s;
        }
        :host(.visible) {
          opacity: 1;
        }
        .track {
          position: relative;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.1);
          border-radius: 0px;
          pointer-events: auto; /* allow clicks */
        }
        .thumb {
          position: absolute;
          top: 0;
          left: 0;
          background: rgba(25,118,210,0.8);
          border-radius: 2px;
          cursor: grab;
          pointer-events: auto;
          transition: all 0.1s;
        }
        .thumb.dragging {
          cursor: grabbing;
        }
      </style>
      <div class="track"><div class="thumb"></div></div>
    `;
    this._track = this.shadowRoot.querySelector(".track");
    this._thumb = this.shadowRoot.querySelector(".thumb");
  }

  connectedCallback() {
    const sel = this.getAttribute("for");
    if (!sel) return;
    const root = this.getRootNode();
    const t = root.querySelector(sel) || document.querySelector(sel);
    if (!t) {
      console.warn(`ScrollIndicator: target not found: ${sel}`);
      return;
    }
    this._target = t;
    this._header = this._target.parentElement.querySelector(".header");

    // Listen for scroll events
    this._target.addEventListener("scroll", this._onScroll, { passive: true });
    // Dragging
    this._thumb.addEventListener("pointerdown", e => this._startDrag(e));
    // Track click
    this._track.addEventListener("click", e => this._onTrackClick(e));

    this._updateDockPosition();
    this._onScroll();
  }

  disconnectedCallback() {
    if (this._target) {
      this._target.removeEventListener("scroll", this._onScroll);
      this._target = null;
    }
    this._thumb.removeEventListener("pointerdown", this._startDrag);
    this._track.removeEventListener("click", this._onTrackClick);
    document.removeEventListener("pointermove", this._onDrag);
    document.removeEventListener("pointerup", this._endDrag);
  }

  /**
   * Docking logic: position indicator relative to wrapper and header.
   */
  _updateDockPosition() {
  if (!this._target) return;
  const dir = this._getDirection();

  if (dir === "y") {
    // Check for optional offset-header attribute
    const offsetSel = this.getAttribute("offset-header");
    let headerHeight = 0;
    if (offsetSel) {
      const headerEl = this._target.parentElement.querySelector(offsetSel);
      if (headerEl) headerHeight = headerEl.offsetHeight;
    }
    this.style.top = headerHeight + "px";
    this.style.right = "0px";
    this.style.width = "6px";
    this.style.height = this._target.clientHeight + "px";
  } else {
    this.style.left = "0px";
    this.style.bottom = "0px";
    this.style.height = "6px";
    this.style.width = this._target.clientWidth + "px";
  }
}


  /**
   * Show indicator and schedule auto-hide.
   */
  _show() {
    this.classList.add("visible");
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      if (!this._dragging) this.classList.remove("visible");
    }, 2000); // auto-hide after 3s
  }

  /**
   * Scroll handler: update thumb size and position.
   */
  _onScroll() {
    if (!this._target) return;
    this._updateDockPosition();
    this._show();

    const dir = this._getDirection();

    if (dir === "y") {
      const { scrollTop, scrollHeight, clientHeight } = this._target;
      const visibleRatio = clientHeight / scrollHeight;
      const minThumb = 30;
      const thumbSize = Math.max(clientHeight * visibleRatio, minThumb);

      const maxScroll = scrollHeight - clientHeight;
      const ratio = scrollTop / (maxScroll || 1);
      const available = clientHeight - thumbSize;
      const pos = available * ratio;

      this._thumb.style.height = `${thumbSize}px`;
      this._thumb.style.width = `100%`;
      this._thumb.style.transform = `translateY(${pos}px)`;

      this._thumbSize = thumbSize;
      this._available = available;
      this._maxScroll = maxScroll;
    } else {
      const { scrollLeft, scrollWidth, clientWidth } = this._target;
      const visibleRatio = clientWidth / scrollWidth;
      const minThumb = 30;
      const thumbSize = Math.max(clientWidth * visibleRatio, minThumb);

      const maxScroll = scrollWidth - clientWidth;
      const ratio = scrollLeft / (maxScroll || 1);
      const available = clientWidth - thumbSize;
      const pos = available * ratio;

      this._thumb.style.width = `${thumbSize}px`;
      this._thumb.style.height = `100%`;
      this._thumb.style.transform = `translateX(${pos}px)`;

      this._thumbSize = thumbSize;
      this._available = available;
      this._maxScroll = maxScroll;
    }
  }

  /**
   * Drag start: record initial mouse and scroll positions.
   */
  _startDrag(e) {
    e.preventDefault();
    const dir = this._getDirection();
    this._dragging = true;
    this._dragStartPos = dir === "y" ? e.clientY : e.clientX;
    this._scrollStart = dir === "y" ? this._target.scrollTop : this._target.scrollLeft;
    this._thumb.classList.add("dragging");
    this._show();

    this._onDrag = this._drag.bind(this);
    this._endDrag = this._stopDrag.bind(this);

    document.addEventListener("pointermove", this._onDrag);
    document.addEventListener("pointerup", this._endDrag);
  }

  /**
   * Drag move: translate mouse delta into scroll offset.
   */
  _drag(e) {
    if (!this._dragging) return;
    const dir = this._getDirection();
    const delta = dir === "y" ? (e.clientY - this._dragStartPos) : (e.clientX - this._dragStartPos);
    const scrollDelta = (delta / this._available) * this._maxScroll;
    if (dir === "y") {
      this._target.scrollTop = this._scrollStart + scrollDelta;
    } else {
      this._target.scrollLeft = this._scrollStart + scrollDelta;
    }
  }

  /**
   * Drag end: cleanup.
   */
  _stopDrag() {
    this._dragging = false;
    this._thumb.classList.remove("dragging");
    document.removeEventListener("pointermove", this._onDrag);
    document.removeEventListener("pointerup", this._endDrag);
    this._show(); // restart hide timer
  }

  /**
   * Track click: jump thumb to clicked position.
   */
  _onTrackClick(e) {
    if (e.target === this._thumb) return;
    const dir = this._getDirection();
    const rect = this._track.getBoundingClientRect();
    const clickPos = dir === "y" ? (e.clientY - rect.top) : (e.clientX - rect.left);
    const thumbCenter = this._thumbSize / 2;
    const targetPos = clickPos - thumbCenter;
    const ratio = targetPos / this._available;
    const newScroll = ratio * this._maxScroll;
    if (dir === "y") {
      this._target.scrollTop = newScroll;
    } else {
      this._target.scrollLeft = newScroll;
    }
    this._show();
  }

  /**
   * Direction detection: use attribute or auto-detect.
   * - If user sets <scroll-indicator direction="x"> or "y", we respect that.
   * - Otherwise, we auto-detect based on scrollable dimensions.
   */
  _getDirection() {
    const attr = this.getAttribute("direction");
    if (attr === "x" || attr === "y") return attr;
    if (!this._target) return "y"; // default fallback

    // Auto-detect: if vertical scrollable, use y; if horizontal, use x.
    if (this._target.scrollHeight > this._target.clientHeight) return "y";
    if (this._target.scrollWidth > this._target.clientWidth) return "x";
    return "y";
  }
}

customElements.define("scroll-indicator", ScrollIndicator);
