// ============================================
// SETTINGS IMPORT PROCESSOR MODULE
// ============================================

function processImportChats(jsonData) {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.data || typeof importData.data !== "object") {
      throw new Error("Неверный формат файла");
    }
    
    const chatCount = Object.keys(importData.data).length;
    
    ons.notification.confirm({
      title: "Импорт чатов",
      message: "Найдено " + chatCount + " чатов. Заменить существующие или объединить?",
      buttonLabels: ["Отмена", "Заменить", "Объединить"],
      callback: function(index) {
        if (index === 1) {
          localStorage.setItem("chat-sessions", JSON.stringify(importData.data));
          ons.notification.toast("Загружено " + chatCount + " чатов", { timeout: 2000 });
        } else if (index === 2) {
          const existing = getChatSessions();
          const merged = Object.assign({}, existing, importData.data);
          localStorage.setItem("chat-sessions", JSON.stringify(merged));
          ons.notification.toast("Всего чатов: " + Object.keys(merged).length, { timeout: 2000 });
        }
      }
    });
    
  } catch (err) {
    ons.notification.alert("Ошибка: неверный формат файла");
  }
}

function processImportSettings(jsonData) {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.data || importData.type !== "settings") {
      throw new Error("Неверный формат файла настроек");
    }
    
    ons.notification.confirm({
      title: "Импорт настроек",
      message: "Заменить текущие настройки? Это перезапишет API ключ и другие параметры.",
      buttonLabels: ["Отмена", "Импортировать"],
      callback: function(index) {
        if (index === 1) {
          for (const key in importData.data) {
            if (importData.data[key] !== null) {
              localStorage.setItem(key, importData.data[key]);
            }
          }
          ons.notification.toast("Настройки импортированы", { timeout: 2000 });
          setTimeout(function() { location.reload(); }, 1500);
        }
      }
    });
    
  } catch (err) {
    ons.notification.alert("Ошибка: неверный формат файла");
  }
}
