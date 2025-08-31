import './content.css';

class GitTalkContent {
  private serverUrl = 'http://localhost:4000';
  private token: string | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Get stored token
    const result = await chrome.storage.local.get(['gittalk_token']);
    this.token = result.gittalk_token;

    // Check if we're on a GitHub page
    if (window.location.hostname === 'github.com') {
      this.injectUI();
    }
  }

  private async injectUI() {
    const path = window.location.pathname;
    
    // Profile page
    if (this.isProfilePage(path)) {
      await this.injectProfileButton();
    }
    
    // PR or Issue page
    if (this.isPRorIssuePage(path)) {
      this.injectThreadButton();
    }
  }

  private isProfilePage(path: string): boolean {
    const parts = path.split('/').filter(Boolean);
    return parts.length === 1 && !path.includes('?');
  }

  private isPRorIssuePage(path: string): boolean {
    return path.includes('/pull/') || path.includes('/issues/');
  }

  private async injectProfileButton() {
    const username = window.location.pathname.split('/')[1];
    if (!username) return;

    // Check if this is the current user's own profile
    try {
      const result = await chrome.storage.local.get(['gittalk_token']);
      
      if (result.gittalk_token) {
        const response = await fetch('http://localhost:4000/auth/me', {
          headers: { Authorization: `Bearer ${result.gittalk_token}` }
        });
        
        if (response.ok) {
          const currentUser = await response.json();
          
          if (currentUser.login === username) {
            return; // Don't show message button on own profile
          }
        }
      }
    } catch (err) {
      // Silently fail and show the button
    }

    // Find a good place to inject the button
    const targetSelectors = [
      '.profile-navigation',
      '.user-profile-nav',
      '.js-profile-editable-area',
      '.profile-header',
    ];

    let target: Element | null = null;
    for (const selector of targetSelectors) {
      target = document.querySelector(selector);
      if (target) break;
    }

    if (!target) return;

    // Check if button already exists
    if (document.querySelector('.gittalk-profile-btn')) return;

    const button = document.createElement('button');
    button.className = 'gittalk-profile-btn btn btn-primary';
    button.textContent = `Message @${username}`;
    button.style.cssText = `
      margin-left: 8px;
      background: #2ea44f;
      border: 1px solid rgba(27, 31, 36, 0.15);
      border-radius: 6px;
      color: #ffffff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      padding: 5px 16px;
      transition: background-color 0.2s cubic-bezier(0.3, 0, 0.5, 1);
    `;

    button.addEventListener('click', () => {
      this.openChat('dm', username);
    });

    target.appendChild(button);
  }

  private injectThreadButton() {
    // Check if button already exists
    if (document.querySelector('.gittalk-thread-btn')) return;

    const targetSelectors = [
      '.gh-header-actions',
      '.gh-header-meta',
      '.gh-header',
      '[data-testid="issue-header"]',
      '.js-issue-header',
      '.issue-header',
      '.pull-request-header',
      '.pr-header',
      '.gh-header-actions .gh-header-meta',
      '.gh-header-actions',
      '.gh-header',
    ];

    let target: Element | null = null;
    for (const selector of targetSelectors) {
      target = document.querySelector(selector);
      if (target) break;
    }

    if (!target) return;

    const button = document.createElement('button');
    button.className = 'gittalk-thread-btn btn btn-outline';
    button.textContent = 'Open Chat';
    button.style.cssText = `
      margin-left: 8px;
      background: #ffffff;
      border: 1px solid rgba(27, 31, 36, 0.15);
      border-radius: 6px;
      color: #24292f;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      padding: 5px 16px;
      transition: background-color 0.2s cubic-bezier(0.3, 0, 0.5, 1);
    `;

    button.addEventListener('click', () => {
      this.openChat('thread', window.location.href);
    });

    target.appendChild(button);
  }

  private openChat(type: 'dm' | 'thread', context: string) {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.gittalk-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'gittalk-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 500px;
      background: white;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid #d0d7de;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f6f8fa;
      border-radius: 6px 6px 0 0;
    `;

    const title = document.createElement('h3');
    title.textContent = type === 'dm' ? `Message @${context}` : 'Thread Chat';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #24292f;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #656d76;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
    `;
    closeBtn.addEventListener('click', () => popup.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create iframe for the chat
    const iframe = document.createElement('iframe');
    iframe.src = `chrome-extension://${chrome.runtime.id}/popup.html?type=${type}&context=${encodeURIComponent(context)}`;
    iframe.style.cssText = `
      flex: 1;
      border: none;
      border-radius: 0 0 6px 6px;
      width: 100%;
    `;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'gittalk-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999998;
    `;
    backdrop.addEventListener('click', () => {
      popup.remove();
      backdrop.remove();
    });

    // Add elements to page
    popup.appendChild(header);
    popup.appendChild(iframe);
    document.body.appendChild(backdrop);
    document.body.appendChild(popup);

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        popup.remove();
        backdrop.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
}

// Initialize content script
new GitTalkContent();
