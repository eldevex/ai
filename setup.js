function saveSetup() {
  const key = $("#ollamaKey")[0].children[0].value.trim();
  const host = $("#ollamaHost")[0].children[0].value.trim() || "https://api.ollama.com";
  
  if (!key) {
    ons.notification.alert("Введите API ключ!");
    return;
  }
  
  localStorage.setItem("ollama-api-key", key);
  localStorage.setItem("ollama-host", host);
  localStorage.setItem("ollama-setup-complete", "yes");
  localStorage.setItem("selected-model", "qwen3-coder:480b-cloud");
  
  // Инициализируем хранилище чатов
  if (!localStorage.getItem("chat-sessions")) {
    localStorage.setItem("chat-sessions", "{}");
  }
  
  location.href = "chat.html";
}
