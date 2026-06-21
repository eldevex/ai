// ============================================
// CUSTOM SWIPE HANDLING MODULE - chat_swipe.js
// ============================================

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isInputFocused = false;
let mouseIsDown = false;
let mouseStartX = 0;
let mouseStartY = 0;

function initCustomSwipe() {
  const menu = document.getElementById("menu");
  const messageInput = document.getElementById("messageInput");
  
  // Полностью отключаем встроенный свайп Onsen UI
  if (menu) {
    menu.removeAttribute("swipeable");
    
    if (typeof menu.setSwipeable === 'function') {
      menu.setSwipeable(false);
    }
    
    menu._swipe = null;
    menu._onDrag = null;
    menu._onDragEnd = null;
    menu._onDragStart = null;
    
    if (menu._boundHandleTouchStart) {
      menu.removeEventListener('touchstart', menu._boundHandleTouchStart);
      menu.removeEventListener('mousedown', menu._boundHandleTouchStart);
    }
  }
  
  // Добавляем свои обработчики на document
  document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true, capture: true });
  document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true, capture: true });
  
  // Для мыши (десктоп/эмулятор)
  document.addEventListener('mousedown', handleGlobalMouseDown, { passive: true, capture: true });
  document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false, capture: true });
  document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true, capture: true });
  
  // Отслеживаем фокус поля ввода
  if (messageInput) {
    messageInput.addEventListener('focus', function() {
      isInputFocused = true;
    });
    messageInput.addEventListener('blur', function() {
      isInputFocused = false;
    });
  }
}

function isPointInInputArea(x, y) {
  const inputArea = document.getElementById("inputArea");
  const messageInput = document.getElementById("messageInput");
  
  if (!inputArea || !messageInput) return false;
  
  const rect = inputArea.getBoundingClientRect();
  const inputRect = messageInput.getBoundingClientRect();
  
  return (
    x >= inputRect.left &&
    x <= inputRect.right &&
    y >= inputRect.top &&
    y <= inputRect.bottom
  );
}

function handleGlobalTouchStart(e) {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}

function handleGlobalTouchMove(e) {
  if (e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  const currentX = touch.clientX;
  const currentY = touch.clientY;
  
  const diffX = currentX - touchStartX;
  const diffY = currentY - touchStartY;
  
  if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
    const wasInInput = isPointInInputArea(touchStartX, touchStartY);
    const isInInput = isPointInInputArea(currentX, currentY);
    
    if (wasInInput || isInInput) {
      return;
    }
    
    if (touchStartX < 50 && diffX > 30) {
      e.preventDefault();
      e.stopPropagation();
      
      const menu = document.getElementById("menu");
      if (menu && !menu.isOpen) {
        if (diffX > 50) {
          menu.open();
        }
      }
    }
  }
}

function handleGlobalTouchEnd(e) {
  touchStartX = 0;
  touchStartY = 0;
  touchStartTime = 0;
}

function handleGlobalMouseDown(e) {
  mouseIsDown = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
}

function handleGlobalMouseMove(e) {
  if (!mouseIsDown) return;
  
  const diffX = e.clientX - mouseStartX;
  const diffY = e.clientY - mouseStartY;
  
  if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
    const wasInInput = isPointInInputArea(mouseStartX, mouseStartY);
    const isInInput = isPointInInputArea(e.clientX, e.clientY);
    
    if (wasInInput || isInInput) {
      return;
    }
    
    if (mouseStartX < 50 && diffX > 50) {
      e.preventDefault();
      e.stopPropagation();
      
      const menu = document.getElementById("menu");
      if (menu && !menu.isOpen) {
        menu.open();
        mouseIsDown = false;
      }
    }
  }
}

function handleGlobalMouseUp(e) {
  mouseIsDown = false;
  mouseStartX = 0;
  mouseStartY = 0;
}
