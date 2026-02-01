export function getMatrix(container, config) {
  const viewType = config.view;
  const items = Array.from(container.querySelectorAll('.draggable'));
  const matrix = [];

  if (!items.length) return matrix;

  const styles = getComputedStyle(container);

  if (viewType === "icon") {
    // Grid layout: flex-direction row, wrapping horizontally
    const itemRect = items[0].getBoundingClientRect();
    const itemWidth = itemRect.width;
    const containerWidth = container.clientWidth; // excludes scrollbar
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const colGap = parseFloat(styles.columnGap) || 0;

    const usableWidth = containerWidth - paddingLeft - paddingRight;
    const columns = Math.max(
      1,
      Math.floor((usableWidth + colGap) / (itemWidth + colGap))
    );

    items.forEach((item, i) => {
      const row = Math.floor(i / columns);
      const col = i % columns;
      if (!matrix[row]) matrix[row] = [];
      matrix[row][col] = item;
    });

  } else if (viewType === "list") {
  // Multi-column vertical wrap: flex-direction column, wrapping horizontally
  const itemRect = items[0].getBoundingClientRect();
  const itemHeight = itemRect.height;
  const containerHeight = container.clientHeight; // excludes scrollbar
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;
  const rowGap = parseFloat(styles.rowGap) || 0;

  const usableHeight = containerHeight - paddingTop - paddingBottom;

  // How many items fit vertically in one column
  const rowsPerColumn = Math.max(
    1,
    Math.floor((usableHeight + rowGap) / (itemHeight + rowGap))
  );

  items.forEach((item, i) => {
    const col = Math.floor(i / rowsPerColumn);
    const row = i % rowsPerColumn;
    if (!matrix[row]) matrix[row] = [];
    matrix[row][col] = item;
  });
}  else if (viewType === "detail") {
    // Simple vertical list: one column
    items.forEach((item, i) => {
      matrix[i] = [item];
    });
  }
  // console.log(matrix);
  return matrix;
}


export function _handleKeydown(component, e) {
  
  // Ctrl + A (or Cmd + A on macOS)
  const externalEventKeys = ["Delete", " ", "Enter","Escape"]; 
  if (externalEventKeys.includes(e.key)) { 
      // console.log(e.key);
      component.dispatchEvent(new CustomEvent("smart-dragdrop-externalEventKeys-pressed", {
        detail: e.key,
        bubbles: true,
        composed: true
      }));
    return;   
  }// exit for any other key

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
    e.preventDefault(); // prevent browser "select all"    
    component._activeContainer.querySelectorAll(".draggable").forEach(item => {
       item.classList.add("selected");
    });  
    return;
  }

  // // Delete key
  // if (e.key === "Delete") {
  //   e.preventDefault();
  //   console.log(`Delete press`);
  //   component.dispatchEvent(new CustomEvent("smart-dragdrop-items-delete-request", {
  //     detail: null,
  //     bubbles: true,
  //     composed: true
  //   }));
  //   return;
  // }

  // // Enter key
  // if (e.key === "Shift") {
  //   e.preventDefault();
  //   // this._handleToggleUse(); // your custom function
  //   return;
  // }

  const arrowKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]; 
  if (!arrowKeys.includes(e.key)) { return; }// exit for any other key
  e.preventDefault();

  const activeContainer = component._activeContainer;
  if (!activeContainer) return;

  const viewType = activeContainer.dataset.view;
  component._matrix = getMatrix(activeContainer, { view: viewType });
  if (!component._matrix.length) return;

  const items = component._matrix.flat();

  if (component._highlightIndex == null) {
    component._highlightIndex = 0;
    items[0].classList.add('highlight');
    return;
  }

  // Find current row/col
  let currentRow, currentCol;
  component._matrix.forEach((row, r) => {
    row.forEach((item, c) => {
      if (item === items[component._highlightIndex]) {
        currentRow = r;
        currentCol = c;
      }
    });
  });

  let newRow = currentRow;
  let newCol = currentCol;

  switch (e.key) {
    case "ArrowUp":
      if (viewType === "detail") {
        newRow = Math.max(0, currentRow - 1);
      } else if (viewType === "icon") {
        if (currentRow > 0) {
          newRow = currentRow - 1;
          newCol = Math.min(currentCol, component._matrix[newRow].length - 1);
        }
      } else if (viewType === "list") {
        if (currentRow > 0) {
          newRow = currentRow - 1;
        } else if (currentCol > 0) {
          // wrap to previous column’s last row
          newCol = currentCol - 1;
          newRow = component._matrix.length - 1;
          if (!component._matrix[newRow][newCol]) {
            // clamp upward until valid
            while (newRow > 0 && !component._matrix[newRow][newCol]) {
              newRow--;
            }
          }
        }
      }
      break;

    case "ArrowDown":
      if (viewType === "detail") {
        newRow = Math.min(component._matrix.length - 1, currentRow + 1);
      } else if (viewType === "icon") {
        if (currentRow < component._matrix.length - 1) {
          newRow = currentRow + 1;
          newCol = Math.min(currentCol, component._matrix[newRow].length - 1);
        }
      } else if (viewType === "list") {
          // console.log(currentCol);
          // console.log(currentRow);       
          if (currentRow < component._matrix.length - 1 &&
              component._matrix[currentRow + 1][currentCol]) {
            // normal down within column
            newRow = currentRow + 1;
          } else if (currentCol < component._matrix[0].length - 1) {
            // wrap to next column, clamp to deepest valid row
            newCol = currentCol + 1;
            let candidateRow = 0;
            // if same row not valid, walk upward until valid
            while (candidateRow >= 0 && !component._matrix[candidateRow][newCol]) {
              candidateRow--;
            }
            newRow = candidateRow >= 0 ? candidateRow : 0;
          }
        }
      break;

    case "ArrowLeft":
      if (viewType === "icon") {
        if (currentCol > 0) {
          newCol = currentCol - 1;
        } else if (currentRow > 0) {
          newRow = currentRow - 1;
          newCol = component._matrix[newRow].length - 1;
        }
      } else if (viewType === "list") {
        if (currentCol > 0) {
          newCol = currentCol - 1;
          if (!component._matrix[newRow][newCol]) {
            // clamp upward until valid
            while (newRow > 0 && !component._matrix[newRow][newCol]) {
              newRow--;
            }
          }
        }
      }
      break;

    case "ArrowRight":
      if (viewType === "icon") {
        if (currentCol < component._matrix[currentRow].length - 1) {
          newCol = currentCol + 1;
        } else if (currentRow < component._matrix.length - 1) {
          newRow = currentRow + 1;
          newCol = 0;
        }
      } else if (viewType === "list") {
          if (currentCol < component._matrix[0].length - 1) {
            newCol = currentCol + 1;
            // try same row
            if (!component._matrix[newRow][newCol]) {
              // clamp upward until valid
              let candidateRow = newRow;
              while (candidateRow >= 0 && !component._matrix[candidateRow][newCol]) {
                candidateRow--;
              }
              newRow = candidateRow >= 0 ? candidateRow : 0;
            }
          }
        }
      break;
  }

  const newItem = component._matrix[newRow]?.[newCol];
  if (!newItem) return;

  // Update highlight
  items[component._highlightIndex].classList.remove('highlight');
  newItem.classList.add('highlight');
  newItem.scrollIntoView({ block: "nearest", inline: "nearest" });
  component._highlightIndex = items.findIndex(el => el.classList.contains('highlight'));
}


