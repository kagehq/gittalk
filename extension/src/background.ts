// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    chrome.action.openPopup();
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitTalk extension installed');
});
