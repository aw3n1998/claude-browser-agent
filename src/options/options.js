// Claude Browser Extension - Options Page

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_SYSTEM_PROMPT = '';

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    switchSection(section);
  });
});

function switchSection(section) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  document.querySelector(`[data-section="${section}"]`).classList.add('active');
  document.getElementById(`section-${section}`).classList.add('active');
}

// Load saved settings on page load
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'apiKey',
    'model',
    'maxTokens',
    'systemPrompt',
    'theme',
  ]);

  if (settings.apiKey) {
    document.getElementById('apiKeyInput').value = settings.apiKey;
  }

  const modelSelect = document.getElementById('modelSelect');
  if (settings.model) modelSelect.value = settings.model;

  const maxTokensSlider = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const tokenVal = settings.maxTokens || DEFAULT_MAX_TOKENS;
  maxTokensSlider.value = tokenVal;
  maxTokensValue.textContent = tokenVal;

  const systemPromptInput = document.getElementById('systemPrompt');
  if (settings.systemPrompt !== undefined) {
    systemPromptInput.value = settings.systemPrompt;
  }

  if (settings.theme) {
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === settings.theme);
      if (opt.dataset.theme === settings.theme) {
        opt.querySelector('input[type="radio"]').checked = true;
      }
    });
  }
}

// API Key Section
const apiKeyInput = document.getElementById('apiKeyInput');
const apiStatus = document.getElementById('apiStatus');

document.getElementById('saveApiKey').addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus(apiStatus, 'error', '请输入 API Key');
    return;
  }
  if (!apiKey.startsWith('sk-ant-')) {
    showStatus(apiStatus, 'error', 'API Key 格式不正确，应以 sk-ant- 开头');
    return;
  }
  await chrome.storage.sync.set({ apiKey });
  showStatus(apiStatus, 'success', 'API Key 保存成功！');
});

document.getElementById('testApiKey').addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus(apiStatus, 'error', '请先输入 API Key');
    return;
  }

  showStatus(apiStatus, 'loading', '正在测试连接...');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      showStatus(apiStatus, 'success', 'API Key 有效，连接成功！');
      await chrome.storage.sync.set({ apiKey });
    } else {
      const err = await response.json().catch(() => ({}));
      showStatus(apiStatus, 'error', `连接失败: ${err.error?.message || response.statusText}`);
    }
  } catch (err) {
    showStatus(apiStatus, 'error', `网络错误: ${err.message}`);
  }
});

document.getElementById('clearApiKey').addEventListener('click', async () => {
  if (!confirm('确定要清除 API Key 吗？')) return;
  await chrome.storage.sync.remove('apiKey');
  apiKeyInput.value = '';
  showStatus(apiStatus, 'success', 'API Key 已清除');
});

// Toggle password visibility
document.getElementById('toggleVisibility').addEventListener('click', () => {
  const input = document.getElementById('apiKeyInput');
  input.type = input.type === 'password' ? 'text' : 'password';
});

// Model Settings
const maxTokensSlider = document.getElementById('maxTokens');
const maxTokensValue = document.getElementById('maxTokensValue');

maxTokensSlider.addEventListener('input', () => {
  maxTokensValue.textContent = maxTokensSlider.value;
});

document.getElementById('saveModelSettings').addEventListener('click', async () => {
  const model = document.getElementById('modelSelect').value;
  const maxTokens = parseInt(maxTokensSlider.value);
  const systemPrompt = document.getElementById('systemPrompt').value.trim();

  await chrome.storage.sync.set({ model, maxTokens, systemPrompt });
  showStatus(document.getElementById('modelStatus'), 'success', '模型设置保存成功！');
});

document.getElementById('resetModelSettings').addEventListener('click', async () => {
  document.getElementById('modelSelect').value = DEFAULT_MODEL;
  maxTokensSlider.value = DEFAULT_MAX_TOKENS;
  maxTokensValue.textContent = DEFAULT_MAX_TOKENS;
  document.getElementById('systemPrompt').value = DEFAULT_SYSTEM_PROMPT;

  await chrome.storage.sync.set({
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
  showStatus(document.getElementById('modelStatus'), 'success', '已恢复默认设置');
});

// Appearance
document.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    opt.querySelector('input[type="radio"]').checked = true;
  });
});

document.getElementById('saveAppearance').addEventListener('click', async () => {
  const selectedTheme = document.querySelector('.theme-option.active')?.dataset.theme || 'dark';
  await chrome.storage.sync.set({ theme: selectedTheme });
  showStatus(document.getElementById('appearanceStatus'), 'success', '外观设置保存成功！');
});

// Helper: show status message
function showStatus(el, type, message) {
  el.className = `status-message ${type}`;
  el.textContent = message;

  if (type !== 'loading') {
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        el.className = 'status-message';
        el.style.opacity = '';
        el.style.transition = '';
      }, 300);
    }, 3000);
  }
}

// Initialize
loadSettings();
