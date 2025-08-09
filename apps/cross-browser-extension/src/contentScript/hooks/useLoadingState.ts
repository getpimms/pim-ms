import { useState, useEffect } from "react";
import { LinkData } from "../../types";

export default function useLoadingState(
  links: LinkData[],
  isPanelActive: boolean
): { isLoading: boolean; hasInitialLoad: boolean } {
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [detectionStarted, setDetectionStarted] = useState(false);

  useEffect(() => {
    if (!isPanelActive) {
      // Reset loading state when panel becomes inactive
      setIsLoading(false);
      setHasInitialLoad(false);
      setDetectionStarted(false);
      return;
    }

    // Start detection and loading when panel becomes active for the first time
    if (!detectionStarted) {
      setDetectionStarted(true);
      setIsLoading(true);
      
      // Give some time for link detection to run
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
        setHasInitialLoad(true);
      }, 800); // 800ms loading time
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [isPanelActive, detectionStarted]);

  // If we get links during loading, stop loading immediately
  useEffect(() => {
    if (isLoading && links.length > 0) {
      setIsLoading(false);
      setHasInitialLoad(true);
    }
  }, [links.length, isLoading]);

  // Only show loading if detection has started and we don't have links yet
  const shouldShowLoading = isLoading && detectionStarted && links.length === 0;

  return { isLoading: shouldShowLoading, hasInitialLoad };
}
