// Walking Controller - Leg and arm animation calculations for walking
// Provides procedural walking animation based on walk cycle phase

import type {
  WalkingBehaviorConfig,
  WalkingStyle,
  LegConfig,
  ArmSwingConfig,
} from '../types/walkingBehaviorTypes';
import {
  DEFAULT_WALKING_BEHAVIOR,
  WALKING_PRESETS,
  isValidWalkingStyle,
} from '../types/walkingBehaviorTypes';

/**
 * Leg pose for a single frame of walking animation
 * All rotations in radians
 */
export interface LegPose {
  leftUpperLeg: { x: number; y: number; z: number };
  rightUpperLeg: { x: number; y: number; z: number };
  leftLowerLeg: { x: number; y: number; z: number };
  rightLowerLeg: { x: number; y: number; z: number };
  leftFoot: { x: number; y: number; z: number };
  rightFoot: { x: number; y: number; z: number };
}

/**
 * Arm swing pose for a single frame
 * All rotations in radians
 */
export interface ArmSwingPose {
  leftUpperArm: { x: number; y: number; z: number };
  rightUpperArm: { x: number; y: number; z: number };
}

/**
 * Calculate leg pose based on walk cycle phase
 * @param phase - Walk cycle phase (0 to 2π)
 * @param config - Walking behavior configuration
 * @returns Leg bone rotations for current phase
 */
export function calculateLegPose(
  phase: number,
  config: WalkingBehaviorConfig
): LegPose {
  const { legs, direction } = config;
  
  // Normalize phase to 0-2π range
  const normalizedPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  
  // Calculate leg swing based on phase
  // Left leg leads at phase 0, right leg leads at phase π
  const leftSwing = Math.sin(normalizedPhase);
  const rightSwing = Math.sin(normalizedPhase + Math.PI); // Opposite phase
  
  // Calculate lift (only when leg is moving forward)
  // Lift peaks at phase π/2 for left, 3π/2 for right
  const leftLift = Math.max(0, Math.sin(normalizedPhase));
  const rightLift = Math.max(0, Math.sin(normalizedPhase + Math.PI));
  
  // Apply stride length scaling
  const strideScale = legs.strideLength * 0.6; // Max ~35 degrees
  const liftScale = legs.liftHeight * 0.4; // Max ~23 degrees
  const bendScale = legs.bendAmount * 0.8; // Max ~46 degrees
  
  // Direction modifier (reverse for backward, reduce for strafe)
  let directionMod = 1;
  if (direction === 'backward') {
    directionMod = -1;
  } else if (direction === 'strafeLeft' || direction === 'strafeRight') {
    directionMod = 0.3; // Reduced forward/back motion during strafe
  }
  
  // Upper leg rotations (hip flexion/extension)
  const leftUpperLegX = leftSwing * strideScale * directionMod;
  const rightUpperLegX = rightSwing * strideScale * directionMod;
  
  // Lower leg rotations (knee bend - always positive, more when leg is back)
  const leftKneeBend = (1 - leftSwing) * 0.5 * bendScale + leftLift * bendScale * 0.5;
  const rightKneeBend = (1 - rightSwing) * 0.5 * bendScale + rightLift * bendScale * 0.5;
  
  // Foot rotations (ankle - compensate for leg angle)
  const leftFootX = -leftUpperLegX * 0.3 + leftLift * liftScale;
  const rightFootX = -rightUpperLegX * 0.3 + rightLift * liftScale;
  
  // Add lateral movement for strafe
  let leftUpperLegZ = 0;
  let rightUpperLegZ = 0;
  if (direction === 'strafeLeft') {
    leftUpperLegZ = -leftLift * 0.2;
    rightUpperLegZ = rightLift * 0.2;
  } else if (direction === 'strafeRight') {
    leftUpperLegZ = leftLift * 0.2;
    rightUpperLegZ = -rightLift * 0.2;
  }
  
  return {
    leftUpperLeg: { x: leftUpperLegX, y: 0, z: leftUpperLegZ },
    rightUpperLeg: { x: rightUpperLegX, y: 0, z: rightUpperLegZ },
    leftLowerLeg: { x: leftKneeBend, y: 0, z: 0 },
    rightLowerLeg: { x: rightKneeBend, y: 0, z: 0 },
    leftFoot: { x: leftFootX, y: 0, z: 0 },
    rightFoot: { x: rightFootX, y: 0, z: 0 },
  };
}

