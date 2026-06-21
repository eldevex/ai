// ============================================
// THEME MODULE - chat_theme.js
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem("app-theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme("dark");
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  const headerIcon = document.getElementById("themeIconHeader");
  
  if (theme === "light") {
    html.setAttribute("data-theme", "light");
    if (headerIcon) headerIcon.textContent = "☀️";
  } else {
    html.removeAttribute("data-theme");
    if (headerIcon) headerIcon.textContent = "🌙";
  }
  
  localStorage.setItem("app-theme", theme);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem("app-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  
  const themeName = newTheme === "dark" ? "Тёмная тема" : "Светлая тема";
  ons.notification.toast(themeName + " включена", { timeout: 2000 });
}
