// ============================================
// SETTINGS EXPORT/IMPORT MAIN MODULE
// ============================================

// Генерация имени файла с датой и временем
function generateBackupFilename(type) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
  const prefix = type === 'chats' ? 'ChatsBackup' : 'SettingsBackup';
  return `${prefix}_${date}_${time}.json`;
}

function exportChats() {
  const apiLevel = getAndroidApiLevel();
  const content = prepareChatsExport();
  const filename = generateBackupFilename('chats');
  
  if (apiLevel >= 30) {
    saveAndShareFile(filename, content);
  } else {
    // Android 10 и ниже — legacy метод с новым именованием
    if (checkStoragePermissions()) {
      try {
        const result = writeBackupFileLegacy(filename, content);
        if (result.success) {
          ons.notification.alert("Чаты сохранены в:<br><b>" + result.path + "</b>");
          return;
        }
      } catch (e) {
        console.error("Legacy export failed:", e);
      }
    } else {
      requestStoragePermissions(function(granted) {
        if (granted) {
          try {
            const result = writeBackupFileLegacy(filename, content);
            if (result.success) {
              ons.notification.alert("Чаты сохранены в:<br><b>" + result.path + "</b>");
              return;
            }
          } catch (e) {
            console.error("Legacy export failed:", e);
          }
        }
        saveAndShareFile(filename, content);
      });
      return;
    }
    
    saveAndShareFile(filename, content);
  }
}

function importChats() {
  const apiLevel = getAndroidApiLevel();
  
  if (apiLevel >= 30) {
    // Android 11+ — показываем выбор из списка файлов
    showBackupPicker('chats');
  } else {
    // Android 10 и ниже — legacy метод
    importChatsLegacy();
  }
}

function exportSettings() {
  const apiLevel = getAndroidApiLevel();
  const content = prepareSettingsExport();
  const filename = generateBackupFilename('settings');
  
  if (apiLevel >= 30) {
    saveAndShareFile(filename, content);
  } else {
    // Android 10 и ниже — legacy метод с новым именованием
    if (checkStoragePermissions()) {
      try {
        const result = writeBackupFileLegacy(filename, content);
        if (result.success) {
          ons.notification.alert("Настройки сохранены в:<br><b>" + result.path + "</b>");
          return;
        }
      } catch (e) {
        console.error("Legacy export failed:", e);
      }
    } else {
      requestStoragePermissions(function(granted) {
        if (granted) {
          try {
            const result = writeBackupFileLegacy(filename, content);
            if (result.success) {
              ons.notification.alert("Настройки сохранены в:<br><b>" + result.path + "</b>");
              return;
            }
          } catch (e) {
            console.error("Legacy export failed:", e);
          }
        }
        saveAndShareFile(filename, content);
      });
      return;
    }
    
    saveAndShareFile(filename, content);
  }
}

function importSettings() {
  const apiLevel = getAndroidApiLevel();
  
  if (apiLevel >= 30) {
    // Android 11+ — показываем выбор из списка файлов
    showBackupPicker('settings');
  } else {
    // Android 10 и ниже — legacy метод
    importSettingsLegacy();
  }
}

// ============================================
// BACKUP PICKER FOR ANDROID 11+
// ============================================

// Показать диалог выбора бэкапа (Android 11+)
function showBackupPicker(importType) {
  try {
    const backupDir = getBackupDir();
    if (!backupDir) {
      // Fallback если нет доступа к папке
      importViaFileInput(importType);
      return;
    }
    
    const files = backupDir.listFiles();
    const backups = [];
    const prefix = importType === 'chats' ? 'ChatsBackup_' : 'SettingsBackup_';
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.getName();
      if (name.startsWith(prefix) && name.endsWith('.json')) {
        backups.push({
          name: name,
          file: file,
          date: file.lastModified(),
          size: file.length()
        });
      }
    }
    
    // Сортируем по дате (новые сверху)
    backups.sort((a, b) => b.date - a.date);
    
    if (backups.length === 0) {
      // Нет бэкапов — предлагаем импорт с устройства
      ons.notification.confirm({
        title: "Бэкапы не найдены",
        message: "В папке приложения нет бэкапов. Импортировать с устройства?",
        buttonLabels: ["Отмена", "Выбрать файл"],
        callback: function(index) {
          if (index === 1) {
            importViaFileInput(importType);
          }
        }
      });
      return;
    }
    
    // Показываем диалог с списком
    renderBackupPicker(backups, importType);
    
  } catch (e) {
    console.error("Backup picker error:", e);
    importViaFileInput(importType);
  }
}

