import React, { useEffect, useRef, useState } from "react";
import { LinkData, PanelState, EMAIL_MARKETING_DOMAINS } from "../types";
import { logger } from "../utils/logger";
import Panel from "./components/Panel";
import { toast } from "./components/ui/Toast";
import isPimmsLink from './utils/isPimmsLink';

interface PanelAppProps {
  onDestroy: () => void;
}

const PanelApp: React.FC<PanelAppProps> = ({ onDestroy }) => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [panelState, setPanelState] = useState<PanelState>("links");
  const [hoveredLink, setHoveredLink] = useState<LinkData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  const [shortenedById, setShortenedById] = useState<Record<string, string>>({});
  const [isShortenedReflected, setIsShortenedReflected] = useState<boolean>(false);
  // When user closes the panel manually, keep it closed until page reload
  const closedUntilReloadRef = useRef<boolean>(false);
  // When true, keep the UI in detail view and ignore hover-hide
  const detailLockedRef = useRef<boolean>(false);
  // Hold timer so detail view remains briefly after hover ends
  const hoverHideTimerRef = useRef<number | null>(null);
  const HOVER_HOLD_MS = 3000;

  // Detect DOM reflection of the shortened URL and auto-return
  useEffect(() => {
    if (panelState !== 'hovered' || !hoveredLink) return;
    const shortened = shortenedById[hoveredLink.id];
    if (!shortened) {
      setIsShortenedReflected(false);
      return;
    }

    const ensureHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const stripProto = (u: string) => u.replace(/^https?:\/\//i, '');
    const stripTrailing = (u: string) => u.replace(/\/+$/, '');
    const cands = Array.from(new Set([
      shortened,
      stripTrailing(shortened),
      stripProto(shortened),
      stripTrailing(stripProto(shortened)),
      ensureHttp(shortened),
      stripTrailing(ensureHttp(shortened)),
    ]));
    const containsAny = (s: string | null | undefined) => {
      if (!s) return false;
      return cands.some((c) => c && s.includes(c));
    };

    let reflected = false;
    try {
      const el = hoveredLink.element as HTMLElement;
      if (el instanceof HTMLAnchorElement) {
        reflected = containsAny(el.href) || containsAny(el.textContent);
      } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        reflected = containsAny(el.value);
      } else {
        // Check the element, its closest contenteditable ancestor, and its parent text
        reflected = containsAny(el.textContent);
        if (!reflected) {
          const editable = el.closest('[contenteditable="true"]') as HTMLElement | null;
          if (editable) {
            reflected = containsAny(editable.textContent);
          }
        }
        if (!reflected && el.parentElement) {
          reflected = containsAny(el.parentElement.textContent);
        }
      }
      // As a last resort, check current detected links collection
      if (!reflected) {
        reflected = links.some((l) => containsAny(l.href) || containsAny(l.text));
      }
    } catch {}
    setIsShortenedReflected(reflected);
  }, [links, panelState, hoveredLink, shortenedById]);

  // Expose methods globally for content script communication
  useEffect(() => {
    (window as any).pimmsPanelApp = {
      updateLinks: (newLinks: LinkData[]) => {
        setLinks(newLinks);
        if (
          newLinks.length > 0 &&
          !isVisible &&
          !closedUntilReloadRef.current
        ) {
          setIsVisible(true);
        }
      },
      showHoveredLink: (link: LinkData) => {
        if (closedUntilReloadRef.current) return;
        if (detailLockedRef.current) return; // do not override locked detail view
        // Cancel pending hide if any
        if (hoverHideTimerRef.current) {
          window.clearTimeout(hoverHideTimerRef.current);
          hoverHideTimerRef.current = null;
        }
        setHoveredLink(link);
        setPanelState("hovered");
        if (!isVisible) {
          setIsVisible(true);
        }
      },
      hideHoveredLink: () => {
        // Only skip auto-hide when detail view was explicitly locked (clicked or after shorten)
        if (detailLockedRef.current) return;
        // Debounced hide: keep detail view visible briefly after hover ends
        if (hoverHideTimerRef.current) {
          window.clearTimeout(hoverHideTimerRef.current);
          hoverHideTimerRef.current = null;
        }
        hoverHideTimerRef.current = window.setTimeout(() => {
          clearAllHighlights();
          lastHoverHighlightedId.current = null;
          setHoveredLink(null);
          setPanelState("links");
          hoverHideTimerRef.current = null;
        }, HOVER_HOLD_MS);
      },
      toggle: () => {
        if (closedUntilReloadRef.current) return;
        setIsVisible(!isVisible);
      },
      hide: () => {
        setIsVisible(false);
      },
    };

    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle panel with Cmd/Ctrl + Shift + P
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "P"
      ) {
        event.preventDefault();
        if (!closedUntilReloadRef.current) {
          setIsVisible(!isVisible);
        }
      }

      // Escape should NOT hide the panel (requested behavior)
      if (event.key === "Escape" && isVisible) {
        event.preventDefault();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      delete (window as any).pimmsPanelApp;
    };
  }, [isVisible, panelState]);

  const handleClose = () => {
    setIsVisible(false);
    // Clear all highlights when closing
    clearAllHighlights();
    currentDetailLink.current = null;
    detailLockedRef.current = false;
    closedUntilReloadRef.current = true;
    (window as any).pimmsPanelClosedUntilReload = true;
  };

  const handleBackToList = () => {
    // Clear highlights and reset state
    clearAllHighlights();
    currentDetailLink.current = null;
    detailLockedRef.current = false;
    setHoveredLink(null);
    setPanelState("links");
  };

  // Auto-return to list a short while after reflection is detected.
  // Guard: only trigger when we're in detail view AND the shortened URL exists.
  useEffect(() => {
    if (!isShortenedReflected) return;
    if (panelState !== 'hovered') return;
    if (!hoveredLink || !shortenedById[hoveredLink.id]) return;
    const currentId = hoveredLink.id;
    const t = window.setTimeout(() => {
      // Clear the copied/shortened ephemeral state so next open shows normal view
      setShortenedById((prev) => {
        const { [currentId]: _removed, ...rest } = prev;
        return rest;
      });
      setIsShortenedReflected(false);
      handleBackToList();
    }, 1500);
    return () => window.clearTimeout(t);
  }, [isShortenedReflected, panelState, hoveredLink, shortenedById]);

  // CRITICAL: Store currently highlighted elements
  const highlightedElements = useRef<Set<HTMLElement>>(new Set());
  const elementToHighlightTarget = useRef<WeakMap<HTMLElement, HTMLElement>>(new WeakMap());
  const overlayByTarget = useRef<WeakMap<HTMLElement, { overlay: HTMLElement; onScroll: (e: Event) => void; onResize: () => void }>>(new WeakMap());
  const currentDetailLink = useRef<LinkData | null>(null);
  // Optimized hover overlay (single element) for fast hover highlighting
  const hoverOverlayRef = useRef<HTMLDivElement | null>(null);
  const hoverTargetRef = useRef<HTMLElement | null>(null);
  const hoverRafIdRef = useRef<number | null>(null);
  const hoverOnScrollRef = useRef<(e: Event) => void | null>(null);
  const hoverOnResizeRef = useRef<() => void | null>(null);
  const lastHoverHighlightedId = useRef<string | null>(null);

  const findHighlightTarget = (element: HTMLElement): HTMLElement => {
    const isReasonableBox = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 6 && rect.height >= 6;
    };

    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      try {
        const style = window.getComputedStyle(current);
        const isInline = style.display === 'inline' || style.display === 'contents';
        if (isReasonableBox(current) && !isInline) {
          return current;
        }
      } catch {}
      current = current.parentElement as HTMLElement | null;
    }
    return element;
  };

  // Apply highlight with a persistent overlay (immune to site CSS)
  const applyHighlight = (element: HTMLElement) => {
    const target = findHighlightTarget(element);
    if (highlightedElements.current.has(target)) return;

    const r = target.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) {
      // Fallback: subtle outline that doesn't hide text
      if (!target.dataset.originalOutline) {
        target.dataset.originalOutline = target.style.outline || "";
        target.dataset.originalOutlineOffset = target.style.outlineOffset || "";
      }
      target.style.outline = "2px solid #2B7FFF";
      target.style.outlineOffset = "2px";
      highlightedElements.current.add(target);
      elementToHighlightTarget.current.set(element, target);
      return;
    }

    const positionOverlay = (overlay: HTMLElement) => {
      const r2 = target.getBoundingClientRect();
      Object.assign(overlay.style, {
        position: 'fixed',
        left: `${Math.max(0, r2.left - 3)}px`,
        top: `${Math.max(0, r2.top - 3)}px`,
        width: `${Math.max(0, r2.width + 6)}px`,
        height: `${Math.max(0, r2.height + 6)}px`,
        border: '2px solid #2B7FFF',
        background: 'rgba(57, 113, 255, 0.08)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        zIndex: '2147483646',
        pointerEvents: 'none',
      } as CSSStyleDeclaration);
    };

    const overlay = document.createElement('div');
    overlay.setAttribute('data-pimms-highlight', 'true');
    positionOverlay(overlay);
    document.body.appendChild(overlay);

    const onScroll = () => positionOverlay(overlay);
    const onResize = () => positionOverlay(overlay);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    overlayByTarget.current.set(target, { overlay, onScroll, onResize });
    highlightedElements.current.add(target);
    elementToHighlightTarget.current.set(element, target);
  };

  // ----- High-performance hover overlay helpers -----
  const ensureHoverOverlay = () => {
    if (!hoverOverlayRef.current) {
      const el = document.createElement('div');
      el.id = 'pimms-hover-overlay';
      Object.assign(el.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: '0px',
        height: '0px',
        border: '2px solid #2B7FFF',
        background: 'rgba(57, 113, 255, 0.08)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        zIndex: '2147483646',
        pointerEvents: 'none',
        display: 'none',
      } as CSSStyleDeclaration);
      document.body.appendChild(el);
      hoverOverlayRef.current = el;
      const req = () => {
        if (hoverRafIdRef.current) cancelAnimationFrame(hoverRafIdRef.current);
        hoverRafIdRef.current = requestAnimationFrame(() => {
          const target = hoverTargetRef.current;
          const box = target?.getBoundingClientRect();
          if (!target || !box || box.width < 2 || box.height < 2) return;
          Object.assign(el.style, {
            left: `${Math.max(0, box.left - 3)}px`,
            top: `${Math.max(0, box.top - 3)}px`,
            width: `${Math.max(0, box.width + 6)}px`,
            height: `${Math.max(0, box.height + 6)}px`,
            display: 'block',
          } as CSSStyleDeclaration);
        });
      };
      hoverOnScrollRef.current = () => req();
      hoverOnResizeRef.current = () => req();
      window.addEventListener('scroll', hoverOnScrollRef.current, true);
      window.addEventListener('resize', hoverOnResizeRef.current);
    }
  };

  const showHoverOverlayFor = (element: HTMLElement) => {
    if (detailLockedRef.current) return; // do not override locked detail
    ensureHoverOverlay();
    const target = findHighlightTarget(element);
    if (hoverTargetRef.current === target) return; // no-op if same
    hoverTargetRef.current = target;
    if (hoverOverlayRef.current) {
      hoverOverlayRef.current.style.display = 'block';
    }
    // Position now (RAF)
    if (hoverRafIdRef.current) cancelAnimationFrame(hoverRafIdRef.current);
    hoverRafIdRef.current = requestAnimationFrame(() => {
      const box = target.getBoundingClientRect();
      if (hoverOverlayRef.current && box) {
        Object.assign(hoverOverlayRef.current.style, {
          left: `${Math.max(0, box.left - 3)}px`,
          top: `${Math.max(0, box.top - 3)}px`,
          width: `${Math.max(0, box.width + 6)}px`,
          height: `${Math.max(0, box.height + 6)}px`,
          display: 'block',
        } as CSSStyleDeclaration);
      }
    });
  };

  const hideHoverOverlay = () => {
    hoverTargetRef.current = null;
    if (hoverOverlayRef.current) hoverOverlayRef.current.style.display = 'none';
  };

  // Remove highlight from element
  const removeHighlight = (element: HTMLElement) => {
    const target = elementToHighlightTarget.current.get(element) || element;
    if (!highlightedElements.current.has(target)) return;

    const entry = overlayByTarget.current.get(target);
    if (entry) {
      window.removeEventListener('scroll', entry.onScroll, true);
      window.removeEventListener('resize', entry.onResize);
      entry.overlay.remove();
      overlayByTarget.current.delete(target);
    }

    highlightedElements.current.delete(target);
  };

  // Clear all highlights
  const clearAllHighlights = () => {
    highlightedElements.current.forEach((element) => {
      removeHighlight(element);
    });
    highlightedElements.current.clear();
  };

  const handleLinkHover = (link: LinkData) => {
    if (link.element) {
      // Fast path: single hover overlay for hover-only case
      showHoverOverlayFor(link.element);
    }
  };

  const handleLinkUnhover = (link: LinkData) => {
    if (link.element) {
      // Hide light hover overlay; keep detail highlight if any
      hideHoverOverlay();
    }
  };

  const handleLinkClick = (link: LinkData) => {
    // Clear all highlights first
    clearAllHighlights();
    hideHoverOverlay();

    // Set current detail link
    currentDetailLink.current = link;

    // Switch to detail view (no outline here)
    setHoveredLink(link);
    setPanelState("hovered");
    // Lock detail view to avoid premature auto-hide
    detailLockedRef.current = true;

    if (link.element) {
      // Auto-scroll to element
      link.element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Apply highlight for detail mode
      applyHighlight(link.element);
      lastHoverHighlightedId.current = link.id;
    }
  };

  const handleShortenClick = async (href: string) => {
    logger.debug("PANEL: 🔗 Shorten with PIMMS:", href);
    if (isPimmsLink(href)) {
      toast({ type: 'error', title: 'Already a pim.ms link', description: 'This URL is already shortened.' });
      return;
    }
    const runtimeValid = () => {
      try {
        return Boolean(chrome?.runtime?.id);
      } catch {
        return false;
      }
    };
    const chromeSendMessageSafe = (message: any, timeoutMs: number = 4000): Promise<{ __error?: string; __timeout?: boolean; resp?: any }> => {
      return new Promise((resolve) => {
        let done = false;
        const timer = window.setTimeout(() => {
          if (!done) {
            done = true;
            resolve({ __timeout: true });
          }
        }, timeoutMs);
        try {
          chrome.runtime.sendMessage(message, (resp) => {
            if (done) return;
            window.clearTimeout(timer);
            const err = chrome.runtime.lastError?.message;
            if (err) {
              resolve({ __error: err });
            } else {
              resolve({ resp });
            }
          });
        } catch (e: any) {
          if (done) return;
          window.clearTimeout(timer);
          resolve({ __error: String(e?.message || e) });
        }
      });
    };

    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      if (isShortening) return; // prevent double submission
      setIsShortening(true);
      // Ensure extension runtime is valid
      if (!runtimeValid()) {
        throw new Error('Extension context invalidated');
      }
      // Ensure offscreen is ready (safe)
      {
        const res = await chromeSendMessageSafe({ type: 'ENSURE_OFFSCREEN' });
        if (res.__error || res.__timeout) {
          const msg = res.__error || 'Timed out ensuring offscreen context';
          if (/context invalidated/i.test(msg) || !runtimeValid()) {
            throw new Error('Extension context invalidated');
          }
          // Retry once after brief delay
          await new Promise((r) => setTimeout(r, 300));
          const res2 = await chromeSendMessageSafe({ type: 'ENSURE_OFFSCREEN' });
          if (res2.__error || res2.__timeout) {
            throw new Error(res2.__error || 'Timed out ensuring offscreen context');
          }
        }
      }

      // Set loading state by updating the hovered link text to indicate progress (optional)
      // Dispatch request to offscreen via background
      // Extract UTM params from the URL if present
      const urlObj = (() => { try { return new URL(href.startsWith('http') ? href : `https://${href}`); } catch { return null; } })();
      const params = urlObj ? urlObj.searchParams : null;
      // Defaults from domain config
      const host = window.location.hostname.toLowerCase();
      const cfg = EMAIL_MARKETING_DOMAINS.find(d => host === d.domain || host.endsWith(`.${d.domain}`));
      let utm_campaign_detected: string | null = null;
      if (cfg?.broadcastIdRegex) {
        try {
          const re = new RegExp(cfg.broadcastIdRegex, 'i');
          const m = re.exec(window.location.href);
          if (m && m[1]) utm_campaign_detected = m[1];
        } catch {}
      }
      if (!utm_campaign_detected) {
        // Fallback: parse path segments /broadcasts/<uuid>(/...)?
        try {
          const path = window.location.pathname || '';
          const parts = path.split('/').filter(Boolean);
          const idx = parts.findIndex((p) => p.toLowerCase() === 'broadcasts');
          const cand = idx >= 0 ? parts[idx + 1] : undefined;
          const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (cand && uuidRe.test(cand)) utm_campaign_detected = cand;
        } catch {}
      }
      const utm_source = (params?.get('utm_source') ?? cfg?.defaultUtmSource ?? null)?.slice(0,190) ?? null;
      const utm_medium = (params?.get('utm_medium') ?? cfg?.defaultUtmMedium ?? null)?.slice(0,190) ?? null;
      const utm_campaign = (params?.get('utm_campaign') ?? utm_campaign_detected ?? null)?.slice(0,190) ?? null;
      const utm_term = params?.get('utm_term')?.slice(0,190) ?? null;
      const utm_content = params?.get('utm_content')?.slice(0,190) ?? null;

      const sendRes = await chromeSendMessageSafe({
        type: 'PIMMS_SHORTEN_REQUEST',
        href,
        requestId,
        _from: 'content',
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
      });
      if (sendRes.__error || sendRes.__timeout) {
        const msg = sendRes.__error || 'Timed out sending shorten request';
        if (/context invalidated/i.test(msg) || !runtimeValid()) {
          throw new Error('Extension context invalidated');
        }
        // Retry once
        await new Promise((r) => setTimeout(r, 300));
        const sendRes2 = await chromeSendMessageSafe({
          type: 'PIMMS_SHORTEN_REQUEST',
          href,
          requestId,
          _from: 'content',
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
        });
        if (sendRes2.__error || sendRes2.__timeout) {
          throw new Error(sendRes2.__error || 'Timed out sending shorten request');
        }
      }
      logger.debug("PANEL: Sent PIMMS_SHORTEN_REQUEST", { requestId });

      const onResult = (message: any) => {
        logger.debug("PANEL: onMessage", message);
        if (
          !message ||
          message.type !== "PIMMS_SHORTEN_RESULT" ||
          message.requestId !== requestId
        )
          return;
        const ok = message.ok;
        const shortened = ok
          ? (message.data?.shortened as string | undefined)
          : undefined;

        if (ok && shortened) {
          const target = currentDetailLink.current || hoveredLink;
          if (target) {
            setShortenedById((prev) => ({ ...prev, [target.id]: shortened }));
            // Ensure we remain in detail view for the just-shortened link
            currentDetailLink.current = target;
            setHoveredLink(target);
            setPanelState('hovered');
            detailLockedRef.current = true;
          }
          // Try to copy to clipboard immediately
          let copied = false;
          const attemptCopy = async () => {
            try {
              await navigator.clipboard.writeText(shortened);
              copied = true;
            } catch {
              try {
                const ta = document.createElement('textarea');
                ta.value = shortened;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const okCopy = document.execCommand('copy');
                document.body.removeChild(ta);
                copied = !!okCopy;
              } catch {}
            }
          };
          attemptCopy();
          toast({
            type: 'success',
            title: 'Link shortened successfully',
            description: 'New short link copied to clipboard.',
          });
        } else {
          toast({
            type: 'error',
            title: 'Failed to shorten link',
            description: 'Please try again.',
          });
          logger.error("PIMMS shorten error", message.status, message.data);
        }

        chrome.runtime.onMessage.removeListener(onResult as any);
        setIsShortening(false);
      };

      chrome.runtime.onMessage.addListener(onResult as any);
    } catch (e) {
      logger.error("PANEL: Error initiating PIMMS shorten", e);
      toast({
        type: 'error',
        title: 'Failed to load PIMMS shortener',
        description: 'Please try again.',
      });
      setIsShortening(false);
    }
  };

  // Always resolve the most up-to-date hovered link from the latest `links`
  const resolvedHoveredLink: LinkData | null = (() => {
    if (!hoveredLink) return null;
    return (
      links.find((l) => l.element === hoveredLink.element) ||
      links.find((l) => l.id === hoveredLink.id) ||
      links.find((l) => l.href === hoveredLink.href) ||
      hoveredLink
    );
  })();

  // Sync highlight when hovering in TAB (via HoverHandler calling showHoveredLink/hideHoveredLink)
  useEffect(() => {
    if (detailLockedRef.current) return;
    if (panelState !== 'hovered') {
      hideHoverOverlay();
      return;
    }
    if (resolvedHoveredLink?.element) {
      showHoverOverlayFor(resolvedHoveredLink.element);
    } else {
      hideHoverOverlay();
    }
  }, [panelState, resolvedHoveredLink]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <>
      <Panel
        links={links}
        hoveredLink={resolvedHoveredLink}
        panelState={panelState}
        onClose={handleClose}
        onLinkClick={handleLinkClick}
        onLinkHover={handleLinkHover}
        onLinkUnhover={handleLinkUnhover}
        onBackToList={handleBackToList}
        onShortenClick={handleShortenClick}
        isShortening={isShortening}
        shortenedById={shortenedById}
        isShortenedReflected={isShortenedReflected}
        onCopyShortened={(href) => {
          try {
            navigator.clipboard.writeText(href);
            toast({ type: 'success', title: 'Copied', description: 'Short link copied to clipboard.' });
          } catch {
            toast({ type: 'error', title: 'Copy failed', description: 'Please copy the link manually.' });
          }
        }}
      />
    </>
  );
};

export default PanelApp;
