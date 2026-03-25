// Claude Browser Extension - Background Service Worker

// Install event
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menus
  chrome.contextMenus.removeAll(() => {
    // Summarize selection
    chrome.contextMenus.create({
      id: 'claude-summarize',
      title: '用 Claude 总结选中内容',
      contexts: ['selection'],
    });

    // Explain selection
    chrome.contextMenus.create({
      id: 'claude-explain',
      title: '用 Claude 解释选中内容',
      contexts: ['selection'],
    });

    // Translate selection
    chrome.contextMenus.create({
      id: 'claude-translate',
      title: '用 Claude 翻译选中内容',
      contexts: ['selection'],
    });

    // Separator
    chrome.contextMenus.create({
      id: 'claude-separator',
      type: 'separator',
      contexts: ['selection'],
    });

    // Ask Claude about page
    chrome.contextMenus.create({
      id: 'claude-ask-page',
      title: '询问 Claude 关于此页面',
      contexts: ['page'],
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);

  if (!apiKey) {
    // Open options page if no API key
    chrome.runtime.openOptionsPage();
    return;
  }

  const action = info.menuItemId;
  const selectedText = info.selectionText || '';

  let prompt = '';
  switch (action) {
    case 'claude-summarize':
      prompt = `请用简洁的中文总结以下内容：\n\n${selectedText}`;
      break;
    case 'claude-explain':
      prompt = `请用简单易懂的中文解释以下内容：\n\n${selectedText}`;
      break;
    case 'claude-translate':
      prompt = `请翻译以下内容（中文翻译成英文，其他语言翻译成中文）：\n\n${selectedText}`;
      break;
    case 'claude-ask-page':
      // Open popup with page context
      chrome.action.openPopup?.().catch(() => {});
      return;
    default:
      return;
  }

  // Call API and show notification with result
  try {
    const result = await callClaudeAPI(apiKey, prompt);

    // Store result for popup to display
    await chrome.storage.session.set({
      pendingContextResult: {
        prompt: selectedText.slice(0, 100) + (selectedText.length > 100 ? '...' : ''),
        result,
        action,
        timestamp: Date.now(),
      },
    });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../../../icons/icon48.svg',
      title: 'Claude AI',
      message: result.slice(0, 200) + (result.length > 200 ? '...' : ''),
    });
  } catch (err) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../../../icons/icon48.svg',
      title: 'Claude AI - 错误',
      message: err.message || '请求失败',
    });
  }
});

// Handle messages from content scripts / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    // Forward page content request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) {
        sendResponse({ error: '无法获取当前标签页' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: '无法获取页面内容' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'CALL_CLAUDE_API') {
    const { apiKey, messages, systemPrompt } = message;
    callClaudeAPIWithMessages(apiKey, messages, systemPrompt)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function callClaudeAPI(apiKey, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callClaudeAPIWithMessages(apiKey, messages, systemPrompt) {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages,
  };
  if (systemPrompt) body.system = systemPrompt;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}
