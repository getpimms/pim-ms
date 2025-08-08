import { LinkData } from '../types';
import LinkDetector from './LinkDetector';

class HoverHandler {
  private linkDetector: LinkDetector;
  private linkListeners = new WeakMap<HTMLElement, any>();
  private hoverTimeout: number | null = null;

  constructor(linkDetector: LinkDetector) {
    this.linkDetector = linkDetector;
    this.setupHoverListeners();
  }

  private setupHoverListeners() {
    // Set up listeners for all detected links
    const links = this.linkDetector.getCurrentLinks();
    
    links.forEach(link => {
      this.addHoverListener(link);
    });
  }

  private addHoverListener(link: LinkData) {
    const element = link.element;
    
    // Remove existing listeners
    const existingListeners = this.linkListeners.get(element);
    if (existingListeners) {
      element.removeEventListener('mouseenter', existingListeners.mouseEnter);
      element.removeEventListener('mouseleave', existingListeners.mouseLeave);
    }

    // Create new listeners
    const listeners = {
      mouseEnter: () => {
        console.log('🎯 Hovering:', link.text);
        this.showHoveredLink(link);
      },
      mouseLeave: () => {
        console.log('👋 Left hover:', link.text);
        this.hideHoveredLink();
      }
    };

    // Store and add listeners
    this.linkListeners.set(element, listeners);
    element.addEventListener('mouseenter', listeners.mouseEnter);
    element.addEventListener('mouseleave', listeners.mouseLeave);
  }

  private showHoveredLink(link: LinkData) {
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Send message to show hovered link (with error handling)
    try {
      chrome.runtime.sendMessage({
        type: 'HOVERED_LINK',
        link: {
          ...link,
          element: undefined // Don't send DOM element
        }
      }).catch(() => {
        // Ignore errors when popup is not open
        console.log('📪 Failed to send hover message - popup may not be open');
      });
    } catch (error) {
      console.log('⚠️ Extension context invalidated:', error);
    }

    // Also notify panel manager if it exists
    if (this.onHoveredLink) {
      this.onHoveredLink(link);
    }
  }

  private hideHoveredLink() {
    // Set timeout to hide after 5 seconds
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    this.hoverTimeout = window.setTimeout(() => {
      try {
        chrome.runtime.sendMessage({
          type: 'HIDE_HOVERED_LINK'
        }).catch(() => {
          // Ignore errors when popup is not open
          console.log('📪 Failed to send hide hover message - popup may not be open');
        });
      } catch (error) {
        console.log('⚠️ Extension context invalidated:', error);
      }

      // Also notify panel manager if it exists
      if (this.onHideHoveredLink) {
        this.onHideHoveredLink();
      }
    }, 5000);
  }

  // Callbacks for external components
  public onHoveredLink: ((link: LinkData) => void) | null = null;
  public onHideHoveredLink: (() => void) | null = null;

  public updateListeners() {
    this.setupHoverListeners();
  }

  public destroy() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }
}

export default HoverHandler;
