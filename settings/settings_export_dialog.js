// ============================================
// SETTINGS EXPORT DIALOGS MODULE
// ============================================

// Показать диалог с кнопкой "Открыть папку" (для Android 11+)
function showSuccessDialog(filename, filePath) {
  const oldModal = document.getElementById("successModal");
  if (oldModal) oldModal.remove();
  
  const modal = document.createElement("div");
  modal.id = "successModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  modal.innerHTML = `
    <div style="
      background: var(--bg-secondary, #1a1a2e);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
      border: 1px solid var(--border-color, #333);
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
      <h3 style="margin:0 0 10px 0;color:var(--text-primary,#fff);font-size:18px;">
        Файл сохранен!
      </h3>
      <p style="font-size:13px;color:var(--text-secondary,#aaa);margin-bottom:20px;line-height:1.5;">
        <b>${filename}</b><br>
        <span style="font-size:11px;opacity:0.7;">${filePath}</span>
      </p>
      
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button onclick="openBackupFolder()" style="
          padding: 14px;
          background: var(--bg-tertiary, #2a2a3e);
          color: var(--text-primary, #fff);
          border: 1px solid var(--border-color, #333);
          border-radius: 10px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span>📂</span> Открыть папку
        </button>
        
        <button onclick="closeSuccessDialog()" style="
          padding: 14px;
          background: var(--accent-color, #4a9eff);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        ">
          Закрыть
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Сохраняем путь для открытия папки
  window.currentBackupFolder = filePath.substring(0, filePath.lastIndexOf('/'));
}

// Открыть папку с бэкапами из диалога (использует сохранённый путь)
function openBackupFolder() {
  if (!window.currentBackupFolder) {
    ons.notification.toast("Путь к папке не найден", { timeout: 2000 });
    return;
  }
  openBackupFolderByPath(window.currentBackupFolder);
}

// Открыть папку с бэкапами из настроек (определяет путь автоматически)
function openBackupFolderFromSettings() {
  const apiLevel = getAndroidApiLevel();
  
  if (apiLevel >= 30) {
    // Android 11+ - открываем папку в Android/data
    try {
      const backupDir = getBackupDir();
      if (backupDir) {
        openBackupFolderByPath(backupDir.toString());
      } else {
        ons.notification.alert("Не удалось получить папку бэкапов");
      }
    } catch (e) {
      console.error("Open folder error:", e);
      ons.notification.alert("Ошибка открытия папки: " + e.message);
    }
  } else {
    // Android 10 и ниже - открываем /sdcard/OllamaAI/
    openBackupFolderByPath(BACKUP_DIR_LEGACY);
  }
}

// Универсальная функция открытия папки по пути
function openBackupFolderByPath(folderPath) {
  try {
    const apiLevel = getAndroidApiLevel();
    const folder = new android.File(folderPath);
    
    if (!folder.exists()) {
      ons.notification.alert("Папка не существует: " + folderPath);
      return;
    }
    
    // Для Android 14+ (API 34+) используем специальный подход
    if (apiLevel >= 34) {
      try {
        const packageName = android.java.activity.getPackageName();
        // Пробуем открыть через DocumentsUI
        const uri = "content://com.android.externalstorage.documents/document/primary%3A" + 
                   encodeURIComponent(folderPath.replace("/sdcard/", "").replace("/storage/emulated/0/", ""));
        
        const intent = {
          action: "android.intent.action.VIEW",
          data: uri,
          type: "vnd.android.document/directory"
        };
        
        android.activity.startActivity(intent, true);
        return;
      } catch (e) {
        console.log("Direct URI failed, trying alternative method");
      }
    }
    
    // Для Android 11-13 пробуем открыть через FileProvider или напрямую
    try {
      let uri;
      
      try {
        // Пробуем FileProvider
        const context = android.java.activity;
        const fileProviderClass = java.lang.Class.forName("androidx.core.content.FileProvider");
        const getUriForFile = fileProviderClass.getMethod("getUriForFile", 
          java.lang.Class.forName("android.content.Context"), 
          java.lang.String, 
          java.lang.Class.forName("java.io.File")
        );
        
        const authority = context.getPackageName() + ".fileprovider";
        uri = getUriForFile.invoke(null, context, authority, folder);
      } catch (e) {
        // Fallback на file://
        uri = "file://" + folderPath;
      }
      
      const intent = {
        action: "android.intent.action.VIEW",
        data: uri.toString(),
        flags: 0x10000000 | 0x00000001 // FLAG_ACTIVITY_NEW_TASK | FLAG_GRANT_READ_URI_PERMISSION
      };
      
      android.activity.startActivity(intent, true);
      
    } catch (e) {
      // Последний fallback — открыть общий доступ к документам
      const intent = {
        action: "android.intent.action.OPEN_DOCUMENT_TREE"
      };
      android.activity.startActivity(intent, true);
      ons.notification.toast("Выберите папку вручную", { timeout: 3000 });
    }
    
  } catch (e) {
    console.error("Open folder error:", e);
    ons.notification.alert("Не удалось открыть папку. Путь: " + folderPath);
  }
}

// Закрыть диалог
function closeSuccessDialog() {
  const modal = document.getElementById("successModal");
  if (modal) modal.remove();
  window.currentBackupFolder = null;
}

// Устаревший диалог с шарингом (оставлен для совместимости)
function showShareDialog(filename, filePath, content) {
  showSuccessDialog(filename, filePath);
}
