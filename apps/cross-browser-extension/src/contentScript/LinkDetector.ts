import { LinkData } from "../types";

// Match http/https URLs and bare domains
const SCHEME_URL_PATTERN = /https?:\/\/[^\s<>'"()]+/gi;
const BARE_DOMAIN_PATTERN = /\b(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,}))(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;

class LinkDetector {
  private observer: MutationObserver | null = null;
  private currentLinks: LinkData[] = [];
  private linkCounter = 0;
  public onLinksUpdated: ((links: LinkData[]) => void) | null = null;
  private scopedRootSelectors: string[] | null = null;
  private scopedRoots: Element[] = [];

  constructor(onLinksUpdated?: (links: LinkData[]) => void) {
    // Set callback first to avoid races with initial scan
    if (onLinksUpdated) {
      this.onLinksUpdated = onLinksUpdated;
    }

    this.startObserver();

    // Perform initial scan after current tick, scoped if selectors are provided
    queueMicrotask(() => {
      this.scanAllScopes();
      this.onLinksUpdated?.(this.currentLinks);
    });
  }

  private generateId(): string {
    return `link_${++this.linkCounter}`;
  }

  private isInsidePanel(node: Element | Node | null): boolean {
    if (!node) return false;
    const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    return Boolean(element?.closest('#pimms-panel-app, #pimms-panel'));
  }

  private isWithinScopes(element: Element): boolean {
    if (!this.scopedRootSelectors || this.scopedRoots.length === 0) return false;
    for (const root of this.scopedRoots) {
      try {
        if (root.contains(element)) return true;
      } catch {}
    }
    return false;
  }

  private resolveScopedRoots(): Element[] {
    if (!this.scopedRootSelectors || this.scopedRootSelectors.length === 0) return [];
    const found: Element[] = [];
    const seen = new Set<Element>();
    for (const sel of this.scopedRootSelectors) {
      try {
        const nodes = Array.from(document.querySelectorAll(sel));
        for (const n of nodes) {
          if (!seen.has(n)) {
            seen.add(n);
            found.push(n);
          }
        }
      } catch {}
    }
    return found;
  }

  private scanAllScopes() {
    // If no scopes set, do nothing (we only scan within provided containers)
    if (!this.scopedRootSelectors || this.scopedRoots.length === 0) return;
    for (const root of this.scopedRoots) {
      this.processElementAndChildren(root);
    }
  }

  private extractUrlsFromText(text: string): string[] {
    const results: string[] = [];
    if (!text) return results;

    const schemeMatches = text.match(SCHEME_URL_PATTERN) || [];
    for (const match of schemeMatches) {
      const cleaned = match.replace(/[),.;:]+$/, "");
      results.push(cleaned);
    }

    const domainMatches = text.match(BARE_DOMAIN_PATTERN) || [];
    for (const match of domainMatches) {
      if (schemeMatches.some((m) => m.includes(match))) continue;
      const cleaned = match.replace(/[),.;:]+$/, "");
      results.push(cleaned);
    }

    return results;
  }

  private processAnchor(anchor: HTMLAnchorElement) {
    if (this.isInsidePanel(anchor)) return;
    if (this.scopedRootSelectors && this.scopedRoots.length > 0 && !this.isWithinScopes(anchor)) return;
    
    // Only consider anchors whose ORIGINAL href attribute starts with http(s)://
    const rawHref = anchor.getAttribute('href')?.trim() || '';
    if (!/^https?:\/\//i.test(rawHref)) return;
    const href = anchor.href; // resolved absolute URL for parsing
    
    // Remove existing link with same element
    this.currentLinks = this.currentLinks.filter(link => link.element !== anchor);
    
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      this.currentLinks.push({
        href,
        text: anchor.textContent?.trim() || href,
        domain: url.hostname,
        element: anchor,
        id: this.generateId(),
        isTextUrl: false,
      });
    } catch {}
  }

  private processTextNode(node: Node) {
    if (!node.parentElement || this.isInsidePanel(node)) return;
    
    const parent = node.parentElement;
    const tag = parent.tagName.toLowerCase();
    // Ignore non-content tags, allow input/textarea via dedicated handler
    if (['script', 'style', 'noscript', 'a'].includes(tag)) return;
    
    const text = node.textContent || '';
    const matches = this.extractUrlsFromText(text);
    if (!matches) return;
    
    // Remove existing links from this text node
    this.currentLinks = this.currentLinks.filter(link => 
      !(link.isTextUrl && link.element === parent)
    );
    
    for (const match of matches) {
      const cleanUrl = match.replace(/[),.;:]+$/, '');
      try {
        const normalized = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
        const url = new URL(normalized);
        this.currentLinks.push({
          href: normalized,
          text: cleanUrl,
          domain: url.hostname,
          element: parent,
          id: this.generateId(),
          isTextUrl: true,
        });
      } catch {}
    }
  }

  private processHrefAttribute(el: Element) {
    if (this.isInsidePanel(el)) return;
    if (this.scopedRootSelectors && this.scopedRoots.length > 0 && !this.isWithinScopes(el)) return;
    const rawHref = el.getAttribute('href')?.trim() || '';
    if (!rawHref) return;

    // Accept http(s) or bare domains, ignore relatives
    let normalized: string | null = null;
    if (/^https?:\/\//i.test(rawHref)) {
      normalized = rawHref;
    } else {
      try {
        // Try to interpret as bare domain
        const testUrl = new URL(`https://${rawHref}`);
        normalized = testUrl.href;
      } catch {
        return;
      }
    }

    // Remove existing links tied to this element
    this.currentLinks = this.currentLinks.filter((link) => !(link.isTextUrl && link.element === el));

    try {
      const url = new URL(normalized);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      this.currentLinks.push({
        href: normalized,
        text: rawHref,
        domain: url.hostname,
        element: el as unknown as HTMLElement,
        id: this.generateId(),
        isTextUrl: true,
      });
    } catch {}
  }

  private processFormElement(el: HTMLInputElement | HTMLTextAreaElement) {
    if (this.isInsidePanel(el)) return;
    if (this.scopedRootSelectors && this.scopedRoots.length > 0 && !this.isWithinScopes(el)) return;
    const value = el.value || '';
    const matches = this.extractUrlsFromText(value);

    // Reset existing text URLs for this element
    this.currentLinks = this.currentLinks.filter((link) => !(link.isTextUrl && link.element === el));

    for (const match of matches) {
      const cleanUrl = match.replace(/[),.;:]+$/, '');
      try {
        const normalized = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
        const url = new URL(normalized);
        this.currentLinks.push({
          href: normalized,
          text: cleanUrl,
          domain: url.hostname,
          element: el,
          id: this.generateId(),
          isTextUrl: true,
        });
      } catch {}
    }
  }

  private processElementText(element: Element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || ['script', 'style', 'noscript', 'a'].includes(parent.tagName.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }}
    );

    let node;
    while ((node = walker.nextNode())) {
      this.processTextNode(node);
    }
  }

  private processElementAndChildren(element: Element) {
    // Process anchors in this element and its children
    const anchors = element.tagName === 'A' ? [element] : element.querySelectorAll?.('a[href]') || [];
    for (const anchor of anchors) {
      this.processAnchor(anchor as HTMLAnchorElement);
    }
    
    // Process non-anchor elements with href
    const hrefElements = element.tagName !== 'A' ? (element.querySelectorAll?.('[href]') || []) : [];
    for (const el of hrefElements as any) {
      if ((el as Element).tagName && (el as Element).tagName.toLowerCase() !== 'a') {
        this.processHrefAttribute(el as Element);
      }
    }

    // Process input/textarea values
    if (element.tagName && ['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      this.processFormElement(element as HTMLInputElement | HTMLTextAreaElement);
    } else {
      const formEls = element.querySelectorAll?.('input, textarea') || [];
      for (const el of formEls as any) {
        this.processFormElement(el as HTMLInputElement | HTMLTextAreaElement);
      }
    }

    // Process text content
    this.processElementText(element);
  }

  private removeStaleLinks() {
    this.currentLinks = this.currentLinks.filter(link => {
      const inDom = document.contains(link.element);
      if (!inDom) return false;
      if (this.scopedRootSelectors && this.scopedRoots.length > 0) {
        return this.isWithinScopes(link.element);
      }
      return true;
    });
  }

  private startObserver() {
    this.observer = new MutationObserver((mutations) => {
      let hasChanges = false;

      for (const mutation of mutations) {
        if (this.isInsidePanel(mutation.target)) continue;

        if (mutation.type === 'childList') {
          // Process added nodes
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processElementAndChildren(node as Element);
              hasChanges = true;
            } else if (node.nodeType === Node.TEXT_NODE) {
              this.processTextNode(node);
              hasChanges = true;
            }
          }
          
          // Remove links for removed nodes
          if (mutation.removedNodes.length > 0) {
            this.removeStaleLinks();
            hasChanges = true;
          }
        } else if (mutation.type === 'attributes') {
          const el = mutation.target as Element;
          if (mutation.attributeName === 'href') {
            if (el.tagName && el.tagName.toLowerCase() === 'a') {
              this.processAnchor(el as HTMLAnchorElement);
            } else {
              this.processHrefAttribute(el);
            }
            hasChanges = true;
          } else if (mutation.attributeName === 'value') {
            if (el.tagName) {
              const tag = el.tagName.toLowerCase();
              if (tag === 'input' || tag === 'textarea') {
                this.processFormElement(el as HTMLInputElement | HTMLTextAreaElement);
                hasChanges = true;
              }
            }
          }
        } else if (mutation.type === 'characterData') {
          this.processTextNode(mutation.target);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.onLinksUpdated?.(this.currentLinks);
      }
    });

    // Targets will be set when root selectors are provided
    this.updateObserverTargets();
  }

  private updateObserverTargets() {
    if (!this.observer) return;
    try { this.observer.disconnect(); } catch {}

    // Only observe within scoped roots
    if (this.scopedRootSelectors && this.scopedRoots.length > 0) {
      for (const root of this.scopedRoots) {
        try {
          this.observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'value'],
            characterData: true,
          });
        } catch {}
      }
    }
  }

  // Public API to set scopes
  public setScopedRootSelectors(selectors: string[]) {
    this.scopedRootSelectors = Array.from(new Set((selectors || []).filter(Boolean)));
    this.scopedRoots = this.resolveScopedRoots();

    // Remove links outside scopes
    this.removeStaleLinks();

    // Reattach observers to new roots
    this.updateObserverTargets();

    // Re-scan within scopes
    this.currentLinks = [];
    this.scanAllScopes();
    this.onLinksUpdated?.(this.currentLinks);
  }

  // Public API
  public getCurrentLinks(): LinkData[] {
    return [...this.currentLinks];
  }

  public getLinkById(id: string): LinkData | undefined {
    return this.currentLinks.find((link) => link.id === id);
  }

  public scrollToLink(id: string) {
    const link = this.getLinkById(id);
    if (!link?.element) return;

    link.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // Simple highlight effect
    setTimeout(() => {
      const el = link.element;
      const original = el.style.outline;
      el.style.outline = '2px solid #007bff';
      setTimeout(() => {
        el.style.outline = original;
      }, 1500);
    }, 300);
  }

  public destroy() {
    this.observer?.disconnect();
  }
}

export default LinkDetector;