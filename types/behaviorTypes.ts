// VRM Behavior System Type Definitions

/**
 * All behavior configuration types
 */
export type BehaviorType = 'transform' | 'expressions' | 'gestures' | 'idle' | 'lipsync' | 'reactions' | 'body';

/**
 * Transform configuration - position, rotation, scale on screen
 */
export interface TransformConfig {
  position: { x: number; y: number; z: number };
  rotation: number; // degrees (0-360)
  scale: number; // multiplier (0.5-2.0)
  cameraDistance: number;
  cameraHeight: number;
  cameraLookAtHeight: number;
  cameraFov?: number;
}

/**
 * Body/Pose configuration - default arm, leg, spine positions
 */
export interface BodyConfig {
  // Arm positions (degrees)
  leftUpperArm: { x: number; y: number; z: number };
  rightUpperArm: { x: number; y: number; z: number };
  leftLowerArm: { x: number; y: number; z: number };
  rightLowerArm: { x: number; y: number; z: number };
  // Hand positions
  leftHand: { x: number; y: number; z: number };
  rightHand: { x: number; y: number; z: number };
  // Spine/torso
  spine: { x: number; y: number; z: number };
  chest: { x: number; y: number; z: number };
  // Legs (optional)
  leftUpperLeg?: { x: number; y: number; z: number };
  rightUpperLeg?: { x: number; y: number; z: number };
  // Eye tracking
  eyeTracking: {
    enabled: boolean;
    intensity: number; // 0-1
  };
}

/**
 * Single gesture definition with bone rotations
 */
export interface GestureDefinition {
  name: string;
  enabled: boolean;
  duration: number; // seconds
  intensity: number; // 0.0-1.0
  transitionSpeed: number; // how fast to blend in/out
  bones: Record<string, { x: number; y: number; z: number }>; // bone name -> rotation (radians)
}

/**
 * Gestures configuration
 */
export interface GesturesConfig {
  gestures: GestureDefinition[];
}

/**
 * Idle animation configuration
 */
export interface IdleConfig {
  breathing: {
    enabled: boolean;
    speed: number;
    intensity: number;
  };
  blinking: {
    enabled: boolean;
    interval: number; // seconds between blinks
    duration: number; // blink duration in seconds
  };
  sway: {
    enabled: boolean;
    amount: number;
    speed: number;
  };
  headMovement: {
    enabled: boolean;
    amount: number;
  };
  preset: 'calm' | 'energetic' | 'sleepy' | 'alert' | 'custom';
  stateOverrides?: {
    listening?: Partial<Omit<IdleConfig, 'stateOverrides' | 'preset'>>;
    thinking?: Partial<Omit<IdleConfig, 'stateOverrides' | 'preset'>>;
    talking?: Partial<Omit<IdleConfig, 'stateOverrides' | 'preset'>>;
  };
}

/**
 * Lip sync configuration
 */
export interface LipSyncConfig {
  sensitivity: number; // how much mouth opens based on volume
  smoothing: number; // how quickly mouth responds (0-1)
  visemeWeights: {
    a: number;
    i: number;
    u: number;
    e: number;
    o: number;
  };
  preset: 'subtle' | 'normal' | 'exaggerated' | 'custom';
}

/**
 * Single reaction/emotion definition
 */
export interface ReactionDefinition {
  name: string;
  enabled: boolean;
  expressions: Array<{ name: string; value: number }>;
  gestures: string[]; // gesture names to trigger
  posture: string; // posture state name
  lookAt?: { x: number; y: number; z: number };
  duration: number; // how long the reaction lasts
  mode: 'ACTIVE' | 'PASSIVE';
}

/**
 * Reactions/emotions configuration
 */
export interface ReactionsConfig {
  reactions: ReactionDefinition[];
}

/**
 * Expression combo definition
 */
export interface ExpressionCombo {
  name: string;
  expressions: Array<{ name: string; value: number }>;
}

/**
 * Expressions configuration
 */
export interface ExpressionsConfig {
  mappings: Record<string, string>; // standard name -> model-specific name
  intensityOverrides?: Record<string, number>; // expression -> max intensity
  combos?: ExpressionCombo[];
}


/**
 * Aggregate type containing all behavior configs for a model
 */
export interface ModelBehaviors {
  modelName: string;
  version: string; // for import/export compatibility
  transform: TransformConfig;
  body: BodyConfig;
  expressions: ExpressionsConfig;
  gestures: GesturesConfig;
  idle: IdleConfig;
  lipsync: LipSyncConfig;
  reactions: ReactionsConfig;
}

/**
 * Map from behavior type to its config interface
 */
export interface BehaviorConfigs {
  transform: TransformConfig;
  body: BodyConfig;
  expressions: ExpressionsConfig;
  gestures: GesturesConfig;
  idle: IdleConfig;
  lipsync: LipSyncConfig;
  reactions: ReactionsConfig;
}

/**
 * Validation result for import operations
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Default values for each config type
 */
