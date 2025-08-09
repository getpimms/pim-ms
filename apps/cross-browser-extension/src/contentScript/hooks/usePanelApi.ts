import { useEffect, useRef, useCallback } from "react";
import { LinkData, PanelState } from "../../types";

export default function usePanelApi(options: {
  isVisible: boolean;
  panelState: PanelState;
  setLinks: (links: LinkData[]) => void;
  setIsVisible: (v: boolean) => void;
  setHoveredLink: (l: LinkData | null) => void;
  setPanelState: (s: PanelState) => void;
  overlay: { clearAll: () => void; hide: () => void };
  closedUntilReloadRef: React.MutableRefObject<boolean>;
  detailLockedRef: React.MutableRefObject<boolean>;
}) {
  const {
    isVisible,
    panelState,
    setLinks,
    setIsVisible,
    setHoveredLink,
    setPanelState,
    overlay,
    closedUntilReloadRef,
    detailLockedRef,
  } = options;
  
  const hoverHideTimerRef = useRef<number | null>(null);
  const HOVER_HOLD_MS = 3000;

  // Initialize panel API once on mount
  useEffect(() => {
    if (!(window as any).pimmsPanelApp) {
      (window as any).pimmsPanelApp = {};
    }
  }, []);

  // Update dynamic methods that depend on current state
  useEffect(() => {
    const api = (window as any).pimmsPanelApp;
    if (!api) return;

    api.updateLinks = (newLinks: LinkData[]) => {
      setLinks(newLinks);
      // Only show panel when we actually have links
      if (newLinks.length > 0 && !isVisible && !closedUntilReloadRef.current) {
        setIsVisible(true);
      } else if (newLinks.length === 0 && isVisible) {
        // Hide panel if we have no links (unless user manually opened it)
        setIsVisible(false);
      }
    };

    api.toggle = () => {
      if (!closedUntilReloadRef.current) {
        setIsVisible(!isVisible);
      }
    };

    api.hide = () => setIsVisible(false);
  }, [isVisible, setLinks, setIsVisible, closedUntilReloadRef]);

  // Update methods that depend on panel state
  useEffect(() => {
    const api = (window as any).pimmsPanelApp;
    if (!api) return;

    api.clearAll = () => {
      setLinks([]);
      setHoveredLink(null);
      setPanelState("links");
      setIsVisible(false);
      overlay.clearAll();
      overlay.hide();
      if (hoverHideTimerRef.current) {
        window.clearTimeout(hoverHideTimerRef.current);
        hoverHideTimerRef.current = null;
      }
    };

    api.showHoveredLink = (link: LinkData) => {
      if (closedUntilReloadRef.current || detailLockedRef.current) return;
      
      if (hoverHideTimerRef.current) {
        window.clearTimeout(hoverHideTimerRef.current);
        hoverHideTimerRef.current = null;
      }
      
      setHoveredLink(link);
      setPanelState("hovered");
      if (!isVisible) setIsVisible(true);
    };

    api.hideHoveredLink = () => {
      if (detailLockedRef.current) return;
      
      if (hoverHideTimerRef.current) {
        window.clearTimeout(hoverHideTimerRef.current);
      }
      
      hoverHideTimerRef.current = window.setTimeout(() => {
        overlay.clearAll();
        setHoveredLink(null);
        setPanelState("links");
        hoverHideTimerRef.current = null;
      }, HOVER_HOLD_MS);
    };
  }, [
    setLinks,
    setHoveredLink,
    setPanelState,
    setIsVisible,
    overlay,
    closedUntilReloadRef,
    detailLockedRef,
    isVisible
  ]);

  // Static methods that don't change
  useEffect(() => {
    const api = (window as any).pimmsPanelApp;
    if (!api) return;

    api.destroy = () => {
      overlay.clearAll();
      overlay.hide();
    };
  }, [overlay]);
}


