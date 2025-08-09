import { ChromeMessage, EMAIL_MARKETING_DOMAINS } from "../types";
import { logger } from "../utils/logger";
import HoverHandler from "./HoverHandler";
import LinkDetector from "./LinkDetector";
import { renderPanel } from "./renderPanel";
import { tryInjectAnalyticsPreview } from "./utils/injectAnalytics";

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
  private linkDetector: LinkDetector | null = null;
  private hoverHandler: HoverHandler | null = null;
  private destroyPanel: (() => void) | null = null;
  private isContextValid = true;
  private detectionEnabled: boolean;

  constructor(detectionEnabled: boolean, createPanel: boolean = true) {
    this.detectionEnabled = detectionEnabled;

    if (this.detectionEnabled) {
      this.linkDetector = new LinkDetector((links) => {
        if ((window as any).pimmsPanelApp) {
          (window as any).pimmsPanelApp.updateLinks(links);
        }
        this.hoverHandler?.updateListeners();
      });
      this.hoverHandler = new HoverHandler(this.linkDetector);

      // Connect components only when detection is enabled
      // As an extra safety, if the panel API is not ready at first callback,
      // retry a couple times to push the initial links once it mounts.
      const tryEmit = () => {
        const links = this.linkDetector?.getCurrentLinks?.() || [];
        if ((window as any).pimmsPanelApp?.updateLinks) {
          (window as any).pimmsPanelApp.updateLinks(links);
        } else {
          setTimeout(tryEmit, 100);
        }
      };
      setTimeout(tryEmit, 0);

      this.hoverHandler.onHoveredLink = (link) => {
        if ((window as any).pimmsPanelApp) {
          (window as any).pimmsPanelApp.showHoveredLink(link);
        }
      };

      this.hoverHandler.onHideHoveredLink = () => {
        if ((window as any).pimmsPanelApp) {
          (window as any).pimmsPanelApp.hideHoveredLink();
        }
      };
    }

    // Render React panel only if requested (legacy support)
    if (createPanel) {
      this.destroyPanel = renderPanel();
    }

    this.setupMessageListener();
    this.setupContextInvalidationHandler();
    logger.info(
      tag(
        "PIMMS",
        `ContentScript initialized (${this.detectionEnabled ? "with" : "without"} detection)`,
      ),
    );
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (message: ChromeMessage) => {
        try {
          switch (message.type) {
            case "SCROLL_TO_LINK":
              if (this.linkDetector) {
                this.linkDetector.scrollToLink(message.linkId);
              }
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

  public destroyDetectionOnly() {
    this.linkDetector?.destroy?.();
    this.hoverHandler?.destroy?.();
    this.linkDetector = null;
    this.hoverHandler = null;
  }

  public destroy() {
    this.destroyDetectionOnly();

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
    ({ domain }) =>
      normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );

  let active: ContentScript | null = null;
  let detectionEnabled = false;
  let panelDestroy: (() => void) | null = null;

  // Auth is now handled by useCookieAuth hook, we just read the global flag
  const hasAnyRoot = (): boolean => {
    if (!scope?.rootSelectors || scope.rootSelectors.length === 0) return true;
    return scope.rootSelectors.some((sel) => !!document.querySelector(sel));
  };

  // Centralized analytics management
  const manageAnalytics = (shouldShow: boolean) => {
    const existingBlock = document.getElementById("pimms-analytics-block");

    if (shouldShow) {
      // Only inject if not already present
      if (!existingBlock) {
        // tryInjectAnalyticsPreview has its own conditions (URL pattern, ready selectors)
        // It will only inject if ALL conditions are met
        tryInjectAnalyticsPreview(normalizedHost, scope).catch(() => {
          // Ignore errors in analytics injection
        });
      }
    } else {
      // Remove analytics if present
      if (existingBlock) {
        console.log("[PIMMS] Analytics should hide, removing...");
        existingBlock.remove();
      }
    }
  };

  const applyRootScopes = () => {
    if (
      scope?.rootSelectors &&
      typeof (active as any)?.linkDetector?.setScopedRootSelectors === "function"
    ) {
      (active as any).linkDetector.setScopedRootSelectors(scope.rootSelectors);
    }
  };

  const ensureInit = async () => {
    // Read auth state from global flag set by useCookieAuth
    const isLoggedIn = !!(window as any).__pimmsIsLoggedIn;
    const hasRoots = hasAnyRoot();
    const shouldEnableDetection = !!isLoggedIn && hasRoots;

    // Analytics should show when logged in (regardless of root selectors, different from detection)
    const shouldShowAnalytics = !!isLoggedIn;

    // Only log significant changes, not every call
    if (active && detectionEnabled !== shouldEnableDetection) {
      console.log("[PIMMS] Detection state changing:", {
        from: detectionEnabled,
        to: shouldEnableDetection,
        reason: !isLoggedIn
          ? "logged out"
          : !hasRoots
            ? "no root selectors"
            : "conditions met",
      });
    }

    // If detection state hasn't changed, don't recreate detector
    if (active && detectionEnabled === shouldEnableDetection) {
      // Keep analytics in sync
      manageAnalytics(shouldShowAnalytics);
      // Always refresh scoped roots on each ensureInit to catch dynamic containers
      if (shouldEnableDetection) applyRootScopes();
      return;
    }

    // Cleanup existing detection only (keep panel alive)
    if (active) {
      try {
        // Only destroy detection components, not panel
        active.destroyDetectionOnly();
      } catch {}
      active = null;
    }

    // Create ContentScript with detection only if logged in AND root selectors present
    active = new ContentScript(shouldEnableDetection, false); // false = don't create panel
    detectionEnabled = shouldEnableDetection;

    // Manage analytics separately from detection
    manageAnalytics(shouldShowAnalytics);

    // Set/refresh root selectors if detection is enabled
    if (shouldEnableDetection) applyRootScopes();

    window.addEventListener("beforeunload", () => {
      if (active) active.destroyDetectionOnly();
      if (panelDestroy) panelDestroy();
    });
  };

  const ensureDestroy = () => {
    if (active) {
      try {
        active.destroyDetectionOnly();
      } catch {}
      active = null;
    }
    if (panelDestroy) {
      try {
        panelDestroy();
      } catch {}
      panelDestroy = null;
    }
    try {
      (window as any).pimmsPanelApp?.hide?.();
    } catch {}
  };

  // Initialize React panel once (separate from detection lifecycle)
  panelDestroy = renderPanel();

  // Initial check - create appropriate version based on auth state
  ensureInit();

  // Observe DOM for changes - check both analytics and root selector presence
  let updateTimer: number | null = null;
  const observer = new MutationObserver(() => {
    if (updateTimer) window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(() => {
      // Re-check if we should enable/disable detection based on root selectors
      ensureInit();

      // Analytics will be managed by ensureInit()
    }, 150);
  });
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  // React to SPA navigations
  const onUrlChange = () => {
    console.log("[PIMMS] URL change detected:", window.location.href);

    // Remove existing analytics block to allow re-injection on new page
    const existingBlock = document.getElementById("pimms-analytics-block");
    if (existingBlock) {
      existingBlock.remove();
      console.log("[PIMMS] Removed existing analytics block for re-injection");
    }

    // Re-initialize everything (detector + analytics)
    ensureInit();
  };

  // Auth state is now managed by useCookieAuth hook, no need for redundant polling
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ensureInit();
  });

  // Listen for auth errors from API calls
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "PIMMS_AUTH_ERROR") {
      console.log(
        "[PIMMS] Auth error detected from API, invalidating cache:",
        message,
      );
      if ((window as any).__pimmsInvalidateAuthCache) {
        (window as any).__pimmsInvalidateAuthCache();
      }
      // Also re-check auth state
      setTimeout(ensureInit, 100);
    }
  });

  // This event is now handled by pimms-detector-refresh, no need for separate analytics event

  // Listen for detector refresh events from auth hook
  window.addEventListener("pimms-detector-refresh", (event: any) => {
    console.log(
      "[PIMMS] Detector refresh triggered by auth change:",
      event.detail,
    );
    ensureInit(); // Re-initialize detector based on new auth state
  });

  window.addEventListener("popstate", onUrlChange);
  window.addEventListener("hashchange", onUrlChange);

  // Patch history methods to emit a custom event
  try {
    const ps = history.pushState;
    const rs = history.replaceState;
    if (ps) {
      history.pushState = function (this: History, ...args: any[]) {
        const ret = ps.apply(this, args as any);
        try { onUrlChange(); } catch {}
        try { requestAnimationFrame(() => onUrlChange()); } catch {}
        return ret;
      } as typeof history.pushState;
    }
    if (rs) {
      history.replaceState = function (this: History, ...args: any[]) {
        const ret = rs.apply(this, args as any);
        try { onUrlChange(); } catch {}
        try { requestAnimationFrame(() => onUrlChange()); } catch {}
        return ret;
      } as typeof history.replaceState;
    }
  } catch {}

  // Additional URL monitoring for modern SPAs that might not trigger history events
  let lastUrl = window.location.href;
  const urlChecker = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("[PIMMS] URL change detected via polling:", currentUrl);
      lastUrl = currentUrl;
      onUrlChange();
    }
  }, 250); // Faster check for SPAs

  // Cleanup interval on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(urlChecker);
  });
} else {
  // Not an email marketing domain - log and exit cleanly
  console.log(`[PIMMS] Skipping initialization on non-email-marketing domain: ${window.location.hostname}`);
}
