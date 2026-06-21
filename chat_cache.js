// ============================================
// CACHE CLEANUP MODULE - chat_cache.js
// ============================================

// Три папки для очистки
const CACHE_DIRS = [
  "/data/user/0/ollama.bober.eldevex/cache",
  "/data/user/0/ollama.bober.eldevex/app_webview/Default/IndexedDB",
  "/data/user/0/ollama.bober.eldevex/app_webview/BrowserMetrics"
];

// Ключи для хранения настроек
const CACHE_AUTO_CLEANUP_KEY = "cache-auto-cleanup-enabled";
const CACHE_MAX_AGE_KEY = "cache-max-age";

// Фиксированный интервал проверки - всегда раз в минуту
const CLEANUP_CHECK_INTERVAL_MS = 60 * 1000; // 1 минута

// Доступные возрасты файлов для удаления
const MAX_AGE_OPTIONS = [
  { label: "1 минута", value: 60 * 1000 },
  { label: "5 минут", value: 5 * 60 * 1000 },
  { label: "15 минут", value: 15 * 60 * 1000 },
  { label: "30 минут", value: 30 * 60 * 1000 },
  { label: "1 час", value: 60 * 60 * 1000 },
  { label: "2 часа", value: 2 * 60 * 60 * 1000 },
  { label: "3 часа", value: 3 * 60 * 60 * 1000 },
  { label: "4 часа", value: 4 * 60 * 60 * 1000 },
  { label: "5 часов", value: 5 * 60 * 60 * 1000 },
  { label: "6 часов", value: 6 * 60 * 60 * 1000 },
  { label: "7 часов", value: 7 * 60 * 60 * 1000 },
  { label: "8 часов", value: 8 * 60 * 60 * 1000 },
  { label: "9 часов", value: 9 * 60 * 60 * 1000 },
  { label: "10 часов", value: 10 * 60 * 60 * 1000 },
  { label: "12 часов", value: 12 * 60 * 60 * 1000 },
  { label: "1 день", value: 24 * 60 * 60 * 1000 },
  { label: "2 дня", value: 2 * 24 * 60 * 60 * 1000 },
  { label: "3 дня", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "4 дня", value: 4 * 24 * 60 * 60 * 1000 },
  { label: "5 дней", value: 5 * 24 * 60 * 60 * 1000 },
  { label: "6 дней", value: 6 * 24 * 60 * 60 * 1000 },
  { label: "7 дней", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "1 неделя", value: 7 * 24 * 60 * 60 * 1000 }
];

// Значение по умолчанию - 5 минут
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

let cleanupIntervalId = null;

// ============ GETTERS/SETTERS ============

function isAutoCleanupEnabled() {
  return localStorage.getItem(CACHE_AUTO_CLEANUP_KEY) === "true";
}

function setAutoCleanupEnabled(enabled) {
  localStorage.setItem(CACHE_AUTO_CLEANUP_KEY, enabled ? "true" : "false");
}

function getMaxAge() {
  return parseInt(localStorage.getItem(CACHE_MAX_AGE_KEY)) || DEFAULT_MAX_AGE_MS;
}

function setMaxAge(ageMs) {
  localStorage.setItem(CACHE_MAX_AGE_KEY, ageMs.toString());
}

// ============ CLEANUP LOGIC ============

// Инициализация очистки кеша
function initCacheCleanup() {
  // Останавливаем текущий интервал если есть
  stopCacheCleanup();
  
  // Если автоматическая очистка включена - запускаем
  if (isAutoCleanupEnabled()) {
    // Очищаем сразу при старте
    cleanupCache();
    
    // Запускаем периодическую проверку (всегда раз в минуту)
    cleanupIntervalId = setInterval(cleanupCache, CLEANUP_CHECK_INTERVAL_MS);
    
    console.log("Auto cache cleanup enabled, checking every 60 seconds");
  } else {
    console.log("Auto cache cleanup disabled");
  }
}

// Остановка очистки
function stopCacheCleanup() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Перезапуск с новыми настройками
function restartCacheCleanup() {
  stopCacheCleanup();
  initCacheCleanup();
}

