// Lightweight gate to defer heavy content script injection and avoid interfering
// with host pages during modal lifecycles.
(() => {
  try {
    // Top-frame only
    if (window !== window.top) return;
    // Avoid double-injection
    if (window.__PIMMS_GATE_INJECTED__) return;
    window.__PIMMS_GATE_INJECTED__ = true;

    const inject = () => {
      try {
        const href = location.href;
        // Ask background if this URL matches allowed patterns before injection
        chrome.runtime?.sendMessage?.({ type: 'PIMMS_SHOULD_INJECT', href }, (resp) => {
          if (resp && resp.ok) {
            chrome.runtime?.sendMessage?.({ type: 'PIMMS_INJECT_CONTENT_BUNDLE' });
          }
        });
      } catch {}
    };

    // Defer until idle/next frame to avoid ResizeObserver loops around modals
    const idle = (cb) => {
      if ('requestIdleCallback' in window) {
        return requestIdleCallback(() => requestAnimationFrame(cb), { timeout: 1000 });
      }
      return setTimeout(() => requestAnimationFrame(cb), 250);
    };

    // If the page is hidden (e.g., background tab), wait until visible
    if (document.visibilityState !== 'visible') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          idle(inject);
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return;
    }

    idle(inject);
  } catch {}
})();


