export function _autoSetRangeValue(component) {

  component.columns.forEach(config => {
    if (!config._rangeChanged) {
      const container = component.shadowRoot.getElementById(`${config.id}-container`);
      const aDraggable = container.querySelector('.draggable');
      if (!aDraggable) return;
      const styles = getComputedStyle(container);
      // console.log(styles.border);
      const style_aDraggable = getComputedStyle(aDraggable);
      const borderRightWidth = parseFloat(style_aDraggable.borderRightWidth) || 0; 
      const borderLeftWidth = parseFloat(style_aDraggable.borderLeftWidth) || 0;
      // console.log(style_aDraggable.border);
      const containerWidth = container.clientWidth; // excludes scrollbar
      // console.log(containerWidth);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      // console.log(paddingLeft);
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      // console.log(paddingRight);
      const colGap = parseFloat(styles.columnGap) || 0;
      // console.log(colGap);
      const usableWidth = containerWidth - paddingLeft - paddingRight;
      // console.log(usableWidth);
      let columns;
      if (containerWidth<=300) { 
        columns = 1;
      } else if (containerWidth<=600) {
        columns = 2;
      } else if (containerWidth<=900) {
        columns = 3;
      } else if (containerWidth<=1200) {
        columns = 4;
      }
      // console.log(columns);
      const itemWidth = (usableWidth/ columns) - colGap - borderRightWidth - borderLeftWidth;
      // console.log(itemWidth);
      container.style.setProperty("--icon-size", `${itemWidth}px`);
      const range = container.parentElement.querySelector("sl-range"); 
      const rangeValue = (itemWidth - 50) / 2;
      range.value = rangeValue;
      // console.log(range);
    }
  });
  
}