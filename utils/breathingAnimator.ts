// Breathing Animator - Realistic breathing via spine/chest bone rotations
// Creates subtle, natural breathing motion that can be reduced during talking

import type { BreathingConfig, BreathingState } from '../types/enhancementTypes';

/**
 * Default breathing configuration
 */
export const DEFAULT_BREATHING_CONFIG: BreathingConfig = {
  enabled: true,
  speed: 0.8,        // Hz - breaths per second (normal adult: 12-20 per minute = 0.2-0.33 Hz, slightly faster for animation)
  intensity: 0.02,   // Base rotation intensity
  spineWeight: 0.6,  // How much spine contributes to breathing
  chestWeight: 1.0,  // How much chest contributes to breathing
};

/**
 * Create initial breathing state
 */
export function createBreathingState(): BreathingState {
  return {
    phase: 0,
    spineRotation: { x: 0, y: 0, z: 0 },
    chestRotation: { x: 0, y: 0, z: 0 },
  };
}

/**
 * Calculate breathing state based on time
 * @param time - Current time in seconds
 * @param config - Breathing configuration
 * @param stateMultiplier - Multiplier for intensity (0-1), reduced during talking
 * @returns Updated breathing state with spine and chest rotations
 */
export function calculateBreathingState(
  time: number,
  config: BreathingConfig,
  stateMultiplier: number = 1.0
): BreathingState {
  if (!config.enabled) {
    return {
      phase: 0,
      spineRotation: { x: 0, y: 0, z: 0 },
      chestRotation: { x: 0, y: 0, z: 0 },
    };
  }

  // Clamp state multiplier to valid range
  const clampedMultiplier = Math.max(0, Math.min(1, stateMultiplier));
  
  // Calculate phase (0 to 2π)
  // Handle negative time by using absolute value for phase calculation
  const absTime = Math.abs(time);
  const rawPhase = (absTime * config.speed * Math.PI * 2) % (Math.PI * 2);
  const phase = rawPhase < 0 ? rawPhase + Math.PI * 2 : rawPhase;
  
  // Use sine wave for smooth breathing motion
  // Inhale: phase 0 to π (chest expands, slight backward lean)
  // Exhale: phase π to 2π (chest contracts, slight forward lean)
  const breathValue = Math.sin(phase);
  
  // Apply intensity and state multiplier
  const effectiveIntensity = config.intensity * clampedMultiplier;
  
  // Spine rotation - subtle backward lean on inhale
  // Primary motion is on X axis (forward/backward tilt)
  // Values are very small (0.01-0.02 radians = ~0.5-1 degree)
  const spineX = breathValue * effectiveIntensity * config.spineWeight * 0.5; // Very subtle
  
  // Chest rotation - slightly more pronounced expansion
  // Primary motion is on X axis only for clean breathing look
  const chestX = breathValue * effectiveIntensity * config.chestWeight * 0.8;
  
  return {
    phase,
    spineRotation: { x: spineX, y: 0, z: 0 },
    chestRotation: { x: chestX, y: 0, z: 0 },
  };
}

/**
 * Get the state multiplier based on avatar state
 * @param state - Current avatar state
 * @returns Multiplier for breathing intensity (0-1)
 */
export function getStateMultiplier(state: 'idle' | 'talking' | 'listening' | 'thinking'): number {
  switch (state) {
    case 'talking':
      return 0.3; // Reduced breathing during speech
    case 'listening':
      return 0.8; // Slightly reduced when attentive
    case 'thinking':
      return 0.6; // Moderate reduction when thinking
    case 'idle':
    default:
      return 1.0; // Full breathing when idle
  }
}

/**
 * Blend breathing state with existing bone rotations
 * @param existingRotation - Current bone rotation
 * @param breathingRotation - Breathing-induced rotation
 * @param blendFactor - How much breathing affects the final rotation (0-1)
 * @returns Combined rotation
 */
export function blendWithExisting(
  existingRotation: { x: number; y: number; z: number },
  breathingRotation: { x: number; y: number; z: number },
  blendFactor: number = 1.0
): { x: number; y: number; z: number } {
  const clampedBlend = Math.max(0, Math.min(1, blendFactor));
  
  return {
    x: existingRotation.x + breathingRotation.x * clampedBlend,
    y: existingRotation.y + breathingRotation.y * clampedBlend,
    z: existingRotation.z + breathingRotation.z * clampedBlend,
  };
}

/**
 * Check if breathing state produces valid rotations
 */
export function isValidBreathingState(state: BreathingState): boolean {
  const isFinite = (n: number) => Number.isFinite(n);
  
  return (
    isFinite(state.phase) &&
    state.phase >= 0 &&
    state.phase <= Math.PI * 2 + 0.001 && // Small tolerance for floating point
    isFinite(state.spineRotation.x) &&
    isFinite(state.spineRotation.y) &&
    isFinite(state.spineRotation.z) &&
    isFinite(state.chestRotation.x) &&
    isFinite(state.chestRotation.y) &&
    isFinite(state.chestRotation.z)
  );
}
