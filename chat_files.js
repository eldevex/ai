// ============================================
// FILE HANDLING MODULE - chat_files.js
// ============================================

// Проверка Word файлов
function isDOCXFile(filename) {
  return filename.toLowerCase().endsWith('.docx');
}

function isDOCFile(filename) {
  return filename.toLowerCase().endsWith('.doc');
}

function isTextFile(filename) {
  const exts = ["txt","md","json","js","html","css","py","java","cpp","c","h","xml","yaml","yml","csv","log","sql","sh","bat"];
  return exts.indexOf(filename.split(".").pop().toLowerCase()) !== -1;
}

function isArchiveFile(filename) {
  const exts = ["zip","rar","7z","tar","gz","bz2"];
  return exts.indexOf(filename.split(".").pop().toLowerCase()) !== -1;
}

function isPDFFile(filename) {
  return filename.split(".").pop().toLowerCase() === "pdf";
}

async function processArchiveWithJSZip(arrayBuffer, fileName) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const files = Object.keys(zip.files);
  
  let content = "АРХИВ: " + fileName + "\n";
  content += "Файлов: " + files.length + "\n";
  content += "=".repeat(50) + "\n\n";
  
  files.slice(0, 150).forEach(function(p) {
    const f = zip.files[p];
    content += p + (f.dir ? "/" : "") + "\n";
  });
  if (files.length > 150) content += "\n... +" + (files.length-150) + " файлов\n";
  
  content += "\n" + "=".repeat(50) + "\nКЛЮЧЕВЫЕ ФАЙЛЫ:\n";
  
  const patterns = [/readme/i,/package\.json/i,/\.md$/i,/main\./i,/index\./i,/config/i,/\.py$/i,/\.js$/i,/\.java$/i];
  let read = 0;
  
  for (let i = 0; i < files.length && read < 10; i++) {
    const p = files[i], f = zip.files[p];
    if (f.dir || f._data.uncompressedSize > 50*1024) continue;
    
    let matchesPattern = false;
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(p)) {
        matchesPattern = true;
        break;
      }
    }
    if (!matchesPattern && read > 3) continue;
    
    try {
      const text = await f.async("string");
      if (text && text.trim()) {
        content += "\n--- " + p + " ---\n";
        content += text.length > 5000 ? text.substring(0,5000)+"\n...[обрезано]" : text;
        content += "\n";
        read++;
      }
    } catch(e){}
  }
  
  return {
    type: "archive",
    data: content,
    name: fileName + " [распаковано]"
  };
}

// ============ PDF PROCESSING ============

async function processPDFWithPDFJS(arrayBuffer, fileName) {
  try {
    // Проверяем доступность PDF.js
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js library not loaded");
    }
    
    // Загружаем PDF документ
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    // Ограничиваем количество страниц (максимум 10 для мультимодальных моделей)
    const pagesToProcess = Math.min(numPages, 10);
    
    const pageImages = [];
    
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Устанавливаем масштаб для хорошего качества (150 DPI эквивалент)
      const scale = 2.0;
      const viewport = page.getViewport({ scale: scale });
      
      // Создаём canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Рендерим страницу на canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Конвертируем canvas в base64 JPEG с хорошим качеством
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      const base64Data = imageData.split(',')[1];
      
      pageImages.push({
        page: pageNum,
        data: base64Data,
        width: canvas.width,
        height: canvas.height
      });
      
      // Освобождаем ресурсы страницы
      page.cleanup();
    }
    
    // Формируем текстовое описание PDF
    let textContent = `PDF: ${fileName}\n`;
    textContent += `Страниц: ${numPages} (обработано: ${pagesToProcess})\n`;
    textContent += "=".repeat(50) + "\n\n";
    
    // Пытаемся извлечь текст из первых страниц
    try {
      for (let i = 1; i <= Math.min(3, numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent_obj = await page.getTextContent();
        const pageText = textContent_obj.items.map(item => item.str).join(' ');
        
        if (pageText.trim()) {
          textContent += `--- Страница ${i} (текст) ---\n`;
          textContent += pageText.substring(0, 2000) + (pageText.length > 2000 ? "\n...[обрезано]" : "") + "\n\n";
        }
        
        page.cleanup();
      }
    } catch (textError) {
      console.warn("Could not extract text from PDF:", textError);
    }
    
    return {
      type: "pdf",
      images: pageImages,
      text: textContent,
      name: fileName,
      totalPages: numPages,
      processedPages: pagesToProcess
    };
    
  } catch (error) {
    console.error("PDF processing error:", error);
    return {
      type: "text",
      data: `[Ошибка обработки PDF: ${error.message}. Файл: ${fileName}]`,
      name: fileName
    };
  }
}

function handleImageSelect(input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  
  let processedCount = 0;
  let errorCount = 0;
  
  files.forEach(function(file) {
    if (file.size > 10*1024*1024) {
      errorCount++;
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      pendingFiles.push({
        type: "image",
        data: dataUrl.split(",")[1],
        name: file.name
      });
      
      processedCount++;
      if (processedCount + errorCount === files.length) {
        renderAttachments();
        if (typeof android !== "undefined" && android.toast) {
          android.toast.show("Добавлено изображений: " + processedCount);
        }
      }
    };
    reader.onerror = function() {
      errorCount++;
    };
    reader.readAsDataURL(file);
  });
  
  input.value = "";
}

async function handleFileSelect(input) {
  const files = Array.from(input.files);
  if (files.length === 0) return;
  
  const processedFiles = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const fileObj = await processSingleFile(files[i]);
      if (fileObj) {
        processedFiles.push(fileObj);
      }
    } catch (err) {
      console.error("Error processing file:", files[i].name, err);
    }
  }
  
  if (processedFiles.length > 0) {
    pendingFiles = pendingFiles.concat(processedFiles);
    renderAttachments();
    if (typeof android !== "undefined" && android.toast) {
      android.toast.show("Добавлено файлов: " + processedFiles.length);
    }
  }
  
  input.value = "";
}

