// useIdleAnimations - Hook for managing idle animation state
// Handles breathing, blinking, saccade, and idle gestures

import { useRef, useCallback } from 'react';
import type { IdleConfig } from '../../../types/behaviorTypes';
import type { BreathingConfig } from '../../../types/enhancementTypes';
import {
  calculateBreathingState,
  getStateMultiplier,
} from '../../../utils/breathingAnimator';
import {
  updateSaccadeState,
  DEFAULT_SACCADE_CONFIG,
  createSaccadeState,
} from '../../../utils/saccadeGenerator';

// Types
export type IdleState = 'idle' | 'talking' | 'listening' | 'thinking';

export interface SaccadeStateData {
  offsetX: number;
  offsetY: number;
  nextSaccadeTime: number;
}

export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

export interface UseIdleAnimationsOptions {
  idleConfig: IdleConfig | undefined;
  boneTargets: React.MutableRefObject<Record<string, BoneRotation>>;
  addExpressionTarget: (alias: string, value: number) => void;
}

export interface UseIdleAnimationsReturn {
  // Breathing state
  breathingTime: React.MutableRefObject<number>;
  breathingPhase: React.MutableRefObject<number>;
  // Blink state
  blinkTimer: React.MutableRefObject<number>;
  nextBlinkTime: React.MutableRefObject<number>;
  blinkAllowedRef: React.MutableRefObject<boolean>;
  // Saccade state
  saccadeState: React.MutableRefObject<SaccadeStateData>;
  // Idle gesture state
  idleGesturesRef: React.MutableRefObject<string[]>;
  idleStateRef: React.MutableRefObject<IdleState>;
  // Functions
  playIdleGesture: (gestureName: string) => void;
  setIdleState: (state: IdleState) => void;
  setBlinkAllowed: (allowed: boolean) => void;
  updateIdleAnimations: (
    delta: number,
    elapsedTime: number,
    volume: number,
    isActive: boolean
  ) => void;
}


/**
 * Get idle gestures for a given state
 */
export function getIdleGesturesForState(state: IdleState): string[] {
  switch (state) {
    case 'talking':
      return ['hand_wave', 'shoulder_shrug'];
    case 'listening':
      return ['head_tilt'];
    case 'thinking':
      return ['sway'];
    case 'idle':
    default:
      return [];
  }
}

/**
 * Calculate blink value based on timer and duration
 * Returns 0-1 value for blink expression
 */
export function calculateBlinkValue(blinkPhase: number, blinkDuration: number): number {
  if (blinkPhase < blinkDuration) {
    // Closing phase
    return blinkPhase / blinkDuration;
  } else if (blinkPhase < blinkDuration * 2) {
    // Opening phase
    return 1 - (blinkPhase - blinkDuration) / blinkDuration;
  }
  return 0;
}

/**
 * Calculate next blink time with variation
 */
export function calculateNextBlinkTime(baseInterval: number, variationPercent: number = 0.2): number {
  const variation = baseInterval * variationPercent;
  return baseInterval + (Math.random() - 0.5) * 2 * variation;
}

/**
 * Hook for managing idle animations (breathing, blinking, saccade, idle gestures)
 */
