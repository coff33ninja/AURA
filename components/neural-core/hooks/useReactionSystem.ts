// useReactionSystem - Hook for managing emotion reactions
// Handles coordinated expression, gesture, and posture responses

import { useRef, useCallback } from 'react';
import type { ReactionDefinition, ReactionStep } from '../../../types/behaviorTypes';

// Types
export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

export interface UseReactionSystemOptions {
  reactionsMapRef: React.MutableRefObject<Map<string, ReactionDefinition>>;
  setExpressionValue: (name: string, value: number) => void;
  playGesture: (gestureName: string, duration?: number) => void;
  updatePosture: (emotion: string) => void;
  setLookAtTarget: (x: number, y: number, z: number) => void;
  playIdleGesture: (gestureName: string) => void;
  setAiMode: (mode: 'ACTIVE' | 'PASSIVE') => void;
  boneTargets: React.MutableRefObject<Record<string, BoneRotation>>;
  addExpressionTarget: (alias: string, value: number) => void;
}

export interface UseReactionSystemReturn {
  triggerEmotion: (emotionState: string) => void;
  executeReactionStepsChain: (steps: ReactionStep[]) => void;
  getReaction: (emotionState: string) => ReactionDefinition | null;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}


/**
 * Calculate cumulative delay for a reaction step
 */
export function calculateCumulativeDelay(steps: ReactionStep[], index: number): number {
  let cumulativeDelay = 0;
  for (let i = 0; i <= index; i++) {
    cumulativeDelay += (steps[i].delay || 0) * 1000;
    if (i < index) {
      cumulativeDelay += (steps[i].duration || 1) * 1000;
    }
  }
  return cumulativeDelay;
}

/**
 * Get idle gesture based on posture
 */
export function getIdleGestureForPosture(posture: string): string {
  return posture === 'thoughtful' || posture === 'anxious' ? 'head_tilt' : 'sway';
}

/**
 * Finger bone names for reaction steps
 */
export const FINGER_BONE_NAMES = [
  'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
] as const;

/**
 * Hook for managing emotion reactions
 */
export function useReactionSystem(options: UseReactionSystemOptions): UseReactionSystemReturn {
  const {
    reactionsMapRef,
    setExpressionValue,
    playGesture,
    updatePosture,
    setLookAtTarget,
    playIdleGesture,
    setAiMode,
    boneTargets,
    addExpressionTarget,
  } = options;

  /**
   * Get reaction definition from loaded config
   */
  const getReaction = useCallback(
    (emotionState: string): ReactionDefinition | null => {
      const reaction = reactionsMapRef.current.get(emotionState);
      if (!reaction || !reaction.enabled) return null;
      return reaction;
    },
    [reactionsMapRef]
  );


  /**
   * Execute a chain of reaction steps with delays
   */
  const executeReactionStepsChain = useCallback(
    (steps: ReactionStep[]) => {
      steps.forEach((step, index) => {
        const cumulativeDelay = calculateCumulativeDelay(steps, index);

        setTimeout(() => {
          switch (step.type) {
            case 'body':
              if (step.bodyConfig) {
                const bc = step.bodyConfig;
                if (bc.leftUpperArm) {
                  boneTargets.current.leftUpperArm = {
                    x: degToRad(bc.leftUpperArm.x),
                    y: degToRad(bc.leftUpperArm.y),
                    z: degToRad(bc.leftUpperArm.z),
                  };
                }
                if (bc.rightUpperArm) {
                  boneTargets.current.rightUpperArm = {
                    x: degToRad(bc.rightUpperArm.x),
                    y: degToRad(bc.rightUpperArm.y),
                    z: degToRad(bc.rightUpperArm.z),
                  };
                }
                if (bc.spine) {
                  boneTargets.current.spine = {
                    x: degToRad(bc.spine.x),
                    y: degToRad(bc.spine.y),
                    z: degToRad(bc.spine.z),
                  };
                }
                if (bc.chest) {
                  boneTargets.current.chest = {
                    x: degToRad(bc.chest.x),
                    y: degToRad(bc.chest.y),
                    z: degToRad(bc.chest.z),
                  };
                }
              }
              break;

            case 'hands':
              if (step.handsConfig) {
                const hc = step.handsConfig;
                for (const boneName of FINGER_BONE_NAMES) {
                  const boneConfig = (hc as Record<string, BoneRotation | undefined>)[boneName];
                  if (boneConfig) {
                    boneTargets.current[boneName] = {
                      x: degToRad(boneConfig.x),
                      y: degToRad(boneConfig.y),
                      z: degToRad(boneConfig.z),
                    };
                  }
                }
              }
              break;

            case 'facial':
              if (step.facialConfig) {
                const fc = step.facialConfig;
                if (fc.expressions) {
                  for (const [expr, value] of Object.entries(fc.expressions)) {
                    addExpressionTarget(expr, value as number);
                  }
                }
                if (fc.mouth) {
                  for (const [viseme, value] of Object.entries(fc.mouth)) {
                    addExpressionTarget(viseme, value as number);
                  }
                }
                if (fc.eyes) {
                  for (const [eye, value] of Object.entries(fc.eyes)) {
                    addExpressionTarget(eye, value as number);
                  }
                }
              }
              break;

            case 'gesture':
              if (step.gestureName) {
                playGesture(step.gestureName, step.duration || 1.5);
              }
              break;

            case 'expression':
              if (step.expressionName) {
                setExpressionValue(step.expressionName, step.expressionValue || 0.8);
              }
              break;
          }

          console.log(`[useReactionSystem] Executed reaction step ${index + 1}: ${step.type} - ${step.name}`);
        }, cumulativeDelay);
      });
    },
    [boneTargets, addExpressionTarget, playGesture, setExpressionValue]
  );


  /**
   * Trigger an emotion reaction
   */
  const triggerEmotion = useCallback(
    (emotionState: string) => {
      const emotion = getReaction(emotionState);
      if (!emotion) {
        console.warn('[useReactionSystem] Emotion not found or disabled:', emotionState);
        return;
      }

      // Trigger all coordinated responses (legacy support)
      emotion.expressions.forEach((expr) => {
        setExpressionValue(expr.name, expr.value);
      });

      updatePosture(emotion.posture);

      // Perform primary gesture (legacy support)
      if (emotion.gestures.length > 0) {
        emotion.gestures.forEach((gest) => playGesture(gest, emotion.duration || 1.5));
      }

      // Update look direction if specified
      if (emotion.lookAt) {
        setLookAtTarget(emotion.lookAt.x, emotion.lookAt.y, emotion.lookAt.z);
      }

      // Set idle gesture based on posture
      const idleGesture = getIdleGestureForPosture(emotion.posture);
      playIdleGesture(idleGesture);

      // Switch interaction mode
      setAiMode(emotion.mode);

      // Execute reaction steps chain if present
      if (emotion.steps && emotion.steps.length > 0) {
        executeReactionStepsChain(emotion.steps);
      }
    },
    [
      getReaction,
      setExpressionValue,
      updatePosture,
      playGesture,
      setLookAtTarget,
      playIdleGesture,
      setAiMode,
      executeReactionStepsChain,
    ]
  );

  return {
    triggerEmotion,
    executeReactionStepsChain,
    getReaction,
  };
}
