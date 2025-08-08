import LinkDetector from './LinkDetector';
import HoverHandler from './HoverHandler';
import PanelManager from './PanelManager';
import { ChromeMessage } from '../types';
// Removed panel.css import to prevent global style pollution

console.log('🚀 PIMMS Content Script loaded');

class ContentScript {
  private linkDetector: LinkDetector;
  private hoverHandler: HoverHandler;
  private panelManager: PanelManager;

  constructor() {
    this.linkDetector = new LinkDetector();
    this.hoverHandler = new HoverHandler(this.linkDetector);
    this.panelManager = new PanelManager();
    
    // Connect the components
    this.linkDetector.onLinksUpdated = (links) => {
      this.panelManager.updateLinks(links);
      this.hoverHandler.updateListeners();
    };
    
    this.hoverHandler.onHoveredLink = (link) => {
      this.panelManager.showHoveredLink(link);
    };
    
    this.hoverHandler.onHideHoveredLink = () => {
      this.panelManager.hideHoveredLink();
    };
    
    this.setupMessageListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);

      try {
        switch (message.type) {
          case 'GET_LINKS':
            const links = this.linkDetector.getCurrentLinks();
            sendResponse({ links });
            return false; // Synchronous response

          case 'SCROLL_TO_LINK':
            this.linkDetector.scrollToLink(message.linkId);
            return false; // No response needed

          default:
            console.log('❓ Unknown message type:', message.type);
            return false; // No response needed
        }
      } catch (error) {
        console.log('⚠️ Error handling message:', error);
        return false;
      }
    });
  }

  public destroy() {
    this.linkDetector.destroy();
    this.hoverHandler.destroy();
    this.panelManager.destroy();
  }
}

// Initialize the content script
const contentScript = new ContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
  console.log('🧹 PIMMS Content Script cleaned up');
});
