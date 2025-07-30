function updateViewportHeight() {
    const root = document.documentElement;
    root.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  }
  
  window.addEventListener('resize', updateViewportHeight);
  window.addEventListener('orientationchange', updateViewportHeight);
  
  // Initial call
  updateViewportHeight();

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${window.visualViewport.height}px`
      );
    });
}

