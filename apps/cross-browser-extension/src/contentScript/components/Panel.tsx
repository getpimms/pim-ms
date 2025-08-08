import React, { useState, useEffect, useRef } from 'react';
import { LinkData, PanelState } from '../../types';
import Button from './ui/Button';
import { IconX } from './ui/icons';
import HoveredLink from './HoveredLink';
import EmptyState from './EmptyState';
import LinksList from './LinksList';
import PimmsWordmark from './PimmsWordmark';
import { Toaster } from 'sonner';
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
  isShortenedReflected?: boolean;
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
  isShortenedReflected = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Auto-show when links are detected
    if (links.length > 0) {
      setIsVisible(true);
    }
  }, [links.length]);

  // Initialize position to bottom-right before first paint, no animation flicker
  useEffect(() => {
    const compute = () => {
      const width = 380; // target width used for initial layout to avoid measuring
      const height = 420;
      const padding = 20;
      return {
        left: Math.max(8, window.innerWidth - width - padding),
        top: Math.max(8, window.innerHeight - height - padding),
      };
    };
    setPosition(compute());
    const onResize = () => setPosition(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const panel = panelRef.current;
      const width = panel?.offsetWidth ?? 380;
      const height = panel?.offsetHeight ?? 420;
      const newLeft = Math.min(
        window.innerWidth - width - 8,
        Math.max(8, e.clientX - dragOffsetRef.current.x)
      );
      const newTop = Math.min(
        window.innerHeight - height - 8,
        Math.max(8, e.clientY - dragOffsetRef.current.y)
      );
      setPosition({ left: newLeft, top: newTop });
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    draggingRef.current = true;
    const left = position?.left ?? 0;
    const top = position?.top ?? 0;
    dragOffsetRef.current = { x: e.clientX - left, y: e.clientY - top };
    document.body.style.userSelect = 'none';
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  return (
    <div
      id="pimms-panel"
      className={`
        fixed w-[380px] h-[420px]
        bg-white border border-neutral-200 rounded-xl shadow-2xl
        z-[2147483647] font-sans text-sm text-neutral-900
        ${position ? '' : 'opacity-0'}
        backdrop-blur-sm
        pointer-events-auto
        ${isVisible && position ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        isolation: 'isolate',
        contain: 'layout style paint',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        pointerEvents: 'auto', // Make panel clickable!
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
      }}
      ref={panelRef}
    >
      <Toaster />
      <div className="flex h-full flex-col">
        {/* Header using shadcn styling */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-[#f4f4f5] rounded-t-xl cursor-move select-none"
          onMouseDown={startDrag}
        >
          <h1 className="m-0 text-[15px] font-semibold text-neutral-900">
            {panelState === 'hovered' ? 'Selected link' : `Detected links (${links.length})`}
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full p-0 hover:bg-neutral-100"
            onClick={handleClose}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white">
        {panelState === 'hovered' && hoveredLink ? (
          <HoveredLink
            link={hoveredLink}
            onBackToList={onBackToList}
            onShortenClick={onShortenClick}
            isLoading={isShortening}
            shortenedHref={shortenedById[hoveredLink.id]}
            onCopyShortened={onCopyShortened}
            isShortenedReflected={isShortenedReflected}
          />
          ) : links.length === 0 ? (
            <EmptyState />
          ) : (
            <LinksList links={links} onLinkClick={onLinkClick} onLinkHover={onLinkHover} onLinkUnhover={onLinkUnhover} />
          )}
        </div>

        {/* Footer with centered logo */}
        <div className="border-t border-neutral-200 px-3 py-3 bg-[#f4f4f5] rounded-b-xl">
          <div className="flex items-center justify-center">
            <PimmsWordmark className="h-[10px] w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Panel;
