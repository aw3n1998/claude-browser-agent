// Claude Browser Extension - Content Script

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    const content = extractPageContent();
    sendResponse(content);
    return true;
  }

  if (message.type === 'HIGHLIGHT_TEXT') {
    highlightText(message.text);
    sendResponse({ success: true });
  }
});

/**
 * Extract meaningful content from the current page
 */
function extractPageContent() {
  try {
    // Get meta information
    const title = document.title || '';
    const url = window.location.href;
    const description = document.querySelector('meta[name="description"]')?.content
      || document.querySelector('meta[property="og:description"]')?.content
      || '';

    // Try to get main content area
    const mainContent = getMainContent();

    // Get headings structure
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 10)
      .map(h => `${h.tagName}: ${h.innerText.trim()}`)
      .join('\n');

    return {
      title,
      url,
      description,
      headings,
      content: mainContent.slice(0, 8000),
      wordCount: mainContent.split(/\s+/).length,
    };
  } catch (e) {
    return {
      title: document.title,
      url: window.location.href,
      description: '',
      headings: '',
      content: document.body?.innerText?.slice(0, 8000) || '',
      wordCount: 0,
    };
  }
}

/**
 * Get the main content of the page, prioritizing article/main elements
 */
function getMainContent() {
  // Priority selectors for main content
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    '#content',
  ];

  for (const selector of contentSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.innerText.trim();
      if (text.length > 200) return text;
    }
  }

  // Fallback: get body text but filter out navigation/footer
  const excludeSelectors = ['nav', 'header', 'footer', 'aside', '.sidebar', '#sidebar', 'script', 'style'];
  const body = document.body.cloneNode(true);

  excludeSelectors.forEach(sel => {
    body.querySelectorAll(sel).forEach(el => el.remove());
  });

  return body.innerText.trim();
}

/**
 * Highlight specific text on the page
 */
function highlightText(searchText) {
  if (!searchText) return;

  // Simple text highlight using mark tag
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes(searchText)) {
      nodes.push(node);
    }
  }

  nodes.slice(0, 5).forEach(textNode => {
    const parts = textNode.nodeValue.split(searchText);
    if (parts.length <= 1) return;

    const fragment = document.createDocumentFragment();
    parts.forEach((part, i) => {
      fragment.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        const mark = document.createElement('mark');
        mark.style.cssText = 'background: rgba(204, 120, 92, 0.4); color: inherit; border-radius: 2px;';
        mark.textContent = searchText;
        fragment.appendChild(mark);
      }
    });

    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

// Inject floating button (optional - only on specific pages)
// Uncomment below to add a floating "Ask Claude" button on pages
/*
function injectFloatingButton() {
  if (document.getElementById('claude-float-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'claude-float-btn';
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    </svg>
  `;
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    background: #cc785c;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
  });
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  });

  document.body.appendChild(btn);
}
*/