// Очистка одной директории (автоматическая по возрасту)
async function cleanupDirectory(dirPath, maxAge, now) {
  let deletedCount = 0;
  let totalFreed = 0;
  let failedCount = 0;
  
  try {
    const dir = new android.File(dirPath);
    
    if (!dir.exists()) {
      console.log("Directory does not exist: " + dirPath);
      return { deleted: 0, freed: 0, failed: 0 };
    }
    
    // Получаем список файлов и папок
    const files = dir.listFiles();
    if (!files || files.length === 0) {
      return { deleted: 0, freed: 0, failed: 0 };
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (file.isDirectory()) {
          // Рекурсивно очищаем подпапку по возрасту
          const subResult = await cleanupDirectory(file.toString(), maxAge, now);
          deletedCount += subResult.deleted;
          totalFreed += subResult.freed;
          failedCount += subResult.failed;
          
          // Пробуем удалить пустую директорию
          try {
            if (file.list() && file.list().length === 0) {
              if (file.delete()) {
                console.log("Deleted empty dir: " + file.getName());
              }
            }
          } catch (e) {
            // Игнорируем ошибку удаления директории
          }
        } else {
          // Это файл - проверяем возраст
          const lastModified = file.lastModified();
          const age = now - lastModified;
          
          if (age > maxAge) {
            const fileSize = file.length();
            const fileName = file.getName();
            
            if (file.delete()) {
              deletedCount++;
              totalFreed += fileSize;
              console.log("Deleted: " + fileName + " (age: " + Math.round(age/1000) + "s)");
            } else {
              failedCount++;
              console.warn("Failed to delete: " + fileName);
            }
          }
        }
      } catch (fileError) {
        failedCount++;
        console.error("Error processing file:", fileError);
      }
    }
    
  } catch (error) {
    console.error("Error cleaning directory " + dirPath + ":", error);
  }
  
  return { deleted: deletedCount, freed: totalFreed, failed: failedCount };
}

// Основная функция очистки - всех трёх папок
async function cleanupCache() {
  try {
    // Проверяем доступность Android API
    if (typeof android === 'undefined' || !android.files) {
      console.warn("Android API not available for cache cleanup");
      return;
    }
    
    const now = Date.now();
    const maxAge = getMaxAge();
    
    let totalDeleted = 0;
    let totalFreed = 0;
    let totalFailed = 0;
    
    // Очищаем все три папки
    for (const dirPath of CACHE_DIRS) {
      const result = await cleanupDirectory(dirPath, maxAge, now);
      totalDeleted += result.deleted;
      totalFreed += result.freed;
      totalFailed += result.failed;
    }
    
    if (totalDeleted > 0 || totalFailed > 0) {
      console.log("Cache cleanup complete: " + totalDeleted + " files deleted, " + 
                  Math.round(totalFreed / 1024) + " KB freed, " + totalFailed + " failed");
    }
    
  } catch (error) {
    console.error("Cache cleanup error:", error);
  }
}

// ============ FORCE CLEANUP (ПРИНУДИТЕЛЬНАЯ ОЧИСТКА) ============

