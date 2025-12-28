// Animation Blender - Smooth interpolation between bone poses
// Provides easing functions and pose blending for gesture transitions

import type { BoneState, BlendOptions } from '../types/enhancementTypes';

/**
 * Easing functions for animation blending
 */
export const easingFunctions = {
  linear: (t: number): number => t,
  
  easeIn: (t: number): number => t * t,
  
  easeOut: (t: number): number => t * (2 - t),
  
  easeInOut: (t: number): number => 
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
} as const;

export type EasingType = keyof typeof easingFunctions;

/**
 * Get easing function by name
 */
export function getEasingFunction(easing: EasingType = 'linear'): (t: number) => number {
  return easingFunctions[easing] || easingFunctions.linear;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Interpolate between two rotation objects
 */
export function lerpRotation(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  t: number
): { x: number; y: number; z: number } {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    z: lerp(from.z, to.z, t),
  };
}

/**
 * Blend between two bone states
 */
export function blendBoneState(from: BoneState, to: BoneState, t: number): BoneState {
  return {
    rotation: lerpRotation(from.rotation, to.rotation, t),
  };
}

/**
 * Blend between two pose configurations (multiple bones)
 * @param from - Starting pose with bone rotations
 * @param to - Target pose with bone rotations
 * @param t - Blend factor (0 = from, 1 = to)
 * @param easing - Easing function name
 * @returns Blended pose
 */
export function blendBoneRotations(
  from: Record<string, BoneState>,
  to: Record<string, BoneState>,
  t: number,
  easing: EasingType = 'linear'
): Record<string, BoneState> {
  const easedT = getEasingFunction(easing)(clamp(t, 0, 1));
  const result: Record<string, BoneState> = {};
  
  // Get all unique bone names from both poses
  const allBones = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const boneName of allBones) {
    const fromState = from[boneName] || { rotation: { x: 0, y: 0, z: 0 } };
    const toState = to[boneName] || { rotation: { x: 0, y: 0, z: 0 } };
    result[boneName] = blendBoneState(fromState, toState, easedT);
  }
  
  return result;
}

/**
 * Create a generator that yields intermediate blend states over time
 * @param from - Starting pose
 * @param to - Target pose
 * @param options - Blend options (duration, easing)
 * @yields Intermediate pose states
 */
export function* createBlendAnimation(
  from: Record<string, BoneState>,
  to: Record<string, BoneState>,
  options: BlendOptions
): Generator<Record<string, BoneState>, void, number | undefined> {
  const { duration, easing = 'easeInOut' } = options;
  let elapsed = 0;
  
  while (elapsed < duration) {
    const t = elapsed / duration;
    const blendedPose = blendBoneRotations(from, to, t, easing);
    
    // Yield the blended pose and receive deltaTime
    const deltaTime = yield blendedPose;
    elapsed += deltaTime ?? (1 / 60); // Default to ~60fps if no deltaTime provided
  }
  
  // Final pose (t = 1)
  yield blendBoneRotations(from, to, 1, easing);
}

/**
 * Create a blend animation that can be stepped through manually
 */
export function createBlendController(
  from: Record<string, BoneState>,
  to: Record<string, BoneState>,
  options: BlendOptions
): {
  update: (deltaTime: number) => Record<string, BoneState>;
  isComplete: () => boolean;
  getProgress: () => number;
  reset: () => void;
} {
  const { duration, easing = 'easeInOut' } = options;
  let elapsed = 0;
  
  return {
    update(deltaTime: number): Record<string, BoneState> {
      elapsed = Math.min(elapsed + deltaTime, duration);
      const t = elapsed / duration;
      return blendBoneRotations(from, to, t, easing);
    },
    
    isComplete(): boolean {
      return elapsed >= duration;
    },
    
    getProgress(): number {
      return elapsed / duration;
    },
    
    reset(): void {
      elapsed = 0;
    },
  };
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Create a BoneState from degree values
 */
export function createBoneState(x: number, y: number, z: number): BoneState {
  return {
    rotation: { x, y, z },
  };
}

/**
 * Create an empty pose (all bones at zero rotation)
 */
export function createEmptyPose(boneNames: string[]): Record<string, BoneState> {
  const pose: Record<string, BoneState> = {};
  for (const name of boneNames) {
    pose[name] = { rotation: { x: 0, y: 0, z: 0 } };
  }
  return pose;
}