async function processSingleFile(file) {
  // Обработка DOCX файлов (читаем сразу)
  if (isDOCXFile(file.name)) {
    if (typeof mammoth !== 'undefined') {
      try {
        console.log('[Files] Читаю DOCX:', file.name);
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer });

        let content = `[📄 ${file.name} — содержимое DOCX]\n`;
        content += `—`.repeat(40) + `\n\n`;
        content += result.value;

        if (result.messages && result.messages.length > 0) {
          content += `\n\n⚠️ Предупреждения: ${result.messages.length}`;
        }

        return {
          type: "text",
          data: content,
          name: file.name + '.txt'
        };
      } catch (err) {
        console.error('[Files] Ошибка DOCX:', err);
        return {
          type: "text",
          data: `[📄 ${file.name} — ошибка чтения: ${err.message}]`,
          name: file.name + '.error.txt'
        };
      }
    } else {
      return {
        type: "text",
        data: `[📄 ${file.name} — mammoth.js не загружен]`,
        name: file.name + '.txt'
      };
    }
  }

  // Обработка DOC файлов (старый формат)
  if (isDOCFile(file.name)) {
    return {
      type: "text",
      data: `[📄 ${file.name} — устаревший формат .doc]\n\n` +
            `Сохраните файл как .docx (Microsoft Word → Сохранить как → Документ Word)`,
      name: file.name + '.txt'
    };
  }

  // Обработка PDF файлов
  if (isPDFFile(file.name)) {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      return await processPDFWithPDFJS(arrayBuffer, file.name);
    } catch(err) {
      return {
        type: "text",
        data: "[Ошибка обработки PDF: " + err.message + "]",
        name: file.name
      };
    }
  }
  
  if (isArchiveFile(file.name)) {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      return await processArchiveWithJSZip(arrayBuffer, file.name);
    } catch(err) {
      return {
        type: "text",
        data: "[Ошибка распаковки архива: " + err.message + "]",
        name: file.name
      };
    }
  }
  
  const maxSize = isTextFile(file.name) ? 5*1024*1024 : 1024*1024;
  if (file.size > maxSize) {
    return null;
  }
  
  if (isTextFile(file.name)) {
    const text = await readFileAsText(file);
    return {
      type: "text",
      data: text,
      name: file.name
    };
  } else {
    const dataUrl = await readFileAsDataURL(file);
    return {
      type: "file",
      data: dataUrl.split(",")[1],
      name: file.name
    };
  }
}

function readFileAsText(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function(e) { reject(e); };
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function(e) { reject(e); };
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function(e) { reject(e); };
    reader.readAsArrayBuffer(file);
  });
}

function renderAttachments() {
  const container = document.getElementById("pendingAttachments");
  const previewContainer = document.getElementById("imagePreviews");
  const countEl = document.getElementById("attachmentCount");
  
  if (!container) return;
  
  if (countEl) countEl.textContent = pendingFiles.length;
  
  let html = "";
  let previewsHtml = "";
  
  pendingFiles.forEach(function(file, index) {
    const icons = { image: "🖼️", text: "📄", file: "📎", archive: "🗜️", pdf: "📕" };
    const icon = icons[file.type] || "📎";
    
    let extraInfo = "";
    if (file.type === "pdf" && file.totalPages) {
      extraInfo = ` (${file.processedPages}/${file.totalPages} стр.)`;
    }
    
    html += 
      '<div class="file-attachment-item">' +
        '<span>' + icon + ' ' + file.name + extraInfo + '</span>' +
        '<span class="remove-file" onclick="removeAttachment(' + index + ')">' +
          '<ons-icon icon="md-close"></ons-icon>' +
        '</span>' +
      '</div>';
    
    if (file.type === "image") {
      previewsHtml += '<img class="image-preview-multi" src="data:image/jpeg;base64,' + file.data + '" style="max-width:100px;max-height:100px;border-radius:8px;margin:5px;">';
    } else if (file.type === "pdf" && file.images && file.images.length > 0) {
      // Показываем превью первой страницы PDF
      previewsHtml += '<div style="position:relative;display:inline-block;margin:5px;">' +
        '<img class="image-preview-multi" src="data:image/jpeg;base64,' + file.images[0].data + '" style="max-width:100px;max-height:100px;border-radius:8px;border:2px solid #e74c3c;">' +
        '<span style="position:absolute;bottom:4px;right:4px;background:#e74c3c;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">PDF</span>' +
        '</div>';
    }
  });
  
  container.innerHTML = html;
  if (previewContainer) previewContainer.innerHTML = previewsHtml;
  
  const attachContainer = document.getElementById("pendingAttachmentsContainer");
  if (attachContainer) {
    attachContainer.style.display = pendingFiles.length > 0 ? "block" : "none";
  }
}

function removeAttachment(index) {
  pendingFiles.splice(index, 1);
  renderAttachments();
}

function clearAttachments() {
  pendingFiles = [];
  renderAttachments();
}

function showAttachMenu() {
  const sheet = document.getElementById("attachSheet");
  if (sheet) sheet.show();
}

function hideAttachMenu() {
  const sheet = document.getElementById("attachSheet");
  if (sheet) sheet.hide();
}

function selectImage() {
  hideAttachMenu();
  const input = document.getElementById("imageInput");
  if (input) input.click();
}

function selectAnyFile() {
  hideAttachMenu();
  const input = document.getElementById("fileInput");
  if (input) input.click();
}