// Рекурсивное удаление ВСЕГО содержимого папки (файлы и подпапки)
function deleteAllContents(file) {
  let deleted = 0;
  let failed = 0;
  let size = 0;
  
  try {
    if (!file.exists()) {
      return { deleted: 0, failed: 0, size: 0 };
    }
    
    if (file.isDirectory()) {
      // Сначала удаляем всё внутри
      const contents = file.listFiles();
      if (contents && contents.length > 0) {
        for (let i = 0; i < contents.length; i++) {
          const result = deleteAllContents(contents[i]);
          deleted += result.deleted;
          failed += result.failed;
          size += result.size;
        }
      }
      
      // Теперь удаляем саму директорию (если это не корневая папка кеша)
      // Не удаляем корневые папки, только их содержимое
      try {
        // Проверяем, является ли это одной из наших корневых папок
        const path = file.toString();
        let isRootCacheDir = false;
        for (const cacheDir of CACHE_DIRS) {
          if (path === cacheDir || path === cacheDir + "/") {
            isRootCacheDir = true;
            break;
          }
        }
        
        // Удаляем только если это не корневая папка кеша
        if (!isRootCacheDir) {
          if (file.delete()) {
            deleted++;
            console.log("Deleted directory: " + file.getName());
          } else {
            // Пробуем deleteFileOrFolder как fallback
            try {
              if (file.deleteFileOrFolder && file.deleteFileOrFolder()) {
                deleted++;
                console.log("Deleted directory via deleteFileOrFolder: " + file.getName());
              } else {
                failed++;
              }
            } catch (e) {
              failed++;
            }
          }
        }
      } catch (e) {
        console.error("Error deleting directory:", e);
        failed++;
      }
      
    } else {
      // Это файл - удаляем
      const fileSize = file.length();
      const fileName = file.getName();
      
      if (file.delete()) {
        deleted++;
        size += fileSize;
        console.log("Deleted file: " + fileName);
      } else {
        // Пробуем deleteFileOrFolder как fallback
        try {
          if (file.deleteFileOrFolder && file.deleteFileOrFolder()) {
            deleted++;
            size += fileSize;
            console.log("Deleted file via deleteFileOrFolder: " + fileName);
          } else {
            failed++;
            console.warn("Failed to delete file: " + fileName);
          }
        } catch (e) {
          failed++;
          console.warn("Failed to delete file: " + fileName, e);
        }
      }
    }
  } catch (error) {
    console.error("Error in deleteAllContents:", error);
    failed++;
  }
  
  return { deleted: deleted, failed: failed, size: size };
}

// Ручной запуск очистки (принудительная очистка ВСЕГО)
async function forceCleanupCache() {
  try {
    // Проверяем доступность API перед очисткой
    if (typeof android === 'undefined' || !android.files) {
      ons.notification.alert("Ошибка: Android API недоступен. Очистка кеша невозможна в этом окружении.");
      return;
    }
    
    console.log("Starting force cleanup of cache directories...");
    
    let totalDeleted = 0;
    let totalFailed = 0;
    let totalSize = 0;
    let dirResults = [];
    
    // Очищаем все три папки полностью
    for (const dirPath of CACHE_DIRS) {
      try {
        console.log("Processing directory: " + dirPath);
        const dir = new android.File(dirPath);
        
        if (!dir.exists()) {
          console.log("Directory does not exist: " + dirPath);
          dirResults.push({ path: dirPath, status: 'not_found' });
          continue;
        }
        
        // Используем рекурсивное удаление всего содержимого
        const result = deleteAllContents(dir);
        
        totalDeleted += result.deleted;
        totalFailed += result.failed;
        totalSize += result.size;
        
        dirResults.push({ 
          path: dirPath, 
          status: 'cleaned',
          deleted: result.deleted,
          failed: result.failed,
          size: result.size
        });
        
        console.log("Cleaned " + dirPath + ": " + result.deleted + " items, " + result.failed + " failed");
        
      } catch (e) {
        console.error("Force cleanup error for " + dirPath + ":", e);
        dirResults.push({ path: dirPath, status: 'error', error: e.message });
      }
    }
    
    // Формируем отчёт
    console.log("Force cleanup complete. Total: " + totalDeleted + " deleted, " + totalFailed + " failed");
    
    let message = "";
    if (totalDeleted > 0) {
      message = `✅ Удалено объектов: ${totalDeleted}\n`;
      message += `💾 Освобождено: ${(totalSize / 1024).toFixed(1)} KB\n`;
      if (totalFailed > 0) {
        message += `⚠️ Не удалось удалить: ${totalFailed}`;
      }
      ons.notification.toast(message.replace(/\n/g, " "), { timeout: 3000 });
    } else if (totalFailed > 0) {
      ons.notification.alert(`⚠️ Не удалось удалить ${totalFailed} объектов. Возможно, файлы используются системой.`);
    } else {
      ons.notification.toast("Кеш уже пуст", { timeout: 2000 });
    }
    
    // Автоматически обновляем информацию на экране настроек
    setTimeout(function() {
      if (typeof refreshCacheInfo === 'function') {
        refreshCacheInfo();
      }
    }, 500);
    
  } catch (error) {
    console.error("Force cleanup error:", error);
    ons.notification.alert("Ошибка очистки: " + error.message);
  }
}

// ============ INFO FUNCTIONS ============

