// VRM Configuration Schema
// This file defines the structure for per-model configuration files

export interface VrmConfig {
  // Model identification
  modelName: string;
  vrmVersion: '0' | '1'; // VRM spec version
  
  // Transform settings
  transform: {
    rotation: number;      // Y-axis rotation in degrees (0-360)
    scale: number;         // Uniform scale multiplier (default 1.0)
    offsetY: number;       // Vertical offset adjustment
  };
  
  // Default pose (arm positions, etc.)
  defaultPose: {
    leftUpperArm: { x: number; y: number; z: number };
    rightUpperArm: { x: number; y: number; z: number };
    leftLowerArm?: { x: number; y: number; z: number };
    rightLowerArm?: { x: number; y: number; z: number };
    spine?: { x: number; y: number; z: number };
    chest?: { x: number; y: number; z: number };
    neck?: { x: number; y: number; z: number };
    head?: { x: number; y: number; z: number };
  };
  
  // Camera framing
  camera: {
    distance: number;      // Camera Z distance
    height: number;        // Camera Y position
    lookAtHeight: number;  // Where camera looks (Y)
    fov?: number;          // Field of view override
  };
  
  // Expression mappings (override sidecar if needed)
  expressions?: {
    // Map standard names to model-specific names
    // e.g., "joy" -> "happy" for VRM 1.0 models
    [standardName: string]: string;
  };
  
  // Lip sync tuning
  lipSync?: {
    sensitivity: number;   // Volume multiplier (default 4.0)
    smoothing: number;     // Smoothing factor (default 0.3)
    visemeWeights?: {      // Per-viseme intensity
      a: number;
      i: number;
      u: number;
      e: number;
      o: number;
    };
  };
  
  // Idle animation settings
  idle?: {
    breathingSpeed: number;    // Breathing cycle speed
    breathingIntensity: number; // Breathing movement amount
    blinkInterval: number;     // Average blink interval (seconds)
    blinkDuration: number;     // Blink duration (seconds)
    swayAmount: number;        // Subtle body sway
  };
  
  // Physics/spring bone adjustments
  physics?: {
    gravityMultiplier: number;
    windStrength: number;
    stiffnessMultiplier: number;
  };
}

// Default configuration template
export const defaultVrmConfig: VrmConfig = {
  modelName: '',
  vrmVersion: '0',
  transform: {
    rotation: 180,
    scale: 1.0,
    offsetY: 0,
  },
  defaultPose: {
    leftUpperArm: { x: 0, y: 0, z: 1.222 },   // 70 degrees in radians (arms down)
    rightUpperArm: { x: 0, y: 0, z: -1.222 },   // -70 degrees in radians
  },
  camera: {
    distance: 2.0,
    height: 1.3,
    lookAtHeight: 1.2,
  },
  lipSync: {
    sensitivity: 4.0,
    smoothing: 0.3,
  },
  idle: {
    breathingSpeed: 0.8,
    breathingIntensity: 0.02,
    blinkInterval: 4.0,
    blinkDuration: 0.15,
    swayAmount: 0.1,
  },
};
