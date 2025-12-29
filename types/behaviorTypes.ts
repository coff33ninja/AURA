// VRM Behavior System Type Definitions

/**
 * All behavior configuration types
 */
export type BehaviorType = 'transform' | 'expressions' | 'gestures' | 'idle' | 'lipsync' | 'reactions' | 'body' | 'hands' | 'facial';

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
 * 3D rotation for a single bone (degrees)
 */
export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

/**
 * Hand/Finger configuration - individual finger bone positions
 * All values in degrees. X = curl, Y = spread, Z = twist
 */
export interface HandsConfig {
  // Left hand fingers
  leftThumbProximal: BoneRotation;
  leftThumbDistal: BoneRotation;
  leftIndexProximal: BoneRotation;
  leftIndexIntermediate: BoneRotation;
  leftIndexDistal: BoneRotation;
  leftMiddleProximal: BoneRotation;
  leftMiddleIntermediate: BoneRotation;
  leftMiddleDistal: BoneRotation;
  leftRingProximal: BoneRotation;
  leftRingIntermediate: BoneRotation;
  leftRingDistal: BoneRotation;
  leftLittleProximal: BoneRotation;
  leftLittleIntermediate: BoneRotation;
  leftLittleDistal: BoneRotation;
  // Right hand fingers
  rightThumbProximal: BoneRotation;
  rightThumbDistal: BoneRotation;
  rightIndexProximal: BoneRotation;
  rightIndexIntermediate: BoneRotation;
  rightIndexDistal: BoneRotation;
  rightMiddleProximal: BoneRotation;
  rightMiddleIntermediate: BoneRotation;
  rightMiddleDistal: BoneRotation;
  rightRingProximal: BoneRotation;
  rightRingIntermediate: BoneRotation;
  rightRingDistal: BoneRotation;
  rightLittleProximal: BoneRotation;
  rightLittleIntermediate: BoneRotation;
  rightLittleDistal: BoneRotation;
}

/**
 * Custom facial preset definition
 */
export interface FacialPreset {
  name: string;
  values: Record<string, number>;
}

/**
 * Facial configuration - expressions, mouth, and eye controls
 * All values 0-1 intensity
 */