export function useIdleAnimations(options: UseIdleAnimationsOptions): UseIdleAnimationsReturn {
  const { idleConfig, boneTargets, addExpressionTarget } = options;

  // Breathing state
  const breathingTime = useRef(0);
  const breathingPhase = useRef(0);

  // Blink state
  const blinkTimer = useRef(0);
  const nextBlinkTime = useRef(2); // Initial blink after 2s
  const blinkAllowedRef = useRef(true);

  // Saccade state
  const saccadeState = useRef<SaccadeStateData>(createSaccadeState());

  // Idle gesture state
  const idleGesturesRef = useRef<string[]>([]);
  const idleStateRef = useRef<IdleState>('idle');

  /**
   * Play a specific idle gesture
   */
  const playIdleGesture = useCallback((gestureName: string) => {
    idleGesturesRef.current = [gestureName];
  }, []);

  /**
   * Set the idle state and update gestures accordingly
   */
  const setIdleState = useCallback((state: IdleState) => {
    idleStateRef.current = state;
    idleGesturesRef.current = getIdleGesturesForState(state);
  }, []);

  /**
   * Set whether blinking is allowed (used by eye gaze commands)
   */
  const setBlinkAllowed = useCallback((allowed: boolean) => {
    blinkAllowedRef.current = allowed;
  }, []);


  /**
   * Update all idle animations for the current frame
   */
  const updateIdleAnimations = useCallback(
    (delta: number, elapsedTime: number, volume: number, isActive: boolean) => {
      // 1. Breathing Animation
      const breathingEnabled = idleConfig?.breathing?.enabled !== false;
      if (breathingEnabled) {
        const breathingConfig: BreathingConfig = {
          enabled: true,
          speed: idleConfig?.breathing?.speed ?? 0.8,
          intensity: idleConfig?.breathing?.intensity ?? 0.02,
          spineWeight: 0.6,
          chestWeight: 1.0,
        };

        // Determine state multiplier based on current activity
        const avatarState = volume > 0.3 ? 'talking' : isActive ? 'listening' : 'idle';
        const stateMultiplier = getStateMultiplier(avatarState as IdleState);

        breathingTime.current += delta;
        const breathingState = calculateBreathingState(
          breathingTime.current,
          breathingConfig,
          stateMultiplier
        );
        breathingPhase.current = breathingState.phase;

        // Apply breathing rotations to spine and chest bone targets
        // Only set if not already set by gestures (gestures take priority)
        if (!boneTargets.current['spine']) {
          boneTargets.current['spine'] = breathingState.spineRotation;
        }
        if (!boneTargets.current['chest']) {
          boneTargets.current['chest'] = breathingState.chestRotation;
        }
      }

      // 2. Blinking
      const blinkEnabled = idleConfig?.blinking?.enabled !== false;
      const blinkInterval = idleConfig?.blinking?.interval ?? 4.0;
      const blinkDuration = idleConfig?.blinking?.duration ?? 0.15;
      if (blinkAllowedRef.current && blinkEnabled) {
        blinkTimer.current += delta;
        if (blinkTimer.current >= nextBlinkTime.current) {
          blinkTimer.current = 0;
          nextBlinkTime.current = calculateNextBlinkTime(blinkInterval);
        }
        const blinkValue = calculateBlinkValue(blinkTimer.current, blinkDuration);
        addExpressionTarget('blink', Math.max(0, blinkValue));
      }

      // 3. Saccade (eye micro-movements)
      const saccadeEnabled = idleConfig?.saccade?.enabled !== false;
      if (saccadeEnabled) {
        const newSaccadeState = updateSaccadeState(
          saccadeState.current,
          DEFAULT_SACCADE_CONFIG,
          delta
        );
        saccadeState.current = newSaccadeState;

        // Apply saccade as subtle look expressions
        const saccadeIntensity = 0.05;
        if (newSaccadeState.offsetX > 0.5) {
          addExpressionTarget('lookRight', Math.min(0.3, newSaccadeState.offsetX * saccadeIntensity));
        } else if (newSaccadeState.offsetX < -0.5) {
          addExpressionTarget('lookLeft', Math.min(0.3, Math.abs(newSaccadeState.offsetX) * saccadeIntensity));
        }
        if (newSaccadeState.offsetY > 0.5) {
          addExpressionTarget('lookUp', Math.min(0.2, newSaccadeState.offsetY * saccadeIntensity));
        } else if (newSaccadeState.offsetY < -0.5) {
          addExpressionTarget('lookDown', Math.min(0.2, Math.abs(newSaccadeState.offsetY) * saccadeIntensity));
        }
      }


      // 4. Idle Gestures (continuous subtle movements)
      const swayEnabled = idleConfig?.sway?.enabled !== false;
      const swayAmount = idleConfig?.sway?.amount ?? 0.1;
      const swaySpeed = idleConfig?.sway?.speed ?? 0.6;
      const headMovementEnabled = idleConfig?.headMovement?.enabled !== false;
      const headMovementAmount = idleConfig?.headMovement?.amount ?? 0.1;

      const gestures = idleGesturesRef.current;
      if (gestures.length > 0) {
        const currentIdleGesture = gestures[Math.floor(elapsedTime * 0.5) % gestures.length];
        if (currentIdleGesture && isActive && volume < 0.3) {
          if (currentIdleGesture === 'head_tilt' && headMovementEnabled) {
            const tilt = Math.sin(elapsedTime * 0.8) * headMovementAmount * 1.5;
            boneTargets.current['head'] = { x: 0, y: tilt, z: 0 };
          } else if (currentIdleGesture === 'shoulder_shrug') {
            const shrug = Math.sin(elapsedTime * 1.2) * 0.08;
            boneTargets.current['rightUpperArm'] = { x: 0, y: 0, z: -0.5 + shrug };
            boneTargets.current['leftUpperArm'] = { x: 0, y: 0, z: 0.5 - shrug };
          } else if (currentIdleGesture === 'hand_wave') {
            const wave = Math.sin(elapsedTime * 3) * 0.3;
            boneTargets.current['rightHand'] = { x: 0, y: wave, z: 0 };
          } else if (currentIdleGesture === 'sway' && swayEnabled) {
            const sway = Math.sin(elapsedTime * swaySpeed) * swayAmount;
            boneTargets.current['spine'] = { x: 0, y: sway, z: 0 };
          }
        }
      }
    },
    [idleConfig, boneTargets, addExpressionTarget]
  );

  return {
    // Breathing state
    breathingTime,
    breathingPhase,
    // Blink state
    blinkTimer,
    nextBlinkTime,
    blinkAllowedRef,
    // Saccade state
    saccadeState,
    // Idle gesture state
    idleGesturesRef,
    idleStateRef,
    // Functions
    playIdleGesture,
    setIdleState,
    setBlinkAllowed,
    updateIdleAnimations,
  };
}
