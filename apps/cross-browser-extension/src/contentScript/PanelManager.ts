import { LinkData, EMAIL_MARKETING_DOMAINS } from '../types';

class PanelManager {
  private panel: HTMLElement | null = null;
  private isVisible = true;
  private currentLinks: LinkData[] = [];
  private hoveredLink: LinkData | null = null;
  private isShowingHoveredLink = false;

  constructor() {
    // Check if current page is a target platform
    if (this.isTargetPage() || this.shouldShowPanel()) {
      this.isVisible = true;
    }
  }

  private isTargetPage(): boolean {
    const hostname = window.location.hostname.replace('www.', '').toLowerCase();
    return EMAIL_MARKETING_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  }

  private shouldShowPanel(): boolean {
    return this.currentLinks.length > 0;
  }

  public updateLinks(links: LinkData[]) {
    try {
      this.currentLinks = links;
      
      if (links.length > 0 && this.isVisible) {
        this.showPanel();
      } else if (links.length === 0 && !this.isTargetPage()) {
        this.hidePanel();
      }
    } catch (error) {
      console.log('⚠️ Error updating panel links:', error);
    }
  }

  public showHoveredLink(link: LinkData) {
    this.hoveredLink = link;
    this.isShowingHoveredLink = true;
    this.updatePanelContent();
  }

  public hideHoveredLink() {
    setTimeout(() => {
      this.hoveredLink = null;
      this.isShowingHoveredLink = false;
      this.updatePanelContent();
    }, 5000);
  }

  private showPanel() {
    if (!this.panel) {
      this.createPanel();
    }
    this.updatePanelContent();
  }

  private hidePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  private createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'pimms-links-panel';
    
