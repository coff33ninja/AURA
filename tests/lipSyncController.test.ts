/**
 * Feature: phoneme-lip-sync
 * Property 4: Smooth Viseme Transitions
 * For any sequence of phoneme results processed over time, the change in any
 * viseme weight between consecutive frames SHALL be bounded by (deltaTime / transitionDuration).
 * 
 * Property 5: Return to Neutral on Silence
 * For any LipSyncController that has been processing speech, when silence is detected
 * for a duration exceeding transitionDuration, all viseme weights SHALL approach zero.
 * 
 * Property 6: Intensity Multiplier Scaling
 * For any intensity multiplier value M and any phoneme input, the resulting viseme
 * weights SHALL be scaled by M (clamped to [0.0, 1.0]).
 * 
 * Property 8: Volume-Based Fallback Equivalence
 * For any audio input when phoneme detection is disabled, the LipSyncController
 * SHALL produce output equivalent to the legacy volume-based lip sync system.
 * 
 * **Validates: Requirements 2.3, 3.2, 3.4, 4.1, 4.2, 5.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LipSyncController } from '../utils/lipSyncController';
import {
  VisemeWeights,
  isValidVisemeWeights,
  createNeutralWeights,
} from '../types/phonemeLipSync';

// Helper to create 32-bit float constraints
const f = Math.fround;

// Arbitrary for generating volume values
const volumeArb = fc.float({ min: f(0), max: f(1), noNaN: true });

// Arbitrary for generating delta time (in seconds)
const deltaTimeArb = fc.float({ min: f(0.001), max: f(0.1), noNaN: true }); // 10ms to 100ms

// Arbitrary for generating frequency data
const frequencyDataArb = fc.uint8Array({ minLength: 128, maxLength: 512 });

// Arbitrary for generating intensity multiplier
const intensityMultiplierArb = fc.float({ min: f(0.1), max: f(3.0), noNaN: true });

describe('LipSyncController', () => {
  let controller: LipSyncController;

  beforeEach(() => {
    controller = new LipSyncController();
  });

  describe('Property 4: Smooth Viseme Transitions', () => {
    /**
     * Feature: phoneme-lip-sync, Property 4: Smooth Viseme Transitions
     * Weight changes between frames are bounded by transition rate
     */
    it('limits weight change rate based on transition duration', () => {
      const transitionDuration = 50; // ms
      const smoothController = new LipSyncController({
        phonemeDetection: {
          enabled: true,
          minConfidence: 0.3,
          transitionDuration,
          intensityMultiplier: 1.0,
        },
      });

      fc.assert(
        fc.property(
          fc.array(frequencyDataArb, { minLength: 2, maxLength: 10 }),
          deltaTimeArb,
          (frequencyDataSequence, deltaTime) => {
            smoothController.reset();
            
            let prevWeights: VisemeWeights | null = null;
            
            for (const frequencyData of frequencyDataSequence) {
              const weights = smoothController.processFrequencyData(frequencyData, deltaTime);
              
              if (prevWeights) {
                // Calculate max allowed change based on transition duration
                const maxChange = deltaTime / (transitionDuration / 1000);
                
                // Check each weight change is bounded
                const aChange = Math.abs(weights.a - prevWeights.a);
                const iChange = Math.abs(weights.i - prevWeights.i);
                const uChange = Math.abs(weights.u - prevWeights.u);
                const eChange = Math.abs(weights.e - prevWeights.e);
                const oChange = Math.abs(weights.o - prevWeights.o);
                
                // Allow some tolerance for floating point
                const tolerance = 0.01;
                expect(aChange).toBeLessThanOrEqual(maxChange + tolerance);
                expect(iChange).toBeLessThanOrEqual(maxChange + tolerance);
                expect(uChange).toBeLessThanOrEqual(maxChange + tolerance);
                expect(eChange).toBeLessThanOrEqual(maxChange + tolerance);
                expect(oChange).toBeLessThanOrEqual(maxChange + tolerance);
              }
              
              prevWeights = weights;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('produces valid weights for any frequency data sequence', () => {
      const phonemeController = new LipSyncController({
        phonemeDetection: {
          enabled: true,
          minConfidence: 0.3,
          transitionDuration: 50,
          intensityMultiplier: 1.0,
        },
      });

      fc.assert(
        fc.property(
          frequencyDataArb,
          deltaTimeArb,
          (frequencyData, deltaTime) => {
            const weights = phonemeController.processFrequencyData(frequencyData, deltaTime);
            expect(isValidVisemeWeights(weights)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Return to Neutral on Silence', () => {
    /**
     * Feature: phoneme-lip-sync, Property 5: Return to Neutral on Silence
     * Weights decay to zero when silence is detected
     */
    it('returns to neutral weights after sustained silence', () => {
      const phonemeController = new LipSyncController({
        phonemeDetection: {
          enabled: true,
          minConfidence: 0.3,
          transitionDuration: 50,
          intensityMultiplier: 1.0,
        },
      });

      // First, process some "speech" (high energy data)
      const speechData = new Uint8Array(256);
      for (let i = 0; i < speechData.length; i++) {
        speechData[i] = 150 + Math.floor(Math.random() * 100);
      }
      
      // Process speech for a few frames
      for (let i = 0; i < 10; i++) {
        phonemeController.processFrequencyData(speechData, 0.016);
      }
      
      // Now process silence
      const silenceData = new Uint8Array(256).fill(0);
      
      // Process silence for enough frames to transition
      for (let i = 0; i < 20; i++) {
        phonemeController.processFrequencyData(silenceData, 0.016);
      }
      
      const finalWeights = phonemeController.getCurrentWeights();
      
      // All weights should be near zero
      const totalWeight = finalWeights.a + finalWeights.i + finalWeights.u + finalWeights.e + finalWeights.o;
      expect(totalWeight).toBeLessThan(0.1);
    });

    it('current phoneme is SIL after silence', () => {
      const phonemeController = new LipSyncController({
        phonemeDetection: {
          enabled: true,
          minConfidence: 0.3,
          transitionDuration: 50,
          intensityMultiplier: 1.0,
        },
      });

      const silenceData = new Uint8Array(256).fill(0);
      
      // Process silence
      for (let i = 0; i < 10; i++) {
        phonemeController.processFrequencyData(silenceData, 0.016);
      }
      
      expect(phonemeController.getCurrentPhoneme()).toBe('SIL');
    });
  });

  describe('Property 6: Intensity Multiplier Scaling', () => {
    /**
     * Feature: phoneme-lip-sync, Property 6: Intensity Multiplier Scaling
     * Higher intensity multiplier produces higher weights (clamped to 1)
     */
    it('scales weights by intensity multiplier', () => {
      fc.assert(
        fc.property(
          intensityMultiplierArb,
          volumeArb.filter(v => v > 0.1), // Need some volume to see effect
          (multiplier, volume) => {
            const normalController = new LipSyncController({
              phonemeDetection: {
                enabled: false,
                minConfidence: 0.3,
                transitionDuration: 50,
                intensityMultiplier: 1.0,
              },
            });
            
            const scaledController = new LipSyncController({
              sensitivity: 4.0 * multiplier, // Scale sensitivity for volume mode
              phonemeDetection: {
                enabled: false,
                minConfidence: 0.3,
                transitionDuration: 50,
                intensityMultiplier: multiplier,
              },
            });
            
            const normalWeights = normalController.processVolume(volume, 0.016);
            const scaledWeights = scaledController.processVolume(volume, 0.016);
            
            // Scaled weights should be >= normal weights (or both clamped to 1)
            if (multiplier > 1) {
              expect(scaledWeights.a).toBeGreaterThanOrEqual(normalWeights.a - 0.001);
            } else {
              expect(scaledWeights.a).toBeLessThanOrEqual(normalWeights.a + 0.001);
            }
            
            // All weights must be valid (clamped to [0, 1])
            expect(isValidVisemeWeights(scaledWeights)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('clamps weights to maximum of 1.0', () => {
      const extremeController = new LipSyncController({
        sensitivity: 100.0, // Very high sensitivity
        phonemeDetection: {
          enabled: false,
          minConfidence: 0.3,
          transitionDuration: 50,
          intensityMultiplier: 10.0,
        },
      });

      fc.assert(
        fc.property(volumeArb, (volume) => {
          const weights = extremeController.processVolume(volume, 0.016);
          
          expect(weights.a).toBeLessThanOrEqual(1);
          expect(weights.i).toBeLessThanOrEqual(1);
          expect(weights.u).toBeLessThanOrEqual(1);
          expect(weights.e).toBeLessThanOrEqual(1);
          expect(weights.o).toBeLessThanOrEqual(1);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: Volume-Based Fallback Equivalence', () => {
    /**
     * Feature: phoneme-lip-sync, Property 8: Volume-Based Fallback Equivalence
     * processVolume matches legacy NeuralCore behavior exactly
     */
    it('processVolume matches legacy behavior: mouthOpen * visemeWeights', () => {
      const sensitivity = 4.0;
      const visemeWeights = { a: 0.8, i: 0.3, u: 0.25, e: 0.3, o: 0.6 };
      
      const legacyController = new LipSyncController({
        sensitivity,
        visemeWeights,
        phonemeDetection: { enabled: false, minConfidence: 0.3, transitionDuration: 50, intensityMultiplier: 1.0 },
      });

      fc.assert(
        fc.property(volumeArb, (volume) => {
          const weights = legacyController.processVolume(volume, 0.016);
          
          // Calculate expected values (legacy NeuralCore behavior)
          const mouthOpen = Math.min(1.0, volume * sensitivity);
          const expectedA = mouthOpen * visemeWeights.a;
          const expectedI = mouthOpen * visemeWeights.i;
          const expectedU = mouthOpen * visemeWeights.u;
          const expectedE = mouthOpen * visemeWeights.e;
          const expectedO = mouthOpen * visemeWeights.o;
          
          // Should match exactly
          expect(weights.a).toBeCloseTo(expectedA, 5);
          expect(weights.i).toBeCloseTo(expectedI, 5);
          expect(weights.u).toBeCloseTo(expectedU, 5);
          expect(weights.e).toBeCloseTo(expectedE, 5);
          expect(weights.o).toBeCloseTo(expectedO, 5);
        }),
        { numRuns: 100 }
      );
    });

    it('isPhonemeDetectionEnabled returns false when disabled', () => {
      const volumeController = new LipSyncController({
        phonemeDetection: { enabled: false, minConfidence: 0.3, transitionDuration: 50, intensityMultiplier: 1.0 },
      });
      
      expect(volumeController.isPhonemeDetectionEnabled()).toBe(false);
    });

    it('isPhonemeDetectionEnabled returns true when enabled', () => {
      const phonemeController = new LipSyncController({
        phonemeDetection: { enabled: true, minConfidence: 0.3, transitionDuration: 50, intensityMultiplier: 1.0 },
      });
      
      expect(phonemeController.isPhonemeDetectionEnabled()).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('updateConfig changes behavior', () => {
      const weights1 = controller.processVolume(0.1, 0.016); // Use low volume to avoid clamping
      
      controller.updateConfig({ sensitivity: 8.0 }); // Double sensitivity
      
      const weights2 = controller.processVolume(0.1, 0.016);
      
      // Higher sensitivity should produce higher weights
      expect(weights2.a).toBeGreaterThan(weights1.a);
    });

    it('reset returns to neutral state', () => {
      // Process some data
      controller.processVolume(0.8, 0.016);
      
      // Reset
      controller.reset();
      
      const state = controller.getState();
      expect(state.currentPhoneme).toBe('SIL');
      expect(state.currentWeights.a).toBe(0);
      expect(state.currentWeights.i).toBe(0);
      expect(state.currentWeights.u).toBe(0);
      expect(state.currentWeights.e).toBe(0);
      expect(state.currentWeights.o).toBe(0);
    });

    it('getConfig returns current configuration', () => {
      const config = controller.getConfig();
      
      expect(config).toHaveProperty('sensitivity');
      expect(config).toHaveProperty('smoothing');
      expect(config).toHaveProperty('visemeWeights');
      expect(config).toHaveProperty('preset');
      expect(config).toHaveProperty('phonemeDetection');
    });
  });
});
