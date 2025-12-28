// Property-based tests for walkingAnimator
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateWalkingBob,
  createWalkingState,
  smoothTransitionBob,
  calculateLegPhase,
  getLegRotations,
  getArmSwing,
  isValidWalkingState,
  DEFAULT_WALKING_CONFIG,
} from '../utils/walkingAnimator';
import type { WalkingConfig } from '../types/enhancementTypes';

describe('walkingAnimator', () => {
  describe('Property 13: Walking vertical bobbing', () => {
    it('should produce vertical offset that oscillates for non-zero speed', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(2.0), noNaN: true }), // walkSpeed
          fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),    // startTime
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }), // bobIntensity
          fc.float({ min: Math.fround(1), max: Math.fround(4), noNaN: true }),      // bobFrequency
          (walkSpeed, startTime, bobIntensity, bobFrequency) => {
            const config: WalkingConfig = { bobIntensity, bobFrequency };
            
            // Sample at multiple time points
            const samples = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(offset =>
              calculateWalkingBob(walkSpeed, startTime + offset, config)
            );
            
            // Check that values oscillate (not all the same)
            const offsets = samples.map(s => s.verticalOffset);
            const uniqueValues = new Set(offsets.map(v => v.toFixed(4)));
            
            // Should have multiple different values (oscillation)
            return uniqueValues.size >= 2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce amplitude proportional to speed', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }), // slowSpeed
          fc.float({ min: Math.fround(1.1), max: Math.fround(2.0), noNaN: true }), // fastSpeed
          fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),    // time
          (slowSpeed, fastSpeed, time) => {
            const config = DEFAULT_WALKING_CONFIG;
            
            // Get max offset over a cycle for each speed
            const slowSamples = Array.from({ length: 20 }, (_, i) =>
              calculateWalkingBob(slowSpeed, time + i * 0.05, config).verticalOffset
            );
            const fastSamples = Array.from({ length: 20 }, (_, i) =>
              calculateWalkingBob(fastSpeed, time + i * 0.05, config).verticalOffset
            );
            
            const slowMax = Math.max(...slowSamples);
            const fastMax = Math.max(...fastSamples);
            
            // Faster speed should produce equal or larger amplitude
            return fastMax >= slowMax - 0.001; // Small tolerance
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce zero offset when speed is zero', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          (time) => {
            const state = calculateWalkingBob(0, time, DEFAULT_WALKING_CONFIG);
            return state.verticalOffset === 0;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce valid walking state for any input', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.5), noNaN: true }),
          fc.float({ min: Math.fround(0.5), max: Math.fround(10), noNaN: true }),
          (speed, time, intensity, frequency) => {
            const config: WalkingConfig = {
              bobIntensity: intensity,
              bobFrequency: frequency,
            };
            
            const state = calculateWalkingBob(speed, time, config);
            return isValidWalkingState(state);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('smoothTransitionBob', () => {
    it('should smoothly transition between values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true }),
          (current, target, deltaTime, smoothing) => {
            const result = smoothTransitionBob(current, target, deltaTime, smoothing);
            
            // Result should be between current and target (or equal to one)
            const min = Math.min(current, target);
            const max = Math.max(current, target);
            
            return result >= min - 0.0001 && result <= max + 0.0001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should converge to target over time', () => {
      const current = 0;
      const target = 0.05;
      const deltaTime = 0.016; // ~60fps
      const smoothing = 5.0;
      
      let value = current;
      for (let i = 0; i < 100; i++) {
        value = smoothTransitionBob(value, target, deltaTime, smoothing);
      }
      
      // Should be very close to target after many iterations
      expect(Math.abs(value - target)).toBeLessThan(0.001);
    });
  });

  describe('createWalkingState', () => {
    it('should create initial state with zero values', () => {
      const state = createWalkingState();
      
      expect(state.verticalOffset).toBe(0);
      expect(state.phase).toBe(0);
    });
  });

  describe('calculateLegPhase', () => {
    it('should return 0 when speed is 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          (time) => {
            return calculateLegPhase(0, time) === 0;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce phase in valid range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          (speed, time) => {
            const phase = calculateLegPhase(speed, time);
            return phase >= 0 && phase <= Math.PI * 2 + 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getLegRotations', () => {
    it('should produce opposite rotations for left and right legs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
          (phase, amplitude) => {
            const rotations = getLegRotations(phase, amplitude);
            
            // At most phases, legs should have opposite signs
            // (except at 0, π, 2π where one is near zero)
            const sum = rotations.leftLeg + rotations.rightLeg;
            
            // Sum should be close to zero (opposite rotations)
            return Math.abs(sum) < amplitude * 0.1 + 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect amplitude bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(2.0), noNaN: true }),
          (phase, amplitude) => {
            const rotations = getLegRotations(phase, amplitude);
            
            return (
              Math.abs(rotations.leftLeg) <= amplitude + 0.001 &&
              Math.abs(rotations.rightLeg) <= amplitude + 0.001
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getArmSwing', () => {
    it('should produce arm swing within amplitude bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
          (phase, amplitude) => {
            const arms = getArmSwing(phase, amplitude);
            
            // Arms should be within amplitude bounds
            return (
              Math.abs(arms.leftArm) <= amplitude + 0.001 &&
              Math.abs(arms.rightArm) <= amplitude + 0.001
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce opposite arm rotations', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
          (phase) => {
            const arms = getArmSwing(phase, 0.3);
            
            // Arms should have opposite signs (or near zero)
            const sum = arms.leftArm + arms.rightArm;
            return Math.abs(sum) < 0.1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidWalkingState', () => {
    it('should return true for valid states', () => {
      const validState = {
        verticalOffset: 0.02,
        phase: Math.PI,
      };
      
      expect(isValidWalkingState(validState)).toBe(true);
    });

    it('should return false for NaN values', () => {
      const invalidState = {
        verticalOffset: NaN,
        phase: 0,
      };
      
      expect(isValidWalkingState(invalidState)).toBe(false);
    });

    it('should return false for negative phase', () => {
      const invalidState = {
        verticalOffset: 0,
        phase: -1,
      };
      
      expect(isValidWalkingState(invalidState)).toBe(false);
    });
  });
});
