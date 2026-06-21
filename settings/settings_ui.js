// ============================================
// SETTINGS UI MODULE
// ============================================

// Назад к чату
function goBack() {
  location.href = "chat.html";
}

// Переключить секцию
function toggleSection(sectionId) {
  sectionStates[sectionId] = !sectionStates[sectionId];
  
  const content = document.getElementById('content-' + sectionId);
  const chevron = document.getElementById('chevron-' + sectionId);
  
  if (content && chevron) {
    if (sectionStates[sectionId]) {
      content.classList.add('expanded');
      chevron.style.transform = 'rotate(180deg)';
    } else {
      content.classList.remove('expanded');
      chevron.style.transform = 'rotate(0deg)';
    }
  }
}

// Загрузка значений
function loadAllValues() {
  const apiKey = localStorage.getItem("ollama-api-key") || "";
  const apiHost = localStorage.getItem("ollama-host") || "https://api.ollama.com";
  
  const keyInput = document.getElementById("settingsApiKey");
  const hostInput = document.getElementById("settingsApiHost");
  
  if (keyInput) keyInput.value = apiKey;
  if (hostInput) hostInput.value = apiHost;
  
  const promptText = document.getElementById("settingsPromptText");
  const promptToggle = document.getElementById("settingsPromptToggle");
  
  if (promptText) promptText.value = getSystemPrompt();
  if (promptToggle) promptToggle.checked = isSystemPromptEnabled();
}

// Обновление всего UI
function updateAllUI() {
  const promptTextarea = document.getElementById("settingsPromptText");
  
  if (promptTextarea) {
    const isPromptEnabled = isSystemPromptEnabled();
    promptTextarea.disabled = !isPromptEnabled;
    promptTextarea.style.opacity = isPromptEnabled ? "1" : "0.5";
  }
  updatePromptPreview();
}

function initSettingsPage() {
  initTheme();
  loadAllValues();
  loadCacheSettings(); // Добавить это
  updateAllUI();
  updateCacheUI(); // Добавить это
}

