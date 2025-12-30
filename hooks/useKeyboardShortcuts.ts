import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
  onToggleConnection?: () => void;
  onCloseMenu?: () => void;
  onToggleDebug?: () => void;
  onToggleFullscreen?: () => void;
}

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  deps: {
    isConnected: boolean;
    menuOpen: boolean;
  }
): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlers.onToggleConnection?.();
          break;
        case 'Escape':
          if (deps.menuOpen) {
            handlers.onCloseMenu?.();
          }
          break;
        case 'KeyD':
          // Toggle debug/FPS counter
          handlers.onToggleDebug?.();
          break;
        case 'KeyF':
          // Toggle fullscreen
          handlers.onToggleFullscreen?.();
          break;
      }
    },
    [handlers, deps.menuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
