import React, { useEffect, useState, useMemo, useCallback } from "react";
import { LinkData } from "../types";
import useHighlightOverlay from "./hooks/useHighlightOverlay";

import usePanelApi from "./hooks/usePanelApi";
import usePanelState from "./hooks/usePanelState";
import useAuth from "./hooks/useAuth";
import useUserData from "./hooks/useUserData";
import useShortenActions from "./hooks/useShortenActions";
import useHighlightSync from "./hooks/useHighlightSync";
import useRootSelectorVisibility from "./hooks/useRootSelectorVisibility";
import useLoadingState from "./hooks/useLoadingState";
import OnboardingModal from "./components/OnboardingModal";
import Panel from "./components/Panel";
import Launcher from "./components/Launcher";

const PanelApp: React.FC = () => {
  const overlay = useHighlightOverlay();
  
  const {
    links, panelState, hoveredLink, isVisible, isShortening, shortenedById,
    setLinks, setPanelState, setHoveredLink, setIsVisible, setIsShortening, setShortenedById,
    closedUntilReloadRef, detailLockedRef,
    resetPanelState, removeShortenedLink
  } = usePanelState(overlay);
  
  const { isLoggedIn } = useAuth();
  const { user, workspace } = useUserData();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const hasRootSelectors = useRootSelectorVisibility();
  
  // Panel is only active when user is logged in AND root selectors are present
  const isPanelActive = Boolean(isLoggedIn && hasRootSelectors);
  
  // Loading state for smooth UX during link detection
  const { isLoading, hasInitialLoad } = useLoadingState(links, isPanelActive);
  
  // Removed debug logs to reduce console spam
  
  // Reset onboarding state when user logs in
  useEffect(() => {
    if (isLoggedIn === true) {
      setShowOnboarding(false);
    }
  }, [isLoggedIn]);
  
  // Handle panel activation/deactivation
  useEffect(() => {
    if (!isPanelActive) {
      // Clean up everything when panel becomes inactive
      if ((window as any).pimmsPanelApp?.clearAll) {
        (window as any).pimmsPanelApp.clearAll();
      }
    }
  }, [isPanelActive]);
  
  // This is now handled by useCookieAuth hook via pimms-detector-refresh event
  
  // Memoize shorten actions config to prevent re-renders
  const shortenActionsConfig = useMemo(() => ({
    hoveredLink,
    isShortening,
    setIsShortening,
    setShortenedById,
  }), [hoveredLink, isShortening, setIsShortening, setShortenedById]);

  const { handleShortenClick, handleCopyShortened } = useShortenActions(shortenActionsConfig);

  // Memoize panel API config to prevent re-renders
  const panelApiConfig = useMemo(() => ({
    isVisible: isPanelActive ? isVisible : false,
    panelState,
    setLinks: isPanelActive ? setLinks : () => {},
    setIsVisible: isPanelActive ? setIsVisible : () => {},
    setHoveredLink: isPanelActive ? setHoveredLink : () => {},
    setPanelState: isPanelActive ? setPanelState : () => {},
    overlay,
    closedUntilReloadRef,
    detailLockedRef,
  }), [
    isPanelActive, 
    isVisible, 
    panelState, 
    setLinks, 
    setIsVisible, 
    setHoveredLink, 
    setPanelState, 
    overlay, 
    closedUntilReloadRef, 
    detailLockedRef
  ]);

  // Only setup panel API when panel is active (logged in + root selectors present)
  usePanelApi(panelApiConfig);

  // Memoize handlers to prevent re-renders
  const handlers = useMemo(() => ({
    close: () => {
      setIsVisible(false);
      resetPanelState();
      closedUntilReloadRef.current = true;
      (window as any).pimmsPanelClosedUntilReload = true;
    },
    backToList: () => {
      resetPanelState();
      setPanelState("links");
    },
    linkHover: (link: LinkData) => link.element && overlay.showFor(link.element),
    linkUnhover: () => overlay.hide(),
    linkClick: (link: LinkData) => {
      resetPanelState();
      setHoveredLink(link);
      setPanelState("hovered");
      detailLockedRef.current = true;
      if (link.element) {
        link.element.scrollIntoView({ behavior: "smooth", block: "center" });
        overlay.applyHighlight(link.element);
      }
    }
  }), [setIsVisible, resetPanelState, closedUntilReloadRef, setPanelState, overlay, setHoveredLink, detailLockedRef]);

  // Sync highlights with panel activation state
  useHighlightSync(
    panelState,
    hoveredLink,
    detailLockedRef,
    overlay,
    isPanelActive
  );

  // Show nothing until we know auth state to avoid onboarding flash
  if (isLoggedIn === null) {
    return null;
  }
  
  // If not logged in OR no root selectors: show onboarding and launcher
  if (!isPanelActive) {
    // Only show onboarding/launcher if user is not logged in
    // If logged in but no root selectors, show nothing
    if (!isLoggedIn) {
      return (
        <>
          {showOnboarding && (
            <OnboardingModal onClose={() => setShowOnboarding(false)} />
          )}
          {!showOnboarding && (
            <Launcher onClick={() => setShowOnboarding(true)} />
          )}
        </>
      );
    }
    return null;
  }

  return (
    <Panel
      links={links}
      hoveredLink={hoveredLink}
      panelState={panelState}
      onClose={handlers.close}
      onLinkClick={handlers.linkClick}
      onLinkHover={handlers.linkHover}
      onLinkUnhover={handlers.linkUnhover}
      onBackToList={handlers.backToList}
      onShortenClick={handleShortenClick}
      isShortening={isShortening}
      shortenedById={shortenedById}
      isLoading={isLoading}
      isPanelActive={isPanelActive}
      isVisible={isVisible}
      onCopyShortened={handleCopyShortened}
      user={user}
      workspace={workspace}
    />
  );
};

export default PanelApp;
