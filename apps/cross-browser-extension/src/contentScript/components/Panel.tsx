import React from "react";
import { LinkData, PanelState } from "../../types";
import usePanelDrag from "../hooks/usePanelDrag";
import { UserData, WorkspaceData } from "../hooks/useUserData";
import EmptyState from "./EmptyState";
import HoveredLink from "./HoveredLink";
import LinksList from "./LinksList";
import LinksSkeleton from "./LinksSkeleton";
import PimmsWordmark from "./PimmsWordmark";
import UserProfileHeader from "./UserProfileHeader";
import Button from "./ui/Button";
import { IconX } from "./ui/icons";
interface PanelProps {
  links: LinkData[];
  hoveredLink: LinkData | null;
  panelState: PanelState;
  onClose: () => void;
  onLinkClick: (link: LinkData) => void;
  onLinkHover: (link: LinkData) => void;
  onLinkUnhover: (link: LinkData) => void;
  onBackToList: () => void;
  onShortenClick: (href: string) => void;
  isShortening?: boolean;
  shortenedById?: Record<string, string>;
  onCopyShortened?: (href: string) => void;
  isLoading?: boolean;
  isPanelActive?: boolean; // Controls panel visibility by domain/root
  isVisible?: boolean; // Explicit open/close from app state
  user?: UserData | null;
  workspace?: WorkspaceData | null;
}

const Panel: React.FC<PanelProps> = ({
  links,
  hoveredLink,
  panelState,
  onClose,
  onLinkClick,
  onLinkHover,
  onLinkUnhover,
  onBackToList,
  onShortenClick,
  isShortening = false,
  shortenedById = {},
  onCopyShortened,
  isLoading = false,
  isPanelActive = true,
  isVisible = true,
  user,
  workspace,
}) => {
  const { position, startDrag } = usePanelDrag();
  // Panel renders only when the app says visible AND the panel is active for this page
  const shouldRender = isPanelActive && isVisible;

  const handleClose = () => {
    onClose();
  };

  // Don't render the panel if not visible
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      id="pimms-panel"
      className={`pointer-events-auto fixed z-[2147483647] h-[420px] w-[380px] rounded-xl border border-neutral-200 bg-white font-sans text-sm text-neutral-900 shadow-2xl backdrop-blur-sm ${position ? "opacity-100" : "opacity-0"} `}
      style={{
        isolation: "isolate",
        contain: "layout style paint",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        pointerEvents: "auto", // Make panel clickable!
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
      }}
    >
      {/* Toaster is mounted once at app root */}
      <div className="flex h-full flex-col">
        {/* Header using shadcn styling */}
        <div
          className="flex cursor-move select-none items-center justify-between rounded-t-xl border-b border-neutral-200 bg-[#f4f4f5] px-4 py-3"
          onMouseDown={startDrag}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {user && (
              <UserProfileHeader
                user={user}
                workspace={workspace || null}
                showWorkspaceName={true}
                className="text-xs"
              />
            )}
            <h1 className="m-0 text-[15px] font-semibold text-neutral-900">
              {panelState === "hovered"
                ? "Selected link"
                : isLoading
                  ? "Loading links..."
                  : `Detected links (${links.length})`}
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 h-8 w-8 rounded-full p-0 hover:bg-neutral-100"
            onClick={handleClose}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white pb-4">
          {panelState === "hovered" && hoveredLink ? (
            <HoveredLink
              link={hoveredLink}
              onBackToList={onBackToList}
              onShortenClick={onShortenClick}
              isLoading={isShortening}
              shortenedHref={shortenedById[hoveredLink.id]}
              onCopyShortened={onCopyShortened}
            />
          ) : isLoading ? (
            <LinksSkeleton />
          ) : links.length === 0 ? (
            <EmptyState />
          ) : (
            <LinksList
              links={links}
              onLinkClick={onLinkClick}
              onLinkHover={onLinkHover}
              onLinkUnhover={onLinkUnhover}
            />
          )}
        </div>

        {/* Footer with centered logo */}
        <div className="rounded-b-xl border-t border-neutral-200 bg-[#f4f4f5] px-3 py-3">
          <div className="flex items-center justify-center">
            <PimmsWordmark className="h-[10px] w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Panel;