// Отрисовать список файлов в диалоге
function renderBackupPicker(backups, importType) {
  const modal = document.getElementById('backupPickerModal');
  const list = document.getElementById('backupFileList');
  const subtitle = document.getElementById('pickerSubtitle');
  
  if (!modal || !list) {
    // Fallback если DOM элементов нет — берём последний бэкап
    if (backups.length > 0) {
      const content = backups[0].file.read();
      if (importType === 'chats') {
        processImportChats(content);
      } else {
        processImportSettings(content);
      }
    }
    return;
  }
  
  subtitle.textContent = `Найдено ${backups.length} файл(ов):`;
  
  let html = '';
  backups.forEach((backup, index) => {
    const date = new Date(backup.date).toLocaleString('ru-RU');
    const size = formatFileSize(backup.size);
    const icon = importType === 'chats' ? '💬' : '⚙️';
    
    html += `
      <div onclick="selectBackupFile(${index})" style="
        padding: 12px 16px;
        margin: 4px 8px;
        background: var(--bg-tertiary);
        border-radius: 12px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='var(--accent-color)'" onmouseout="this.style.borderColor='transparent'">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:24px;">${icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${backup.name}
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
              📅 ${date} &nbsp;|&nbsp; 📦 ${size}
            </div>
          </div>
          <ons-icon icon="md-chevron-right" style="color:var(--text-muted);"></ons-icon>
        </div>
      </div>
    `;
  });
  
  // Сохраняем список для выбора
  window.currentBackupList = backups;
  window.currentImportType = importType;
  
  list.innerHTML = html;
  modal.style.display = 'flex';
}

// Выбрать конкретный файл из списка
function selectBackupFile(index) {
  const backup = window.currentBackupList[index];
  const importType = window.currentImportType;
  
  closeBackupPicker();
  
  if (!backup) return;
  
  try {
    const content = backup.file.read();
    if (importType === 'chats') {
      processImportChats(content);
    } else {
      processImportSettings(content);
    }
  } catch (e) {
    ons.notification.alert("Ошибка чтения файла: " + e.message);
  }
}

// Закрыть диалог выбора
function closeBackupPicker() {
  const modal = document.getElementById('backupPickerModal');
  if (modal) modal.style.display = 'none';
  window.currentBackupList = null;
  window.currentImportType = null;
}

// Fallback на file input из диалога
function importViaFileInputFallback() {
  const importType = window.currentImportType || 'chats';
  closeBackupPicker();
  importViaFileInput(importType);
}

// Формат размера файла
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// LEGACY METHODS FOR ANDROID 10 AND BELOW
// ============================================

function importChatsLegacy() {
  try {
    const backupDir = getBackupDir();
    if (!backupDir) {
      importViaFileInput('chats');
      return;
    }
    
    const files = backupDir.listFiles();
    const backups = [];
    
    // Ищем все файлы ChatsBackup_*.json
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.getName();
      if (name.startsWith('ChatsBackup_') && name.endsWith('.json')) {
        backups.push({
          file: file,
          date: file.lastModified()
        });
      }
    }
    
    // Сортируем по дате (новые сверху) и берём последний
    backups.sort((a, b) => b.date - a.date);
    
    if (backups.length > 0) {
      const content = backups[0].file.read();
      processImportChats(content);
    } else {
      // Fallback на старое имя
      const file = new android.File(backupDir, "ChatsBackup.json");
      if (file.exists()) {
        const content = file.read();
        processImportChats(content);
      } else {
        importViaFileInput('chats');
      }
    }
  } catch (e) {
    console.error("Legacy import failed:", e);
    importViaFileInput('chats');
  }
}

function importSettingsLegacy() {
  try {
    const backupDir = getBackupDir();
    if (!backupDir) {
      importViaFileInput('settings');
      return;
    }
    
    const files = backupDir.listFiles();
    const backups = [];
    
    // Ищем все файлы SettingsBackup_*.json
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.getName();
      if (name.startsWith('SettingsBackup_') && name.endsWith('.json')) {
        backups.push({
          file: file,
          date: file.lastModified()
        });
      }
    }
    
    // Сортируем по дате (новые сверху) и берём последний
    backups.sort((a, b) => b.date - a.date);
    
    if (backups.length > 0) {
      const content = backups[0].file.read();
      processImportSettings(content);
    } else {
      // Fallback на старое имя
      const file = new android.File(backupDir, "SettingsBackup.json");
      if (file.exists()) {
        const content = file.read();
        processImportSettings(content);
      } else {
        importViaFileInput('settings');
      }
    }
  } catch (e) {
    console.error("Legacy import failed:", e);
    importViaFileInput('settings');
  }
}
