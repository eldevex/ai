// ============================================
// SETTINGS VARS & UTILS MODULE
// ============================================

// Состояние секций (открыты/закрыты)
const sectionStates = {
  api: false,
  prompt: false,
  cache: false,
  about: false,
  export: false
};

// Константы
const PERMISSION_WRITE_EXTERNAL_STORAGE = "android.permission.WRITE_EXTERNAL_STORAGE";
const PERMISSION_READ_EXTERNAL_STORAGE = "android.permission.READ_EXTERNAL_STORAGE";
const BACKUP_DIR_LEGACY = "/sdcard/OllamaAI";  // Для Android 10 и ниже

// Глобальные переменные
var pendingPermissionCallback = null;
var pendingExportData = null;
var pendingImportCallback = null;

// Проверка доступности Android API
function isAndroidAvailable() {
  return (typeof android !== "undefined" && android.system);
}

// Получение уровня API Android
function getAndroidApiLevel() {
  if (!isAndroidAvailable()) return 0;
  try {
    return android.system.getApiLevel();
  } catch (e) {
    return 0;
  }
}

// Получение папки для бэкапов (Android/data/[package]/files/Backups)
function getBackupDir() {
  try {
    const externalDir = android.files.getExternalFilesDir();
    if (!externalDir) {
      throw new Error("External files dir not available");
    }
    
    const backupDir = new android.File(externalDir, "Backups");
    if (!backupDir.exists()) {
      backupDir.mkdirs();
    }
    
    return backupDir;
  } catch (e) {
    console.error("Get backup dir error:", e);
    return null;
  }
}

// Проверка разрешений (только для Android 10 и ниже)
function checkStoragePermissions() {
  if (!isAndroidAvailable()) return true;
  
  const apiLevel = getAndroidApiLevel();
  
  if (apiLevel >= 23 && apiLevel <= 29) {
    try {
      return android.system.checkRuntimePermission(PERMISSION_WRITE_EXTERNAL_STORAGE);
    } catch (e) {
      return false;
    }
  }
  
  return true;
}

// Запрос разрешений (только для Android 6-10)
function requestStoragePermissions(callback) {
  pendingPermissionCallback = callback;
  
  if (!isAndroidAvailable()) {
    callback(true);
    return;
  }
  
  const apiLevel = getAndroidApiLevel();
  
  if (apiLevel >= 30) {
    callback(true);
    return;
  }
  
  if (apiLevel >= 23) {
    ons.notification.confirm({
      title: "Требуется разрешение",
      message: "Для экспорта/импорта файлов необходим доступ к памяти устройства. Разрешить?",
      buttonLabels: ["Отмена", "Разрешить"],
      callback: function(index) {
        if (index === 1) {
          android.system.requestPermissions(PERMISSION_WRITE_EXTERNAL_STORAGE);
          
          setTimeout(function() {
            const granted = checkStoragePermissions();
            if (pendingPermissionCallback) {
              pendingPermissionCallback(granted);
              pendingPermissionCallback = null;
            }
          }, 1000);
        } else {
          if (pendingPermissionCallback) {
            pendingPermissionCallback(false);
            pendingPermissionCallback = null;
          }
        }
      }
    });
  } else {
    callback(true);
  }
}
