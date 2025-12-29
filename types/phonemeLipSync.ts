/**
 * Phoneme-based Lip Sync Type Definitions
 * 
 * Types for phoneme detection and viseme mapping system.
 */

/**
 * Standard phonemes based on ARPAbet notation
 * Used for phoneme detection from audio analysis
 */
export type Phoneme = 
  // Vowels
  | 'AA' | 'AE' | 'AH' | 'AO' | 'AW' | 'AY'
  | 'EH' | 'ER' | 'EY' | 'IH' | 'IY'
  | 'OW' | 'OY' | 'UH' | 'UW'
  // Consonants
  | 'B' | 'CH' | 'D' | 'DH' | 'F' | 'G'
  | 'HH' | 'JH' | 'K' | 'L' | 'M' | 'N' | 'NG'
  | 'P' | 'R' | 'S' | 'SH' | 'T' | 'TH'
  | 'V' | 'W' | 'Y' | 'Z' | 'ZH'
  // Silence
  | 'SIL';

/**
 * All phoneme values as an array for iteration
 */
export const ALL_PHONEMES: Phoneme[] = [
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY',
  'EH', 'ER', 'EY', 'IH', 'IY',
  'OW', 'OY', 'UH', 'UW',
  'B', 'CH', 'D', 'DH', 'F', 'G',
  'HH', 'JH', 'K', 'L', 'M', 'N', 'NG',
  'P', 'R', 'S', 'SH', 'T', 'TH',
  'V', 'W', 'Y', 'Z', 'ZH',
  'SIL'
];

/**
 * Result from phoneme detection
 */
export interface PhonemeResult {
  /** Detected phoneme */
  phoneme: Phoneme;
  /** Confidence level 0.0 - 1.0 */
  confidence: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Viseme keys matching existing LipSyncConfig.visemeWeights
 */
export type VisemeKey = 'a' | 'i' | 'u' | 'e' | 'o';

/**
 * Viseme weights for VRM blend shapes
 * Matches the structure in LipSyncConfig.visemeWeights
 */
export interface VisemeWeights {
  a: number;  // Open mouth (A sound)
  i: number;  // Narrow mouth (I sound)
  u: number;  // Rounded lips (U sound)
  e: number;  // Wide smile (E sound)
  o: number;  // Round open (O sound)
}

/**
 * Configuration for PhonemeDetector
 */
export interface PhonemeDetectorConfig {
  /** Sample rate of audio (typically 24000 for Gemini) */
  sampleRate: number;
  /** FFT size for frequency analysis */
  fftSize: number;
  /** Minimum confidence threshold to report a phoneme */
  minConfidence: number;
  /** Smoothing factor for temporal consistency */
  smoothingFactor: number;
}

/**
 * Default PhonemeDetector configuration
 */
export const DEFAULT_PHONEME_DETECTOR_CONFIG: PhonemeDetectorConfig = {
  sampleRate: 24000,
  fftSize: 256,
  minConfidence: 0.3,
  smoothingFactor: 0.5,
};

/**
 * Configuration for VisemeMapper
 */
export interface VisemeMapperConfig {
  /** Multiplier for output intensity */
  intensityMultiplier: number;
  /** Base weights from LipSyncConfig */
  baseWeights: VisemeWeights;
  /** Optional custom phoneme-to-viseme mappings */
  customMappings?: Partial<Record<Phoneme, Partial<VisemeWeights>>>;
}

/**
 * Default VisemeMapper configuration
 * Note: baseWeights are intentionally lower for natural-looking speech.
 * The 'a' viseme (open mouth) is reduced to prevent exaggerated mouth opening.
 */
export const DEFAULT_VISEME_MAPPER_CONFIG: VisemeMapperConfig = {
  intensityMultiplier: 0.7,
  baseWeights: { a: 0.5, i: 0.25, u: 0.2, e: 0.25, o: 0.4 },
};

/**
 * Phoneme detection settings for LipSyncConfig extension
 */
export interface PhonemeDetectionSettings {
  /** Enable phoneme detection (false = use volume-based) */
  enabled: boolean;
  /** Minimum confidence to use detected phoneme */
  minConfidence: number;
  /** Transition duration in milliseconds */
  transitionDuration: number;
  /** Intensity multiplier for output */
  intensityMultiplier: number;
}

/**
 * Default phoneme detection settings
 */
export const DEFAULT_PHONEME_DETECTION_SETTINGS: PhonemeDetectionSettings = {
  enabled: false,
  minConfidence: 0.3,
  transitionDuration: 50,
  intensityMultiplier: 1.0,
};

/**
 * Internal state for LipSyncController
 */
export interface LipSyncState {
  currentPhoneme: Phoneme;
  targetWeights: VisemeWeights;
  currentWeights: VisemeWeights;
  lastUpdateTime: number;
}

/**
 * Create neutral (zero) viseme weights
 */
export function createNeutralWeights(): VisemeWeights {
  return { a: 0, i: 0, u: 0, e: 0, o: 0 };
}

/**
 * Check if a value is a valid Phoneme
 */
export function isValidPhoneme(value: unknown): value is Phoneme {
  return typeof value === 'string' && ALL_PHONEMES.includes(value as Phoneme);
}

/**
 * Check if weights are valid VisemeWeights
 */
export function isValidVisemeWeights(value: unknown): value is VisemeWeights {
  if (!value || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  return (
    typeof w.a === 'number' && w.a >= 0 && w.a <= 1 &&
    typeof w.i === 'number' && w.i >= 0 && w.i <= 1 &&
    typeof w.u === 'number' && w.u >= 0 && w.u <= 1 &&
    typeof w.e === 'number' && w.e >= 0 && w.e <= 1 &&
    typeof w.o === 'number' && w.o >= 0 && w.o <= 1
  );
}
