// Claude Browser Extension - Popup Script

const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 1024;

let conversationHistory = [];
let isLoading = false;

// DOM Elements
const messagesEl = document.getElementById('messages');
const welcomeEl = document.getElementById('welcome');
const userInputEl = document.getElementById('userInput');
const sendBtnEl = document.getElementById('sendBtn');
const charCountEl = document.getElementById('charCount');
const apiWarningEl = document.getElementById('apiWarning');
const newChatBtnEl = document.getElementById('newChatBtn');
const settingsBtnEl = document.getElementById('settingsBtn');
const goSettingsBtnEl = document.getElementById('goSettingsBtn');
const quickActionsEl = document.getElementById('quickActions');

// Initialize
async function init() {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (!apiKey) {
    apiWarningEl.style.display = 'block';
    userInputEl.disabled = true;
    sendBtnEl.disabled = true;
  }
  setupEventListeners();
}

function setupEventListeners() {
  // Input events
  userInputEl.addEventListener('input', onInputChange);
  userInputEl.addEventListener('keydown', onKeyDown);

  // Button events
  sendBtnEl.addEventListener('click', sendMessage);
  newChatBtnEl.addEventListener('click', startNewChat);
  settingsBtnEl.addEventListener('click', openSettings);
  goSettingsBtnEl.addEventListener('click', openSettings);

  // Quick actions
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
  });

  // Suggestion chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInputEl.value = chip.dataset.text;
      onInputChange();
      sendMessage();
    });
  });
}

function onInputChange() {
  const value = userInputEl.value;
  const len = value.length;
  charCountEl.textContent = `${len} / 10000`;
  charCountEl.classList.toggle('warning', len > 9000);

  // Auto-resize textarea
  userInputEl.style.height = 'auto';
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 120) + 'px';

  // Enable/disable send button
  sendBtnEl.disabled = !value.trim() || isLoading;
}

function onKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtnEl.disabled) sendMessage();
  }
}

async function sendMessage() {
  const text = userInputEl.value.trim();
  if (!text || isLoading) return;

  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (!apiKey) {
    showApiWarning();
    return;
  }

  // Hide welcome screen
  if (welcomeEl) welcomeEl.style.display = 'none';

  // Add user message to UI
  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  // Clear input
  userInputEl.value = '';
  userInputEl.style.height = 'auto';
  onInputChange();

  // Send to API
  await callClaudeAPI(apiKey);
}

async function callClaudeAPI(apiKey) {
  isLoading = true;
  sendBtnEl.disabled = true;

  // Show typing indicator
  const typingEl = appendTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: conversationHistory,
        system: 'You are Claude, a helpful AI assistant. You are running as a browser extension. When users ask about the current page, you have access to page content provided in their messages. Be concise but thorough. Format responses clearly. Support Chinese and English.',
      }),
    });

    typingEl.remove();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 请求失败 (${response.status})`);
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || '';

    conversationHistory.push({ role: 'assistant', content: assistantMessage });
    appendMessage('assistant', assistantMessage);

  } catch (err) {
    typingEl.remove();
    appendError(err.message || '请求失败，请检查网络连接和 API Key');
  } finally {
    isLoading = false;
    sendBtnEl.disabled = !userInputEl.value.trim();
  }
}

function appendMessage(role, text) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  const header = document.createElement('div');
  header.className = 'message-header';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'U' : 'C';

  const name = document.createElement('span');
  name.textContent = role === 'user' ? '你' : 'Claude';

  if (role === 'assistant') {
    header.appendChild(avatar);
    header.appendChild(name);
  } else {
    header.appendChild(name);
    header.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  // Basic markdown formatting
  formatMessageBubble(bubble, text);

  messageEl.appendChild(header);
  messageEl.appendChild(bubble);
  messagesEl.appendChild(messageEl);
  scrollToBottom();

  return messageEl;
}

function formatMessageBubble(el, text) {
  // Convert basic markdown to HTML safely
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  el.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function appendTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message assistant';

  const header = document.createElement('div');
  header.className = 'message-header';
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'C';
  const name = document.createElement('span');
  name.textContent = 'Claude';
  header.appendChild(avatar);
  header.appendChild(name);

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    indicator.appendChild(dot);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(indicator);
  messagesEl.appendChild(wrapper);
  scrollToBottom();

  return wrapper;
}

function appendError(msg) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant';

  const errorEl = document.createElement('div');
  errorEl.className = 'message-error';
  errorEl.textContent = `错误: ${msg}`;

  messageEl.appendChild(errorEl);
  messagesEl.appendChild(messageEl);
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function startNewChat() {
  conversationHistory = [];
  messagesEl.innerHTML = '';

  // Restore welcome
  const welcome = document.createElement('div');
  welcome.className = 'welcome';
  welcome.id = 'welcome';
  welcome.innerHTML = `
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
      </svg>
    </div>
    <h2>你好，我是 Claude</h2>
    <p>有什么我可以帮助你的吗？</p>
    <div class="suggestion-chips">
      <button class="chip" data-text="帮我总结当前页面的内容">总结当前页面</button>
      <button class="chip" data-text="解释这个页面的主要内容">解释页面内容</button>
      <button class="chip" data-text="你能做什么？">你能做什么？</button>
    </div>
  `;

  // Re-attach chip listeners
  welcome.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInputEl.value = chip.dataset.text;
      onInputChange();
      sendMessage();
    });
  });

  messagesEl.appendChild(welcome);
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function showApiWarning() {
  apiWarningEl.style.display = 'block';
}

async function handleQuickAction(action) {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (!apiKey) {
    showApiWarning();
    return;
  }

  // Get page content from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  let pageContent = '';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: window.location.href,
        content: document.body.innerText.slice(0, 5000),
      }),
    });
    if (results?.[0]?.result) {
      const { title, url, content } = results[0].result;
      pageContent = `页面标题: ${title}\n页面URL: ${url}\n\n页面内容:\n${content}`;
    }
  } catch (e) {
    pageContent = `当前页面: ${tab.title || '未知页面'}`;
  }

  const prompts = {
    summarize: `请用简洁的中文总结以下网页内容，提取关键信息：\n\n${pageContent}`,
    explain: `请用简单易懂的中文解释以下网页内容，适合普通读者理解：\n\n${pageContent}`,
    translate: `请将以下网页内容翻译成中文（如果已是中文则翻译成英文）：\n\n${pageContent}`,
  };

  const prompt = prompts[action];
  if (!prompt) return;

  // Hide welcome
  if (welcomeEl) welcomeEl.style.display = 'none';

  const actionNames = { summarize: '总结页面', explain: '解释页面', translate: '翻译页面' };
  appendMessage('user', `[${actionNames[action]}]`);
  conversationHistory.push({ role: 'user', content: prompt });

  await callClaudeAPI(apiKey);
}

// Start the app
init();
