/**
 * LipSyncController - Orchestrates phoneme detection and viseme application
 * 
 * Provides a unified interface for lip sync that supports both:
 * - Phoneme-based detection (new)
 * - Volume-based fallback (legacy, matches current NeuralCore behavior)
 */

import { LipSyncConfig } from '../types/behaviorTypes';
import { PhonemeDetector } from './phonemeDetector';
import { VisemeMapper } from './visemeMapper';
import {
  VisemeWeights,
  LipSyncState,
  Phoneme,
  createNeutralWeights,
  PhonemeDetectorConfig,
} from '../types/phonemeLipSync';

/**
 * Extended LipSyncConfig with phoneme detection settings
 */
export interface LipSyncControllerConfig extends LipSyncConfig {
  phonemeDetection?: {
    enabled: boolean;
    minConfidence: number;
    transitionDuration: number;
    intensityMultiplier: number;
  };
}

/**
 * LipSyncController class
 * Orchestrates phoneme detection and provides viseme weights
 */
export class LipSyncController {
  private config: LipSyncControllerConfig;
  private phonemeDetector: PhonemeDetector;
  private visemeMapper: VisemeMapper;
  private state: LipSyncState;
  private lastFrameTime: number = 0;

  constructor(config: Partial<LipSyncControllerConfig> = {}) {
    // Merge with defaults
    // Note: visemeWeights are intentionally lower for natural-looking speech
    this.config = {
      sensitivity: config.sensitivity ?? 4.0,
      smoothing: config.smoothing ?? 0.3,
      visemeWeights: config.visemeWeights ?? { a: 0.5, i: 0.25, u: 0.2, e: 0.25, o: 0.4 },
      preset: config.preset ?? 'normal',
      phonemeDetection: {
        enabled: config.phonemeDetection?.enabled ?? false,
        minConfidence: config.phonemeDetection?.minConfidence ?? 0.3,
        transitionDuration: config.phonemeDetection?.transitionDuration ?? 50,
        intensityMultiplier: config.phonemeDetection?.intensityMultiplier ?? 0.7,
      },
    };

    // Initialize components
    const detectorConfig: Partial<PhonemeDetectorConfig> = {
      minConfidence: this.config.phonemeDetection!.minConfidence,
      smoothingFactor: this.config.smoothing,
    };
    
    this.phonemeDetector = new PhonemeDetector(detectorConfig);
    this.visemeMapper = new VisemeMapper({
      intensityMultiplier: this.config.phonemeDetection!.intensityMultiplier,
      baseWeights: this.config.visemeWeights,
    });

    // Initialize state
    this.state = {
      currentPhoneme: 'SIL',
      targetWeights: createNeutralWeights(),
      currentWeights: createNeutralWeights(),
      lastUpdateTime: performance.now(),
    };
  }

  /**
   * Process FFT frequency data and return viseme weights (phoneme mode)
   * @param frequencyData Uint8Array from AnalyserNode.getByteFrequencyData()
   * @param deltaTime Time since last frame in seconds
   * @returns VisemeWeights to apply to VRM model
   */
  processFrequencyData(frequencyData: Uint8Array, deltaTime: number): VisemeWeights {
    // Detect phoneme
    const phonemeResult = this.phonemeDetector.analyzeFrequencyData(frequencyData);
    
    // Map to viseme weights
    const targetWeights = this.visemeMapper.mapPhonemeToViseme(phonemeResult);
    
    // Update state
    this.state.currentPhoneme = phonemeResult.phoneme;
    this.state.targetWeights = targetWeights;
    
    // Apply smooth interpolation
    this.interpolateWeights(deltaTime);
    
    return { ...this.state.currentWeights };
  }

