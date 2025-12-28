// Saccade Generator - Realistic eye micro-movements
// Saccades are rapid, involuntary eye movements that occur naturally

import type { SaccadeConfig, SaccadeState } from '../types/enhancementTypes';

/**
 * Default saccade configuration
 */
export const DEFAULT_SACCADE_CONFIG: SaccadeConfig = {
  enabled: true,
  minInterval: 0.5,  // seconds
  maxInterval: 2.0,  // seconds
  amplitude: 3.0,    // degrees
};

/**
 * Create initial saccade state
 */
export function createSaccadeState(): SaccadeState {
  return {
    offsetX: 0,
    offsetY: 0,
    nextSaccadeTime: Math.random() * 1.0 + 0.5, // Initial random delay
  };
}

/**
 * Generate a random saccade offset within the configured amplitude
 * @param config - Saccade configuration
 * @returns Random offset in degrees { x, y }
 */
export function generateSaccade(config: SaccadeConfig): { x: number; y: number } {
  if (!config.enabled) {
    return { x: 0, y: 0 };
  }
  
  // Generate random angle and magnitude
  const angle = Math.random() * Math.PI * 2;
  const magnitude = Math.random() * config.amplitude;
  
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

/**
 * Calculate the next saccade interval
 * @param config - Saccade configuration
 * @returns Time in seconds until next saccade
 */
export function getNextSaccadeInterval(config: SaccadeConfig): number {
  const range = config.maxInterval - config.minInterval;
  return config.minInterval + Math.random() * range;
}

/**
 * Update saccade state based on elapsed time
 * @param state - Current saccade state
 * @param config - Saccade configuration
 * @param deltaTime - Time elapsed since last update (seconds)
 * @returns Updated saccade state
 */
export function updateSaccadeState(
  state: SaccadeState,
  config: SaccadeConfig,
  deltaTime: number
): SaccadeState {
  if (!config.enabled) {
    return { ...state, offsetX: 0, offsetY: 0 };
  }
  
  // Decrease time until next saccade
  const newNextTime = state.nextSaccadeTime - deltaTime;
  
  if (newNextTime <= 0) {
    // Time for a new saccade
    const newOffset = generateSaccade(config);
    return {
      offsetX: newOffset.x,
      offsetY: newOffset.y,
      nextSaccadeTime: getNextSaccadeInterval(config),
    };
  }
  
  // Gradually decay current offset (smooth return to center)
  const decayRate = 2.0; // How fast saccade decays
  const decay = Math.exp(-decayRate * deltaTime);
  
  return {
    offsetX: state.offsetX * decay,
    offsetY: state.offsetY * decay,
    nextSaccadeTime: newNextTime,
  };
}

/**
 * Blend saccade offset with intentional gaze direction
 * @param gazeDirection - Intentional gaze direction { x, y } in degrees
 * @param saccadeOffset - Current saccade offset { x, y } in degrees
 * @param blendFactor - How much saccade affects final gaze (0-1)
 * @returns Combined gaze direction
 */
export function blendWithGaze(
  gazeDirection: { x: number; y: number },
  saccadeOffset: { x: number; y: number },
  blendFactor: number = 1.0
): { x: number; y: number } {
  const clampedBlend = Math.max(0, Math.min(1, blendFactor));
  
  return {
    x: gazeDirection.x + saccadeOffset.x * clampedBlend,
    y: gazeDirection.y + saccadeOffset.y * clampedBlend,
  };
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert saccade offset from degrees to radians for bone rotation
 */
export function saccadeToRadians(offset: { x: number; y: number }): { x: number; y: number } {
  return {
    x: degToRad(offset.x),
    y: degToRad(offset.y),
  };
}

/**
 * Check if saccade offset is within valid bounds
 */
export function isValidSaccadeOffset(
  offset: { x: number; y: number },
  maxAmplitude: number
): boolean {
  const magnitude = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
  return magnitude <= maxAmplitude + 0.001; // Small tolerance for floating point
}
