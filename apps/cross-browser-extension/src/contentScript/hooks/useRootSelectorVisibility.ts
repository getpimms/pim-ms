import { useState, useEffect } from "react";
import { EMAIL_MARKETING_DOMAINS } from "../../types";

export default function useRootSelectorVisibility(): boolean {
  const [hasRoots, setHasRoots] = useState<boolean>(false);

  useEffect(() => {
    const normalizedHost = window.location.hostname.toLowerCase();
    const scope = EMAIL_MARKETING_DOMAINS.find(
      ({ domain }) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
    );

    const checkRootSelectors = () => {
      // If no scope or no rootSelectors defined, always visible
      if (!scope?.rootSelectors || scope.rootSelectors.length === 0) {
        setHasRoots(true);
        return;
      }
      
      // Check if any root selector is present
      const found = scope.rootSelectors.some((sel) => !!document.querySelector(sel));
      setHasRoots(found);
    };

    // Initial check
    checkRootSelectors();

    // Watch for DOM changes
    const observer = new MutationObserver(checkRootSelectors);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return hasRoots;
}
