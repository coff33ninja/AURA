// Walking Animator - Vertical bobbing during walking
// Creates natural up/down motion synchronized with leg movement

import type { WalkingConfig, WalkingState } from '../types/enhancementTypes';

/**
 * Default walking configuration
 */
export const DEFAULT_WALKING_CONFIG: WalkingConfig = {
  bobIntensity: 0.02,  // Vertical displacement in units
  bobFrequency: 2.0,   // Cycles per step (2 = bob twice per full leg cycle)
};

/**
 * Create initial walking state
 */
export function createWalkingState(): WalkingState {
  return {
    verticalOffset: 0,
    phase: 0,
  };
}

/**
 * Calculate walking bob based on speed and time
 * @param walkSpeed - Current walking speed (0 = stopped, 1 = normal)
 * @param time - Current time in seconds
 * @param config - Walking configuration
 * @returns Updated walking state with vertical offset
 */
export function calculateWalkingBob(
  walkSpeed: number,
  time: number,
  config: WalkingConfig
): WalkingState {
  // No bobbing when not walking
  if (walkSpeed <= 0) {
    return {
      verticalOffset: 0,
      phase: 0,
    };
  }
  
  // Calculate phase based on time and speed
  // Faster walking = faster bobbing
  const effectiveFrequency = config.bobFrequency * walkSpeed;
  const phase = (time * effectiveFrequency * Math.PI * 2) % (Math.PI * 2);
  
  // Use absolute sine for double-bounce effect (bob on each foot strike)
  // This creates the characteristic walking rhythm
  const bobValue = Math.abs(Math.sin(phase));
  
  // Scale by intensity and speed (faster = more pronounced bob)
  const speedMultiplier = Math.min(1.5, 0.5 + walkSpeed * 0.5);
  const verticalOffset = bobValue * config.bobIntensity * speedMultiplier;
  
  return {
    verticalOffset,
    phase,
  };
}

/**
 * Smooth transition for vertical offset when starting/stopping walking
 * @param currentOffset - Current vertical offset
 * @param targetOffset - Target vertical offset
 * @param deltaTime - Time since last update (seconds)
 * @param smoothing - Smoothing factor (higher = faster transition)
 * @returns Smoothed vertical offset
 */
export function smoothTransitionBob(
  currentOffset: number,
  targetOffset: number,
  deltaTime: number,
  smoothing: number = 5.0
): number {
  // Exponential smoothing for natural feel
  const t = 1 - Math.exp(-smoothing * deltaTime);
  return currentOffset + (targetOffset - currentOffset) * t;
}

/**
 * Calculate leg animation phase for synchronization
 * @param walkSpeed - Current walking speed
 * @param time - Current time in seconds
 * @returns Leg animation phase (0 to 2π)
 */
export function calculateLegPhase(walkSpeed: number, time: number): number {
  if (walkSpeed <= 0) return 0;
  
  // Leg cycle is typically slower than bob cycle
  const legFrequency = walkSpeed * 1.0; // One full leg cycle per second at speed 1
  return (time * legFrequency * Math.PI * 2) % (Math.PI * 2);
}

/**
 * Get leg rotation values for procedural walking animation
 * @param phase - Current leg phase
 * @param amplitude - Maximum leg swing angle in radians
 * @returns Left and right leg rotations
 */
export function getLegRotations(
  phase: number,
  amplitude: number = 0.6
): { leftLeg: number; rightLeg: number } {
  return {
    leftLeg: Math.sin(phase) * amplitude,
    rightLeg: Math.sin(phase + Math.PI) * amplitude, // Opposite phase
  };
}

/**
 * Check if walking state is valid
 */
export function isValidWalkingState(state: WalkingState): boolean {
  return (
    Number.isFinite(state.verticalOffset) &&
    Number.isFinite(state.phase) &&
    state.phase >= 0 &&
    state.phase <= Math.PI * 2 + 0.001 // Small tolerance
  );
}

/**
 * Calculate arm swing for natural walking
 * @param phase - Current leg phase
 * @param amplitude - Maximum arm swing angle in radians
 * @returns Left and right arm rotations (opposite to legs)
 */
export function getArmSwing(
  phase: number,
  amplitude: number = 0.3
): { leftArm: number; rightArm: number } {
  // Arms swing opposite to legs for natural gait
  return {
    leftArm: Math.sin(phase + Math.PI) * amplitude, // Opposite to right leg
    rightArm: Math.sin(phase) * amplitude, // Opposite to left leg
  };
}