export const DEFAULT_TRANSFORM: TransformConfig = {
  position: { x: 0, y: 0, z: 0 },
  rotation: 180,
  scale: 1.0,
  cameraDistance: 2.0,
  cameraHeight: 1.3,
  cameraLookAtHeight: 1.2,
};

export const DEFAULT_BODY: BodyConfig = {
  leftUpperArm: { x: 0, y: 0, z: 30 },  // degrees
  rightUpperArm: { x: 0, y: 0, z: -30 },
  leftLowerArm: { x: 0, y: 0, z: 0 },
  rightLowerArm: { x: 0, y: 0, z: 0 },
  leftHand: { x: 0, y: 0, z: 0 },
  rightHand: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  chest: { x: 0, y: 0, z: 0 },
  eyeTracking: { enabled: true, intensity: 0.7 },
};

export const DEFAULT_GESTURES: GesturesConfig = {
  gestures: [],
};

export const DEFAULT_IDLE: IdleConfig = {
  breathing: { enabled: true, speed: 0.8, intensity: 0.02 },
  blinking: { enabled: true, interval: 4.0, duration: 0.15 },
  sway: { enabled: true, amount: 0.1, speed: 0.6 },
  headMovement: { enabled: true, amount: 0.1 },
  preset: 'calm',
};

export const DEFAULT_LIPSYNC: LipSyncConfig = {
  sensitivity: 4.0,
  smoothing: 0.3,
  visemeWeights: { a: 0.8, i: 0.3, u: 0.25, e: 0.3, o: 0.6 },
  preset: 'normal',
};

export const DEFAULT_REACTIONS: ReactionsConfig = {
  reactions: [],
};

export const DEFAULT_EXPRESSIONS: ExpressionsConfig = {
  mappings: {},
};

/**
 * Get default config for a behavior type
 */
export function getDefaultConfig<T extends BehaviorType>(type: T): BehaviorConfigs[T] {
  const defaults: Record<BehaviorType, any> = {
    transform: DEFAULT_TRANSFORM,
    body: DEFAULT_BODY,
    expressions: DEFAULT_EXPRESSIONS,
    gestures: DEFAULT_GESTURES,
    idle: DEFAULT_IDLE,
    lipsync: DEFAULT_LIPSYNC,
    reactions: DEFAULT_REACTIONS,
  };
  return defaults[type];
}

/**
 * Create empty ModelBehaviors with defaults
 */
export function createDefaultModelBehaviors(modelName: string): ModelBehaviors {
  return {
    modelName,
    version: '1.0.0',
    transform: { ...DEFAULT_TRANSFORM },
    body: { ...DEFAULT_BODY },
    expressions: { ...DEFAULT_EXPRESSIONS },
    gestures: { ...DEFAULT_GESTURES },
    idle: { ...DEFAULT_IDLE },
    lipsync: { ...DEFAULT_LIPSYNC },
    reactions: { ...DEFAULT_REACTIONS },
  };
}

/**
 * Deep merge helper for configs
 */
export function deepMergeConfig<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMergeConfig(
          (target[key] as object) || {},
          source[key] as object
        ) as T[typeof key];
      } else {
        result[key] = source[key] as T[typeof key];
      }
    }
  }
  return result;
}

/**
 * Check if a config has all required fields
 */
export function isValidTransformConfig(config: unknown): config is TransformConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.position === 'object' && c.position !== null &&
    typeof (c.position as any).x === 'number' &&
    typeof (c.position as any).y === 'number' &&
    typeof (c.position as any).z === 'number' &&
    typeof c.rotation === 'number' &&
    typeof c.scale === 'number' &&
    typeof c.cameraDistance === 'number' &&
    typeof c.cameraHeight === 'number' &&
    typeof c.cameraLookAtHeight === 'number'
  );
}

export function isValidGesturesConfig(config: unknown): config is GesturesConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return Array.isArray(c.gestures);
}

export function isValidIdleConfig(config: unknown): config is IdleConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.breathing === 'object' &&
    typeof c.blinking === 'object' &&
    typeof c.sway === 'object' &&
    typeof c.headMovement === 'object' &&
    typeof c.preset === 'string'
  );
}

export function isValidLipSyncConfig(config: unknown): config is LipSyncConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.sensitivity === 'number' &&
    typeof c.smoothing === 'number' &&
    typeof c.visemeWeights === 'object' &&
    typeof c.preset === 'string'
  );
}

export function isValidReactionsConfig(config: unknown): config is ReactionsConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return Array.isArray(c.reactions);
}

export function isValidExpressionsConfig(config: unknown): config is ExpressionsConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return typeof c.mappings === 'object' && c.mappings !== null;
}

export function isValidBodyConfig(config: unknown): config is BodyConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.leftUpperArm === 'object' &&
    typeof c.rightUpperArm === 'object' &&
    typeof c.eyeTracking === 'object'
  );
}
