/**
 * useGesturePlayer Hook
 * 
 * Manages gesture playback with queueing, smooth transitions,
 * and easing-based bone interpolation.
 */

import { useRef, useCallback } from 'react';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { GestureDefinition } from '../../../types/behaviorTypes';
import type { EasingType } from '../../../utils/animationBlender';
import type { BoneRotation, BonePose } from '../utils/boneAnimation';

// ============================================================================
// Types
// ============================================================================

export interface UseGesturePlayerOptions {
  /** Reference to the VRM instance */
  vrmRef: React.MutableRefObject<VRM | null>;
  /** Reference to the gestures map */
  gesturesMapRef: React.MutableRefObject<Map<string, GestureDefinition>>;
  /** Reference to bone targets for animation */
  boneTargets: React.MutableRefObject<BonePose>;
}

export interface GestureQueueItem {
  name: string;
  duration: number;
}

export interface GestureState {
  active: boolean;
  elapsed: number;
  duration: number;
  currentGesture: string | null;
  transitionSpeed: number;
  easing: EasingType;
  fromPose: BonePose;
  toPose: BonePose;
}

export interface UseGesturePlayerReturn {
  /** Queue of pending gestures */
  gestureQueue: React.MutableRefObject<GestureQueueItem[]>;
  /** Current gesture state */
  gestureState: React.MutableRefObject<GestureState>;
  /** Play a gesture (adds to queue) */
  playGesture: (gestureName: string, duration?: number) => void;
  /** Play the next gesture in queue */
  playNextGesture: () => void;
  /** Get bone rotations for a gesture */
  getGestureRotations: (gestureName: string) => BonePose | null;
  /** Update gesture state (call in animation loop) */
  updateGestureState: (delta: number) => void;
  /** Check if a gesture is currently playing */
  isPlaying: () => boolean;
  /** Clear the gesture queue */
  clearQueue: () => void;
}

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_GESTURE_STATE: GestureState = {
  active: false,
  elapsed: 0,
  duration: 0,
  currentGesture: null,
  transitionSpeed: 0.3,
  easing: 'easeInOut',
  fromPose: {},
  toPose: {},
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing gesture playback
 */
export function useGesturePlayer(
  options: UseGesturePlayerOptions
): UseGesturePlayerReturn {
  const { vrmRef, gesturesMapRef, boneTargets } = options;

  // Gesture state refs
  const gestureQueue = useRef<GestureQueueItem[]>([]);
  const gestureState = useRef<GestureState>({ ...DEFAULT_GESTURE_STATE });

  /**
   * Get bone rotations for a gesture, applying dynamic animations
   */
  const getGestureRotations = useCallback((gestureName: string): BonePose | null => {
    const gesture = gesturesMapRef.current.get(gestureName);
    if (!gesture || !gesture.enabled) return null;
    
    // For dynamic gestures (wave, applause), apply time-based animation
    const bones: BonePose = { ...gesture.bones };
    const now = Date.now();
    
    // Apply dynamic animations for specific gestures
    if (gestureName === 'wave' && bones.rightLowerArm) {
      bones.rightLowerArm = {
        ...bones.rightLowerArm,
        x: Math.sin(now * 0.003) * 0.5
      };
    } else if (gestureName === 'applause') {
      if (bones.rightHand) {
        bones.rightHand = { ...bones.rightHand, x: Math.sin(now * 0.005) * 0.3 };
      }
      if (bones.leftHand) {
        bones.leftHand = { ...bones.leftHand, x: Math.sin(now * 0.005 + Math.PI) * 0.3 };
      }
    } else if (gestureName === 'dismissive_wave' && bones.rightHand) {
      bones.rightHand = { ...bones.rightHand, x: Math.sin(now * 0.004) * 0.3 };
    }
    
    return bones;
  }, [gesturesMapRef]);

  /**
   * Capture current bone positions as a pose
   */
  const captureBonePose = useCallback((boneNames: string[]): BonePose => {
    const pose: BonePose = {};
    const vrm = vrmRef.current;
    
    if (!vrm) return pose;
    
    for (const boneName of boneNames) {
      const bone = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
      if (bone) {
        pose[boneName] = {
          x: bone.rotation.x,
          y: bone.rotation.y,
          z: bone.rotation.z,
        };
      } else {
        pose[boneName] = { x: 0, y: 0, z: 0 };
      }
    }
    
    return pose;
  }, [vrmRef]);

  /**
   * Play the next gesture in queue
   */
  const playNextGesture = useCallback(() => {
    if (gestureQueue.current.length === 0) {
      gestureState.current = { ...DEFAULT_GESTURE_STATE };
      return;
    }
    
    const { name, duration } = gestureQueue.current.shift()!;
    const rotations = getGestureRotations(name);
    if (!rotations) {
      // Try next gesture if this one failed
      playNextGesture();
      return;
    }
    
    const gestureConfig = gesturesMapRef.current.get(name);
    
    // Capture current bone positions as starting pose
    const fromPose = captureBonePose(Object.keys(rotations));
    
    // Set bone targets for the gesture
    for (const [boneName, rot] of Object.entries(rotations)) {
      boneTargets.current[boneName] = rot;
    }
    
    gestureState.current = {
      active: true,
      elapsed: 0,
      duration,
      currentGesture: name,
      transitionSpeed: gestureConfig?.transitionSpeed ?? 0.3,
      easing: 'easeInOut',
      fromPose,
      toPose: rotations,
    };
  }, [getGestureRotations, captureBonePose, gesturesMapRef, boneTargets]);

  /**
   * Play a gesture (adds to queue)
   */
  const playGesture = useCallback((gestureName: string, duration: number = 1.5) => {
    const rotations = getGestureRotations(gestureName);
    if (!rotations || !vrmRef.current) {
      console.warn('[useGesturePlayer] Gesture not found or disabled:', gestureName);
      return;
    }
    
    // Get gesture config for duration/intensity
    const gesture = gesturesMapRef.current.get(gestureName);
    const actualDuration = gesture?.duration ?? duration;
    
    // Queue the gesture
    gestureQueue.current.push({ name: gestureName, duration: actualDuration });
    
    // If no gesture is currently playing, start this one immediately
    if (!gestureState.current.active) {
      playNextGesture();
    }
  }, [getGestureRotations, vrmRef, gesturesMapRef, playNextGesture]);

  /**
   * Update gesture state (call in animation loop)
   */
  const updateGestureState = useCallback((delta: number) => {
    if (!gestureState.current.active) return;
    
    gestureState.current.elapsed += delta;
    
    if (gestureState.current.elapsed >= gestureState.current.duration) {
      // Gesture finished, play next one from queue
      playNextGesture();
    }
  }, [playNextGesture]);

  /**
   * Check if a gesture is currently playing
   */
  const isPlaying = useCallback((): boolean => {
    return gestureState.current.active;
  }, []);

  /**
   * Clear the gesture queue
   */
  const clearQueue = useCallback(() => {
    gestureQueue.current = [];
    gestureState.current = { ...DEFAULT_GESTURE_STATE };
  }, []);

  return {
    gestureQueue,
    gestureState,
    playGesture,
    playNextGesture,
    getGestureRotations,
    updateGestureState,
    isPlaying,
    clearQueue,
  };
}

export default useGesturePlayer;
