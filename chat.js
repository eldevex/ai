// ============================================
// MAIN CHAT MODULE - chat.js
// ============================================

// Глобальные переменные (используются всеми модулями)
let currentChatId = null;
let chatHistory = [];
let pendingFiles = [];
let renameChatId = null;
let currentAbortController = null; // Для отмены запроса
let currentStreamingMessageId = null; // ID текущего стримящегося сообщения

// ============ INITIALIZATION ============
window.onload = function() {
  initTheme();
  initCustomSwipe();
  initSearchProvider();
  initResearchMode();
  loadCurrentModel();
  renderModelsList();
  renderChatHistoryList();
  initSystemPrompt(); // <-- Эта строка уже должна быть
  
  const lastChatId = localStorage.getItem("last-active-chat");
  if (lastChatId) {
    loadChatSession(lastChatId);
  } else {
    createNewChat();
  }
};


// ============ CHAT RENDERING ============
// Открыть страницу настроек
function openSettings() {
  location.href = "settings.html";
}

function renderChat() {
  const container = document.getElementById("chatContainer");
  if (!container) return;
  
  if (chatHistory.length === 0) {
    container.innerHTML = 
      '<div class="empty-state">' +
        '<p>Начните диалог...</p>' +
        '<p style="font-size:13px;margin-top:8px;">Отправьте сообщение или прикрепите файл</p>' +
      '</div>';
    return;
  }
  
  container.innerHTML = "";
  
  chatHistory.forEach(function(msg) {
    const div = createMessageElement(msg);
    container.appendChild(div);
  });
  
  container.scrollTop = container.scrollHeight;
}

function createMessageElement(msg) {
  const div = document.createElement("div");
  div.className = "message " + msg.role + "-message";
  div.id = "msg-" + msg.time;
  
  const time = new Date(msg.time).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  
  const copyBtn = '<button class="copy-msg-btn" onclick="copyMessageContent(this)" title="Копировать">📋</button>';
  const formattedContent = formatMessage(msg.content);
  
  div.innerHTML = '<div class="msg-content">' + formattedContent + '</div><div class="time-stamp"><span>' + time + '</span>' + copyBtn + '</div>';
  return div;
}

function addMessage(content, role) {
  const message = {
    role: role,
    content: content,
    time: Date.now()
  };
  
  chatHistory.push(message);
  saveCurrentChat();
  renderChatHistoryList();
  
  const container = document.getElementById("chatContainer");
  if (!container) return message;
  
  const div = createMessageElement(message);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  return message;
}

function updateStreamingMessage(content) {
  const container = document.getElementById("chatContainer");
  if (!container) return;
  
  let msgDiv = document.getElementById("msg-" + currentStreamingMessageId);
  
  if (!msgDiv) {
    // Создаём новое сообщение если его ещё нет
    const message = {
      role: "assistant",
      content: content,
      time: currentStreamingMessageId
    };
    
    msgDiv = createMessageElement(message);
    msgDiv.id = "msg-" + currentStreamingMessageId;
    container.appendChild(msgDiv);
  } else {
    // Обновляем существующее
    const msgContent = msgDiv.querySelector('.msg-content');
    if (msgContent) {
      msgContent.innerHTML = formatMessage(content);
    }
  }
  
  container.scrollTop = container.scrollHeight;
}

function finalizeStreamingMessage(finalContent) {
  const msgDiv = document.getElementById("msg-" + currentStreamingMessageId);
  if (msgDiv) {
    const msgContent = msgDiv.querySelector('.msg-content');
    if (msgContent) {
      msgContent.innerHTML = formatMessage(finalContent);
    }
  }
  
  // Обновляем в истории — ищем по времени создания
  const msgIndex = chatHistory.findIndex(m => m.time === currentStreamingMessageId);
  if (msgIndex !== -1) {
    chatHistory[msgIndex].content = finalContent;
  } else {
    // Если не нашли, добавляем как новое сообщение
    chatHistory.push({
      role: "assistant",
      content: finalContent,
      time: currentStreamingMessageId
    });
  }
  
  saveCurrentChat();
  renderChatHistoryList();
  
  currentStreamingMessageId = null;
}