  /**
   * Process volume and return viseme weights (legacy mode)
   * Matches the exact behavior of NeuralCore lines 1350-1355:
   *   const mouthOpen = Math.min(1.0, sVol * lipSyncSensitivity);
   *   addExpressionTarget('a', mouthOpen * visemeWeights.a);
   *   addExpressionTarget('i', mouthOpen * visemeWeights.i);
   *   etc.
   * 
   * @param volume Smoothed volume value (0-1)
   * @param deltaTime Time since last frame in seconds
   * @returns VisemeWeights to apply to VRM model
   */
  processVolume(volume: number, deltaTime: number): VisemeWeights {
    const { sensitivity, visemeWeights } = this.config;
    
    // Calculate mouth open amount (matches NeuralCore behavior)
    const mouthOpen = Math.min(1.0, volume * sensitivity);
    
    // Set target weights (matches NeuralCore behavior)
    this.state.targetWeights = {
      a: mouthOpen * visemeWeights.a,
      i: mouthOpen * visemeWeights.i,
      u: mouthOpen * visemeWeights.u,
      e: mouthOpen * visemeWeights.e,
      o: mouthOpen * visemeWeights.o,
    };
    
    // For volume mode, we can apply directly without interpolation
    // to match the original behavior exactly
    this.state.currentWeights = { ...this.state.targetWeights };
    
    return { ...this.state.currentWeights };
  }

  /**
   * Interpolate current weights toward target weights
   * Uses configurable transition duration for smooth blending
   */
  private interpolateWeights(deltaTime: number): void {
    const transitionDuration = this.config.phonemeDetection!.transitionDuration / 1000; // Convert ms to seconds
    const lerpFactor = Math.min(1, deltaTime / transitionDuration);
    
    this.state.currentWeights.a = this.lerp(this.state.currentWeights.a, this.state.targetWeights.a, lerpFactor);
    this.state.currentWeights.i = this.lerp(this.state.currentWeights.i, this.state.targetWeights.i, lerpFactor);
    this.state.currentWeights.u = this.lerp(this.state.currentWeights.u, this.state.targetWeights.u, lerpFactor);
    this.state.currentWeights.e = this.lerp(this.state.currentWeights.e, this.state.targetWeights.e, lerpFactor);
    this.state.currentWeights.o = this.lerp(this.state.currentWeights.o, this.state.targetWeights.o, lerpFactor);
  }

  /**
   * Linear interpolation helper
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Check if phoneme detection is enabled
   */
  isPhonemeDetectionEnabled(): boolean {
    return this.config.phonemeDetection?.enabled ?? false;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<LipSyncControllerConfig>): void {
    // Update main config
    if (config.sensitivity !== undefined) this.config.sensitivity = config.sensitivity;
    if (config.smoothing !== undefined) this.config.smoothing = config.smoothing;
    if (config.visemeWeights !== undefined) this.config.visemeWeights = config.visemeWeights;
    if (config.preset !== undefined) this.config.preset = config.preset;
    
    // Update phoneme detection config
    if (config.phonemeDetection) {
      this.config.phonemeDetection = {
        ...this.config.phonemeDetection!,
        ...config.phonemeDetection,
      };
      
      // Update detector config
      this.phonemeDetector.updateConfig({
        minConfidence: this.config.phonemeDetection.minConfidence,
        smoothingFactor: this.config.smoothing,
      });
      
      // Update mapper config
      this.visemeMapper.updateConfig({
        intensityMultiplier: this.config.phonemeDetection.intensityMultiplier,
        baseWeights: this.config.visemeWeights,
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LipSyncControllerConfig {
    return { ...this.config };
  }

  /**
   * Get current state (for debugging/monitoring)
   */
  getState(): LipSyncState {
    return { ...this.state };
  }

  /**
   * Get current phoneme
   */
  getCurrentPhoneme(): Phoneme {
    return this.state.currentPhoneme;
  }

  /**
   * Get current weights
   */
  getCurrentWeights(): VisemeWeights {
    return { ...this.state.currentWeights };
  }

  /**
   * Reset to neutral state
   */
  reset(): void {
    this.state = {
      currentPhoneme: 'SIL',
      targetWeights: createNeutralWeights(),
      currentWeights: createNeutralWeights(),
      lastUpdateTime: performance.now(),
    };
    this.phonemeDetector.reset();
  }
}
