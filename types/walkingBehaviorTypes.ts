// Walking Behavior Types - Extended walking configuration for leg/arm animation control

/**
 * Walking style presets
 */
export type WalkingStyle = 'casual' | 'march' | 'sneak' | 'run';

/**
 * Walking direction
 */
export type WalkingDirection = 'forward' | 'backward' | 'strafeLeft' | 'strafeRight';

/**
 * Leg bone configuration
 */
export interface LegConfig {
  strideLength: number;  // 0-1, how far legs extend
  liftHeight: number;    // 0-1, how high feet lift
  bendAmount: number;    // 0-1, knee bend intensity
}

/**
 * Arm swing configuration during walking
 */
export interface ArmSwingConfig {
  enabled: boolean;
  intensity: number;     // 0-1
  syncWithLegs: boolean; // opposite arm/leg movement
}

/**
 * Complete walking behavior configuration
 */
export interface WalkingBehaviorConfig {
  // Core walking parameters
  enabled: boolean;
  speed: number;             // 0-2 (0=stopped, 1=normal, 2=fast)
  direction: WalkingDirection;
  
  // Vertical bob (from existing WalkingConfig)
  bobIntensity: number;      // 0-0.1
  bobFrequency: number;      // 0.5-4
  
  // Leg animation
  legs: LegConfig;
  
  // Arm swing
  armSwing: ArmSwingConfig;
  
  // Style preset
  style: WalkingStyle;
}

/**
 * Default walking behavior configuration
 */
export const DEFAULT_WALKING_BEHAVIOR: WalkingBehaviorConfig = {
  enabled: false,
  speed: 0,
  direction: 'forward',
  bobIntensity: 0.02,
  bobFrequency: 2.0,
  legs: {
    strideLength: 0.5,
    liftHeight: 0.3,
    bendAmount: 0.4,
  },
  armSwing: {
    enabled: true,
    intensity: 0.5,
    syncWithLegs: true,
  },
  style: 'casual',
};

/**
 * Walking style presets
 */
export const WALKING_PRESETS: Record<WalkingStyle, Partial<WalkingBehaviorConfig>> = {
  casual: {
    bobIntensity: 0.02,
    bobFrequency: 2.0,
    legs: { strideLength: 0.5, liftHeight: 0.3, bendAmount: 0.4 },
    armSwing: { enabled: true, intensity: 0.5, syncWithLegs: true },
  },
  march: {
    bobIntensity: 0.03,
    bobFrequency: 2.5,
    legs: { strideLength: 0.7, liftHeight: 0.5, bendAmount: 0.5 },
    armSwing: { enabled: true, intensity: 0.8, syncWithLegs: true },
  },
  sneak: {
    bobIntensity: 0.01,
    bobFrequency: 1.5,
    legs: { strideLength: 0.3, liftHeight: 0.2, bendAmount: 0.6 },
    armSwing: { enabled: false, intensity: 0.2, syncWithLegs: true },
  },
  run: {
    bobIntensity: 0.04,
    bobFrequency: 3.0,
    legs: { strideLength: 0.8, liftHeight: 0.4, bendAmount: 0.3 },
    armSwing: { enabled: true, intensity: 0.9, syncWithLegs: true },
  },
};

/**
 * Validate walking behavior config
 */
export function isValidWalkingBehaviorConfig(config: unknown): config is WalkingBehaviorConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  
  return (
    typeof c.enabled === 'boolean' &&
    typeof c.speed === 'number' &&
    typeof c.direction === 'string' &&
    typeof c.bobIntensity === 'number' &&
    typeof c.bobFrequency === 'number' &&
    typeof c.legs === 'object' && c.legs !== null &&
    typeof c.armSwing === 'object' && c.armSwing !== null &&
    typeof c.style === 'string'
  );
}

/**
 * Validate leg config
 */
export function isValidLegConfig(config: unknown): config is LegConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  
  return (
    typeof c.strideLength === 'number' &&
    typeof c.liftHeight === 'number' &&
    typeof c.bendAmount === 'number'
  );
}

/**
 * Validate arm swing config
 */
export function isValidArmSwingConfig(config: unknown): config is ArmSwingConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  
  return (
    typeof c.enabled === 'boolean' &&
    typeof c.intensity === 'number' &&
    typeof c.syncWithLegs === 'boolean'
  );
}

/**
 * Check if a value is a valid walking style
 */
export function isValidWalkingStyle(style: unknown): style is WalkingStyle {
  return style === 'casual' || style === 'march' || style === 'sneak' || style === 'run';
}

/**
 * Check if a value is a valid walking direction
 */
export function isValidWalkingDirection(direction: unknown): direction is WalkingDirection {
  return (
    direction === 'forward' ||
    direction === 'backward' ||
    direction === 'strafeLeft' ||
    direction === 'strafeRight'
  );
}
