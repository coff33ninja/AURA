import { useState, useRef, useEffect, useCallback } from 'react';
import { createFpsCounter, type FpsState } from '../utils/fpsCounter';

export interface UseFpsMonitorReturn {
  showFpsCounter: boolean;
  fpsState: FpsState;
  toggleFpsCounter: () => void;
  tick: (deltaTime: number) => void;
}

export function useFpsMonitor(): UseFpsMonitorReturn {
  const [showFpsCounter, setShowFpsCounter] = useState(false);
  const [fpsState, setFpsState] = useState<FpsState>({ fps: 60, frameTime: 16.67, color: 'green' });
  const fpsCounterRef = useRef(createFpsCounter());

  const toggleFpsCounter = useCallback(() => {
    setShowFpsCounter((prev) => !prev);
  }, []);

  const tick = useCallback((deltaTime: number) => {
    if (showFpsCounter) {
      fpsCounterRef.current.update(deltaTime);
      const state = fpsCounterRef.current.getState();
      setFpsState(state);
    }
  }, [showFpsCounter]);

  // Reset FPS counter when toggled on
  useEffect(() => {
    if (showFpsCounter) {
      fpsCounterRef.current = createFpsCounter();
    }
  }, [showFpsCounter]);

  return {
    showFpsCounter,
    fpsState,
    toggleFpsCounter,
    tick,
  };
}
