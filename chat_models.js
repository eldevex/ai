// ============================================
// MODELS & SETTINGS MODULE - chat_models.js
// ============================================

const MODEL_CATEGORIES = [
  {
    name: "Кодинг и программирование",
    emoji: "💻",
    models: [
      { name: "Qwen3 Coder 480B", id: "qwen3-coder:480b-cloud" },
      { name: "Qwen3 Coder Next", id: "qwen3-coder-next:cloud" },
      { name: "Devstral-small 2 24B", id: "devstral-small-2:24b-cloud" },
      { name: "Devstral 2 123B", id: "devstral-2:123b-cloud" },
      { name: "RNJ-1 8B", id: "rnj-1:8b-cloud" },
      { name: "GLM 4.7", id: "glm-4.7:cloud" }
    ]
  },
  {
    name: "Мультимодальные / Vision",
    emoji: "👁️",
    models: [
      { name: "Qwen3 VL 235B", id: "qwen3-vl:235b-cloud" },
      { name: "Gemini 3 Flash", id: "gemini-3-flash-preview:cloud" },
      { name: "Kimi K2.5", id: "kimi-k2.5:cloud" }
    ]
  },
  {
    name: "Мощные рассуждающие",
    emoji: "🧠",
    models: [
      { name: "Kimi K2 Thinking", id: "kimi-k2-thinking:cloud" },
      { name: "DeepSeek V3.1 671B", id: "deepseek-v3.1:671b-cloud" },
      { name: "DeepSeek V3.2", id: "deepseek-v3.2:cloud" }
    ]
  },
  {
    name: "Компактные",
    emoji: "⚡",
    models: [
      { name: "Gemma3 4B", id: "gemma3:4b-cloud" },
      { name: "Gemma3 12B", id: "gemma3:12b-cloud" },
      { name: "Gemma3 27B", id: "gemma3:27b-cloud" }
    ]
  }
];

const VISION_MODELS = new Set([
  "qwen3-vl:235b-cloud",
  "gemini-3-flash-preview:cloud",
  "kimi-k2.5:cloud"
]);

function loadCurrentModel() {
  const model = localStorage.getItem("selected-model") || "qwen3-coder:480b-cloud";
  const modelName = model.split(":")[0];
  
  // Бейдж в чате
  const el = document.getElementById("currentModel");
  if (el) el.textContent = modelName;
  
  // В боковом меню
  const menuEl = document.getElementById("menuCurrentModel");
  if (menuEl) menuEl.textContent = modelName;
}

function renderModelsList() {
  const currentModel = localStorage.getItem("selected-model") || "qwen3-coder:480b-cloud";
  let html = "";
  
  MODEL_CATEGORIES.forEach(function(cat) {
    html += "<h5 style='color:var(--text-secondary);margin:16px 0 12px;font-size:13px;font-weight:600'>" + cat.emoji + " " + cat.name + "</h5>";
    cat.models.forEach(function(m) {
      const selected = currentModel === m.id;
      html += "<ons-list-item onclick=\"selectModel('" + m.id + "','" + m.name + "')\" tappable" + 
        (selected ? " style='background:var(--bg-active);border-radius:var(--radius-sm)'" : " style='border-radius:var(--radius-sm)'") + ">" +
        "<div class='center' style='color:" + (selected ? "var(--accent-color)" : "var(--text-primary)") + "'>" + m.name + "</div>" +
        (selected ? "<div class='right'><ons-icon icon='md-check' style='color:var(--accent-color)'></ons-icon></div>" : "") +
        "</ons-list-item>";
    });
  });
  
  const listEl = document.getElementById("modelsList");
  if (listEl) listEl.innerHTML = html;
}

function selectModel(id, name) {
  localStorage.setItem("selected-model", id);
  
  const modelName = name.split(" ")[0];
  
  // Обновляем бейдж в чате
  const el = document.getElementById("currentModel");
  if (el) el.textContent = modelName;
  
  // Обновляем в боковом меню
  const menuEl = document.getElementById("menuCurrentModel");
  if (menuEl) menuEl.textContent = modelName;
  
  renderModelsList();
  
  const dialog = document.getElementById("modelsDialog");
  if (dialog) dialog.hide();
  
  ons.notification.toast("Выбрана: " + name, { timeout: 2000 });
  
  if (currentChatId) {
    const sessions = getChatSessions();
    if (sessions[currentChatId]) {
      sessions[currentChatId].model = id;
      saveChatSessions(sessions);
      renderChatHistoryList();
    }
  }
}

function showModels() {
  renderModelsList();
  const dialog = document.getElementById("modelsDialog");
  if (dialog) dialog.show();
}

function showSettings() {
  // Перенаправляем на страницу настроек
  location.href = "settings.html";
}

function saveSettings() {
  // Устарело — настройки сохраняются на отдельной странице
  console.log("saveSettings is deprecated, use settings.html");
}