// Рекурсивный подсчёт размера и количества файлов
function calculateDirSize(file, stats) {
  try {
    if (!file.exists()) return;
    
    if (file.isDirectory()) {
      const contents = file.listFiles();
      if (contents && contents.length > 0) {
        for (let i = 0; i < contents.length; i++) {
          calculateDirSize(contents[i], stats);
        }
      }
    } else {
      stats.count++;
      stats.size += file.length();
      
      const modified = file.lastModified();
      if (modified < stats.oldestTime) {
        stats.oldestTime = modified;
        stats.oldestFile = file.getName();
        stats.oldestPath = file.toString();
      }
      if (modified > stats.newestTime) {
        stats.newestTime = modified;
      }
    }
  } catch (e) {
    console.error("Error calculating size for " + file.toString() + ":", e);
  }
}

// Получение информации о кеше (объединённая статистика по всем папкам)
function getCacheInfo() {
  try {
    if (typeof android === 'undefined' || !android.files) {
      console.error("Android API not available");
      return { error: "Android API not available" };
    }
    
    let stats = {
      count: 0,
      size: 0,
      oldestTime: Date.now(),
      newestTime: 0,
      oldestFile: null,
      oldestPath: null
    };
    
    let existingDirs = 0;
    
    for (const dirPath of CACHE_DIRS) {
      try {
        console.log("Checking directory: " + dirPath);
        const dir = new android.File(dirPath);
        
        if (!dir.exists()) {
          console.log("Directory does not exist: " + dirPath);
          continue;
        }
        
        existingDirs++;
        calculateDirSize(dir, stats);
        
      } catch (e) {
        console.error("Error reading cache dir " + dirPath + ":", e);
      }
    }
    
    const result = {
      exists: existingDirs > 0,
      path: CACHE_DIRS.join(", "),
      fileCount: stats.count,
      totalSize: stats.size,
      totalSizeKB: Math.round(stats.size / 1024),
      totalSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      oldestFile: stats.oldestFile,
      oldestPath: stats.oldestPath,
      oldestAgeMinutes: stats.count > 0 ? Math.round((Date.now() - stats.oldestTime) / 60000) : 0,
      newestAgeMinutes: stats.count > 0 ? Math.round((Date.now() - stats.newestTime) / 60000) : 0,
      dirsFound: existingDirs
    };
    
    console.log("Cache info:", result);
    return result;
    
  } catch (error) {
    console.error("getCacheInfo error:", error);
    return { error: error.message };
  }
}

// Получить текстовое описание текущих настроек
function getCleanupSettingsText() {
  if (!isAutoCleanupEnabled()) {
    return "Автоочистка отключена";
  }
  
  const maxAge = MAX_AGE_OPTIONS.find(a => a.value === getMaxAge()) || MAX_AGE_OPTIONS[1];
  
  return "Проверка: каждую минуту, удаление: " + maxAge.label;
}

// ============ UI FUNCTIONS ============

// Показать информацию о кеше
function showCacheInfo() {
  const info = getCacheInfo();
  
  if (info.error) {
    ons.notification.alert("Ошибка: " + info.error);
    return;
  }
  
  const settingsText = getCleanupSettingsText();
  
  let message = "📁 Информация о кеше\n\n";
  
  if (!info.exists || info.fileCount === 0) {
    message += "Кеш-папки пусты или недоступны\n\n";
  } else {
    message += `📊 Файлов: ${info.fileCount}\n`;
    message += `💾 Размер: ${info.totalSizeMB} MB (${info.totalSizeKB} KB)\n`;
    message += `🕐 Самый старый: ${info.oldestFile || 'нет'} (${info.oldestAgeMinutes} мин)\n\n`;
  }
  
  message += `⚙️ ${settingsText}`;
  message += `\n\n📂 Папки:\n• cache\n• IndexedDB\n• BrowserMetrics`;
    
  ons.notification.alert(message);
}

// Быстрое переключение автоочистки (для страницы настроек)
function toggleAutoCleanup() {
  const newState = !isAutoCleanupEnabled();
  setAutoCleanupEnabled(newState);
  restartCacheCleanup();
  
  const status = newState ? "Автоочистка включена" : "Автоочистка отключена";
  ons.notification.toast(status, { timeout: 2000 });
  
  return newState;
}
