// ============================================
// SETTINGS API MODULE
// ============================================

function saveApiSettings() {
  const keyInput = document.getElementById("settingsApiKey");
  const hostInput = document.getElementById("settingsApiHost");
  
  const key = keyInput ? keyInput.value.trim() : "";
  const host = hostInput ? hostInput.value.trim() : "";
  
  if (key) localStorage.setItem("ollama-api-key", key);
  if (host) localStorage.setItem("ollama-host", host);
  
  ons.notification.toast("Настройки API сохранены", { timeout: 2000 });
}
