// ============================================
// RESEARCH MODE MODULE - chat_research.js
// RAG (Retrieval-Augmented Generation) implementation
// ============================================

const RESEARCH_MODE_KEY = "research-mode-enabled";
const RESEARCH_MODEL_KEY = "research-embedding-model";
const RESEARCH_INDEX_KEY = "research-document-index";
const RESEARCH_CHUNKS_KEY = "research-chunks";

// Настройки чанкирования
const CHUNK_SIZE = 512; // символов
const CHUNK_OVERLAP = 128; // перекрытие между чанками
const TOP_K_RESULTS = 5; // сколько чанков брать в контекст

// Доступные embedding модели
const EMBEDDING_MODELS = [
  { id: "qwen3-embedding", name: "Qwen3 Embedding", dims: 1024 },
  { id: "embeddinggemma", name: "EmbeddingGemma", dims: 768 },
  { id: "all-minilm", name: "All-MiniLM", dims: 384 }
];

let researchDocuments = []; // Загруженные документы
let researchChunks = []; // Чанки с эмбеддингами
let isResearchMode = false;

// ============ STATE MANAGEMENT ============

function isResearchModeEnabled() {
  return localStorage.getItem(RESEARCH_MODE_KEY) === "true";
}

function setResearchModeEnabled(enabled) {
  localStorage.setItem(RESEARCH_MODE_KEY, enabled ? "true" : "false");
  isResearchMode = enabled;
  updateResearchButton();
  if (enabled) loadResearchIndex();
}

function getEmbeddingModel() {
  return localStorage.getItem(RESEARCH_MODEL_KEY) || "qwen3-embedding";
}

function setEmbeddingModel(modelId) {
  localStorage.setItem(RESEARCH_MODEL_KEY, modelId);
}

// ============ DOCUMENT PROCESSING ============

// Разбиваем текст на чанки с перекрытием
function chunkText(text, sourceName) {
  const chunks = [];
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
  
  if (cleanText.length <= CHUNK_SIZE) {
    return [{
      id: `${sourceName}_0`,
      text: cleanText,
      source: sourceName,
      index: 0
    }];
  }
  
  let start = 0;
  let index = 0;
  
  while (start < cleanText.length) {
    let end = start + CHUNK_SIZE;
    
    // Ищем конец предложения или слова
    if (end < cleanText.length) {
      // Пробуем найти конец предложения
      const sentenceEnd = cleanText.indexOf('.', end - 50);
      if (sentenceEnd !== -1 && sentenceEnd < end + 50) {
        end = sentenceEnd + 1;
      } else {
        // Или конец слова
        const spaceIndex = cleanText.lastIndexOf(' ', end);
        if (spaceIndex > start) {
          end = spaceIndex;
        }
      }
    }
    
    const chunk = cleanText.substring(start, end).trim();
    if (chunk.length > 50) { // Минимальная длина чанка
      chunks.push({
        id: `${sourceName}_${index}`,
        text: chunk,
        source: sourceName,
        index: index
      });
      index++;
    }
    
    start = end - CHUNK_OVERLAP;
    if (start >= cleanText.length) break;
  }
  
  return chunks;
}

// Извлекаем текст из разных типов файлов
async function extractTextFromFile(file) {
  switch(file.type) {
    case "text":
      return file.data;
    
    case "pdf":
      // Используем текстовое содержимое PDF если есть
      if (file.text) {
        return file.text;
      }
      // Или OCR через vision модель (упрощённо)
      return `[PDF: ${file.name} - ${file.totalPages} страниц. Для полного анализа используйте vision-способные модели.]`;
    
    case "archive":
      // Для архивов используем структуру
      return file.data;
    
    case "file":
      // Бинарные файлы - только метаданные
      return `[Файл: ${file.name} - бинарный формат]`;
    
    default:
      return `[Неизвестный тип: ${file.name}]`;
  }
}

// ============ EMBEDDINGS API ============

// Генерируем эмбеддинги через Ollama API
async function generateEmbeddings(texts, model) {
  const apiKey = localStorage.getItem("ollama-api-key");
  const host = localStorage.getItem("ollama-host") || "https://api.ollama.com";
  
  const response = await fetch(`${host}/api/embed`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      input: texts
    })
  });
  
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.embeddings; // Массив векторов
}

// ============ COSINE SIMILARITY ============