    // Use completely isolated inline styles - no global CSS pollution
    this.panel.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 320px !important;
      max-height: 400px !important;
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif !important;
      font-size: 13px !important;
      overflow: hidden !important;
      opacity: 0 !important;
      transform: translateY(-10px) scale(0.95) !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
      backdrop-filter: blur(8px) !important;
      isolation: isolate !important;
      contain: layout style paint !important;
      pointer-events: auto !important;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding: 12px 16px !important;
      backdrop-filter: blur(8px) !important;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #334155 !important;
      font-family: inherit !important;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none !important;
      border: none !important;
      font-size: 18px !important;
      cursor: pointer !important;
      color: #64748b !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
      font-family: inherit !important;
      line-height: 1 !important;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = '#f1f5f9';
      closeBtn.style.color = '#334155';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = '#64748b';
    };
    closeBtn.onclick = () => {
      this.isVisible = false;
      this.hidePanel();
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      max-height: 320px !important;
      overflow-y: auto !important;
      padding: 8px !important;
      background: #ffffff !important;
    `;

    this.panel.appendChild(header);
    this.panel.appendChild(content);
    document.body.appendChild(this.panel);

    // Smooth animation
    requestAnimationFrame(() => {
      if (this.panel) {
        this.panel.style.opacity = '1';
        this.panel.style.transform = 'translateY(0) scale(1)';
      }
    });
  }

  private updatePanelContent() {
    if (!this.panel) return;

    const title = this.panel.querySelector('h3');
    const content = this.panel.querySelector('div:last-child') as HTMLElement;

    if (!title || !content) return;

    // Update title
    title.textContent = this.isShowingHoveredLink && this.hoveredLink ? '🎯 Hovered Link' : `🔗 PIMMS Links (${this.currentLinks.length})`;

    // Update content
    content.innerHTML = '';

    if (this.isShowingHoveredLink && this.hoveredLink) {
      content.appendChild(this.createHoveredLinkContent());
    } else {
      content.appendChild(this.createLinksListContent());
    }
  }

  private createHoveredLinkContent(): HTMLElement {
    if (!this.hoveredLink) return document.createElement('div');

    const container = document.createElement('div');
    container.style.cssText = 'padding: 16px !important;';

    const linkInfo = document.createElement('div');
    linkInfo.style.cssText = `
      background: #f8fafc !important;
      padding: 16px !important;
      border-radius: 8px !important;
      margin-bottom: 16px !important;
      border: 1px solid #e2e8f0 !important;
    `;

    // Small label for link text
    const linkText = document.createElement('div');
    linkText.textContent = this.hoveredLink.text;
    linkText.style.cssText = `
      background: #f1f5f9 !important;
      color: #64748b !important;
      padding: 4px 8px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      margin-bottom: 12px !important;
      display: inline-block !important;
      max-width: 100% !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-family: inherit !important;
    `;

    // Format URL with domain highlighting - remove protocol for cleaner display
    const formatUrl = (href: string) => {
      try {
        const url = new URL(href);
        const domain = url.hostname;
        const path = url.pathname + url.search + url.hash;
        return { domain, path };
      } catch {
        return { domain: href, path: '' };
      }
    };

    const { domain, path } = formatUrl(this.hoveredLink.href);

    const linkUrl = document.createElement('div');
    linkUrl.style.cssText = `
      font-size: 13px !important;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
      word-break: break-all !important;
      line-height: 1.4 !important;
    `;

    const domainSpan = document.createElement('span');
    domainSpan.textContent = domain;
    domainSpan.style.cssText = 'color: #2563eb !important; font-weight: 600 !important;';

    const pathSpan = document.createElement('span');
    pathSpan.textContent = path;
    pathSpan.style.cssText = 'color: #4b5563 !important; font-weight: 400 !important;';

    linkUrl.appendChild(domainSpan);
    linkUrl.appendChild(pathSpan);

    linkInfo.appendChild(linkText);
    linkInfo.appendChild(linkUrl);

    const shortenBtn = document.createElement('button');
    shortenBtn.textContent = 'Shorten with PIMMS';
    shortenBtn.style.cssText = `
      background: #2563eb !important;
      color: #ffffff !important;
      border: none !important;
      padding: 12px 24px !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      width: 100% !important;
      font-size: 14px !important;
      transition: background-color 0.2s ease !important;
      font-family: inherit !important;
    `;
    shortenBtn.onmouseover = () => {
      shortenBtn.style.backgroundColor = '#1d4ed8';
    };
    shortenBtn.onmouseout = () => {
      shortenBtn.style.backgroundColor = '#2563eb';
    };
    shortenBtn.onclick = () => {
      console.log('🔗 Shorten clicked:', this.hoveredLink!.href);
    };

    container.appendChild(linkInfo);
    container.appendChild(shortenBtn);
    return container;
  }

  private createLinksListContent(): HTMLElement {
    const container = document.createElement('div');

    if (this.currentLinks.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        text-align: center !important;
        padding: 32px 16px !important;
        color: #64748b !important;
      `;

      const emoji = document.createElement('div');
      emoji.style.cssText = `
        font-size: 40px !important;
        margin-bottom: 16px !important;
      `;
      emoji.textContent = '🔍';

      const heading = document.createElement('div');
      heading.style.cssText = `
        font-weight: 600 !important;
        color: #334155 !important;
        font-size: 16px !important;
        margin-bottom: 8px !important;
        font-family: inherit !important;
      `;
      heading.textContent = 'No links detected';

      const desc = document.createElement('div');
      desc.style.cssText = `
        font-size: 13px !important;
        line-height: 1.4 !important;
        font-family: inherit !important;
      `;
      desc.textContent = 'Browse to email marketing platforms or type URLs';

      emptyState.appendChild(emoji);
      emptyState.appendChild(heading);
      emptyState.appendChild(desc);
      container.appendChild(emptyState);
    } else {
      this.currentLinks.forEach((link) => {
        const linkItem = document.createElement('div');
        linkItem.style.cssText = `
          padding: 12px !important;
          margin: 4px 0 !important;
          border: 1px solid #f1f5f9 !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          background: #ffffff !important;
          transition: all 0.2s ease !important;
        `;

        linkItem.onclick = () => {
          this.scrollToLink(link);
        };

        linkItem.onmouseenter = () => {
          linkItem.style.backgroundColor = '#f8fafc';
          linkItem.style.borderColor = '#2563eb';
          linkItem.style.transform = 'translateY(-1px)';
          linkItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        };

        linkItem.onmouseleave = () => {
          linkItem.style.backgroundColor = '#ffffff';
          linkItem.style.borderColor = '#f1f5f9';
          linkItem.style.transform = 'translateY(0)';
          linkItem.style.boxShadow = 'none';
        };

        // Small label for link text
        const textLabel = document.createElement('div');
        textLabel.textContent = link.text;
        textLabel.style.cssText = `
          background: #f1f5f9 !important;
          color: #64748b !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-size: 10px !important;
          font-weight: 500 !important;
          margin-bottom: 8px !important;
          display: inline-block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-family: inherit !important;
        `;

        // Format URL with domain highlighting - remove protocol for cleaner display
        const formatUrl = (href: string) => {
          try {
            const url = new URL(href);
            const domain = url.hostname;
            const path = url.pathname + url.search + url.hash;
            return { domain, path };
          } catch {
            return { domain: href, path: '' };
          }
        };

        const { domain, path } = formatUrl(link.href);
        
        const urlContainer = document.createElement('div');
        urlContainer.style.cssText = `
          font-size: 13px !important;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          display: flex !important;
          align-items: center !important;
        `;

        const badge = document.createElement('span');
        badge.style.cssText = `
          width: 6px !important;
          height: 6px !important;
          background: #2563eb !important;
          border-radius: 50% !important;
          display: inline-block !important;
          margin-right: 8px !important;
          flex-shrink: 0 !important;
        `;

        const urlText = document.createElement('div');
        urlText.style.cssText = `
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        `;

        const domainSpan = document.createElement('span');
        domainSpan.textContent = domain;
        domainSpan.style.cssText = 'color: #2563eb !important; font-weight: 600 !important;';

        const pathSpan = document.createElement('span');
        pathSpan.textContent = path;
        pathSpan.style.cssText = 'color: #4b5563 !important; font-weight: 400 !important;';

        urlText.appendChild(domainSpan);
        urlText.appendChild(pathSpan);

        urlContainer.appendChild(badge);
        urlContainer.appendChild(urlText);

        linkItem.appendChild(textLabel);
        linkItem.appendChild(urlContainer);
        container.appendChild(linkItem);
      });
    }

    return container;
  }

  private scrollToLink(link: LinkData) {
    if (link.element) {
      link.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      this.highlightElement(link.element);
    }
  }

  private highlightElement(element: HTMLElement) {
    const originalOutline = element.style.outline;
    const originalBackground = element.style.backgroundColor;
    
    element.style.outline = '3px solid #2B7FFF';
    element.style.backgroundColor = 'rgba(43, 127, 255, 0.2)';
    
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.backgroundColor = originalBackground;
    }, 3000);
  }

  public destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}

export default PanelManager;
