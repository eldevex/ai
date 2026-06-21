// ============================================
// SETTINGS EXPORT CORE MODULE
// ============================================

// Устаревшая функция шаринга (больше не используется для Android 11+)
function shareFileViaIntent() {
  console.log("Share via intent is deprecated for Android 11+");
}

// Сохранить файл в Android/data и показать диалог (с кнопкой открыть папку)
function saveAndShareFile(filename, content) {
  try {
    const backupDir = getBackupDir();
    if (!backupDir) {
      throw new Error("Не удалось получить папку для сохранения");
    }
    
    const file = new android.File(backupDir, filename);
    file.write(content);
    const filePath = file.toString();
    
    // Показываем диалог с кнопкой открыть папку
    showSuccessDialog(filename, filePath);
    
    return true;
  } catch (e) {
    console.error("Save error:", e);
    ons.notification.alert("Ошибка сохранения: " + e.message);
    return false;
  }
}

// Импорт для Android 11+ — читаем из папки приложения как в legacy
function importViaPicker(importType) {
  const apiLevel = getAndroidApiLevel();
  
  // Сначала пробуем импорт из Android/data/[package]/files/Backups/
  try {
    const backupDir = getBackupDir();
    if (backupDir) {
      const fileName = importType === 'chats' ? "ChatsBackup.json" : "SettingsBackup.json";
      const file = new android.File(backupDir, fileName);
      if (file.exists()) {
        const content = file.read();
        if (importType === 'chats') {
          processImportChats(content);
        } else if (importType === 'settings') {
          processImportSettings(content);
        }
        return;
      }
    }
  } catch (e) {
    console.error("Import from app dir failed:", e);
  }
  
  // Если файла нет — fallback на file input
  importViaFileInput(importType);
}

// Fallback: импорт через file input
function importViaFileInput(importType) {
  const oldInput = document.getElementById("hiddenFileInput");
  if (oldInput) oldInput.remove();
  
  const input = document.createElement("input");
  input.type = "file";
  input.id = "hiddenFileInput";
  input.accept = ".json,application/json";
  input.style.display = "none";
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      if (importType === 'chats') {
        processImportChats(event.target.result);
      } else if (importType === 'settings') {
        processImportSettings(event.target.result);
      }
    };
    reader.onerror = function() {
      ons.notification.alert("Ошибка чтения файла");
    };
    reader.readAsText(file);
  };
  
  document.body.appendChild(input);
  input.click();
}

// Подготовка данных для экспорта чатов
function prepareChatsExport() {
  const sessions = getChatSessions();
  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    type: "chats",
    data: sessions
  };
  return JSON.stringify(exportData, null, 2);
}

// Подготовка данных для экспорта настроек
function prepareSettingsExport() {
  const settings = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    type: "settings",
    data: {
      "selected-model": localStorage.getItem("selected-model"),
      "ollama-api-key": localStorage.getItem("ollama-api-key"),
      "ollama-host": localStorage.getItem("ollama-host"),
      "app-theme": localStorage.getItem("app-theme"),
      "system-prompt-text": localStorage.getItem("system-prompt-text"),
      "system-prompt-enabled": localStorage.getItem("system-prompt-enabled"),
      "research-mode-enabled": localStorage.getItem("research-mode-enabled"),
      "research-embedding-model": localStorage.getItem("research-embedding-model")
    }
  };
  return JSON.stringify(settings, null, 2);
}
