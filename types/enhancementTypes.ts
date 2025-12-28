// AURA Enhancement Type Definitions

// ============================================
// Media Capture Types (Screenshot/Recording)
// ============================================

export interface MediaCaptureOptions {
  canvas: HTMLCanvasElement;
  filename?: string;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for jpeg
}

export interface RecordingOptions {
  canvas: HTMLCanvasElement;
  mimeType?: string;
  videoBitsPerSecond?: number;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  blob: Blob | null;
  startTime: number | null;
}

// ============================================
// Custom VRM Upload Types
// ============================================

export interface VrmValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    name: string;
    version: string;
    expressions: string[];
  };
}

export interface CustomVrmEntry {
  name: string;
  objectUrl: string;
  expressions: string[];
  addedAt: number;
}

// ============================================
// Background Types
// ============================================

export type BackgroundType = 'solid' | 'gradient' | 'hdri';

export interface SolidBackground {
  type: 'solid';
  color: string; // hex color
}

export interface GradientBackground {
  type: 'gradient';
  colors: [string, string]; // [topColor, bottomColor]
  angle: number; // degrees
}

export interface HdriBackground {
  type: 'hdri';
  url: string;
  intensity: number; // 0-2
}

export type BackgroundConfig = SolidBackground | GradientBackground | HdriBackground;

export interface BackgroundPreferences {
  type: BackgroundType;
  config: BackgroundConfig;
}


// ============================================
// Animation Blending Types
// ============================================

export interface BoneState {
  rotation: { x: number; y: number; z: number };
}

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface BlendOptions {
  duration: number; // seconds
  easing?: EasingType;
}

// ============================================
// Saccade (Eye Movement) Types
// ============================================

export interface SaccadeConfig {
  enabled: boolean;
  minInterval: number;  // seconds (default 0.5)
  maxInterval: number;  // seconds (default 2.0)
  amplitude: number;    // degrees (default 2-5)
}

export interface SaccadeState {
  offsetX: number;
  offsetY: number;
  nextSaccadeTime: number;
}

export const DEFAULT_SACCADE_CONFIG: SaccadeConfig = {
  enabled: true,
  minInterval: 0.5,
  maxInterval: 2.0,
  amplitude: 3,
};

// ============================================
// Breathing Animation Types
// ============================================

export interface BreathingConfig {
  enabled: boolean;
  speed: number;      // Hz (default 0.8)
  intensity: number;  // 0-1 (default 0.02)
  spineWeight: number;  // 0-1
  chestWeight: number;  // 0-1
}

export interface BreathingState {
  phase: number;  // 0-2π
  spineRotation: { x: number; y: number; z: number };
  chestRotation: { x: number; y: number; z: number };
}

export const DEFAULT_BREATHING_CONFIG: BreathingConfig = {
  enabled: true,
  speed: 0.8,
  intensity: 0.02,
  spineWeight: 0.6,
  chestWeight: 0.4,
};

// ============================================
// Walking Animation Types
// ============================================

export interface WalkingConfig {
  bobIntensity: number;  // vertical displacement (default 0.02)
  bobFrequency: number;  // cycles per step (default 2)
}

export interface WalkingState {
  verticalOffset: number;
  phase: number;
}

export const DEFAULT_WALKING_CONFIG: WalkingConfig = {
  bobIntensity: 0.02,
  bobFrequency: 2,
};

// ============================================
// LOD (Level of Detail) Types
// ============================================

export type ShadowQuality = 'high' | 'medium' | 'low' | 'none';

export interface LodLevel {
  distance: number;
  shadowQuality: ShadowQuality;
  particleMultiplier: number; // 0-1
}

export interface LodConfig {
  enabled: boolean;
  thresholds: number[];  // camera distances
  levels: LodLevel[];
}

export const DEFAULT_LOD_CONFIG: LodConfig = {
  enabled: true,
  thresholds: [3, 6],
  levels: [
    { distance: 0, shadowQuality: 'high', particleMultiplier: 1.0 },
    { distance: 3, shadowQuality: 'medium', particleMultiplier: 0.5 },
    { distance: 6, shadowQuality: 'low', particleMultiplier: 0.25 },
  ],
};

// ============================================
// Device Detection Types
// ============================================

export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  maxParticles: number;
  recommendedLod: number;
}

// ============================================
// FPS Counter Types
// ============================================

export type FpsColor = 'green' | 'yellow' | 'red';

export interface FpsState {
  fps: number;
  frameTime: number; // ms
  color: FpsColor;
}

// ============================================
// VRM Model Manager Types
// ============================================

export interface ModelCacheEntry {
  vrm: unknown; // VRM type from @pixiv/three-vrm
  loadedAt: number;
  size: number;
}

export interface VrmModelManagerOptions {
  maxCacheSize?: number;
  onLoadStart?: (modelName: string) => void;
  onLoadComplete?: (modelName: string) => void;
  onLoadError?: (modelName: string, error: Error) => void;
}
