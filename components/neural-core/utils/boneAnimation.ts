/**
 * Bone Animation Utilities
 * 
 * Provides functions for VRM bone manipulation, pose capture,
 * and smooth interpolation between poses.
 */

import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

// ============================================================================
// Types
// ============================================================================

export type BoneRotation = { x: number; y: number; z: number };
export type BonePose = Record<string, BoneRotation>;

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

// ============================================================================
// Bone Name Constants
// ============================================================================

/**
 * All animatable bone names for VRM humanoid
 */
export const ALL_BONE_NAMES: VRMHumanBoneName[] = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
  // Finger bones
  'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
];

/**
 * Finger bone names for hand animations
 */
export const FINGER_BONE_NAMES: VRMHumanBoneName[] = [
  'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
];

/**
 * Body bone names (excluding fingers) for posture animations
 */
export const BODY_BONE_NAMES: VRMHumanBoneName[] = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
];

/**
 * Common bones used in gesture animations
 */
export const GESTURE_BONE_NAMES: VRMHumanBoneName[] = [
  'spine', 'chest', 'neck', 'head',
  'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightUpperArm', 'rightLowerArm', 'rightHand',
];

// ============================================================================
// Easing Functions
// ============================================================================

/**
 * Get easing function by type
 */
export function getEasingFunction(type: EasingType): (t: number) => number {
  switch (type) {
    case 'easeIn':
      return (t: number) => t * t;
    case 'easeOut':
      return (t: number) => t * (2 - t);
    case 'easeInOut':
      return (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear':
    default:
      return (t: number) => t;
  }
}

// ============================================================================
// Bone Animation Functions
// ============================================================================

/**
 * Apply bone rotation targets with smooth interpolation
 * 
 * @param vrm - VRM instance to animate
 * @param targets - Target rotations for each bone
 * @param delta - Time delta in seconds
 * @param smoothingSpeed - Interpolation speed (default: 5.0)
 */
export function applyBoneTargets(
  vrm: VRM,
  targets: BonePose,
  delta: number,
  smoothingSpeed: number = 5.0
): void {
  if (!vrm?.humanoid) return;
  
  const lerpFactor = Math.min(1, smoothingSpeed * delta);
  
  for (const [boneName, target] of Object.entries(targets)) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
    if (bone) {
      bone.rotation.x += (target.x - bone.rotation.x) * lerpFactor;
      bone.rotation.y += (target.y - bone.rotation.y) * lerpFactor;
      bone.rotation.z += (target.z - bone.rotation.z) * lerpFactor;
    }
  }
}

/**
 * Capture current bone rotations as a pose snapshot
 * 
 * @param vrm - VRM instance to capture from
 * @param boneNames - List of bone names to capture
 * @returns Pose object with bone rotations
 */
export function captureBonePose(
  vrm: VRM,
  boneNames: VRMHumanBoneName[]
): BonePose {
  const pose: BonePose = {};
  
  if (!vrm?.humanoid) return pose;
  
  for (const boneName of boneNames) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      pose[boneName] = {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z,
      };
    } else {
      // Default to zero rotation if bone not found
      pose[boneName] = { x: 0, y: 0, z: 0 };
    }
  }
  
  return pose;
}

/**
 * Interpolate between two poses
 * 
 * @param from - Starting pose
 * @param to - Target pose
 * @param progress - Interpolation progress (0-1)
 * @param easing - Easing function type (default: 'linear')
 * @returns Interpolated pose
 */
export function interpolatePose(
  from: BonePose,
  to: BonePose,
  progress: number,
  easing: EasingType = 'linear'
): BonePose {
  // Clamp progress to [0, 1]
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const easingFn = getEasingFunction(easing);
  const easedProgress = easingFn(clampedProgress);
  
  const result: BonePose = {};
  
  // Get all unique bone names from both poses
  const allBones = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const boneName of allBones) {
    const fromRot = from[boneName] ?? { x: 0, y: 0, z: 0 };
    const toRot = to[boneName] ?? { x: 0, y: 0, z: 0 };
    
    result[boneName] = {
      x: fromRot.x + (toRot.x - fromRot.x) * easedProgress,
      y: fromRot.y + (toRot.y - fromRot.y) * easedProgress,
      z: fromRot.z + (toRot.z - fromRot.z) * easedProgress,
    };
  }
  
  return result;
}

/**
 * Apply a pose directly to VRM bones (no interpolation)
 * 
 * @param vrm - VRM instance to apply pose to
 * @param pose - Pose to apply
 */
export function applyPose(vrm: VRM, pose: BonePose): void {
  if (!vrm?.humanoid) return;
  
  for (const [boneName, rotation] of Object.entries(pose)) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
    if (bone) {
      bone.rotation.x = rotation.x;
      bone.rotation.y = rotation.y;
      bone.rotation.z = rotation.z;
    }
  }
}

/**
 * Reset bones to neutral pose (zero rotation)
 * 
 * @param vrm - VRM instance to reset
 * @param boneNames - List of bone names to reset
 */
export function resetBonesToNeutral(
  vrm: VRM,
  boneNames: VRMHumanBoneName[]
): void {
  if (!vrm?.humanoid) return;
  
  for (const boneName of boneNames) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.rotation.x = 0;
      bone.rotation.y = 0;
      bone.rotation.z = 0;
    }
  }
}

/**
 * Check if a bone exists in the VRM humanoid
 * 
 * @param vrm - VRM instance to check
 * @param boneName - Bone name to check
 * @returns True if bone exists
 */
export function hasBone(vrm: VRM, boneName: VRMHumanBoneName): boolean {
  if (!vrm?.humanoid) return false;
  return vrm.humanoid.getNormalizedBoneNode(boneName) !== null;
}

/**
 * Get available bones from a list
 * 
 * @param vrm - VRM instance to check
 * @param boneNames - List of bone names to check
 * @returns List of available bone names
 */
export function getAvailableBones(
  vrm: VRM,
  boneNames: VRMHumanBoneName[]
): VRMHumanBoneName[] {
  if (!vrm?.humanoid) return [];
  return boneNames.filter(name => hasBone(vrm, name));
}

// ============================================================================
// Utility Functions
// ============================================================================

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
 * Create a bone rotation from degrees
 */
export function rotationFromDegrees(
  x: number,
  y: number,
  z: number
): BoneRotation {
  return {
    x: degToRad(x),
    y: degToRad(y),
    z: degToRad(z),
  };
}

/**
 * Merge two poses, with the second pose taking priority
 * 
 * @param base - Base pose
 * @param overlay - Overlay pose (takes priority)
 * @returns Merged pose
 */
export function mergePoses(base: BonePose, overlay: BonePose): BonePose {
  return { ...base, ...overlay };
}

/**
 * Scale a pose's rotations by a factor
 * 
 * @param pose - Pose to scale
 * @param factor - Scale factor
 * @returns Scaled pose
 */
export function scalePose(pose: BonePose, factor: number): BonePose {
  const result: BonePose = {};
  
  for (const [boneName, rotation] of Object.entries(pose)) {
    result[boneName] = {
      x: rotation.x * factor,
      y: rotation.y * factor,
      z: rotation.z * factor,
    };
  }
  
  return result;
}
