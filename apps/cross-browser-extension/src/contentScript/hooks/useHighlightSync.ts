import { useEffect } from "react";
import { LinkData, PanelState } from "../../types";

export default function useHighlightSync(
  panelState: PanelState,
  hoveredLink: LinkData | null,
  detailLockedRef: React.MutableRefObject<boolean>,
  overlay: { showFor: (element: HTMLElement) => void; hide: () => void; applyHighlight: (element: HTMLElement) => void },
  isPanelActive: boolean = true
) {
  useEffect(() => {
    // Don't show highlights if panel is not active
    if (!isPanelActive) {
      overlay.hide();
      return;
    }
    
    if (detailLockedRef.current) {
      // If detail is locked and we have a hovered link, ensure highlight is applied
      if (hoveredLink?.element) {
        overlay.applyHighlight(hoveredLink.element);
      }
      return;
    }
    
    const shouldShow = panelState === "hovered" && hoveredLink?.element;
    if (shouldShow) {
      overlay.showFor(hoveredLink.element);
    } else {
      overlay.hide();
    }
  }, [panelState, hoveredLink, detailLockedRef, overlay, isPanelActive]);
}
