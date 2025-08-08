import { APP_DOMAIN } from "@dub/utils";
import { logger } from "../utils/logger";

let creatingOffscreen: Promise<void> | null = null;
const pendingRequests = new Map<string, number>(); // requestId -> tabId

async function ensureOffscreenDocument(path: string = 'offscreen.html'): Promise<void> {
  try {
    const offscreenUrl = chrome.runtime.getURL(path);
    const getContexts = (chrome.runtime as any).getContexts as ((query: any) => Promise<any[]>) | undefined;

    if (getContexts) {
      const contexts = await getContexts({
        contextTypes: [(chrome.runtime as any).ContextType?.OFFSCREEN_DOCUMENT || 'OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl],
      });
      if (contexts && contexts.length > 0) {
        logger.debug('🟢 Offscreen already exists');
        return;
      }
    } else if ((chrome.offscreen as any)?.hasDocument) {
      const has = await (chrome.offscreen as any).hasDocument();
      if (has) {
        logger.debug('🟢 Offscreen already exists (hasDocument)');
        return;
      }
    }

    if (!chrome.offscreen || !chrome.offscreen.createDocument) {
      logger.warn('⚠️ chrome.offscreen not available');
      return;
    }

    if (creatingOffscreen) {
      logger.debug('⏳ Offscreen creation in progress – awaiting existing promise');
      await creatingOffscreen;
      return;
    }

    logger.debug('🟠 Creating offscreen document...');
    creatingOffscreen = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [
        (chrome.offscreen as any).Reason?.LOCAL_STORAGE || 'LOCAL_STORAGE',
        (chrome.offscreen as any).Reason?.IFRAME_SCRIPTING || 'IFRAME_SCRIPTING',
      ],
      justification: 'Call API, tracking, and logging',
    } as any);
    await creatingOffscreen;
    creatingOffscreen = null;
    logger.debug('✅ Offscreen document created');
  } catch (err) {
    logger.error('❌ Failed to ensure offscreen document', err);
  }
}

// Background script for PIMMS extension
logger.info('🚀 PIMMS Background script loaded');
// Attempt to warm up the offscreen doc on service worker start
ensureOffscreenDocument('offscreen.html');

// Handle icon click - open PIMMS web app
chrome.action.onClicked.addListener((tab) => {
  logger.info('🔗 PIMMS icon clicked, opening web app');
  chrome.tabs.create({ url: APP_DOMAIN });
});

chrome.runtime.onInstalled.addListener(() => {
  ensureOffscreenDocument('offscreen.html');
});

// Handle messages from content script (minimal now since we use React panel)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('📨 Background received message:', message);
  
  try {
    switch (message.type) {
      case 'ENSURE_OFFSCREEN':
        (async () => {
          await ensureOffscreenDocument('offscreen.html');
          logger.debug('BACKGROUND: ENSURE_OFFSCREEN resolved');
          sendResponse({ ok: true });
        })();
        return true;
      case 'PIMMS_SHORTEN_REQUEST':
        // Ensure offscreen exists then forward the message
        (async () => {
          await ensureOffscreenDocument('offscreen.html');
          const tabId = sender.tab?.id;
          if (tabId && message.requestId) {
            pendingRequests.set(message.requestId as string, tabId);
            logger.debug('BACKGROUND: Stored pending request', { requestId: message.requestId, tabId });
          } else {
            logger.warn('BACKGROUND: Missing tabId or requestId on shorten request');
          }
          // Forward to offscreen
          logger.debug('BACKGROUND: Forwarding to offscreen', message);
          chrome.runtime.sendMessage({ ...message, forwarded: true, _from: 'background' });
          sendResponse({ ok: true });
        })();
        return true;
      case 'PIMMS_ANALYTICS_REQUEST':
        (async () => {
          await ensureOffscreenDocument('offscreen.html');
          const tabId = sender.tab?.id;
          if (tabId && message.requestId) {
            pendingRequests.set(message.requestId as string, tabId);
            logger.debug('BACKGROUND: Stored pending analytics request', { requestId: message.requestId, tabId });
          } else {
            logger.warn('BACKGROUND: Missing tabId or requestId on analytics request');
          }
          logger.debug('BACKGROUND: Forwarding analytics request to offscreen', message);
          chrome.runtime.sendMessage({ ...message, forwarded: true, _from: 'background' });
          sendResponse({ ok: true });
        })();
        return true;
      case 'PIMMS_SHORTEN_RESULT': {
        const requestId = message.requestId as string | undefined;
        if (requestId && pendingRequests.has(requestId)) {
          const tabId = pendingRequests.get(requestId)!;
          logger.debug('BACKGROUND: Forwarding RESULT to tab', { requestId, tabId });
          chrome.tabs.sendMessage(tabId, message, () => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              logger.warn('BACKGROUND: Failed to send result to tab', lastError.message);
            }
          });
          pendingRequests.delete(requestId);
        } else {
          logger.warn('BACKGROUND: No pending request mapping for result', { requestId });
        }
        return false;
      }
      case 'PIMMS_ANALYTICS_RESULT': {
        const requestId = message.requestId as string | undefined;
        logger.debug('BACKGROUND: Received PIMMS_ANALYTICS_RESULT', { requestId, ok: message.ok });
        if (requestId && pendingRequests.has(requestId)) {
          const tabId = pendingRequests.get(requestId)!;
          logger.debug('BACKGROUND: Forwarding ANALYTICS RESULT to tab', { requestId, tabId });
          chrome.tabs.sendMessage(tabId, message, () => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              logger.warn('BACKGROUND: Failed to send analytics result to tab', lastError.message);
            }
          });
          pendingRequests.delete(requestId);
        } else {
          logger.warn('BACKGROUND: No pending request mapping for analytics result', { requestId });
        }
        return false;
      }
      case 'OPEN_WEB_APP':
        const fullUrl = message.url || APP_DOMAIN;
        chrome.tabs.create({ url: fullUrl });
        return false; // No response needed
        
      default:
        logger.warn('❓ Unknown message type in background:', message.type);
        return false; // No response needed
    }
  } catch (error) {
    logger.error('⚠️ Error in background message handler:', error);
    return false;
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    logger.debug('📄 Tab updated:', tab.url);
  }
});
