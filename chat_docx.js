// ============================================
// DOCX MODULE - chat_docx.js (DEBUG VERSION)
// ============================================

function isDOCXFile(filename) {
  return filename.toLowerCase().endsWith('.docx');
}

function isDOCFile(filename) {
  return filename.toLowerCase().endsWith('.doc');
}

async function extractDOCXText(file) {
  console.log('[DOCX Debug] extractDOCXText called with:', typeof file, file);

  if (!file) {
    throw new Error('Файл не передан (null/undefined)');
  }

  if (!(file instanceof Blob)) {
    console.error('[DOCX Debug] File is not Blob:', file);
    throw new Error('Неверный тип: ожидается Blob/File, получено ' + typeof file);
  }

  if (typeof mammoth === 'undefined') {
    throw new Error('mammoth.js не загружен');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function(event) {
      try {
        const arrayBuffer = event.target.result;
        console.log('[DOCX Debug] File read, size:', arrayBuffer.byteLength);

        const textResult = await mammoth.extractRawText({ arrayBuffer });
        console.log('[DOCX Debug] mammoth extracted text length:', textResult.value.length);

        resolve({
          text: textResult.value,
          warnings: textResult.messages || [],
          filename: file.name
        });

      } catch (error) {
        console.error('[DOCX Debug] mammoth error:', error);
        reject(error);
      }
    };

    reader.onerror = (e) => {
      console.error('[DOCX Debug] FileReader error:', e);
      reject(new Error('Ошибка чтения файла'));
    };

    reader.readAsArrayBuffer(file);
  });
}

async function processDOCXFile(fileObj) {
  console.log('[DOCX Debug] processDOCXFile called:', fileObj);

  // Пытаемся получить оригинальный файл разными способами
  let originalFile = null;

  if (fileObj.file instanceof Blob) {
    originalFile = fileObj.file;
    console.log('[DOCX Debug] Found file in fileObj.file');
  } else if (fileObj instanceof Blob) {
    originalFile = fileObj;
    console.log('[DOCX Debug] fileObj itself is Blob');
  } else if (fileObj.originalFile instanceof Blob) {
    originalFile = fileObj.originalFile;
    console.log('[DOCX Debug] Found file in fileObj.originalFile');
  }

  if (!originalFile) {
    console.error('[DOCX Debug] Cannot find Blob in:', fileObj);
    return {
      type: 'text',
      data: `[📄 ${fileObj.name || 'файл'} — ошибка: файл не найден в объекте]`,
      name: (fileObj.name || 'файл') + '.error.txt'
    };
  }

  const indicatorId = addDOCXIndicator(fileObj.name);

  try {
    const result = await extractDOCXText(originalFile);
    removeDOCXIndicator(indicatorId);

    let formattedContent = `[📄 ${fileObj.name} — содержимое DOCX]\n`;
    formattedContent += `—`.repeat(40) + `\n\n`;
    formattedContent += result.text;

    return {
      type: 'text',
      data: formattedContent,
      name: fileObj.name + '.txt'
    };

  } catch (error) {
    removeDOCXIndicator(indicatorId);
    console.error('[DOCX Debug] Error:', error);

    return {
      type: 'text',
      data: `[📄 ${fileObj.name} — ошибка: ${error.message}]`,
      name: fileObj.name + '.error.txt'
    };
  }
}

async function processDOCFile(fileObj) {
  return {
    type: 'text',
    data: `[📄 ${fileObj.name} — устаревший формат .doc. Сохраните как .docx]`,
    name: fileObj.name + '.txt'
  };
}

function addDOCXIndicator(filename) {
  const id = 'docx-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'thinking docx-indicator';
  el.innerHTML = `📄 Читаю DOCX: «${filename}»...`;
  el.style.cssText = 'background: rgba(46, 125, 50, 0.1); border-left: 3px solid #2e7d32;';

  const container = document.getElementById('chatContainer');
  if (container) {
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
  return id;
}

function removeDOCXIndicator(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }
}

window.isDOCXFile = isDOCXFile;
window.isDOCFile = isDOCFile;
window.processDOCXFile = processDOCXFile;
window.processDOCFile = processDOCFile;
