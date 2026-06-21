// ============================================
// WEB SEARCH MODULE - chat_websearch.js
// ============================================

let isSearchEnabled = false;

// ============ SEARCH TOGGLE ============

function initSearchProvider() {
  updateSearchUI();
}

function updateSearchUI() {
  const searchBtn = document.getElementById("searchBtn");
  const searchBadge = document.getElementById("searchBadge");
  
  if (!searchBtn) return;
  
  if (isSearchEnabled) {
    searchBtn.classList.add("active");
    if (searchBadge) searchBadge.style.display = "inline";
  } else {
    searchBtn.classList.remove("active");
    if (searchBadge) searchBadge.style.display = "none";
  }
}

function toggleSearch() {
  isSearchEnabled = !isSearchEnabled;
  updateSearchUI();
  
  const status = isSearchEnabled ? "Веб-поиск включен (DuckDuckGo)" : "Веб-поиск выключен";
  ons.notification.toast(status, { timeout: 2000 });
}

// ============ WEB SEARCH FUNCTIONS ============

async function performWebSearch(query) {
  try {
    // Пробуем несколько стратегий поиска
    let results = await tryMultipleSearchStrategies(query);
    return formatSearchResults(results, "DuckDuckGo");
  } catch (error) {
    console.error("Search error:", error);
    // Возвращаем информативное сообщение об ошибке
    return "⚠️ Поиск временно недоступен. Возможные причины:\n" +
           "• Блокировка CORS в браузере\n" +
           "• Нестабильность прокси-серверов\n" +
           "• Попробуйте отключить поиск и спросить напрямую\n\n" +
           "Техническая ошибка: " + error.message;
  }
}

