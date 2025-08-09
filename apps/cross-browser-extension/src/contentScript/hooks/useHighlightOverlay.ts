import { useRef } from "react";

// Common overlay styling constants
const OVERLAY_STYLE = {
  border: "2px solid #2B7FFF",
  background: "rgba(57, 113, 255, 0.08)",
  borderRadius: "4px",
  boxSizing: "border-box" as const,
  zIndex: "2147483646",
  pointerEvents: "none" as const,
};

const OVERLAY_OFFSET = 3;
const MIN_ELEMENT_SIZE = 6;
const MIN_RECT_SIZE = 2;

export default function useHighlightOverlay() {
  const highlightedElements = useRef<Set<HTMLElement>>(new Set());
  const elementToTarget = useRef<WeakMap<HTMLElement, HTMLElement>>(new WeakMap());
  const overlayByTarget = useRef<WeakMap<HTMLElement, { overlay: HTMLElement; onScroll: (e: Event) => void; onResize: () => void }>>(new WeakMap());

  const hoverOverlayRef = useRef<HTMLDivElement | null>(null);
  const hoverTargetRef = useRef<HTMLElement | null>(null);
  const hoverRafIdRef = useRef<number | null>(null);
  const hoverOnScrollRef = useRef<((e: Event) => void) | null>(null);
  const hoverOnResizeRef = useRef<(() => void) | null>(null);

  const findTarget = (element: HTMLElement): HTMLElement => {
    let current: HTMLElement | null = element;
    while (current && current !== document.body) {
      try {
        const rect = current.getBoundingClientRect();
        const style = window.getComputedStyle(current);
        const isInline = style.display === "inline" || style.display === "contents";
        
        if (rect.width >= MIN_ELEMENT_SIZE && rect.height >= MIN_ELEMENT_SIZE && !isInline) {
          return current;
        }
      } catch {}
      current = current.parentElement;
    }
    return element;
  };

  const positionOverlay = (overlay: HTMLElement, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      position: "fixed",
      left: `${Math.max(0, rect.left - OVERLAY_OFFSET)}px`,
      top: `${Math.max(0, rect.top - OVERLAY_OFFSET)}px`,
      width: `${Math.max(0, rect.width + OVERLAY_OFFSET * 2)}px`,
      height: `${Math.max(0, rect.height + OVERLAY_OFFSET * 2)}px`,
      ...OVERLAY_STYLE,
    });
  };

  const applyHighlight = (element: HTMLElement) => {
    const target = findTarget(element);
    if (highlightedElements.current.has(target)) return;

    const rect = target.getBoundingClientRect();
    
    // Use outline for very small elements
    if (!rect || rect.width < MIN_RECT_SIZE || rect.height < MIN_RECT_SIZE) {
      if (!target.dataset.originalOutline) {
        target.dataset.originalOutline = target.style.outline || "";
        target.dataset.originalOutlineOffset = target.style.outlineOffset || "";
      }
      target.style.outline = OVERLAY_STYLE.border;
      target.style.outlineOffset = "2px";
      highlightedElements.current.add(target);
      elementToTarget.current.set(element, target);
      return;
    }

    // Create overlay for normal elements
    const overlay = document.createElement("div");
    overlay.setAttribute("data-pimms-highlight", "true");
    positionOverlay(overlay, target);
    document.body.appendChild(overlay);

    const updatePosition = () => positionOverlay(overlay, target);
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    overlayByTarget.current.set(target, { overlay, onScroll: updatePosition, onResize: updatePosition });
    highlightedElements.current.add(target);
    elementToTarget.current.set(element, target);
  };

  const ensureHoverOverlay = () => {
    if (!hoverOverlayRef.current) {
      const el = document.createElement("div");
      el.id = "pimms-hover-overlay";
      Object.assign(el.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: "0px",
        height: "0px",
        display: "none",
        ...OVERLAY_STYLE,
      });
      document.body.appendChild(el);
      hoverOverlayRef.current = el;

      const updateHoverPosition = () => {
        if (hoverRafIdRef.current) cancelAnimationFrame(hoverRafIdRef.current);
        hoverRafIdRef.current = requestAnimationFrame(() => {
          const target = hoverTargetRef.current;
          const rect = target?.getBoundingClientRect();
          if (!target || !rect || rect.width < MIN_RECT_SIZE || rect.height < MIN_RECT_SIZE) return;
          
          Object.assign(el.style, {
            left: `${Math.max(0, rect.left - OVERLAY_OFFSET)}px`,
            top: `${Math.max(0, rect.top - OVERLAY_OFFSET)}px`,
            width: `${Math.max(0, rect.width + OVERLAY_OFFSET * 2)}px`,
            height: `${Math.max(0, rect.height + OVERLAY_OFFSET * 2)}px`,
            display: "block",
          });
        });
      };
      hoverOnScrollRef.current = updateHoverPosition;
      hoverOnResizeRef.current = updateHoverPosition;
      window.addEventListener("scroll", hoverOnScrollRef.current, { capture: true, passive: true });
      window.addEventListener("resize", hoverOnResizeRef.current, { passive: true });
    }
  };

  const showFor = (element: HTMLElement) => {
    ensureHoverOverlay();
    const target = findTarget(element);
    if (hoverTargetRef.current === target) return;
    
    hoverTargetRef.current = target;
    const overlay = hoverOverlayRef.current;
    if (!overlay) return;
    
    overlay.style.display = "block";
    
    if (hoverRafIdRef.current) cancelAnimationFrame(hoverRafIdRef.current);
    hoverRafIdRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      if (rect) {
        Object.assign(overlay.style, {
          left: `${Math.max(0, rect.left - OVERLAY_OFFSET)}px`,
          top: `${Math.max(0, rect.top - OVERLAY_OFFSET)}px`,
          width: `${Math.max(0, rect.width + OVERLAY_OFFSET * 2)}px`,
          height: `${Math.max(0, rect.height + OVERLAY_OFFSET * 2)}px`,
          display: "block",
        });
      }
    });
  };

  const hide = () => {
    hoverTargetRef.current = null;
    if (hoverOverlayRef.current) hoverOverlayRef.current.style.display = "none";
  };

  const removeHighlight = (element: HTMLElement) => {
    const target = elementToTarget.current.get(element) || element;
    if (!highlightedElements.current.has(target)) return;
    
    const entry = overlayByTarget.current.get(target);
    if (entry) {
      window.removeEventListener("scroll", entry.onScroll, true);
      window.removeEventListener("resize", entry.onResize);
      entry.overlay.remove();
      overlayByTarget.current.delete(target);
    }
    
    highlightedElements.current.delete(target);
  };

  const clearAll = () => {
    highlightedElements.current.forEach((el) => removeHighlight(el));
    highlightedElements.current.clear();
  };

  const teardown = () => {
    try {
      hide();
      clearAll();
      if (hoverOnScrollRef.current) window.removeEventListener("scroll", hoverOnScrollRef.current as EventListener, true);
      if (hoverOnResizeRef.current) window.removeEventListener("resize", hoverOnResizeRef.current as EventListener);
      if (hoverOverlayRef.current) hoverOverlayRef.current.remove();
      hoverOverlayRef.current = null;
    } catch {}
  };

  return { applyHighlight, showFor, hide, clearAll, teardown };
}