/**
 * Calculate arm swing pose based on walk cycle phase
 * Arms swing opposite to legs for natural gait
 * @param phase - Walk cycle phase (0 to 2π)
 * @param config - Walking behavior configuration
 * @returns Arm bone rotations for current phase
 */
export function calculateArmSwingPose(
  phase: number,
  config: WalkingBehaviorConfig
): ArmSwingPose {
  const { armSwing, direction } = config;
  
  // No arm swing if disabled
  if (!armSwing.enabled) {
    return {
      leftUpperArm: { x: 0, y: 0, z: 0 },
      rightUpperArm: { x: 0, y: 0, z: 0 },
    };
  }
  
  // Normalize phase
  const normalizedPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  
  // Arms swing opposite to legs when syncWithLegs is true
  // Left arm swings with right leg (phase + π), right arm with left leg (phase)
  const phaseOffset = armSwing.syncWithLegs ? Math.PI : 0;
  const leftSwing = Math.sin(normalizedPhase + phaseOffset);
  const rightSwing = Math.sin(normalizedPhase + phaseOffset + Math.PI);
  
  // Scale by intensity (max ~30 degrees at full intensity)
  const swingScale = armSwing.intensity * 0.5;
  
  // Direction modifier
  let directionMod = 1;
  if (direction === 'backward') {
    directionMod = -1;
  } else if (direction === 'strafeLeft' || direction === 'strafeRight') {
    directionMod = 0.3;
  }
  
  return {
    leftUpperArm: { x: leftSwing * swingScale * directionMod, y: 0, z: 0 },
    rightUpperArm: { x: rightSwing * swingScale * directionMod, y: 0, z: 0 },
  };
}

/**
 * Get walking preset configuration for a style
 * @param style - Walking style name
 * @returns Partial walking config for the style
 */
export function getWalkingPreset(style: WalkingStyle): Partial<WalkingBehaviorConfig> {
  if (!isValidWalkingStyle(style)) {
    return WALKING_PRESETS.casual;
  }
  return WALKING_PRESETS[style];
}

/**
 * Apply a walking style preset to a base configuration
 * @param baseConfig - Base walking configuration
 * @param style - Walking style to apply
 * @returns New configuration with style applied
 */
export function applyWalkingStyle(
  baseConfig: WalkingBehaviorConfig,
  style: WalkingStyle
): WalkingBehaviorConfig {
  const preset = getWalkingPreset(style);
  
  return {
    ...baseConfig,
    style,
    bobIntensity: preset.bobIntensity ?? baseConfig.bobIntensity,
    bobFrequency: preset.bobFrequency ?? baseConfig.bobFrequency,
    legs: preset.legs ?? baseConfig.legs,
    armSwing: preset.armSwing ?? baseConfig.armSwing,
  };
}

/**
 * Create a default walking behavior config
 */
export function createDefaultWalkingBehavior(): WalkingBehaviorConfig {
  return { ...DEFAULT_WALKING_BEHAVIOR };
}

/**
 * Calculate walk cycle phase from time and speed
 * @param time - Current time in seconds
 * @param speed - Walking speed (0-2)
 * @returns Phase in radians (0 to 2π)
 */
export function calculateWalkPhase(time: number, speed: number): number {
  if (speed <= 0) return 0;
  
  // Base frequency: 1 full cycle per second at speed 1
  const frequency = speed * 1.0;
  return (time * frequency * Math.PI * 2) % (Math.PI * 2);
}

/**
 * Validate that a leg pose has valid values
 */
export function isValidLegPose(pose: LegPose): boolean {
  const bones = [
    pose.leftUpperLeg,
    pose.rightUpperLeg,
    pose.leftLowerLeg,
    pose.rightLowerLeg,
    pose.leftFoot,
    pose.rightFoot,
  ];
  
  return bones.every(bone =>
    Number.isFinite(bone.x) &&
    Number.isFinite(bone.y) &&
    Number.isFinite(bone.z)
  );
}

/**
 * Validate that an arm swing pose has valid values
 */
export function isValidArmSwingPose(pose: ArmSwingPose): boolean {
  return (
    Number.isFinite(pose.leftUpperArm.x) &&
    Number.isFinite(pose.leftUpperArm.y) &&
    Number.isFinite(pose.leftUpperArm.z) &&
    Number.isFinite(pose.rightUpperArm.x) &&
    Number.isFinite(pose.rightUpperArm.y) &&
    Number.isFinite(pose.rightUpperArm.z)
  );
}
