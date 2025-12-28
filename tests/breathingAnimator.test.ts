// Property-based tests for breathingAnimator
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBreathingState,
  createBreathingState,
  getStateMultiplier,
  blendWithExisting,
  isValidBreathingState,
  DEFAULT_BREATHING_CONFIG,
} from '../utils/breathingAnimator';
import type { BreathingConfig } from '../types/enhancementTypes';

describe('breathingAnimator', () => {
  describe('Property 12: Breathing affects spine/chest bones', () => {
    it('should produce non-zero rotations when enabled with positive intensity', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),  // time
          fc.float({ min: Math.fround(0.1), max: Math.fround(2.0), noNaN: true }),  // speed
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }), // intensity
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),  // spineWeight
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),  // chestWeight
          (time, speed, intensity, spineWeight, chestWeight) => {
            const config: BreathingConfig = {
              enabled: true,
              speed,
              intensity,
              spineWeight,
              chestWeight,
            };
            
            const state = calculateBreathingState(time, config, 1.0);
            
            // At least one rotation component should be non-zero
            // (unless we're exactly at phase 0 or π where sin = 0)
            const hasSpineRotation = 
              state.spineRotation.x !== 0 || 
              state.spineRotation.y !== 0 || 
              state.spineRotation.z !== 0;
            const hasChestRotation = 
              state.chestRotation.x !== 0 || 
              state.chestRotation.y !== 0 || 
              state.chestRotation.z !== 0;
            
            // Check that rotations oscillate (not always zero)
            // We check multiple time points to ensure oscillation
            const state2 = calculateBreathingState(time + 0.5 / speed, config, 1.0);
            const hasOscillation = 
              state.spineRotation.x !== state2.spineRotation.x ||
              state.chestRotation.x !== state2.chestRotation.x;
            
            return hasSpineRotation || hasChestRotation || hasOscillation;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce zero rotations when disabled', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          (time) => {
            const config: BreathingConfig = {
              enabled: false,
              speed: 0.8,
              intensity: 0.02,
              spineWeight: 0.6,
              chestWeight: 1.0,
            };
            
            const state = calculateBreathingState(time, config, 1.0);
            
            return (
              state.spineRotation.x === 0 &&
              state.spineRotation.y === 0 &&
              state.spineRotation.z === 0 &&
              state.chestRotation.x === 0 &&
              state.chestRotation.y === 0 &&
              state.chestRotation.z === 0
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reduce intensity when stateMultiplier < 1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
          (time, multiplier) => {
            const config = DEFAULT_BREATHING_CONFIG;
            
            const fullState = calculateBreathingState(time, config, 1.0);
            const reducedState = calculateBreathingState(time, config, multiplier);
            
            // Reduced state should have smaller magnitude rotations
            const fullMagnitude = Math.abs(fullState.spineRotation.x) + Math.abs(fullState.chestRotation.x);
            const reducedMagnitude = Math.abs(reducedState.spineRotation.x) + Math.abs(reducedState.chestRotation.x);
            
            // Allow for floating point tolerance
            return reducedMagnitude <= fullMagnitude + 0.0001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should oscillate over time', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),
          (startTime) => {
            const config = DEFAULT_BREATHING_CONFIG;
            
            // Sample at multiple time points over one breathing cycle
            const period = 1 / config.speed;
            const samples = [0, 0.25, 0.5, 0.75].map(fraction => 
              calculateBreathingState(startTime + fraction * period, config, 1.0)
            );
            
            // Check that values change over the cycle
            const spineXValues = samples.map(s => s.spineRotation.x);
            const uniqueValues = new Set(spineXValues.map(v => v.toFixed(6)));
            
            // Should have at least 2 different values (oscillation)
            return uniqueValues.size >= 2;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce valid breathing state for any input', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          (time, speed, intensity, spineWeight, chestWeight, multiplier) => {
            const config: BreathingConfig = {
              enabled: true,
              speed,
              intensity,
              spineWeight,
              chestWeight,
            };
            
            const state = calculateBreathingState(time, config, multiplier);
            
            return isValidBreathingState(state);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('createBreathingState', () => {
    it('should create initial state with zero rotations', () => {
      const state = createBreathingState();
      
      expect(state.phase).toBe(0);
      expect(state.spineRotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.chestRotation).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('getStateMultiplier', () => {
    it('should return 1.0 for idle state', () => {
      expect(getStateMultiplier('idle')).toBe(1.0);
    });

    it('should return reduced value for talking state', () => {
      const multiplier = getStateMultiplier('talking');
      expect(multiplier).toBeLessThan(1.0);
      expect(multiplier).toBeGreaterThan(0);
    });

    it('should return values between 0 and 1 for all states', () => {
      const states: Array<'idle' | 'talking' | 'listening' | 'thinking'> = 
        ['idle', 'talking', 'listening', 'thinking'];
      
      for (const state of states) {
        const multiplier = getStateMultiplier(state);
        expect(multiplier).toBeGreaterThanOrEqual(0);
        expect(multiplier).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('blendWithExisting', () => {
    it('should add breathing rotation to existing rotation', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
          (ex, ey, ez, bx, by, bz) => {
            const existing = { x: ex, y: ey, z: ez };
            const breathing = { x: bx, y: by, z: bz };
            
            const result = blendWithExisting(existing, breathing, 1.0);
            
            // With blend factor 1.0, result should be sum
            const tolerance = 0.0001;
            return (
              Math.abs(result.x - (ex + bx)) < tolerance &&
              Math.abs(result.y - (ey + by)) < tolerance &&
              Math.abs(result.z - (ez + bz)) < tolerance
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect blend factor', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (blendFactor) => {
            const existing = { x: 0, y: 0, z: 0 };
            const breathing = { x: 0.1, y: 0.05, z: 0.02 };
            
            const result = blendWithExisting(existing, breathing, blendFactor);
            
            const tolerance = 0.0001;
            return (
              Math.abs(result.x - breathing.x * blendFactor) < tolerance &&
              Math.abs(result.y - breathing.y * blendFactor) < tolerance &&
              Math.abs(result.z - breathing.z * blendFactor) < tolerance
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clamp blend factor to 0-1 range', () => {
      const existing = { x: 0, y: 0, z: 0 };
      const breathing = { x: 0.1, y: 0.1, z: 0.1 };
      
      // Blend factor > 1 should be clamped to 1
      const resultHigh = blendWithExisting(existing, breathing, 2.0);
      expect(resultHigh.x).toBeCloseTo(0.1);
      
      // Blend factor < 0 should be clamped to 0
      const resultLow = blendWithExisting(existing, breathing, -1.0);
      expect(resultLow.x).toBeCloseTo(0);
    });
  });

  describe('isValidBreathingState', () => {
    it('should return true for valid states', () => {
      const validState = {
        phase: Math.PI,
        spineRotation: { x: 0.01, y: 0, z: 0 },
        chestRotation: { x: 0.02, y: 0, z: 0.001 },
      };
      
      expect(isValidBreathingState(validState)).toBe(true);
    });

    it('should return false for NaN values', () => {
      const invalidState = {
        phase: NaN,
        spineRotation: { x: 0, y: 0, z: 0 },
        chestRotation: { x: 0, y: 0, z: 0 },
      };
      
      expect(isValidBreathingState(invalidState)).toBe(false);
    });

    it('should return false for phase outside valid range', () => {
      const invalidState = {
        phase: -1,
        spineRotation: { x: 0, y: 0, z: 0 },
        chestRotation: { x: 0, y: 0, z: 0 },
      };
      
      expect(isValidBreathingState(invalidState)).toBe(false);
    });
  });
});
