import { useState, useRef, useCallback } from "react";
import { LinkData, PanelState } from "../../types";

export interface PanelStateHook {
  // State
  links: LinkData[];
  panelState: PanelState;
  hoveredLink: LinkData | null;
  isVisible: boolean;
  isShortening: boolean;
  shortenedById: Record<string, string>;
  
  // State setters
  setLinks: (links: LinkData[]) => void;
  setPanelState: (state: PanelState) => void;
  setHoveredLink: (link: LinkData | null) => void;
  setIsVisible: (visible: boolean) => void;
  setIsShortening: (shortening: boolean) => void;
  setShortenedById: (setter: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) => void;
  
  // Refs
  closedUntilReloadRef: React.MutableRefObject<boolean>;
  detailLockedRef: React.MutableRefObject<boolean>;
  
  // Actions
  resetPanelState: () => void;
  removeShortenedLink: (linkId: string) => void;
}

export default function usePanelState(overlay: { clearAll: () => void }): PanelStateHook {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [panelState, setPanelState] = useState<PanelState>("links");
  const [hoveredLink, setHoveredLink] = useState<LinkData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  const [shortenedById, setShortenedById] = useState<Record<string, string>>({});
  
  const closedUntilReloadRef = useRef<boolean>(false);
  const detailLockedRef = useRef<boolean>(false);

  const resetPanelState = useCallback(() => {
    overlay.clearAll();
    detailLockedRef.current = false;
    setHoveredLink(null);
  }, [overlay]);

  const removeShortenedLink = useCallback((linkId: string) => {
    setShortenedById(({ [linkId]: _, ...rest }) => rest);
  }, []);

  return {
    links,
    panelState,
    hoveredLink,
    isVisible,
    isShortening,
    shortenedById,
    setLinks,
    setPanelState,
    setHoveredLink,
    setIsVisible,
    setIsShortening,
    setShortenedById,
    closedUntilReloadRef,
    detailLockedRef,
    resetPanelState,
    removeShortenedLink,
  };
}
