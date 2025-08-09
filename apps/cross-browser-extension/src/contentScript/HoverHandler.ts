import { LinkData } from '../types';
import LinkDetector from './LinkDetector';

class HoverHandler {
  private linkDetector: LinkDetector;
  private linkListeners = new WeakMap<HTMLElement, any>();
  private hoverTimeout: number | null = null;
  private hoverRaf: number | null = null; // throttle to next frame
  private pendingLink: LinkData | null = null;
  private hideDelayMs = 120; // quick hide to avoid flicker

  constructor(linkDetector: LinkDetector) {
    this.linkDetector = linkDetector;
    this.setupHoverListeners();
  }

  private setupHoverListeners() {
    // Set up listeners for all detected links (dedupe by element)
    const links = this.linkDetector.getCurrentLinks();
    const seen = new WeakSet<HTMLElement>();
    links.forEach((link) => {
      if (!link.element || seen.has(link.element)) return;
      seen.add(link.element);
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

    // Create new listeners with rAF throttling for responsiveness
    const listeners = {
      mouseEnter: (e: MouseEvent) => {
        // schedule on next frame; collapse rapid moves
        this.pendingLink = link;
        if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf);
        this.hoverRaf = requestAnimationFrame(() => {
          this.hoverRaf = null;
          if (this.pendingLink) {
            this.showHoveredLink(this.pendingLink);
          }
        });
      },
      mouseLeave: (e: MouseEvent) => {
        // small delay to avoid flicker when crossing gaps
        if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
        this.hoverTimeout = window.setTimeout(() => {
          this.hideHoveredLink();
        }, this.hideDelayMs);
      }
    };

    // Store and add listeners
    this.linkListeners.set(element, listeners);
    element.addEventListener('mouseenter', listeners.mouseEnter, { passive: true } as any);
    element.addEventListener('mouseleave', listeners.mouseLeave, { passive: true } as any);
  }

  private showHoveredLink(link: LinkData) {
    
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Only notify the callback - message sending is handled centrally in index.ts
    if (this.onHoveredLink) {
      this.onHoveredLink(link);
    }
  }

  private hideHoveredLink() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    if (this.onHideHoveredLink) {
      this.onHideHoveredLink();
    }
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
    if (this.hoverRaf) {
      cancelAnimationFrame(this.hoverRaf);
      this.hoverRaf = null;
    }
    // Remove listeners from tracked elements using current links (WeakMap is not iterable)
    const links = this.linkDetector.getCurrentLinks();
    const seen = new WeakSet<HTMLElement>();
    links.forEach((l) => {
      const el = l.element;
      if (!el || seen.has(el)) return;
      seen.add(el);
      const ls = this.linkListeners.get(el);
      if (ls) {
        try {
          el.removeEventListener('mouseenter', ls.mouseEnter);
          el.removeEventListener('mouseleave', ls.mouseLeave);
        } catch {}
      }
    });
    this.linkListeners = new WeakMap();
  }
}

export default HoverHandler;
