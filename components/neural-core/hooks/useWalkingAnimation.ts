// useWalkingAnimation - Hook for managing walking animation state
// Handles walking movement, bobbing, leg/arm animation

import { useRef, useCallback } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { WalkingBehaviorConfig } from '../../../types/walkingBehaviorTypes';
import {
  DEFAULT_WALKING_BEHAVIOR,
  directionToAngle,
  angleToMovementVector,
} from '../../../types/walkingBehaviorTypes';
import {
  calculateWalkingBob,
  smoothTransitionBob,
} from '../../../utils/walkingAnimator';
import {
  calculateLegPose,
  calculateArmSwingPose,
  calculateWalkPhase,
} from '../../../utils/walkingController';

// Types
export interface WalkState {
  speed: number;
  direction: number;
  isWalking: boolean;
  position: { x: number; y: number; z: number };
}

export interface UseWalkingAnimationOptions {
  vrmRef: React.MutableRefObject<VRM | null>;
  bodyRotationRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
}

export interface UseWalkingAnimationReturn {
  // State refs
  walkState: React.MutableRefObject<WalkState>;
  walkingBehavior: React.MutableRefObject<WalkingBehaviorConfig>;
  walkBobOffset: React.MutableRefObject<number>;
  // Functions
  walk: (direction: number, speed?: number) => void;
  stopWalking: () => void;
  startWalking: () => void;
  isWalking: () => boolean;
  setWalkingBehavior: (config: Partial<WalkingBehaviorConfig>) => void;
  getWalkingBehavior: () => WalkingBehaviorConfig;
  updateWalkingAnimation: (delta: number, elapsedTime: number) => void;
}


/**
 * Create initial walk state
 */
export function createWalkState(): WalkState {
  return {
    speed: 0,
    direction: 0,
    isWalking: false,
    position: { x: 0, y: 0, z: 0 },
  };
}

/**
 * Screen bounds for walking
 */
export const WALK_BOUNDS = {
  minX: -2,
  maxX: 2,
  minZ: -1.5,
  maxZ: 1.5,
};

/**
 * Clamp position to screen bounds
 */
export function clampPosition(position: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return {
    x: Math.max(WALK_BOUNDS.minX, Math.min(WALK_BOUNDS.maxX, position.x)),
    y: position.y,
    z: Math.max(WALK_BOUNDS.minZ, Math.min(WALK_BOUNDS.maxZ, position.z)),
  };
}

/**
 * Hook for managing walking animations
 */