export interface FacialConfig {
  // Standard VRM expressions
  expressions: {
    joy: number;
    angry: number;
    sorrow: number;
    fun: number;
    surprised: number;
  };
  // Mouth visemes for lip sync
  mouth: {
    a: number;
    i: number;
    u: number;
    e: number;
    o: number;
  };
  // Eye controls
  eyes: {
    blink: number;
    lookUp: number;
    lookDown: number;
    lookLeft: number;
    lookRight: number;
  };
  // User-created presets
  customPresets: FacialPreset[];
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
  saccade?: {
    enabled: boolean;
    amplitude?: number; // degrees
    minInterval?: number; // seconds
    maxInterval?: number; // seconds
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
  
  // Phoneme detection settings (optional, disabled by default)
  phonemeDetection?: {
    enabled: boolean;           // Enable phoneme-based lip sync
    minConfidence: number;      // Minimum confidence threshold (0.0-1.0)
    transitionDuration: number; // Transition duration in ms
    intensityMultiplier: number; // Output intensity multiplier
  };
  
  // Custom phoneme-to-viseme mapping overrides (optional)
  customPhonemeMap?: Record<string, Partial<{
    a: number;
    i: number;
    u: number;
    e: number;
    o: number;
  }>>;
}

/**
 * A step in a reaction chain - can be body pose, hand pose, or facial expression
 */
export interface ReactionStep {
  type: 'body' | 'hands' | 'facial' | 'gesture' | 'expression';
  name: string; // display name for this step
  delay: number; // seconds to wait before this step
  duration: number; // how long this step lasts
  // Config snapshots (only one will be set based on type)
  bodyConfig?: Partial<BodyConfig>;
  handsConfig?: Partial<HandsConfig>;
  facialConfig?: Partial<FacialConfig>;
  gestureName?: string; // reference to a saved gesture
  expressionName?: string; // expression name
  expressionValue?: number; // expression intensity
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
  // Chain of steps to execute in sequence
  steps?: ReactionStep[];
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
  hands: HandsConfig;
  facial: FacialConfig;
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
  hands: HandsConfig;
  facial: FacialConfig;
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

const ZERO_ROTATION: BoneRotation = { x: 0, y: 0, z: 0 };

export const DEFAULT_HANDS: HandsConfig = {
  // Left hand - all fingers at neutral
  leftThumbProximal: { ...ZERO_ROTATION },
  leftThumbDistal: { ...ZERO_ROTATION },
  leftIndexProximal: { ...ZERO_ROTATION },
  leftIndexIntermediate: { ...ZERO_ROTATION },
  leftIndexDistal: { ...ZERO_ROTATION },
  leftMiddleProximal: { ...ZERO_ROTATION },
  leftMiddleIntermediate: { ...ZERO_ROTATION },
  leftMiddleDistal: { ...ZERO_ROTATION },
  leftRingProximal: { ...ZERO_ROTATION },
  leftRingIntermediate: { ...ZERO_ROTATION },
  leftRingDistal: { ...ZERO_ROTATION },
  leftLittleProximal: { ...ZERO_ROTATION },
  leftLittleIntermediate: { ...ZERO_ROTATION },
  leftLittleDistal: { ...ZERO_ROTATION },
  // Right hand - all fingers at neutral
  rightThumbProximal: { ...ZERO_ROTATION },
  rightThumbDistal: { ...ZERO_ROTATION },
  rightIndexProximal: { ...ZERO_ROTATION },
  rightIndexIntermediate: { ...ZERO_ROTATION },
  rightIndexDistal: { ...ZERO_ROTATION },
  rightMiddleProximal: { ...ZERO_ROTATION },
  rightMiddleIntermediate: { ...ZERO_ROTATION },
  rightMiddleDistal: { ...ZERO_ROTATION },
  rightRingProximal: { ...ZERO_ROTATION },
  rightRingIntermediate: { ...ZERO_ROTATION },
  rightRingDistal: { ...ZERO_ROTATION },
  rightLittleProximal: { ...ZERO_ROTATION },
  rightLittleIntermediate: { ...ZERO_ROTATION },
  rightLittleDistal: { ...ZERO_ROTATION },
};

export const DEFAULT_FACIAL: FacialConfig = {
  expressions: {
    joy: 0,
    angry: 0,
    sorrow: 0,
    fun: 0,
    surprised: 0,
  },
  mouth: {
    a: 0,
    i: 0,
    u: 0,
    e: 0,
    o: 0,
  },
  eyes: {
    blink: 0,
    lookUp: 0,
    lookDown: 0,
    lookLeft: 0,
    lookRight: 0,
  },
  customPresets: [],
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
  // Phoneme detection disabled by default for backward compatibility
  phonemeDetection: {
    enabled: false,
    minConfidence: 0.3,
    transitionDuration: 50,
    intensityMultiplier: 1.0,
  },
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
    hands: DEFAULT_HANDS,
    facial: DEFAULT_FACIAL,
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
    hands: { ...DEFAULT_HANDS },
    facial: { ...DEFAULT_FACIAL },
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
  
  // Required fields
  const hasRequiredFields = (
    typeof c.sensitivity === 'number' &&
    typeof c.smoothing === 'number' &&
    typeof c.visemeWeights === 'object' &&
    typeof c.preset === 'string'
  );
  
  if (!hasRequiredFields) return false;
  
  // Optional phonemeDetection validation
  if (c.phonemeDetection !== undefined) {
    if (typeof c.phonemeDetection !== 'object' || c.phonemeDetection === null) return false;
    const pd = c.phonemeDetection as Record<string, unknown>;
    if (
      typeof pd.enabled !== 'boolean' ||
      typeof pd.minConfidence !== 'number' ||
      typeof pd.transitionDuration !== 'number' ||
      typeof pd.intensityMultiplier !== 'number'
    ) return false;
  }
  
  return true;
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

export function isValidHandsConfig(config: unknown): config is HandsConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  // Check a few key finger bones exist
  return (
    typeof c.leftIndexProximal === 'object' &&
    typeof c.rightIndexProximal === 'object' &&
    typeof c.leftThumbProximal === 'object' &&
    typeof c.rightThumbProximal === 'object'
  );
}

export function isValidFacialConfig(config: unknown): config is FacialConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.expressions === 'object' &&
    typeof c.mouth === 'object' &&
    typeof c.eyes === 'object' &&
    Array.isArray(c.customPresets)
  );
}