// Вычисляем косинусное сходство между векторами [^5^]
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`);
  }
  
  // Dot product
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  // Magnitudes
  let magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  if (magA === 0 || magB === 0) return 0;
  
  return dotProduct / (magA * magB);
}

// ============ INDEX MANAGEMENT ============

// Индексируем документы
async function indexDocuments(files) {
  if (!files || files.length === 0) return;
  
  const model = getEmbeddingModel();
  const allChunks = [];
  
  // Извлекаем текст и создаём чанки
  for (const file of files) {
    const text = await extractTextFromFile(file);
    const chunks = chunkText(text, file.name);
    allChunks.push(...chunks);
  }
  
  if (allChunks.length === 0) {
    ons.notification.toast("Нет текста для индексации", { timeout: 2000 });
    return;
  }
  
  // Показываем индикатор
  const indicator = addResearchIndicator(`Индексация ${allChunks.length} чанков...`);
  
  try {
    // Генерируем эмбеддинги батчами по 10 чанков
    const batchSize = 10;
    const embeddings = [];
    
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.text);
      
      const batchEmbeddings = await generateEmbeddings(texts, model);
      embeddings.push(...batchEmbeddings);
      
      // Обновляем прогресс
      updateResearchIndicator(indicator, `Индексация... ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`);
    }
    
    // Сохраняем чанки с эмбеддингами
    for (let i = 0; i < allChunks.length; i++) {
      allChunks[i].embedding = embeddings[i];
    }
    
    researchChunks = allChunks;
    researchDocuments = files.map(f => ({ name: f.name, type: f.type }));
    
    saveResearchIndex();
    
    ons.notification.toast(`Проиндексировано ${allChunks.length} чанков`, { timeout: 3000 });
    
  } catch (error) {
    console.error("Indexing error:", error);
    ons.notification.toast("Ошибка индексации: " + error.message, { timeout: 3000 });
  } finally {
    removeResearchIndicator(indicator);
  }
}

// Сохраняем индекс в localStorage (сжатый)
function saveResearchIndex() {
  try {
    // Сохраняем только необходимое (без полных эмбеддингов в localStorage - они большие)
    const minimalChunks = researchChunks.map(c => ({
      id: c.id,
      text: c.text.substring(0, 200), // Первые 200 символов для preview
      source: c.source,
      index: c.index
    }));
    
    localStorage.setItem(RESEARCH_INDEX_KEY, JSON.stringify({
      documents: researchDocuments,
      chunks: minimalChunks,
      chunkCount: researchChunks.length,
      updatedAt: Date.now()
    }));
    
    // Эмбеддинги храним отдельно или пересчитываем при загрузке
    // Для production лучше использовать IndexedDB
    
  } catch (e) {
    console.warn("Failed to save research index:", e);
  }
}

// Загружаем индекс
function loadResearchIndex() {
  try {
    const saved = localStorage.getItem(RESEARCH_INDEX_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      researchDocuments = data.documents || [];
      // Полные чанки нужно перезагрузить или пересчитать
      console.log("Research index loaded:", researchDocuments.length, "docs,", data.chunkCount, "chunks");
    }
  } catch (e) {
    console.warn("Failed to load research index:", e);
  }
}

// Очищаем индекс
function clearResearchIndex() {
  researchChunks = [];
  researchDocuments = [];
  localStorage.removeItem(RESEARCH_INDEX_KEY);
  localStorage.removeItem(RESEARCH_CHUNKS_KEY);
  ons.notification.toast("Индекс очищен", { timeout: 2000 });
}

// ============ RETRIEVAL ============

// Ищем релевантные чанки по запросу
async function retrieveRelevantChunks(query, topK = TOP_K_RESULTS) {
  if (researchChunks.length === 0) {
    return [];
  }
  
  const model = getEmbeddingModel();
  
  try {
    // Генерируем эмбеддинг запроса
    const queryEmbeddings = await generateEmbeddings([query], model);
    const queryVector = queryEmbeddings[0];
    
    // Вычисляем сходство со всеми чанками
    const scored = researchChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.embedding)
    }));
    
    // Сортируем по убыванию сходства
    scored.sort((a, b) => b.score - a.score);
    
    // Берём топ-K
    return scored.slice(0, topK);
    
  } catch (error) {
    console.error("Retrieval error:", error);
    return [];
  }
}

// Формируем контекст для промпта
async function buildResearchContext(query) {
  const relevant = await retrieveRelevantChunks(query);
  
  if (relevant.length === 0) {
    return null;
  }
  
  let context = "📚 КОНТЕКСТ ИЗ ЗАГРУЖЕННЫХ ДОКУМЕНТОВ:\n";
  context += "=".repeat(50) + "\n\n";
  
  relevant.forEach((chunk, i) => {
    context += `[${i + 1}] Источник: ${chunk.source} (релевантность: ${(chunk.score * 100).toFixed(1)}%)\n`;
    context += `${chunk.text}\n\n`;
  });
  
  context += "=".repeat(50) + "\n";
  context += "Используйте информацию из контекста выше для ответа на вопрос пользователя. ";
  context += "Если ответ не найден в контексте, скажите об этом явно.\n\n";
  
  return context;
}

// ============ UI FUNCTIONS ============

// Быстрое переключение режима
function quickToggleResearchMode() {
  const newState = !isResearchModeEnabled();
  setResearchModeEnabled(newState);
  
  if (newState && researchDocuments.length === 0) {
    ons.notification.alert({
      title: "Исследовательский режим",
      message: "Режим включён, но нет проиндексированных документов. Загрузите файлы для анализа."
    });
  } else {
    const status = newState ? "Исследовательский режим включён" : "Исследовательский режим отключён";
    ons.notification.toast(status, { timeout: 2000 });
  }
}

// Обновляем кнопку в UI
function updateResearchButton() {
  const btn = document.getElementById("researchBtn");
  if (!btn) return;
  
  const isEnabled = isResearchModeEnabled();
  
  if (isEnabled) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}

// Индикатор индексации
function addResearchIndicator(text) {
  const id = "research-" + Date.now();
  const el = document.createElement("div");
  el.id = id;
  el.className = "thinking";
  el.innerHTML = `📚 ${text}`;
  const container = document.getElementById("chatContainer");
  if (container) {
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
  return id;
}

function updateResearchIndicator(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `📚 ${text}`;
}

function removeResearchIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Диалог настроек исследовательского режима
function showResearchDialog() {
  const docsList = researchDocuments.length > 0 
    ? researchDocuments.map(d => `• ${d.name}`).join('\n')
    : 'Нет загруженных документов';
  
  const chunksInfo = researchChunks.length > 0
    ? `\n\nПроиндексировано чанков: ${researchChunks.length}`
    : '';
  
  ons.notification.confirm({
    title: "📚 Исследовательский режим",
    message: `Загруженные документы:\n${docsList}${chunksInfo}\n\nВыберите действие:`,
    buttonLabels: ["Закрыть", "Очистить индекс", "Настройки"],
    primaryButtonIndex: 2,
    callback: function(index) {
      if (index === 1) {
        clearResearchIndex();
      } else if (index === 2) {
        showResearchSettings();
      }
    }
  });
}

// Настройки модели эмбеддингов
function showResearchSettings() {
  const currentModel = getEmbeddingModel();
  
  let html = '<ons-list>';
  EMBEDDING_MODELS.forEach(m => {
    const checked = m.id === currentModel ? 'checked' : '';
    html += `
      <ons-list-item tappable onclick="selectEmbeddingModel('${m.id}')">
        <label class="left">
          <ons-radio name="embedding-model" ${checked}></ons-radio>
        </label>
        <div class="center">
          <div class="list-item__title">${m.name}</div>
          <div class="list-item__subtitle">${m.dims} dimensions</div>
        </div>
      </ons-list-item>
    `;
  });
  html += '</ons-list>';
  
  ons.notification.alert({
    title: "Модель эмбеддингов",
    messageHTML: html,
    callback: () => {}
  });
}

function selectEmbeddingModel(modelId) {
  setEmbeddingModel(modelId);
  ons.notification.toast(`Выбрана модель: ${modelId}`, { timeout: 2000 });
}

// ============ INTEGRATION ============

// Инициализация при загрузке
function initResearchMode() {
  isResearchMode = isResearchModeEnabled();
  loadResearchIndex();
  updateResearchButton();
  console.log("Research mode initialized, enabled:", isResearchMode);
}

// Модифицируем sendToAPI для добавления контекста исследований
const originalSendToAPI = window.sendToAPI;
window.sendToAPI = async function(text, files, searchContext) {
  // Если включён исследовательский режим и есть запрос
  if (isResearchModeEnabled() && text && researchChunks.length > 0) {
    const researchContext = await buildResearchContext(text);
    if (researchContext) {
      // Объединяем с существующим контекстом поиска
      searchContext = searchContext 
        ? researchContext + "\n\n" + searchContext 
        : researchContext;
    }
  }
  
  // Индексируем новые файлы если есть
  if (files && files.length > 0) {
    const textFiles = files.filter(f => f.type === "text" || f.type === "pdf" || f.type === "archive");
    if (textFiles.length > 0) {
      await indexDocuments(textFiles);
    }
  }
  
  // Вызываем оригинальную функцию
  return originalSendToAPI.call(this, text, files, searchContext);
};