function formatMessage(text) {
  // Сохраняем кодовые блоки отдельно
  const codeBlocks = [];
  let codeIndex = 0;
  
  let processedText = text.replace(/```([\s\S]*?)```/g, function(match, codeContent) {
    const placeholder = `{{CODE_BLOCK_${codeIndex}}}`;
    codeBlocks.push({
      placeholder: placeholder,
      code: codeContent
    });
    codeIndex++;
    return placeholder;
  });
  
  // Обрабатываем markdown ссылки [text](url) ДО экранирования HTML
  // Используем временные placeholder'ы без спецсимволов
  const links = [];
  let linkIndex = 0;
  
  processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, linkText, url) {
    const placeholder = `{{LINK_${linkIndex}}}`;
    links.push({
      placeholder: placeholder,
      url: url,
      text: linkText
    });
    linkIndex++;
    return placeholder;
  });
  
  // Экранируем HTML
  processedText = processedText
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Восстанавливаем ссылки
  links.forEach(function(link) {
    const safeUrl = link.url.replace(/"/g, '&quot;');
    const safeText = link.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
    processedText = processedText.replace(link.placeholder, linkHtml);
  });
  
  // Остальное форматирование
  processedText = processedText
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
  
  // Восстанавливаем кодовые блоки
  codeBlocks.forEach(function(block) {
    const escapedCode = block.code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    
    const html = '<pre data-original-code="' + escapedCode + '"><button class="copy-code-btn" onclick="copyCodeBlock(this)">📋 Копировать</button><code>' + 
      block.code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>") +
      '</code></pre>';
    
    processedText = processedText.replace(block.placeholder, html);
  });
  
  return processedText;
}


// ============ COPY FUNCTIONALITY ============

function copyToClipboard(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showCopyToast(label || "Скопировано!");
    }).catch(function() {
      fallbackCopy(text, label);
    });
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showCopyToast(label || "Скопировано!");
  } catch(e) {
    if (typeof android !== "undefined" && android.toast) {
      android.toast.show("Ошибка копирования");
    }
  }
  document.body.removeChild(ta);
}

function showCopyToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast-copy";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(function(){toast.remove()}, 2000);
}

