// Background script for PIMMS extension
console.log('🚀 PIMMS Background script loaded');

// Handle messages from content script and forward to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  try {
    switch (message.type) {
      case 'LINKS_UPDATED':
      case 'HOVERED_LINK':
      case 'HIDE_HOVERED_LINK':
        // Forward these messages to the popup if it's open
        chrome.runtime.sendMessage(message).catch(() => {
          // Popup is not open, ignore error
          console.log('📪 Popup not open, message not delivered');
        });
        return false; // No response needed
        
      default:
        console.log('❓ Unknown message type in background:', message.type);
        return false; // No response needed
    }
  } catch (error) {
    console.log('⚠️ Error in background message handler:', error);
    return false;
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('📄 Tab updated:', tab.url);
  }
});
