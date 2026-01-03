// spinner.js
export const Spinner = {
  init() {
    let container = document.querySelector("#global-spinner-container");
    if (!container) {
      // Container
      container = document.createElement("div");
      container.id = "global-spinner-container";
      container.style.position = "fixed";
      container.style.top = "50%";
      container.style.left = "50%";
      container.style.transform = "translate(-50%, -50%)";
      container.style.zIndex = "9999";
      container.style.display = "none";

      // White background wrapper sized to spinner
      const bgWrapper = document.createElement("div");
      bgWrapper.id = "spinner-bg-wrapper";
      bgWrapper.style.backgroundColor = "#fff";
      bgWrapper.style.borderRadius = "50%";
      bgWrapper.style.position = "relative";
      bgWrapper.style.display = "inline-flex";
      bgWrapper.style.alignItems = "center";
      bgWrapper.style.justifyContent = "center";

      // Spinner
      const spinner = document.createElement("sl-spinner");
      spinner.id = "global-spinner";
      spinner.style.fontSize = "10vw"; // base size
      bgWrapper.style.width = spinner.style.fontSize;
      bgWrapper.style.height = spinner.style.fontSize;
      bgWrapper.appendChild(spinner);

      // Counter text
      const counter = document.createElement("div");
      counter.id = "spinner-counter";
      counter.style.position = "absolute";
      counter.style.top = "50%";
      counter.style.left = "50%";
      counter.style.transform = "translate(-50%, -50%)";
      counter.style.fontSize = "2rem";
      counter.style.color = "var(--sl-color-primary-600)";
      counter.style.textShadow = "0 0 10px var(--sl-color-primary-600)";
      bgWrapper.appendChild(counter);

      container.appendChild(bgWrapper);
      document.body.appendChild(container);
    }
    return container;
  },

  show() {
    const container = this.init();
    container.style.display = "block";

    let seconds = 0;
    const counter = container.querySelector("#spinner-counter");
    const spinner = container.querySelector("#global-spinner");
    const bgWrapper = container.querySelector("#spinner-bg-wrapper");
    counter.textContent = seconds;

    // Interval update
    this.interval = setInterval(() => {
      seconds++;
      counter.textContent = seconds;

      // If number goes beyond 99, enlarge spinner circle + wrapper
      if (seconds > 99) {
        spinner.style.fontSize = "12vw";
        bgWrapper.style.width = spinner.style.fontSize;
        bgWrapper.style.height = spinner.style.fontSize;
      }
    }, 1000);
  },

  hide() {
  const container = this.init();
  const counter   = container.querySelector("#spinner-counter");
  const spinner   = container.querySelector("#global-spinner");
  const bgWrapper = container.querySelector("#spinner-bg-wrapper");

  // Stop interval
  if (this.interval) {
    clearInterval(this.interval);
    this.interval = null;
  }

  // Animate fade out + font size increase for counter
  counter.style.transition = "all 1s ease";
  counter.style.opacity    = "0";
  counter.style.fontSize   = "6rem"; // triple original size

  // Animate background expansion + fade out
  bgWrapper.style.transition = "all 1s ease";
  bgWrapper.style.transform  = "scale(1.5)"; // expand 1.5x
  bgWrapper.style.opacity    = "0";

  setTimeout(() => {
    container.style.display = "none";
    // Reset styles
    counter.style.opacity   = "1";
    counter.style.fontSize  = "2rem";
    spinner.style.fontSize  = "10vw";
    bgWrapper.style.transform = "scale(1)";
    bgWrapper.style.opacity   = "1";
    bgWrapper.style.width     = spinner.style.fontSize;
    bgWrapper.style.height    = spinner.style.fontSize;
  }, 1000);
}

};
