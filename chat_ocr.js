// ============================================
// OCR MODULE - chat_ocr.js (CDN Edition)
// ============================================

let ocrWorker = null;
let isOCRReady = false;
let ocrInitPromise = null;

// ============ ИНИЦИАЛИЗАЦИЯ ============

async function initOCR() {
  if (ocrInitPromise) return ocrInitPromise;
  if (isOCRReady && ocrWorker) return true;

  ocrInitPromise = (async () => {
    console.log('[OCR] Initializing...');

    if (typeof Tesseract === 'undefined') {
      console.error('[OCR] Tesseract.js not loaded!');
      return false;
    }

    try {
      console.log('[OCR] Creating worker...');

      ocrWorker = await Tesseract.createWorker('rus+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            updateOCRProgress(m.progress);
          }
        }
      });

      isOCRReady = true;
      console.log('[OCR] ✅ Ready!');
      return true;

    } catch (error) {
      console.error('[OCR] ❌ Init failed:', error);
      isOCRReady = false;
      ocrWorker = null;
      return false;
    } finally {
      ocrInitPromise = null;
    }
  })();

  return ocrInitPromise;
}

// ============ РАСПОЗНАВАНИЕ ============

/**
 * Распознает текст с изображения
 * @param {string} imageData - base64 изображение (с или без data:image префикса)
 * @param {string} filename - имя для отображения
 * @returns {Promise<string>} - распознанный текст
 */
async function recognizeImage(imageData, filename) {
  const ready = await initOCR();
  if (!ready || !ocrWorker) {
    return `[📷 ${filename} — OCR не доступен]`;
  }

  // Проверяем и добавляем префикс если нужно
  let base64Data = imageData;
  if (!base64Data.startsWith('data:image')) {
    base64Data = 'data:image/jpeg;base64,' + base64Data;
  }

  const indicatorId = addOCRIndicator(filename);

  try {
    console.log('[OCR] Processing:', filename);
    const startTime = Date.now();

    const result = await ocrWorker.recognize(base64Data);

    const duration = Date.now() - startTime;
    const text = result.data.text ? result.data.text.trim() : '';
    const confidence = result.data.confidence || 0;

    console.log(`[OCR] ✅ Done: ${duration}ms, confidence: ${confidence.toFixed(1)}%`);

    removeOCRIndicator(indicatorId);

    if (!text) {
      return `[📷 ${filename} — текст не найден]`;
    }

    let output = `[📷 ${filename} — OCR распознавание]\n`;
    output += `Точность: ${confidence.toFixed(1)}%\n`;
    output += `—`.repeat(30) + `\n`;
    output += text;

    return output;

  } catch (error) {
    console.error('[OCR] Error:', error);
    removeOCRIndicator(indicatorId);
    return `[📷 ${filename} — ошибка: ${error.message}]`;
  }
}

// ============ UI ИНДИКАТОРЫ ============

let currentIndicatorId = null;

function addOCRIndicator(filename) {
  const id = 'ocr-' + Date.now();
  currentIndicatorId = id;

  const el = document.createElement('div');
  el.id = id;
  el.className = 'thinking ocr-indicator';
  el.innerHTML = `🔍 OCR: «${filename}» <span class="ocr-progress"></span>`;

  const container = document.getElementById('chatContainer');
  if (container) {
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
  return id;
}

function updateOCRProgress(progress) {
  if (!currentIndicatorId) return;
  const el = document.getElementById(currentIndicatorId);
  if (el) {
    const span = el.querySelector('.ocr-progress');
    if (span) span.textContent = Math.round(progress * 100) + '%';
  }
}

function removeOCRIndicator(id) {
  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }
  }
  if (currentIndicatorId === id) currentIndicatorId = null;
}

// Экспорт
window.initOCR = initOCR;
window.recognizeImage = recognizeImage;
