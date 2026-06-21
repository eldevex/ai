// ============================================
// CHAT SESSIONS MODULE - chat_sessions.js
// ============================================

function generateChatId() {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getChatSessions() {
  const sessions = localStorage.getItem("chat-sessions");
  return sessions ? JSON.parse(sessions) : {};
}

function saveChatSessions(sessions) {
  localStorage.setItem("chat-sessions", JSON.stringify(sessions));
}

function createNewChat() {
  const chatId = generateChatId();
  const sessions = getChatSessions();
  
  const newSession = {
    id: chatId,
    title: "Новый чат",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: localStorage.getItem("selected-model") || "qwen3-coder:480b-cloud",
    messages: []
  };
  
  sessions[chatId] = newSession;
  saveChatSessions(sessions);
  
  currentChatId = chatId;
  chatHistory = [];
  
  localStorage.setItem("last-active-chat", chatId);
  
  renderChat();
  renderChatHistoryList();
  updateToolbarTitle();
  
  const menu = document.getElementById("menu");
  if (menu) menu.close();
  
  ons.notification.toast("Новый чат создан", { timeout: 2000 });
}

function loadChatSession(chatId) {
  const sessions = getChatSessions();
  const session = sessions[chatId];
  
  if (!session) {
    createNewChat();
    return;
  }
  
  currentChatId = chatId;
  chatHistory = session.messages || [];
  
  localStorage.setItem("last-active-chat", chatId);
  
  if (session.model) {
    localStorage.setItem("selected-model", session.model);
    document.getElementById("currentModel").textContent = session.model.split(":")[0];
  }
  
  renderChat();
  renderChatHistoryList();
  updateToolbarTitle();
  
  const menu = document.getElementById("menu");
  if (menu) menu.close();
}

function saveCurrentChat() {
  if (!currentChatId) return;
  
  const sessions = getChatSessions();
  if (sessions[currentChatId]) {
    sessions[currentChatId].messages = chatHistory;
    sessions[currentChatId].updatedAt = Date.now();
    sessions[currentChatId].model = localStorage.getItem("selected-model") || "qwen3-coder:480b-cloud";
    saveChatSessions(sessions);
  }
}

function updateToolbarTitle(title) {
  const el = document.getElementById("toolbarTitle");
  if (!el) return;
  
  if (title) {
    el.textContent = title;
  } else {
    const sessions = getChatSessions();
    const session = sessions[currentChatId];
    el.textContent = session ? session.title : "Ollama AI Chat";
  }
}

function generateChatTitle(firstMessage) {
  const sessions = getChatSessions();
  const session = sessions[currentChatId];
  
  if (!session || session.title !== "Новый чат") return;
  
  let title = firstMessage.split('\n')[0].substring(0, 30);
  if (firstMessage.length > 30) title += "...";
  title = title.replace(/[#*`]/g, '').trim();
  
  if (title) {
    session.title = title;
    saveChatSessions(sessions);
    updateToolbarTitle(title);
    renderChatHistoryList();
  }
}

// ============ DELETE ALL CHATS ============

function deleteAllChats() {
  const sessions = getChatSessions();
  const chatCount = Object.keys(sessions).length;
  
  if (chatCount === 0) {
    ons.notification.toast("Нет чатов для удаления", { timeout: 2000 });
    return;
  }
  
  ons.notification.confirm({
    message: `Удалить все ${chatCount} чатов? Это действие нельзя отменить.`,
    buttonLabels: ["Отмена", "Удалить все"],
    primaryButtonIndex: 1,
    cancelable: true,
    callback: function(index) {
      if (index === 1) {
        // Удаляем все чаты
        localStorage.setItem("chat-sessions", "{}");
        localStorage.removeItem("last-active-chat");
        
        // Сбрасываем текущий чат
        currentChatId = null;
        chatHistory = [];
        
        // Создаём новый чат
        createNewChat();
        
        ons.notification.toast(`Удалено ${chatCount} чатов`, { timeout: 2000 });
      }
    }
  });
}

// ============ CHAT HISTORY RENDERING ============

function renderChatHistoryList() {
  const sessions = getChatSessions();
  const listEl = document.getElementById("chatHistoryList");
  if (!listEl) return;
  
  const sortedSessions = Object.values(sessions).sort(function(a, b) {
    return b.updatedAt - a.updatedAt;
  });
  
  let html = "";
  
  if (sortedSessions.length === 0) {
    html = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Нет чатов</div>';
  } else {
    sortedSessions.forEach(function(session) {
      const isActive = session.id === currentChatId;
      const date = new Date(session.updatedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
      const msgCount = session.messages ? session.messages.length : 0;
      
      html += '<div class="chat-history-item ' + (isActive ? 'active' : '') + '" onclick="loadChatSession(\'' + session.id + '\')">' +
        '<div class="chat-history-title">' + escapeHtml(session.title) + '</div>' +
        '<div class="chat-history-meta">' + date + ' • ' + msgCount + ' сообщ. • ' + session.model.split(":")[0] + '</div>' +
        '<div class="chat-history-actions" onclick="event.stopPropagation()">' +
          '<button class="chat-history-btn" onclick="showRenameDialog(\'' + session.id + '\')">Переименовать</button>' +
          '<button class="chat-history-btn delete" onclick="deleteChat(\'' + session.id + '\')">Удалить</button>' +
        '</div>' +
      '</div>';
    });
  }
  
  listEl.innerHTML = html;
}

function showRenameDialog(chatId) {
  renameChatId = chatId;
  const sessions = getChatSessions();
  const session = sessions[chatId];
  if (!session) return;
  
  const input = document.getElementById("newChatName");
  if (input) input.children[0].value = session.title;
  
  const dialog = document.getElementById("renameDialog");
  if (dialog) dialog.show();
}

function confirmRename() {
  const input = document.getElementById("newChatName");
  const newName = input ? input.children[0].value.trim() : "";
  
  if (!newName || !renameChatId) {
    const dialog = document.getElementById("renameDialog");
    if (dialog) dialog.hide();
    return;
  }
  
  const sessions = getChatSessions();
  if (sessions[renameChatId]) {
    sessions[renameChatId].title = newName;
    saveChatSessions(sessions);
    renderChatHistoryList();
    if (renameChatId === currentChatId) {
      updateToolbarTitle(newName);
    }
    ons.notification.toast("Чат переименован", { timeout: 2000 });
  }
  
  renameChatId = null;
  const dialog = document.getElementById("renameDialog");
  if (dialog) dialog.hide();
}

function deleteChat(chatId) {
  ons.notification.confirm("Удалить этот чат?").then(function(idx) {
    if (idx === 1) {
      const sessions = getChatSessions();
      delete sessions[chatId];
      saveChatSessions(sessions);
      
      if (localStorage.getItem("last-active-chat") === chatId) {
        localStorage.removeItem("last-active-chat");
      }
      
      if (chatId === currentChatId) {
        const remainingIds = Object.keys(sessions);
        if (remainingIds.length > 0) {
          loadChatSession(remainingIds[0]);
        } else {
          createNewChat();
        }
      } else {
        renderChatHistoryList();
      }
      
      ons.notification.toast("Чат удалён", { timeout: 2000 });
    }
  });
}
