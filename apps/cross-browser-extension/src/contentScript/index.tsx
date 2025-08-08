import { ChromeMessage, EMAIL_MARKETING_DOMAINS } from "../types";
import { logger } from "../utils/logger";
import HoverHandler from "./HoverHandler";
import { tryInjectAnalyticsPreview } from './utils/injectAnalytics';
import LinkDetector from "./LinkDetector";
import { renderPanel } from "./renderPanel";

// Tailwind CSS is now isolated and injected inside the Shadow DOM via panel.css

function isEmailMarketingDomain(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return EMAIL_MARKETING_DOMAINS.some(({ domain }) => {
    const d = domain.toLowerCase();
    return normalizedHost === d || normalizedHost.endsWith(`.${d}`);
  });
}

// Tag helpers for structured messages
const tag = (label: string, message: string) => `[${label}] ${message}`;

class ContentScript {
  private linkDetector: LinkDetector;
  private hoverHandler: HoverHandler;
  private destroyPanel: (() => void) | null = null;
  private isContextValid = true;

  constructor() {
    this.linkDetector = new LinkDetector();
    this.hoverHandler = new HoverHandler(this.linkDetector);

    // Render React panel
    this.destroyPanel = renderPanel();

    // Connect the components - update React panel
    this.linkDetector.onLinksUpdated = (links) => {
      // Update React panel
      if ((window as any).pimmsPanelApp) {
        (window as any).pimmsPanelApp.updateLinks(links);
      }

      this.hoverHandler.updateListeners();
    };

    this.hoverHandler.onHoveredLink = (link) => {
      // Update React panel
      if ((window as any).pimmsPanelApp) {
        (window as any).pimmsPanelApp.showHoveredLink(link);
      }
    };

    this.hoverHandler.onHideHoveredLink = () => {
      if ((window as any).pimmsPanelApp) {
        (window as any).pimmsPanelApp.hideHoveredLink();
      }
    };

    this.setupMessageListener();
    this.setupContextInvalidationHandler();
    logger.info(tag("PIMMS", "ContentScript initialized successfully"));
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (message: ChromeMessage, sender, sendResponse) => {
        logger.debug(
          tag("PIMMS", `Message received: ${message.type}`),
          message,
        );

        try {
          switch (message.type) {
            case "SCROLL_TO_LINK":
              this.linkDetector.scrollToLink(message.linkId);
              return false; 

            default:
              return false; 
          }
        } catch (error) {
          logger.error(tag("PIMMS", "Error handling message:"), error);
          return false;
        }
      },
    );
  }

  private setupContextInvalidationHandler() {
    // Listen for context invalidation
    window.addEventListener("beforeunload", () => {
      this.isContextValid = false;
    });

    // Check periodically if context is still valid
    setInterval(() => {
      this.checkExtensionContext();
    }, 5000); // Check every 5 seconds
  }

  // Check if extension context is still valid
  private checkExtensionContext(): boolean {
    try {
      // Test if extension context is still valid
      if (!chrome.runtime?.id) {
        this.isContextValid = false;
        return false;
      }
      return this.isContextValid;
    } catch (error) {
      this.isContextValid = false;
      return false;
    }
  }

  public destroy() {
    this.linkDetector.destroy();
    this.hoverHandler.destroy();

    // Destroy React panel
    if (this.destroyPanel) {
      this.destroyPanel();
      this.destroyPanel = null;
    }
  }
}

if (isEmailMarketingDomain(window.location.hostname)) {
  const normalizedHost = window.location.hostname.toLowerCase();
  const scope = EMAIL_MARKETING_DOMAINS.find(
    ({ domain }) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );

  let active: ContentScript | null = null;
  const hasAnyRoot = (): boolean => {
    if (!scope?.rootSelectors || scope.rootSelectors.length === 0) return true;
    return scope.rootSelectors.some((sel) => !!document.querySelector(sel));
  };

  const ensureInit = () => {
    if (active || !hasAnyRoot()) return;
    active = new ContentScript();
    tryInjectAnalyticsPreview(normalizedHost, scope);
    if (
      scope?.rootSelectors &&
      typeof (active as any).linkDetector?.setScopedRootSelectors === 'function'
    ) {
      (active as any).linkDetector.setScopedRootSelectors(scope.rootSelectors);
    }
    window.addEventListener('beforeunload', () => active && active!.destroy());
  };

  const ensureDestroy = () => {
    if (!active) return;
    if (hasAnyRoot()) return;
    try { active.destroy(); } catch {}
    active = null;
    try { (window as any).pimmsPanelApp?.hide?.(); } catch {}
  };

  // Initial checks
  // 1) Try injecting analytics preview regardless of root presence
  tryInjectAnalyticsPreview(normalizedHost, scope);
  // 2) Initialize link detection/panel only when roots exist
  if (hasAnyRoot()) ensureInit();

  // Observe DOM for root selector presence changes
  const observer = new MutationObserver(() => {
    // Try analytics injection on DOM mutations as analytics containers may mount later
    tryInjectAnalyticsPreview(normalizedHost, scope);
    if (!active) {
      ensureInit();
    } else {
      ensureDestroy();
    }
  });
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  // React to SPA navigations
  const onUrlChange = () => {
    // On route change, re-evaluate presence and init/destroy accordingly
    ensureDestroy();
    ensureInit();
    // Also retry analytics block injection on route changes
    tryInjectAnalyticsPreview(normalizedHost, scope);
  };
  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('hashchange', onUrlChange);
  // Patch history methods to emit a custom event
  try {
    const ps = history.pushState;
    const rs = history.replaceState;
    if (ps) {
      history.pushState = function (this: History, ...args: any[]) {
        const ret = ps.apply(this, args as any);
        onUrlChange();
        return ret;
      } as typeof history.pushState;
    }
    if (rs) {
      history.replaceState = function (this: History, ...args: any[]) {
        const ret = rs.apply(this, args as any);
        onUrlChange();
        return ret;
      } as typeof history.replaceState;
    }
  } catch {}
}
