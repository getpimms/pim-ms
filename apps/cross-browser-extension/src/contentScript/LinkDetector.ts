import { LinkData } from '../types';
import { logger } from '../utils/logger';

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
  private quickDebounceTimer: number | null = null;
  private isProcessing = false;
  private linkCounter = 0;
  
  /**
   * Tracks URLs we've already added during a single detection pass,
   * keyed by DOM element so the same href in different elements
   * is treated as distinct items.
   */
  private seenByElement: WeakMap<Element, Set<string>> = new WeakMap();

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.detectLinks();
    this.startObserver();
    this.addInputListeners();
    this.addContentEditableListeners();
  }

  private generateUniqueId(href: string, text: string): string {
    const base = btoa(href + '|' + text).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
    return `${base}_${this.linkCounter++}`;
  }

  /**
   * Normalize URLs to avoid duplicate entries caused by trivial differences,
   * such as trailing slashes or hostname casing. We keep the query/hash to
   * avoid collapsing distinct tracked links.
   */
  private normalizeUrlForDeduplication(href: string): string {
    try {
      const url = new URL(href);
      const protocol = url.protocol.toLowerCase();
      const hostname = url.hostname.toLowerCase();
      // Remove trailing slashes from pathname, but keep root '/'
      let pathname = url.pathname.replace(/\/+$/, '');
      if (pathname === '') pathname = '/';
      const search = url.search || '';
      const hash = url.hash || '';
      return `${protocol}//${hostname}${pathname}${search}${hash}`;
    } catch {
      return href;
    }
  }

  private hasSeen(element: Element, normalizedHref: string): boolean {
    const set = this.seenByElement.get(element);
    return set ? set.has(normalizedHref) : false;
  }

  private markSeen(element: Element, normalizedHref: string) {
    let set = this.seenByElement.get(element);
    if (!set) {
      set = new Set<string>();
      this.seenByElement.set(element, set);
    }
    set.add(normalizedHref);
  }

  private isInsidePanel(node: Element | null): boolean {
    if (!node) return false;
    try {
      const element = node as Element;
      return Boolean(element.closest && element.closest('#pimms-panel-app, #pimms-panel'));
    } catch {
      return false;
    }
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
          
          // Accept ALL URLs, no domain filtering
          
          const normalized = this.normalizeUrlForDeduplication(fullUrl);
          const uniqueId = this.generateUniqueId(normalized, displayText);
          
          foundUrls.push({
            href: normalized,
            text: displayText,
            domain,
            element: element as HTMLElement,
            id: uniqueId,
            isTextUrl: true
          });
        } catch (error) {
          logger.debug(`⚠️ Invalid URL skipped: ${url}`, error);
        }
      });
    });
    
    return foundUrls;
  }

  private detectLinks(): LinkData[] {
    if (this.isProcessing) return this.currentLinks;
    this.isProcessing = true;

    // Reset counter for consistent ID generation
    this.linkCounter = 0;
    this.seenByElement = new WeakMap();
    const allLinks: LinkData[] = [];
    
    // 1. Get anchor links first (only visible and NOT inside the panel)
    const roots = this.getScanRoots();
    const scopedQueryAll = (selector: string): Element[] => {
      const results: Element[] = [];
      roots.forEach((r) => r.querySelectorAll(selector).forEach((el) => results.push(el)));
      return results;
    };

    const allAnchorLinks = scopedQueryAll('a[href]').filter(
      (el) => !this.isInsidePanel(el)
    );
    
    const anchorLinks = allAnchorLinks.filter((el) => this.isElementVisible(el));
    
    anchorLinks.forEach((link, index) => {
      const href = (link as HTMLAnchorElement).href;
      try {
        const url = new URL(href);
        const domain = url.hostname;
        
        // Accept ALL links, no domain filtering for individual links
        const normalized = this.normalizeUrlForDeduplication(href);
        if (!this.hasSeen(link as HTMLElement, normalized)) {
          this.markSeen(link as HTMLElement, normalized);
          allLinks.push({
            href: normalized,
            text: link.textContent?.trim() || href,
            domain,
            element: link as HTMLElement,
            id: this.generateUniqueId(normalized, link.textContent?.trim() || href),
            isTextUrl: false
          });
        }
      } catch (error) {
        logger.debug(`[PIMMS-DEBUG] ❌ Invalid URL: ${href}`, error);
      }
    });
    
    // 2. Get text URLs (excluding anchor tags)
    const walkers = roots.map((root) =>
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Exclude any text contained within the PIMMS panel containers
            if (this.isInsidePanel(parent)) {
              return NodeFilter.FILTER_REJECT;
            }

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
      )
    );

    walkers.forEach((walker) => {
      let textNode;
      while (textNode = walker.nextNode()) {
        if (textNode.textContent && textNode.parentElement) {
          const urlsInText = this.extractUrlsFromText(textNode.textContent, textNode.parentElement);
          if (urlsInText.length > 0) {
            for (const textUrl of urlsInText) {
              const normalized = this.normalizeUrlForDeduplication(textUrl.href);
              const el = textUrl.element;
              if (!this.hasSeen(el, normalized)) {
                this.markSeen(el, normalized);
                allLinks.push({ ...textUrl, href: normalized });
              }
            }
          }
        }
      }
    });
    
    // 3. Get URLs from form inputs (only visible and NOT inside the panel)
    const inputs: Element[] = [];
    roots.forEach((r) => r.querySelectorAll('input[type="url"], input[type="text"], input[type="email"], textarea').forEach((el) => inputs.push(el)));
    inputs.forEach((input) => {
      if (this.isInsidePanel(input)) return;
      if (!this.isElementVisible(input)) return;
      const value = (input as HTMLInputElement).value;
      if (!value || value.length < 4) return;
      
      const urlsInInput = this.extractUrlsFromText(value, input as Element);
      if (urlsInInput.length > 0) {
        for (const inputUrl of urlsInInput) {
          const normalized = this.normalizeUrlForDeduplication(inputUrl.href);
          const el = input as Element;
          if (!this.hasSeen(el, normalized)) {
            this.markSeen(el, normalized);
            allLinks.push({ ...inputUrl, href: normalized });
          }
        }
      }
    });

    this.currentLinks = allLinks;
    this.isProcessing = false;
    return allLinks;
  }

  private scheduleDetection = (delayMs: number = 300) => {
    if (delayMs <= 100) {
      if (this.quickDebounceTimer) clearTimeout(this.quickDebounceTimer);
      this.quickDebounceTimer = window.setTimeout(() => {
        const links = this.detectLinks();
        this.notifyLinksUpdated(links);
      }, delayMs);
    } else {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        const links = this.detectLinks();
        this.notifyLinksUpdated(links);
      }, delayMs);
    }
  };

  private startObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      let highPriority = false;
      
      for (const mutation of mutations) {
        // Ignore any mutations happening inside our panel containers
        const targetElement = (mutation.target as Element) || null;
        if (targetElement && this.isInsidePanel(targetElement)) {
          continue;
        }

        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            const elementNode = (node as Element) || null;
            const parentElement = (node as any)?.parentElement as Element | null;
            if ((elementNode && !this.isInsidePanel(elementNode)) || (parentElement && !this.isInsidePanel(parentElement))) {
              shouldUpdate = true;
              break;
            }
          }
          if (shouldUpdate) break;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
          if (!this.isInsidePanel(targetElement)) {
            shouldUpdate = true;
            highPriority = true; // href changes should reflect quickly
            break;
          }
        }
        if (mutation.type === 'characterData') {
          // If text inside an anchor changed, update quickly
          const textNodeParent = (mutation.target as CharacterData)?.parentElement || null;
          if (textNodeParent && textNodeParent.closest && textNodeParent.closest('a')) {
            shouldUpdate = true;
            highPriority = true;
            break;
          }
        }
      }
      
      if (shouldUpdate) {
        this.scheduleDetection(highPriority ? 80 : 300);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
      characterData: true
    });
  }

  private addInputListeners() {
    const inputs = document.querySelectorAll('input[type="url"], input[type="text"], input[type="email"], textarea');
    inputs.forEach(input => {
      if (this.isInsidePanel(input)) return;
      ['input', 'paste', 'keyup'].forEach(eventType => {
        input.addEventListener(eventType, () => this.scheduleDetection(150));
      });
    });
  }

  private addContentEditableListeners() {
    const roots = this.getScanRoots();
    const editables: Element[] = [];
    roots.forEach((r) => r.querySelectorAll('[contenteditable="true"]').forEach((el) => editables.push(el)));
    editables.forEach((el) => {
      if (this.isInsidePanel(el)) return;
      ['input', 'keyup', 'paste'].forEach((eventType) => {
        el.addEventListener(eventType, () => this.scheduleDetection(120), { passive: true });
      });
    });
  }

  // Optional scoping: when provided, we limit detection to these roots
  public setScopedRoots(roots: Element[]) {
    (this as any)._scopedRoots = roots;
    // Trigger a re-detection when scopes change
    this.scheduleDetection(80);
  }

  // Optional scoping by CSS selectors; if set, we resolve them on each pass.
  public setScopedRootSelectors(selectors: string[]) {
    (this as any)._scopedSelectors = Array.isArray(selectors) ? selectors.slice() : [];
    this.scheduleDetection(80);
  }

  private getScanRoots(): Element[] {
    const scoped = (this as any)._scopedRoots as Element[] | undefined;
    if (scoped && Array.isArray(scoped) && scoped.length > 0) {
      return scoped;
    }
    const selectors = (this as any)._scopedSelectors as string[] | undefined;
    if (selectors && Array.isArray(selectors) && selectors.length > 0) {
      const results: Element[] = [];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => results.push(el));
      });
      // If selectors are configured but not present yet, DO NOT fall back to body
      // to avoid scanning the entire page. We'll scan when they appear.
      return results;
    }
    return [document.body];
  }

  private notifyLinksUpdated(links: LinkData[]) {
    // Only notify the callback - message sending is handled centrally in index.ts
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
      // Wait a bit for smooth scrolling to complete before drawing overlay
      window.setTimeout(() => {
        this.highlightElement(link.element);
      }, 400);
    }
  }

  private highlightElement(element: HTMLElement) {
    const target = this.findHighlightTarget(element);
    // Lightweight outline pulse that doesn't cover inner text
    const originalOutline = target.style.outline;
    const originalOutlineOffset = (target.style as any).outlineOffset as string;
    target.style.outline = '2px solid #2B7FFF';
    (target.style as any).outlineOffset = '2px';
    setTimeout(() => {
      target.style.outline = originalOutline;
      (target.style as any).outlineOffset = originalOutlineOffset || '';
    }, 2000);
  }

  private findHighlightTarget(element: HTMLElement): HTMLElement {
    const tag = element.tagName.toLowerCase();
    // For interactive controls and anchors, prefer the element itself
    if (tag === 'a' || tag === 'input' || tag === 'textarea' || element.isContentEditable) {
      return element;
    }
    const isReasonableBox = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 6 && rect.height >= 6;
    };

    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      try {
        const style = window.getComputedStyle(current);
        const isInline = style.display === 'inline' || style.display === 'contents';
        if (this.isElementVisible(current) && isReasonableBox(current) && !isInline) {
          return current;
        }
      } catch {}
      current = current.parentElement as HTMLElement | null;
    }
    return element;
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