function copyMessageContent(btn) {
  const msgDiv = btn.closest('.message');
  if (!msgDiv) return;
  
  const contentDiv = msgDiv.querySelector('.msg-content');
  if (!contentDiv) return;
  
  // Получаем HTML и конвертируем в текст с сохранением переносов
  let html = contentDiv.innerHTML;
  
  // Восстанавливаем переносы строк из HTML
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<pre[^>]*data-original-code="([^"]*)"[^>]*>[\s\S]*?<\/pre>/gi, function(match, code) {
      // Восстанавливаем код из data-атрибута
      return '\n```\n' + code
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&') + '\n```\n';
    })
    .replace(/<code[^>]*>([^<]*)<\/code>/gi, '$1')
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Убираем лишние переносы в конце
  text = text.replace(/\n+$/, '');
  
  copyToClipboard(text, "Сообщение скопировано!");
}

function copyCodeBlock(btn) {
  const pre = btn.closest('pre');
  if (!pre) return;
  
  let text = pre.getAttribute('data-original-code');
  
  if (!text) {
    const code = pre.querySelector('code');
    if (code) {
      text = code.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    }
  }
  
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  
  const originalHTML = btn.innerHTML;
  btn.innerHTML = "✓ Скопировано";
  btn.classList.add("copied");
  
  copyToClipboard(text, "Код скопирован!");
  
  setTimeout(function() {
    btn.innerHTML = originalHTML;
    btn.classList.remove("copied");
  }, 2000);
}

// ============ MESSAGE SENDING ============

async function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input) return;
  
  const text = input.value.trim();
  
  if (!text && pendingFiles.length === 0) return;

  // ===== OCR ОБРАБОТКА ДЛЯ НЕ-VISION МОДЕЛЕЙ =====
  // Распознаем текст с изображений, PDF и файлов для не-vision моделей
  const currentModel = localStorage.getItem("selected-model") || "";
  const isVisionModel = VISION_MODELS && VISION_MODELS.has(currentModel);
  let ocrAttachments = []; // OCR результаты

  if (!isVisionModel && pendingFiles.length > 0 && typeof initOCR === "function") {
    console.log("🔍 OCR: Проверяю файлы для распознавания...");

    // Инициализируем OCR один раз
    await initOCR();

    // Обрабатываем все файлы
    for (const file of pendingFiles) {
      try {
        // 1. Обычные изображения (type: "image")
        if (file.type === "image") {
          console.log("🔍 OCR: Изображение", file.name);
          const base64Data = "data:image/jpeg;base64," + file.data;
          const ocrResult = await recognizeImage(base64Data, file.name);

          if (ocrResult && !ocrResult.includes("не найден текст")) {
            ocrAttachments.push({
              type: "text",
              data: ocrResult,
              name: "OCR_" + file.name + ".txt"
            });
          }
        }

        // 2. PDF файлы (type: "pdf") - OCR для каждой страницы
        else if (file.type === "pdf" && file.images && file.images.length > 0) {
          console.log("🔍 OCR: PDF", file.name, "-", file.images.length, "страниц");

          let pdfOcrText = `[📄 ${file.name} — OCR распознавание PDF]\n`;
          pdfOcrText += `Страниц: ${file.totalPages}, обработано: ${file.processedPages}\n`;
          pdfOcrText += `—`.repeat(40) + `\n\n`;

          for (let i = 0; i < file.images.length; i++) {
            const page = file.images[i];
            try {
              const base64Data = "data:image/jpeg;base64," + page.data;
              const pageResult = await recognizeImage(base64Data, `${file.name} (стр.${page.page})`);

              // Извлекаем чистый текст
              const textMatch = pageResult.match(/—{30}\n([\s\S]+)$/);
              const cleanText = textMatch ? textMatch[1] : pageResult;

              if (cleanText && !cleanText.includes("текст не найден")) {
                pdfOcrText += `--- Страница ${page.page} ---\n${cleanText}\n\n`;
              }
            } catch (e) {
              pdfOcrText += `--- Страница ${page.page} ---\n[Ошибка OCR]\n\n`;
            }
          }

          ocrAttachments.push({
            type: "text",
            data: pdfOcrText,
            name: "OCR_" + file.name + ".txt"
          });
        }

        // 3. DOCX файлы (type: "docx") - читаем через mammoth.js
        else if ((file.type === "docx" || isDOCXFile(file.name)) && typeof processDOCXFile === "function") {
          console.log("📄 DOCX: Обрабатываю", file.name);
          const docxResult = await processDOCXFile(file);
          if (docxResult) {
            ocrAttachments.push(docxResult);
            console.log("✅ DOCX обработан:", file.name);
          }
        }

        // 4. DOC файлы (старый формат) - предупреждение
        else if ((file.type === "doc" || isDOCFile(file.name)) && typeof processDOCFile === "function") {
          console.log("📄 DOC: Старый формат", file.name);
          const docResult = await processDOCFile(file);
          if (docResult) {
            ocrAttachments.push(docResult);
          }
        }

        // 5. Архивы (type: "archive") - уже распакованы в текст
        // Но если в архиве были изображения, они не извлекаются автоматически
        // Оставляем текущее поведение (только текстовое содержимое)

      } catch (err) {
        console.error("❌ OCR ошибка:", file.name, err);
      }
    }

    console.log("✅ OCR завершен, результатов:", ocrAttachments.length);
  }
  // ================================================
  
  let displayContent = text;
  let fileInfos = [];
  
  // PDF показываем как изображения, без упоминания PDF
  pendingFiles.forEach(function(file) {
    const icons = { image: "🖼️", text: "📄", file: "📎", archive: "🗜️", pdf: "🖼️" };
    // Для PDF используем ту же иконку что и для изображений
    const icon = file.type === "pdf" ? "🖼️" : (icons[file.type] || "📎");
    fileInfos.push("[" + icon + " " + file.name + "]");
  });
  
  if (fileInfos.length > 0) {
    displayContent = text ? text + "\n" + fileInfos.join("\n") : fileInfos.join("\n");
  }
  
  // Если включен веб-поиск, добавляем результаты поиска
  let searchResults = "";
  if (isSearchEnabled && text) {
    const searchIndicator = addSearchIndicator();
    try {
      searchResults = await performWebSearch(text);
      removeSearchIndicator(searchIndicator);
    } catch (error) {
      removeSearchIndicator(searchIndicator);
      ons.notification.toast("Ошибка поиска: " + error.message, { timeout: 3000 });
    }
  }
  
  addMessage(displayContent, "user");
  input.value = "";
  
  if (chatHistory.length === 1) {
    generateChatTitle(text);
  }
  
  // Добавляем OCR результаты к файлам
  const allFiles = pendingFiles.concat(ocrAttachments);
  sendToAPI(text, allFiles, searchResults);
  clearAttachments();
}

async function sendToAPI(text, files, searchContext) {
  const model = localStorage.getItem("selected-model");
  const apiKey = localStorage.getItem("ollama-api-key");
  const host = localStorage.getItem("ollama-host") || "https://api.ollama.com";
  
  // Создаём AbortController для возможности отмены
  currentAbortController = new AbortController();
  
  // Показываем кнопку стоп
  showStopButton();
  
  // Создаём ID для стримящегося сообщения
  currentStreamingMessageId = Date.now();
  
  try {
    let messageContent = text || "";
    let images = [];
    let textAttachments = [];
    
    // Добавляем контекст поиска если есть
    if (searchContext) {
      messageContent = "[Контекст поиска:\n" + searchContext + "\n\nВопрос пользователя: " + messageContent + "]";
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      switch(file.type) {
        case "image":
          if (VISION_MODELS.has(model)) {
            images.push(file.data);
          } else {
            messageContent += "\n\n[Изображение: " + file.name + "]";
          }
          break;
        case "pdf":
          // PDF отправляем как изображения, без текста в сообщении
          if (VISION_MODELS.has(model) && file.images && file.images.length > 0) {
            // Добавляем все страницы PDF как обычные изображения
            file.images.forEach(function(pageImg) {
              images.push(pageImg.data);
            });
            // НЕ добавляем текстовое описание PDF в сообщение
          } else {
            // Для не-vision моделей - только имя файла без содержимого
            messageContent += "\n\n[Изображение: " + file.name + "]";
          }
          break;
        case "text":
          textAttachments.push("--- " + file.name + " ---\n" + file.data);
          break;
        case "file":
          messageContent += "\n\n[Файл: " + file.name + "]\n" + file.data.substring(0, 50000);
          break;
        case "archive":
          textAttachments.push(file.data);
          break;
      }
    }
    
    if (textAttachments.length > 0) {
      messageContent += "\n\n" + textAttachments.join("\n\n");
    }
    
    // В функции sendToAPI, замените этот блок:

// СТАРЫЙ КОД (закомментируйте или удалите):
// const messages = chatHistory
//   .filter(function(m) { return m.role === "user" || m.role === "assistant"; })
//   .slice(-6)
//   .map(function(m) { return { role: m.role, content: m.content }; });

// НОВЫЙ КОД:
const historyMessages = chatHistory
  .filter(function(m) { return m.role === "user" || m.role === "assistant"; })
  .slice(-6)
  .map(function(m) { return { role: m.role, content: m.content }; });

const messages = buildMessagesWithSystemPrompt(historyMessages);

    messages.push({
      role: "user", 
      content: messageContent, 
      images: images.length ? images : undefined
    });
    
    const response = await fetch(host + "/api/chat", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true // Включаем стриминг
      }),
      signal: currentAbortController.signal
    });
    
    if (!response.ok) throw new Error("HTTP " + response.status);
    
    // Обрабатываем стрим
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          const data = JSON.parse(line);
          if (data.message && data.message.content) {
            fullResponse += data.message.content;
            updateStreamingMessage(fullResponse);
          }
          
          // Проверяем, не отменили ли запрос
          if (currentAbortController.signal.aborted) {
            throw new Error("Aborted");
          }
        } catch (e) {
          // Игнорируем ошибки парсинга отдельных строк
          if (e.message === "Aborted") throw e;
        }
      }
    }
    
    // Финализируем сообщение
    finalizeStreamingMessage(fullResponse);
    
  } catch(err) {
    if (err.name === 'AbortError' || err.message === "Aborted") {
      // Пользователь отменил - добавляем сообщение о прерывании если есть частичный ответ
      const msgDiv = document.getElementById("msg-" + currentStreamingMessageId);
      if (msgDiv) {
        const msgContent = msgDiv.querySelector('.msg-content');
        if (msgContent && msgContent.textContent) {
          finalizeStreamingMessage(msgContent.textContent + "\n\n[Ответ прерван пользователем]");
        } else {
          msgDiv.remove();
          // Удаляем из истории если пустое
          chatHistory = chatHistory.filter(m => m.time !== currentStreamingMessageId);
        }
      }
      ons.notification.toast("Ответ остановлен", { timeout: 2000 });
    } else {
      removeThinking(null); // Удаляем индикатор если есть
      // Удаляем пустое сообщение если есть
      const msgDiv = document.getElementById("msg-" + currentStreamingMessageId);
      if (msgDiv) msgDiv.remove();
      chatHistory = chatHistory.filter(m => m.time !== currentStreamingMessageId);
      
      addMessage("Ошибка: " + err.message, "assistant");
    }
  } finally {
    currentAbortController = null;
    
    hideStopButton();
  }
}

// ============ STOP BUTTON ============

function showStopButton() {
  const sendBtn = document.querySelector('.send-btn');
  if (!sendBtn) return;
  
  sendBtn.innerHTML = '<span class="stop-icon">⏹</span>';
  sendBtn.classList.add('stop-btn');
  sendBtn.onclick = stopGeneration;
  sendBtn.title = "Остановить генерацию";
}

function hideStopButton() {
  const sendBtn = document.querySelector('.send-btn');
  if (!sendBtn) return;
  
  sendBtn.innerHTML = '<span class="send-emoji">🚀</span>';
  sendBtn.classList.remove('stop-btn');
  sendBtn.onclick = sendMessage;
  sendBtn.title = "Отправить";
}

function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
}

// ============ UTILITY FUNCTIONS ============

function handleKeyPress(e) {
  if (e.key === "Enter") sendMessage();
}

function addThinking(id) {
  // Больше не используем старый индикатор "Думаю"
  // Стриминг сам показывает прогресс
}

function removeThinking(id) {
  // Не нужен для стриминга
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Menu open function
window.fn = {
  open: function() {
    const menu = document.getElementById("menu");
    if (menu) menu.open();
  }
};
