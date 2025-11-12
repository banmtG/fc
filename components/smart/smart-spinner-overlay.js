
// <body id="mybody"> 
//     <div id="my-content" style="position: relative; height: 200px; width: 100%;
//    border: 1px solid #ccc; background-color: gold;">
//      Loading content...
//     </div>
//     <div id="my-content" style="position: relative; height: 100px; width: 50%;
//     border: 1px solid #ccc; background-color: #cfcf;">
//      Another div....
//     </div>

//     <smart-spinner-overlay size="font-size: 50px; --track-width: 10px;" target="#my-content"></smart-spinner-overlay>
//     <smart-spinner-overlay size="font-size: 150px; --track-width: 10px;" color="--indicator-color: deeppink; --track-color: pink;" speed="--speed:10s;" target="#mybody"></smart-spinner-overlay>
//     <smart-spinner-overlay id="my_spinner" size="font-size: 150px; --track-width: 10px;" color="--indicator-color: deeppink; --track-color: pink;" speed="--speed:10s;" target="#mybody"></smart-spinner-overlay>
//     <script>
//         const spinner =document.querySelector('#my_spinner');
//           spinner.target = document.getElementById('mybody');
//     </script>
// </body>
import './smart-notification.js';

class SmartSpinnerOverlay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Internal refs
    this._targetElement = null;
    this._overlay = null;
    this._defaultSize = '';
    this._resizeObserver = null;
  }

  static get observedAttributes() {
    return ['target','size','speed','color'];
  }

  set target(el) {
      if (!(el instanceof HTMLElement)) return;
      this._targetElement = el;
      this._positionOverlay();
      this._observeResize();
  }

  get target() {
    return this._targetElement;
  }

  attributeChangedCallback(name, oldVal, newVal) {
   // console.log(name, newVal);
    if (name === 'target') {
      this._resolveTarget(newVal);
    }
    if (name === 'size') {
      this._resolveCssText([newVal,"",""]);
    }
    if (name === 'color') {
        this._resolveCssText(["",newVal,""]);
    }
    if (name === 'speed') {
        this._resolveCssText(["","",newVal]);
    }
  }

  connectedCallback() {
    this._startTime = performance.now(); // Record load start time

    this._renderOverlay();
    this._size =this.getAttribute('size');
    this._color =this.getAttribute('color');
    this._speed = this.getAttribute('speed');
    this._targetElement = this.getAttribute('target');
    //console.log(this._size,this._color,this._speed);
    //console.log(this._targetElement);
    this._resolveTarget(this._targetElement);
    this._resolveCssText([this._size,this._color,this._speed]);    
  }

  disconnectedCallback() {
    this._cleanup();
  }

  _resolveTarget(selector) {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;

    this._targetElement = el;
    this._positionOverlay();
    this._observeResize();
  }

  _resolveCssText([size='',color='',speed='']) {       
    const spinner = this.shadowRoot.querySelector('sl-spinner');
    //console.log(spinner);
    if (spinner) {
      if (!size) {  // Apply dynamic size to sl-spinner if users dont specify size
        size= `font-size:${this._defaultSize}px; --track-width:${this._defaultSize/10}px;`;
      }
      if (!color) {  // Apply dynamic size to sl-spinner if users dont specify size
        color = ``;
      }
      if (!speed) {  // Apply dynamic size to sl-spinner if users dont specify size
        speed = `--speed:5s`;
      }
      const cssText = `${size} ${color} ${speed}`;
      //console.log(cssText);
      spinner.style.cssText = cssText;
    }
  }

  _renderOverlay() {
    const style = document.createElement('style');
    style.textContent = `
      .overlay {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: none;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.1);
      }    
    `;

    const wrapper = document.createElement('div');
    wrapper.classList.add('overlay');

    // Allow slot customization
    const spinner = document.createElement('sl-spinner');
    wrapper.appendChild(spinner);
    this._overlay = wrapper;
    this.shadowRoot.append(style, wrapper);
  }

  _positionOverlay() {
    if (!this._targetElement || !this._overlay) return;

    const rect = this._targetElement.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    const width = rect.width;
    const height = rect.height;
    this._defaultSize  = Math.floor(Math.min(width, height) / 3); // One-third of smaller dimension
    //console.log(this._defaultSize);

    Object.assign(this._overlay.style, {
      top: `${rect.top + scrollTop}px`,
      left: `${rect.left + scrollLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });   

    this._resolveCssText([this._size,this._color,this._speed]);    
  }

  _observeResize() {
  // ✅ Guard clause: If there's no target element, exit early
  if (!this._targetElement) return;

  // ✅ Create a new ResizeObserver instance
  // This will monitor size changes of the target element
  this._resizeObserver = new ResizeObserver(() => {
    // 🔁 When the target resizes, reposition the overlay to stay aligned
    this._positionOverlay();
  });

  // ✅ Start observing the target element
  // ResizeObserver will now trigger whenever its dimensions change
  this._resizeObserver.observe(this._targetElement);
}

  removeWithOutDuration() {
    this.remove();
  }

  removeWithDuration() {
    //console.log(this._targetElement);
    this._endTime = performance.now(); // Record load start time

    const durationSec = ((this._endTime - this._startTime) / 1000).toFixed(2); // Format duration
    const notifier = document.createElement(`smart-notification`);    
    this._targetElement.append(notifier);    
    notifier.show({
      label: `Loading time: ${durationSec} seconds`,
      icon: 'check',      
      color: '--sl-color-success-600',
      timer: 2000
    });

    setTimeout(() => {
      notifier.remove();
    }, 2000);

    this.remove();
  }

  _cleanup() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    this._targetElement = null;
  }
}

customElements.define('smart-spinner-overlay', SmartSpinnerOverlay);

export const LoadSmartSpinner = {    
    show(target) {
      const spinner = document.createElement('smart-spinner-overlay');  
      spinner.setAttribute('target',target);
      document.body.append(spinner);
    },

    hideWithDuration() {
      document.querySelector('smart-spinner-overlay')?.removeWithDuration();
    },

    hide() {
      document.querySelector('smart-spinner-overlay')?.removeWithOutDuration();
    }
}

//   hideWithDuration() {
//     document.querySelector('loading-icon')?.removeWithDuration();
//   },

//   hide() {
//     document.querySelector('loading-icon')?.removeWithOutDuration();
//   }
// };