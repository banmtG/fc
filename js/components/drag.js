_initDragLogic(handles = [], draggedModal) { // input elements to hold and target element to drag
    // ---------------------------------------------------------------
    // 💡 Drag support (desktop + mobile) Reuseable    
        let isDragging = false;
        let startX = 0, startY = 0;
        let offsetX = 0, offsetY = 0;

        const startDrag = (e) => {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
        e.target.setPointerCapture(e.pointerId);
        e.preventDefault();
        };

        const doDrag = (e) => {
        if (!isDragging) return;
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        draggedModal.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        e.preventDefault();
        };

        const endDrag = () => {
        isDragging = false;
        };

        handles.forEach(handle => {
          handle.addEventListener('pointerdown', startDrag);
        })      

        window.addEventListener('pointermove', doDrag);
        window.addEventListener('pointerup', endDrag);
        
    // 💡 Drag support (desktop + mobile) Reuseable
    // ----------------------------------------------------------------
  }