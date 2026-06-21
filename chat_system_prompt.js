// ============================================
// SYSTEM PROMPT MODULE - chat_system_prompt.js
// ============================================

const SYSTEM_PROMPT_KEY = "system-prompt-text";
const SYSTEM_PROMPT_ENABLED_KEY = "system-prompt-enabled";

// Значения по умолчанию
const DEFAULT_SYSTEM_PROMPT = "Вы — полезный AI-ассистент. Отвечайте на русском языке, если не указано иное.";

// Получить текущий системный промпт
function getSystemPrompt() {
  return localStorage.getItem(SYSTEM_PROMPT_KEY) || DEFAULT_SYSTEM_PROMPT;
}

// Проверить включен ли системный промпт
function isSystemPromptEnabled() {
  return localStorage.getItem(SYSTEM_PROMPT_ENABLED_KEY) === "true";
}

// Сохранить системный промпт
function saveSystemPrompt(text) {
  localStorage.setItem(SYSTEM_PROMPT_KEY, text.trim());
}

// Включить/выключить системный промпт
function setSystemPromptEnabled(enabled) {
  localStorage.setItem(SYSTEM_PROMPT_ENABLED_KEY, enabled ? "true" : "false");
  updateQuickPromptButton();
}

// Быстрое переключение в шапке чата
function quickToggleSystemPrompt() {
  const newState = !isSystemPromptEnabled();
  setSystemPromptEnabled(newState);
  
  const status = newState ? "Системный промпт включен" : "Системный промпт отключен";
  ons.notification.toast(status, { timeout: 2000 });
}

// Обновить кнопку быстрого переключения
function updateQuickPromptButton() {
  const btn = document.getElementById("quickPromptBtn");
  
  if (!btn) return;
  
  const isEnabled = isSystemPromptEnabled();
  
  if (isEnabled) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}


// Получить сообщения для API с учетом системного промпта
function buildMessagesWithSystemPrompt(userMessages) {
  const messages = [];
  
  // Добавляем системный промпт если включен
  if (isSystemPromptEnabled()) {
    messages.push({
      role: "system",
      content: getSystemPrompt()
    });
  }
  
  // Добавляем остальные сообщения
  messages.push(...userMessages);
  
  return messages;
}

// Показать диалог настройки системного промпта (для страницы настроек)
function showSystemPromptDialog() {
  // Переходим на страницу настроек
  location.href = "settings.html";
}

// Инициализация при загрузке
function initSystemPrompt() {
  updateQuickPromptButton();
  console.log("System prompt initialized, enabled:", isSystemPromptEnabled());
}
