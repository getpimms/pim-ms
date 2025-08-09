import { useState, useEffect, useRef } from 'react';

export interface PanelDragHook {
  position: { left: number; top: number } | null;
  startDrag: (e: React.MouseEvent) => void;
}

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 420;
const MARGIN = 8;

export default function usePanelDrag(): PanelDragHook {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Initialize position to bottom-right
  useEffect(() => {
    const computePosition = () => ({
      left: Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN),
      top: Math.max(MARGIN, window.innerHeight - PANEL_HEIGHT - MARGIN),
    });
    
    setPosition(computePosition());
    const handleResize = () => setPosition(computePosition());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const { x: offsetX, y: offsetY } = dragOffsetRef.current;
      setPosition({
        left: Math.min(
          window.innerWidth - PANEL_WIDTH - MARGIN, 
          Math.max(MARGIN, e.clientX - offsetX)
        ),
        top: Math.min(
          window.innerHeight - PANEL_HEIGHT - MARGIN, 
          Math.max(MARGIN, e.clientY - offsetY)
        )
      });
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
    dragOffsetRef.current = {
      x: e.clientX - (position?.left ?? 0),
      y: e.clientY - (position?.top ?? 0)
    };
    document.body.style.userSelect = 'none';
  };

  return {
    position,
    startDrag,
  };
}
