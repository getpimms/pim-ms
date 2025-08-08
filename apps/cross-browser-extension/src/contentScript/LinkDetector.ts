import { LinkData, EMAIL_MARKETING_DOMAINS } from '../types';

// Email marketing platforms imported from centralized types

// Enhanced URL regex patterns to capture COMPLETE URLs
const URL_PATTERNS = [
  /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?::[0-9]+)?(?:\/[^\s<>"'\]\)]*)?(?:\?[^\s<>"'\]\)]*)?(?:#[^\s<>"'\]\)]*)*/gi,
  /(?:^|\s|[^\w\.-])([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?::[0-9]+)?(?:\/[^\s<>"'\]\)]*)?(?:\?[^\s<>"'\]\)]*)?(?:#[^\s<>"'\]\)]*)*)(?=\s|$|[^\w\.-])/gi,
  /(?:^|\s)([a-zA-Z0-9-]+\.(?:com|io|co|net|org|app))(?=\s|$|[^\w\.-])/gi
];

class LinkDetector {
  private observer: MutationObserver | null = null;
  private currentLinks: LinkData[] = [];
  private debounceTimer: number | null = null;
  private isProcessing = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.detectLinks();
    this.startObserver();
    this.addInputListeners();
  }

  private isTargetDomain(hostname: string): boolean {
    const domain = hostname.replace('www.', '').toLowerCase();
    return EMAIL_MARKETING_DOMAINS.some(targetDomain => 
      domain === targetDomain || domain.endsWith('.' + targetDomain)
    );
  }

  private generateLinkId(href: string, text: string): string {
    return btoa(href + '|' + text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  private isElementVisible(element: Element): boolean {
    // Not attached or hidden by styles
    if (!element || !(element as HTMLElement).ownerDocument) return false;

    const htmlElement = element as HTMLElement;
    const style = window.getComputedStyle(htmlElement);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false;
    }

    // No box / no rects
    const hasBox = !!(htmlElement.offsetWidth || htmlElement.offsetHeight || htmlElement.getClientRects().length);
    if (!hasBox) return false;

    // Must be at least partially in the viewport
    const rect = htmlElement.getBoundingClientRect();
    const inViewport =
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth);
    return inViewport;
  }

  private extractUrlsFromText(text: string, element: Element): LinkData[] {
    const foundUrls: LinkData[] = [];
    
    URL_PATTERNS.forEach((pattern, index) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach((match, matchIndex) => {
        let url = match[1] || match[0];
        
        url = url.trim().replace(/[.,;:\)\]]+$/, '');
        if (!url || url.length < 4) return;
        
        try {
          let fullUrl: string;
          let displayText: string;
          
          if (!url.match(/^https?:\/\//)) {
            fullUrl = `https://${url}`;
            displayText = url;
          } else {
            fullUrl = url;
            displayText = url;
          }
          
          const urlObj = new URL(fullUrl);
          const domain = urlObj.hostname;
          
          if (!this.isTargetDomain(domain)) return;
          
          const uniqueId = this.generateLinkId(fullUrl, displayText) + '_' + matchIndex + '_' + match.index;
          
          foundUrls.push({
            href: fullUrl,
            text: displayText,
            domain,
            element: element as HTMLElement,
            id: uniqueId,
            isTextUrl: true
          });
        } catch (error) {
          console.log(`⚠️ Invalid URL skipped: ${url}`, error);
        }
      });
    });
    
    return foundUrls;
  }

  private detectLinks(): LinkData[] {
    if (this.isProcessing) return this.currentLinks;
    this.isProcessing = true;

    const allLinks: LinkData[] = [];
    
    // 1. Get anchor links first (only visible)
    const anchorLinks = Array.from(document.querySelectorAll('a[href]')).filter((el) => this.isElementVisible(el));
    anchorLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      try {
        const url = new URL(href);
        const domain = url.hostname;
        
        if (this.isTargetDomain(domain)) {
          allLinks.push({
            href,
            text: link.textContent?.trim() || href,
            domain,
            element: link as HTMLElement,
            id: this.generateLinkId(href, link.textContent?.trim() || href),
            isTextUrl: false
          });
        }
      } catch {
        // Invalid URL, skip
      }
    });
    
    // 2. Get text URLs (excluding anchor tags)
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'meta', 'head', 'title', 'a'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          // Ignore any text that is inside or nested within an anchor element
          if (parent.closest('a')) {
            return NodeFilter.FILTER_REJECT;
          }
          // Only consider text that is currently visible
          if (!this.isElementVisible(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent || '';
          if (text.trim().length < 4) return NodeFilter.FILTER_REJECT;
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode.textContent && textNode.parentElement) {
        const urlsInText = this.extractUrlsFromText(textNode.textContent, textNode.parentElement);
        if (urlsInText.length > 0) {
          // Simple duplicate check
          const newUrls = urlsInText.filter(textUrl => {
            return !allLinks.some(existingUrl => existingUrl.href === textUrl.href);
          });
          allLinks.push(...newUrls);
        }
      }
    }
    
    // 3. Get URLs from form inputs (only visible)
    const inputs = document.querySelectorAll('input[type="url"], input[type="text"], input[type="email"], textarea');
    inputs.forEach(input => {
      if (!this.isElementVisible(input)) return;
      const value = (input as HTMLInputElement).value;
      if (!value || value.length < 4) return;
      
      const urlsInInput = this.extractUrlsFromText(value, input as Element);
      if (urlsInInput.length > 0) {
        const newUrls = urlsInInput.filter(inputUrl => {
          return !allLinks.some(existingUrl => existingUrl.href === inputUrl.href);
        });
        allLinks.push(...newUrls);
      }
    });

    this.currentLinks = allLinks;
    this.isProcessing = false;
    return allLinks;
  }

  private debouncedDetection = () => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const links = this.detectLinks();
      this.notifyLinksUpdated(links);
    }, 300);
  };

  private startObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        this.debouncedDetection();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    });
  }

  private addInputListeners() {
    const inputs = document.querySelectorAll('input[type="url"], input[type="text"], input[type="email"], textarea');
    inputs.forEach(input => {
      ['input', 'paste', 'keyup'].forEach(eventType => {
        input.addEventListener(eventType, this.debouncedDetection);
      });
    });
  }

  private notifyLinksUpdated(links: LinkData[]) {
    // Send message to background script, which will forward to popup (with error handling)
    try {
      chrome.runtime.sendMessage({
        type: 'LINKS_UPDATED',
        links: links.map(link => ({
          ...link,
          element: undefined // Don't send DOM element via message
        }))
      }).catch(() => {
        // Ignore errors when popup is not open or extension context is invalidated
        console.log('📪 Failed to send message - popup may not be open');
      });
    } catch (error) {
      // Extension context may be invalidated
      console.log('⚠️ Extension context invalidated:', error);
    }

    // Also notify panel manager if it exists
    if (this.onLinksUpdated) {
      this.onLinksUpdated(links);
    }
  }

  // Callback for external components
  public onLinksUpdated: ((links: LinkData[]) => void) | null = null;

  public getCurrentLinks(): LinkData[] {
    return this.currentLinks;
  }

  public getLinkById(id: string): LinkData | undefined {
    return this.currentLinks.find(link => link.id === id);
  }

  public scrollToLink(id: string) {
    const link = this.getLinkById(id);
    if (link && link.element) {
      link.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      this.highlightElement(link.element);
    }
  }

  private highlightElement(element: HTMLElement) {
    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;
    const originalPosition = element.style.position;
    const originalZIndex = element.style.zIndex;
    
    element.style.outline = '3px solid #2B7FFF';
    element.style.backgroundColor = 'rgba(43, 127, 255, 0.2)';
    element.style.zIndex = '9999';
    
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative';
    }
    
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.backgroundColor = originalBackground;
      element.style.position = originalPosition;
      element.style.zIndex = originalZIndex;
    }, 3000);
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

export default LinkDetector;