async function tryMultipleSearchStrategies(query) {
  const strategies = [
    // Стратегия 1: Прямой запрос к DuckDuckGo HTML (работает редко из-за CORS)
    () => searchDuckDuckGoDirect(query),

    // Стратегия 3: Через corsproxy.io
    () => searchViaProxy('https://corsproxy.io/?url=', query),
    // Стратегия 4: Через codetabs
    () => searchViaProxy('https://api.codetabs.com/v1/proxy?quest=', query),
    // Стратегия 5: Альтернативный прокси
    () => searchViaProxy('https://api.codetabs.com/v1/proxy?quest=', query),
        // Стратегия 2: Через allorigins прокси
    () => searchViaProxy('https://api.allorigins.win/get?url=', query),
  ];
  
  let lastError = null;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying search strategy ${i + 1}...`);
      const results = await strategies[i]();
      if (results && results.length > 0) {
        console.log(`Strategy ${i + 1} succeeded with ${results.length} results`);
        return results;
      }
    } catch (error) {
      console.warn(`Strategy ${i + 1} failed:`, error.message);
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error("Все стратегии поиска исчерпаны");
}

// Прямой запрос (обычно блокируется CORS, но иногда работает в некоторых окружениях)
async function searchDuckDuckGoDirect(query) {
  const searchUrl = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
  
  const response = await fetch(searchUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
    // mode: 'no-cors' даст opaque response, но мы не сможем прочитать содержимое
    // поэтому пробуем без него сначала
  });
  
  if (!response.ok) throw new Error("HTTP " + response.status);
  
  const html = await response.text();
  return parseDuckDuckGoHTML(html);
}

// Запрос через CORS-прокси
async function searchViaProxy(proxyUrl, query) {
  const targetUrl = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
  const fetchUrl = proxyUrl + encodeURIComponent(targetUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут
  
  try {
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/html, */*"
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error("HTTP " + response.status);
    
    let html;
    const text = await response.text();
    
    // allorigins возвращает JSON с полем contents
    if (proxyUrl.includes('allorigins')) {
      try {
        const wrapper = JSON.parse(text);
        html = wrapper.contents;
      } catch (e) {
        html = text;
      }
    } else {
      html = text;
    }
    
    if (!html || html.length < 100) {
      throw new Error("Empty response");
    }
    
    return parseDuckDuckGoHTML(html);
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============ HTML PARSER ============

function parseDuckDuckGoHTML(html) {
  const results = [];
  
  // Создаём временный DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Пробуем разные селекторы для результатов
  const selectors = [
    '.result',
    '.web-result', 
    '.result__body',
    '[data-testid="result"]',
    '.links_main',
    '.search-result'
  ];
  
  let resultElements = [];
  
  for (const selector of selectors) {
    resultElements = doc.querySelectorAll(selector);
    if (resultElements.length > 0) break;
  }
  
  // Fallback: ищем любые элементы с ссылками, похожие на результаты
  if (resultElements.length === 0) {
    const allDivs = doc.querySelectorAll('div, article, section');
    for (const el of allDivs) {
      const link = el.querySelector('a[href]');
      const title = el.querySelector('h2, h3, h4, .title, [class*="title"]');
      if (link && (title || el.textContent.length > 50)) {
        resultElements.push(el);
      }
    }
  }
  
  for (const result of resultElements) {
    try {
      // Ищем ссылку
      const linkEl = result.querySelector('a.result__a') || 
                     result.querySelector('a[href*="duckduckgo.com/l/?"]') ||
                     result.querySelector('a[href^="http"]') ||
                     result.querySelector('a');
      
      if (!linkEl) continue;
      
      let url = linkEl.getAttribute('href') || '';
      
      // Расшифровываем редирект DuckDuckGo
      if (url.includes('duckduckgo.com/l/?')) {
        const urlMatch = url.match(/uddg=([^&]+)/);
        if (urlMatch) {
          url = decodeURIComponent(urlMatch[1]);
        }
      }
      
      // Фильтруем невалидные URL
      if (!url || url.startsWith('javascript:') || url.startsWith('#')) continue;
      if (!url.startsWith('http') && !url.startsWith('//')) continue;
      if (url.startsWith('//')) url = 'https:' + url;
      
      // Заголовок
      const title = linkEl.textContent?.trim() || 
                   result.querySelector('h2, h3, .result__title')?.textContent?.trim() ||
                   'Без названия';
      
      // Описание
      const snippetEl = result.querySelector('.result__snippet') ||
                       result.querySelector('.result__description') ||
                       result.querySelector('[class*="snippet"]') ||
                       result.querySelector('[class*="description"]') ||
                       result.querySelector('p');
      
      const snippet = snippetEl ? snippetEl.textContent.trim() : '';
      
      // Пропускаем рекламу
      const text = result.textContent.toLowerCase();
      const isAd = text.includes('реклама') || 
                   text.includes('ad ') || 
                   text.includes('sponsored') ||
                   result.querySelector('[class*="ad"]') !== null;
      
      if (!isAd && title && url && title.length > 5) {
        // Проверяем на дубликаты
        const isDuplicate = results.some(r => r.url === url);
        if (!isDuplicate) {
          results.push({
            title: title.substring(0, 150),
            url: url,
            snippet: snippet.substring(0, 300)
          });
        }
      }
      
      if (results.length >= 5) break;
      
    } catch (e) {
      console.warn("Error parsing result:", e);
    }
  }
  
  return results;
}

function formatSearchResults(results, providerName) {
  if (!results || results.length === 0) {
    return "🔍 Результаты не найдены.";
  }
  
  let formatted = "🔍 Результаты поиска (" + providerName + "):\n\n";
  
  results.forEach((r, i) => {
    formatted += `${i + 1}. ${r.title}\n`;
    if (r.url) formatted += `   🔗 ${r.url}\n`;
    if (r.snippet) formatted += `   ${r.snippet}\n`;
    formatted += "\n";
  });
  
  return formatted;
}

// ============ UI INDICATORS ============

function addSearchIndicator() {
  const id = "searching-" + Date.now();
  const el = document.createElement("div");
  el.id = id;
  el.className = "thinking";
  el.innerHTML = "🔍 Поиск в интернете...";
  const container = document.getElementById("chatContainer");
  if (container) {
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }
  return id;
}

function removeSearchIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
