import { useCallback } from "react";
import { LinkData } from "../../types";
import { logger } from "../../utils/logger";
import { shortenViaOffscreen, copyToClipboard } from "../lib/shorten";
import { toast } from "../components/ui/Toast";
import isPimmsLink from "../utils/isPimmsLink";

export interface ShortenActionsHook {
  handleShortenClick: (href: string) => Promise<void>;
  handleCopyShortened: (href: string) => Promise<void>;
}

interface UseShortenActionsProps {
  hoveredLink: LinkData | null;
  isShortening: boolean;
  setIsShortening: (shortening: boolean) => void;
  setShortenedById: (setter: (prev: Record<string, string>) => Record<string, string>) => void;
}

const showToast = (type: 'success' | 'error', title: string, description: string) => {
  toast({ type, title, description });
};

export default function useShortenActions({
  hoveredLink,
  isShortening,
  setIsShortening,
  setShortenedById,
}: UseShortenActionsProps): ShortenActionsHook {
  
  const handleShortenClick = useCallback(async (href: string) => {
    if (isPimmsLink(href)) {
      showToast("error", "Already a pim.ms link", "This URL is already shortened.");
      return;
    }
    
    if (isShortening || !hoveredLink) return;
    
    try {
      setIsShortening(true);
      const result = await shortenViaOffscreen(href);

      if (result.ok && result.shortened) {
        setShortenedById((prev) => ({ ...prev, [hoveredLink.id]: result.shortened! }));
        copyToClipboard(result.shortened!);
        showToast("success", "Link shortened successfully", "New short link copied to clipboard.");
      } else {
        showToast("error", "Failed to shorten link", "Please try again.");
      }
    } catch (e) {
      logger.error("PANEL: Error shortening link", e);
      showToast("error", "Failed to shorten link", "Please try again.");
    } finally {
      setIsShortening(false);
    }
  }, [hoveredLink, isShortening, setIsShortening, setShortenedById]);

  const handleCopyShortened = useCallback(async (href: string) => {
    const success = await copyToClipboard(href);
    showToast(
      success ? 'success' : 'error',
      success ? 'Copied' : 'Copy failed',
      success ? 'Short link copied to clipboard.' : 'Please copy the link manually.'
    );
  }, []);

  return {
    handleShortenClick,
    handleCopyShortened,
  };
}
