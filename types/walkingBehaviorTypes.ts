// Walking Behavior Types - Extended walking configuration for leg/arm animation control

/**
 * Walking style presets
 */
export type WalkingStyle = 'casual' | 'march' | 'sneak' | 'run';

/**
 * Walking direction - preset directions or custom angle
 */
export type WalkingDirection = 'forward' | 'backward' | 'strafeLeft' | 'strafeRight' | 'faceDirection' | 'custom';

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
  
  // Custom angle for omnidirectional walking (0-360 degrees)
  // 0 = toward camera, 90 = right, 180 = away from camera, 270 = left
  angle: number;
  
  // Depth movement (Z-axis toward/away from camera)
  // Positive = toward camera (model grows), Negative = away (model shrinks)
  depthSpeed: number;        // -1 to 1, multiplier for depth movement
  
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
  angle: 0,
  depthSpeed: 0,
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
 * Convert direction preset to angle in degrees
 * @param direction - Direction preset
 * @param customAngle - Custom angle (used when direction is 'custom')
 * @param facingAngle - Model's current facing angle in radians (used when direction is 'faceDirection')
 */
export function directionToAngle(direction: WalkingDirection, customAngle: number = 0, facingAngle: number = 0): number {
  switch (direction) {
    case 'forward': return 0;      // Toward camera
    case 'backward': return 180;   // Away from camera
    case 'strafeLeft': return 270; // Left
    case 'strafeRight': return 90; // Right
    case 'faceDirection': 
      // Convert facing angle (radians) to walking angle (degrees)
      // Model facing angle: 0 = facing +Z (away from camera), Math.PI = facing -Z (toward camera)
      // Walking angle: 0 = toward camera, 180 = away from camera
      // So we need to convert: facingAngle of Math.PI -> walking angle of 0
      return ((facingAngle * 180 / Math.PI) + 180) % 360;
    case 'custom': return customAngle;
    default: return 0;
  }
}

/**
 * Calculate movement vector from angle
 * Returns normalized X and Z components
 * Angle 0 = toward camera (-Z), 90 = right (+X), 180 = away (+Z), 270 = left (-X)
 */
export function angleToMovementVector(angleDegrees: number): { x: number; z: number } {
  const angleRad = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.sin(angleRad),   // Right is positive X
    z: -Math.cos(angleRad),  // Toward camera is negative Z
  };
}

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
    direction === 'strafeRight' ||
    direction === 'faceDirection' ||
    direction === 'custom'
  );
}
