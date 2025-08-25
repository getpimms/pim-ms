import { createRoot } from "react-dom/client";
import { logger } from "../utils/logger";
import PanelApp from "./PanelApp";

export const renderPanel = () => {
  logger.debug("🎨 Rendering PIMMS React panel (Shadow DOM)...");

  // Create host attached to page
  const host = document.createElement("div");
  host.id = "pimms-panel-host";
  host.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;

  document.body.appendChild(host);

  // Shadow root for isolation
  const shadowRoot = host.attachShadow({ mode: "open" });

  // Inject compiled tailwind into shadow
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-origin", "pimms-shadow-tailwind");
  shadowRoot.appendChild(styleEl);
  const cssUrl = chrome.runtime.getURL("panel.css");
  const loadCss = async () => {
    try {
      // Use default caching for initial load in production, no-store only in dev for hot reload
      const cacheMode =
        process.env.NODE_ENV === "development" ? "no-store" : "default";
      const res = await fetch(cssUrl, { cache: cacheMode });
      if (!res.ok) throw new Error("Failed to load panel.css");
      const css = await res.text();
      styleEl.textContent = css;
    } catch (err) {
      logger.warn("[PIMMS] Could not load panel.css into shadow root:", err);
    }
  };
  loadCss();

  // In development, poll for CSS changes and hot-apply without reloading
  // Set REACT_APP_DISABLE_CSS_POLLING=true to disable this feature and reduce network requests
  let cssPollInterval: number | undefined;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.REACT_APP_DISABLE_CSS_POLLING !== "true"
  ) {
    let lastCss = "";
    const poll = async () => {
      try {
        const res = await fetch(`${cssUrl}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const nextCss = await res.text();
        if (nextCss !== lastCss) {
          styleEl.textContent = nextCss;
          lastCss = nextCss;
          logger.debug("[PIMMS] Applied latest panel.css");
        }
      } catch {}
    };
    // Seed the initial value then start polling
    (async () => {
      try {
        const res = await fetch(`${cssUrl}?t=init`, { cache: "no-store" });
        lastCss = res.ok ? await res.text() : "";
      } catch {
        lastCss = "";
      }
    })();
    cssPollInterval = window.setInterval(poll, 5000);
  }

  // Mount point inside shadow
  const mountEl = document.createElement("div");
  mountEl.id = "pimms-panel-app";
  mountEl.style.pointerEvents = "auto";
  shadowRoot.appendChild(mountEl);

  const root = createRoot(mountEl);
  root.render(<PanelApp />);

  logger.debug("✅ PIMMS React panel rendered inside Shadow DOM");

  return () => {
    logger.debug("🧹 Unmounting PIMMS panel...");
    if (cssPollInterval) window.clearInterval(cssPollInterval);
    try {
      window.pimmsPanelApp?.destroy?.();
    } catch {}
    root.unmount();
    if (host.parentNode) host.parentNode.removeChild(host);
  };
};
