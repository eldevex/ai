// ============================================
// SETTINGS PROMPT MODULE
// ============================================

function onPromptToggle() {
  const toggle = document.getElementById("settingsPromptToggle");
  const textarea = document.getElementById("settingsPromptText");
  
  if (textarea && toggle) {
    textarea.disabled = !toggle.checked;
    textarea.style.opacity = toggle.checked ? "1" : "0.5";
  }
  
  updatePromptPreview();
}

function updatePromptPreview() {
  const preview = document.getElementById("promptPreview");
  const textarea = document.getElementById("settingsPromptText");
  const toggle = document.getElementById("settingsPromptToggle");
  
  if (!preview) return;
  
  const isEnabled = toggle ? toggle.checked : isSystemPromptEnabled();
  const text = textarea ? textarea.value.trim() : "";
  
  if (!isEnabled) {
    preview.innerHTML = '<span class="settings-preview-placeholder">Системный промпт отключен — AI будет использовать стандартное поведение</span>';
    preview.className = "settings-preview-box disabled";
  } else if (!text) {
    preview.innerHTML = '<span style="color:var(--danger-color)">⚠️ Промпт пустой — добавьте текст</span>';
    preview.className = "settings-preview-box warning";
  } else {
    preview.textContent = text.substring(0, 200) + (text.length > 200 ? "..." : "");
    preview.className = "settings-preview-box active";
  }
}

function savePromptSettings() {
  const textarea = document.getElementById("settingsPromptText");
  const toggle = document.getElementById("settingsPromptToggle");
  
  if (textarea && toggle) {
    saveSystemPrompt(textarea.value);
    setSystemPromptEnabled(toggle.checked);
    ons.notification.toast("Системный промпт сохранен", { timeout: 2000 });
  }
}

function resetPromptSettings() {
  const textarea = document.getElementById("settingsPromptText");
  const toggle = document.getElementById("settingsPromptToggle");
  
  if (textarea) textarea.value = "Вы — полезный AI-ассистент. Отвечайте на русском языке, если не указано иное.";
  if (toggle) toggle.checked = false;
  
  onPromptToggle();
  ons.notification.toast("Сброшено по умолчанию", { timeout: 2000 });
}
