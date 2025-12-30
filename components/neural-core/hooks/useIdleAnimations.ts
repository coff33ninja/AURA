import { useRef, useCallback } from 'react';

export type IdleState = 'idle' | 'talking' | 'listening' | 'thinking';

export interface SaccadeState {
  offsetX: number;
  offsetY: number;
  nextSaccadeTime: number;
}

export interface UseIdleAnimationsReturn {
  // Breathing
  breathingTime: React.MutableRefObject<number>;
  breathingPhase: React.MutableRefObject<number>;
  // Blinking
  blinkTimer: React.MutableRefObject<number>;
  nextBlinkTime: React.MutableRefObject<number>;
  blinkAllowedRef: React.MutableRefObject<boolean>;
  // Saccades (eye micro-movements)
  saccadeState: React.MutableRefObject<SaccadeState>;
  // Idle state
  idleStateRef: React.MutableRefObject<IdleState>;
  idleGesturesRef: React.MutableRefObject<string[]>;
  // Functions
  playIdleGesture: (gestureName: string) => void;
  setIdleState: (state: IdleState) => void;
  setBlinkAllowed: (allowed: boolean) => void;
  resetBlinkTimer: () => void;
}

export function useIdleAnimations(): UseIdleAnimationsReturn {
  // Breathing animation
  const breathingTime = useRef(0);
  const breathingPhase = useRef(0);

  // Blink state with interruption control
  const blinkTimer = useRef(0);
  const nextBlinkTime = useRef(2); // Initial blink after 2s
  const blinkAllowedRef = useRef(true);

  // Saccade (eye micro-movement) state
  const saccadeState = useRef<SaccadeState>({
    offsetX: 0,
    offsetY: 0,
    nextSaccadeTime: Math.random() * 1.0 + 0.5,
  });

  // Idle state management
  const idleStateRef = useRef<IdleState>('idle');
  const idleGesturesRef = useRef<string[]>([]);

  const playIdleGesture = useCallback((gestureName: string) => {
    idleGesturesRef.current = [gestureName];
  }, []);

  const setIdleState = useCallback((state: IdleState) => {
    idleStateRef.current = state;
    // Set appropriate idle gestures based on state
    if (state === 'talking') {
      idleGesturesRef.current = ['hand_wave', 'shoulder_shrug'];
    } else if (state === 'listening') {
      idleGesturesRef.current = ['head_tilt'];
    } else if (state === 'thinking') {
      idleGesturesRef.current = ['sway'];
    } else {
      idleGesturesRef.current = [];
    }
  }, []);

  const setBlinkAllowed = useCallback((allowed: boolean) => {
    blinkAllowedRef.current = allowed;
  }, []);

  const resetBlinkTimer = useCallback(() => {
    blinkTimer.current = 0;
    nextBlinkTime.current = Math.random() * 3 + 2; // 2-5 seconds
  }, []);

  return {
    breathingTime,
    breathingPhase,
    blinkTimer,
    nextBlinkTime,
    blinkAllowedRef,
    saccadeState,
    idleStateRef,
    idleGesturesRef,
    playIdleGesture,
    setIdleState,
    setBlinkAllowed,
    resetBlinkTimer,
  };
}