export function useWalkingAnimation(options: UseWalkingAnimationOptions): UseWalkingAnimationReturn {
  const { vrmRef, bodyRotationRef } = options;

  // Walk state refs
  const walkState = useRef<WalkState>(createWalkState());
  const walkingBehavior = useRef<WalkingBehaviorConfig>({ ...DEFAULT_WALKING_BEHAVIOR });
  const walkBobOffset = useRef(0);

  /**
   * Start walking in a direction with optional speed
   */
  const walk = useCallback((direction: number, speed: number = 1.0) => {
    walkState.current.direction = direction;
    walkState.current.speed = speed;
    walkState.current.isWalking = speed > 0;
    // Sync with walking behavior config
    walkingBehavior.current.enabled = speed > 0;
    walkingBehavior.current.speed = speed;
  }, []);

  /**
   * Stop walking
   */
  const stopWalking = useCallback(() => {
    walkState.current.isWalking = false;
    walkState.current.speed = 0;
    walkingBehavior.current.enabled = false;
    walkingBehavior.current.speed = 0;
  }, []);

  /**
   * Start walking with current config
   */
  const startWalking = useCallback(() => {
    walkingBehavior.current.enabled = true;
    if (walkingBehavior.current.speed <= 0) {
      walkingBehavior.current.speed = 1.0;
    }
    walkState.current.isWalking = true;
    walkState.current.speed = walkingBehavior.current.speed;
  }, []);

  /**
   * Check if currently walking
   */
  const isWalking = useCallback(() => {
    return walkState.current.isWalking;
  }, []);

  /**
   * Set walking behavior configuration
   */
  const setWalkingBehavior = useCallback((config: Partial<WalkingBehaviorConfig>) => {
    walkingBehavior.current = { ...walkingBehavior.current, ...config };
    // Sync with walk state
    if (config.enabled !== undefined) {
      walkState.current.isWalking = config.enabled;
    }
    if (config.speed !== undefined) {
      walkState.current.speed = config.speed;
    }
  }, []);

  /**
   * Get current walking behavior configuration
   */
  const getWalkingBehavior = useCallback((): WalkingBehaviorConfig => {
    return { ...walkingBehavior.current };
  }, []);


  /**
   * Update walking animation for the current frame
   */
  const updateWalkingAnimation = useCallback(
    (delta: number, elapsedTime: number) => {
      const vrm = vrmRef.current;
      if (!vrm) return;

      if (walkState.current.isWalking) {
        const walkConfig = walkingBehavior.current;
        const moveSpeed = walkState.current.speed * 0.5 * delta;

        // Calculate movement angle
        const facingAngle = bodyRotationRef.current.y;
        const moveAngle = directionToAngle(walkConfig.direction, walkConfig.angle, facingAngle);
        const moveVector = angleToMovementVector(moveAngle);

        // Apply horizontal movement
        walkState.current.position.x += moveVector.x * moveSpeed;
        walkState.current.position.z += moveVector.z * moveSpeed;

        // Apply depth movement
        const depthMove = (walkConfig.depthSpeed || 0) * moveSpeed;
        walkState.current.position.z -= depthMove;

        // Clamp to screen bounds
        walkState.current.position = clampPosition(walkState.current.position);

        // Calculate walking bob
        const walkBobConfig = {
          bobIntensity: walkConfig.bobIntensity,
          bobFrequency: walkConfig.bobFrequency,
        };
        const walkBobState = calculateWalkingBob(walkState.current.speed, elapsedTime, walkBobConfig);
        walkBobOffset.current = smoothTransitionBob(walkBobOffset.current, walkBobState.verticalOffset, delta, 8.0);

        // Apply to VRM scene
        vrm.scene.position.x = walkState.current.position.x;
        vrm.scene.position.y = walkState.current.position.y + walkBobOffset.current;
        vrm.scene.position.z = walkState.current.position.z;

        // Calculate walk phase for leg and arm animation
        const walkPhase = calculateWalkPhase(elapsedTime, walkState.current.speed);

        // Calculate and apply leg poses
        const legPose = calculateLegPose(walkPhase, walkConfig);
        applyLegPose(vrm, legPose);

        // Calculate and apply arm swing if enabled
        if (walkConfig.armSwing.enabled) {
          const armPose = calculateArmSwingPose(walkPhase, walkConfig);
          applyArmSwingPose(vrm, armPose);
        }
      } else {
        // Smoothly return bob to zero when not walking
        walkBobOffset.current = smoothTransitionBob(walkBobOffset.current, 0, delta, 5.0);
        if (Math.abs(walkBobOffset.current) > 0.0001) {
          vrm.scene.position.y = walkState.current.position.y + walkBobOffset.current;
        }
      }
    },
    [vrmRef, bodyRotationRef]
  );

  return {
    walkState,
    walkingBehavior,
    walkBobOffset,
    walk,
    stopWalking,
    startWalking,
    isWalking,
    setWalkingBehavior,
    getWalkingBehavior,
    updateWalkingAnimation,
  };
}


/**
 * Apply leg pose to VRM bones
 */
function applyLegPose(vrm: VRM, legPose: ReturnType<typeof calculateLegPose>): void {
  const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
  const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
  const leftLowerLeg = vrm.humanoid.getNormalizedBoneNode('leftLowerLeg');
  const rightLowerLeg = vrm.humanoid.getNormalizedBoneNode('rightLowerLeg');
  const leftFoot = vrm.humanoid.getNormalizedBoneNode('leftFoot');
  const rightFoot = vrm.humanoid.getNormalizedBoneNode('rightFoot');

  if (leftUpperLeg) {
    leftUpperLeg.rotation.x = legPose.leftUpperLeg.x;
    leftUpperLeg.rotation.z = legPose.leftUpperLeg.z;
  }
  if (rightUpperLeg) {
    rightUpperLeg.rotation.x = legPose.rightUpperLeg.x;
    rightUpperLeg.rotation.z = legPose.rightUpperLeg.z;
  }
  if (leftLowerLeg) leftLowerLeg.rotation.x = legPose.leftLowerLeg.x;
  if (rightLowerLeg) rightLowerLeg.rotation.x = legPose.rightLowerLeg.x;
  if (leftFoot) leftFoot.rotation.x = legPose.leftFoot.x;
  if (rightFoot) rightFoot.rotation.x = legPose.rightFoot.x;
}

/**
 * Apply arm swing pose to VRM bones
 */
function applyArmSwingPose(vrm: VRM, armPose: ReturnType<typeof calculateArmSwingPose>): void {
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');

  if (leftUpperArm) leftUpperArm.rotation.x += armPose.leftUpperArm.x;
  if (rightUpperArm) rightUpperArm.rotation.x += armPose.rightUpperArm.x;
}
