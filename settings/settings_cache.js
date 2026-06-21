// ============================================
// SETTINGS CACHE UI MODULE
// ============================================

function onCacheToggle() {
  const toggle = document.getElementById("cacheAutoCleanupToggle");
  const maxAgeSelect = document.getElementById("cacheMaxAgeSelect");
  
  if (maxAgeSelect && toggle) {
    maxAgeSelect.disabled = !toggle.checked;
    maxAgeSelect.style.opacity = toggle.checked ? "1" : "0.5";
  }
}

function saveCacheSettings() {
  const toggle = document.getElementById("cacheAutoCleanupToggle");
  const maxAgeSelect = document.getElementById("cacheMaxAgeSelect");
  
  if (toggle && maxAgeSelect) {
    setAutoCleanupEnabled(toggle.checked);
    setMaxAge(parseInt(maxAgeSelect.value));
    
    // Перезапускаем с новыми настройками
    restartCacheCleanup();
    
    ons.notification.toast("Настройки кеша сохранены", { timeout: 2000 });
  }
}

function refreshCacheInfo() {
  console.log("Refreshing cache info...");
  
  const info = getCacheInfo();
  console.log("Cache info result:", info);
  
  const fileCountEl = document.getElementById("cacheFileCount");
  const sizeEl = document.getElementById("cacheSize");
  const oldestEl = document.getElementById("cacheOldest");
  
  if (info.error) {
    console.error("Cache info error:", info.error);
    if (fileCountEl) fileCountEl.textContent = "Н/Д";
    if (sizeEl) sizeEl.textContent = "Н/Д";
    if (oldestEl) oldestEl.textContent = "Ошибка: " + info.error;
    return;
  }
  
  if (!info.exists || info.fileCount === 0) {
    if (fileCountEl) fileCountEl.textContent = "0";
    if (sizeEl) sizeEl.textContent = "0 MB";
    if (oldestEl) oldestEl.textContent = "Папки пусты";
    return;
  }
  
  if (fileCountEl) fileCountEl.textContent = info.fileCount;
  if (sizeEl) sizeEl.textContent = info.totalSizeMB + " MB";
  if (oldestEl) {
    oldestEl.textContent = info.oldestFile 
      ? info.oldestFile + " (" + info.oldestAgeMinutes + " мин)"
      : "Нет файлов";
  }
  
  console.log("Cache info updated successfully");
}

function clearCacheNow() {
  ons.notification.confirm({
    message: "Очистить кеш прямо сейчас? Все временные файлы и папки из трёх директорий (cache, IndexedDB, BrowserMetrics) будут удалены.",
    buttonLabels: ["Отмена", "Очистить"],
    primaryButtonIndex: 1,
    callback: function(index) {
      if (index === 1) {
        console.log("User confirmed cache cleanup");
        forceCleanupCache();
      }
    }
  });
}

function loadCacheSettings() {
  const cacheToggle = document.getElementById("cacheAutoCleanupToggle");
  const maxAgeSelect = document.getElementById("cacheMaxAgeSelect");
  
  if (cacheToggle) cacheToggle.checked = isAutoCleanupEnabled();
  if (maxAgeSelect) maxAgeSelect.value = getMaxAge();
}

function updateCacheUI() {
  const maxAgeSelect = document.getElementById("cacheMaxAgeSelect");
  
  if (maxAgeSelect) {
    const isCacheEnabled = isAutoCleanupEnabled();
    maxAgeSelect.disabled = !isCacheEnabled;
    maxAgeSelect.style.opacity = isCacheEnabled ? "1" : "0.5";
  }
  
  // Небольшая задержка для корректного обновления
  setTimeout(refreshCacheInfo, 100);
}
