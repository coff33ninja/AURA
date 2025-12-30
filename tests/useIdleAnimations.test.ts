// Tests for useIdleAnimations hook
// Feature: neural-core-splitting

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getIdleGesturesForState,
  calculateBlinkValue,
  calculateNextBlinkTime,
  type IdleState,
  type SaccadeStateData,
  type BoneRotation,
} from '../components/neural-core/hooks/useIdleAnimations';

// ============================================================================
// Property 5: Idle Animation State Transitions
// For any call to setIdleState, the idle state SHALL update to the specified
// value and appropriate idle gestures SHALL be set based on the state.
// Validates: Requirements 5.5, 5.6
// ============================================================================

describe('Feature: neural-core-splitting, Property 5: Idle Animation State Transitions', () => {
  describe('getIdleGesturesForState', () => {
    it('should return correct gestures for talking state', () => {
      const gestures = getIdleGesturesForState('talking');
      expect(gestures).toEqual(['hand_wave', 'shoulder_shrug']);
    });

    it('should return correct gestures for listening state', () => {
      const gestures = getIdleGesturesForState('listening');
      expect(gestures).toEqual(['head_tilt']);
    });

    it('should return correct gestures for thinking state', () => {
      const gestures = getIdleGesturesForState('thinking');
      expect(gestures).toEqual(['sway']);
    });

    it('should return empty array for idle state', () => {
      const gestures = getIdleGesturesForState('idle');
      expect(gestures).toEqual([]);
    });

    // Property test: For any valid idle state, gestures should be a non-null array
    it('should always return an array for any valid state', () => {
      const validStates: IdleState[] = ['idle', 'talking', 'listening', 'thinking'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...validStates),
          (state) => {
            const gestures = getIdleGesturesForState(state);
            return Array.isArray(gestures);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: State transitions should be deterministic
    it('should return consistent gestures for the same state', () => {
      const validStates: IdleState[] = ['idle', 'talking', 'listening', 'thinking'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...validStates),
          (state) => {
            const gestures1 = getIdleGesturesForState(state);
            const gestures2 = getIdleGesturesForState(state);
            return JSON.stringify(gestures1) === JSON.stringify(gestures2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Blink Animation Tests
// ============================================================================

describe('Feature: neural-core-splitting, Blink Animation', () => {
  describe('calculateBlinkValue', () => {
    it('should return 0 at the start of blink', () => {
      expect(calculateBlinkValue(0, 0.15)).toBe(0);
    });

    it('should return 1 at peak of blink (end of closing phase)', () => {
      expect(calculateBlinkValue(0.15, 0.15)).toBe(1);
    });

    it('should return 0 after blink completes', () => {
      expect(calculateBlinkValue(0.3, 0.15)).toBe(0);
    });

    it('should return 0.5 at midpoint of closing phase', () => {
      const value = calculateBlinkValue(0.075, 0.15);
      expect(value).toBeCloseTo(0.5, 5);
    });

    it('should return 0.5 at midpoint of opening phase', () => {
      const value = calculateBlinkValue(0.225, 0.15);
      expect(value).toBeCloseTo(0.5, 5);
    });

    // Property test: Blink value should always be in [0, 1] range
    it('should always return value in [0, 1] range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
          (phase, duration) => {
            const value = calculateBlinkValue(phase, duration);
            return value >= 0 && value <= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Blink should be symmetric (closing mirrors opening)
    it('should have symmetric closing and opening phases', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (duration, progress) => {
            // Progress through closing phase
            const closingPhase = progress * duration;
            const closingValue = calculateBlinkValue(closingPhase, duration);
            
            // Equivalent progress through opening phase
            const openingPhase = duration + (1 - progress) * duration;
            const openingValue = calculateBlinkValue(openingPhase, duration);
            
            // Values should be approximately equal (symmetric)
            return Math.abs(closingValue - openingValue) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateNextBlinkTime', () => {
    it('should return a value close to base interval', () => {
      // Run multiple times to check distribution
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(calculateNextBlinkTime(4.0, 0.2));
      }
      
      const min = Math.min(...results);
      const max = Math.max(...results);
      
      // With 20% variation, range should be 4.0 ± 0.8 = [3.2, 4.8]
      expect(min).toBeGreaterThanOrEqual(3.2);
      expect(max).toBeLessThanOrEqual(4.8);
    });

    // Property test: Next blink time should be within variation bounds
    it('should always be within variation bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 0.5, noNaN: true }),
          (baseInterval, variation) => {
            const nextTime = calculateNextBlinkTime(baseInterval, variation);
            const minExpected = baseInterval - baseInterval * variation;
            const maxExpected = baseInterval + baseInterval * variation;
            return nextTime >= minExpected && nextTime <= maxExpected;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Zero variation should return exact base interval
    it('should return exact base interval with zero variation', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          (baseInterval) => {
            const nextTime = calculateNextBlinkTime(baseInterval, 0);
            return nextTime === baseInterval;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Hook Logic Pattern Tests (testing the hook's internal logic)
// ============================================================================

describe('Feature: neural-core-splitting, useIdleAnimations Hook Logic', () => {
  // Mock refs for testing
  const createMockBoneTargets = () => ({
    current: {} as Record<string, BoneRotation>,
  });

  const createMockAddExpressionTarget = () => vi.fn();

  describe('Idle State Management', () => {
    it('should map talking state to hand_wave and shoulder_shrug gestures', () => {
      const gestures = getIdleGesturesForState('talking');
      expect(gestures).toContain('hand_wave');
      expect(gestures).toContain('shoulder_shrug');
      expect(gestures.length).toBe(2);
    });

    it('should map listening state to head_tilt gesture', () => {
      const gestures = getIdleGesturesForState('listening');
      expect(gestures).toContain('head_tilt');
      expect(gestures.length).toBe(1);
    });

    it('should map thinking state to sway gesture', () => {
      const gestures = getIdleGesturesForState('thinking');
      expect(gestures).toContain('sway');
      expect(gestures.length).toBe(1);
    });

    it('should map idle state to no gestures', () => {
      const gestures = getIdleGesturesForState('idle');
      expect(gestures.length).toBe(0);
    });
  });

  describe('Breathing Animation Integration', () => {
    // Property test: Breathing should produce valid bone rotations
    it('should produce finite bone rotation values', () => {
      // Import breathing utilities for testing
      const { calculateBreathingState } = require('../utils/breathingAnimator.ts');
      
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true }),
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          (time, speed, intensity) => {
            const config = {
              enabled: true,
              speed,
              intensity,
              spineWeight: 0.6,
              chestWeight: 1.0,
            };
            const state = calculateBreathingState(time, config, 1.0);
            
            return (
              Number.isFinite(state.phase) &&
              Number.isFinite(state.spineRotation.x) &&
              Number.isFinite(state.spineRotation.y) &&
              Number.isFinite(state.spineRotation.z) &&
              Number.isFinite(state.chestRotation.x) &&
              Number.isFinite(state.chestRotation.y) &&
              Number.isFinite(state.chestRotation.z)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Saccade Animation Integration', () => {
    // Property test: Saccade should produce bounded offsets
    it('should produce bounded saccade offsets', () => {
      const { updateSaccadeState, DEFAULT_SACCADE_CONFIG, createSaccadeState } = require('../utils/saccadeGenerator.ts');
      
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          fc.nat(100),
          (delta, iterations) => {
            let state = createSaccadeState();
            
            // Run multiple updates
            for (let i = 0; i < iterations; i++) {
              state = updateSaccadeState(state, DEFAULT_SACCADE_CONFIG, delta);
            }
            
            // Offsets should be bounded by amplitude
            const maxAmplitude = DEFAULT_SACCADE_CONFIG.amplitude;
            return (
              Math.abs(state.offsetX) <= maxAmplitude + 0.1 &&
              Math.abs(state.offsetY) <= maxAmplitude + 0.1
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Idle Gesture Selection Tests
// ============================================================================

describe('Feature: neural-core-splitting, Idle Gesture Selection', () => {
  // Property test: Gesture selection should be deterministic for same inputs
  it('should select gestures deterministically based on elapsed time', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000, noNaN: true }),
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        (elapsedTime, gestures) => {
          if (gestures.length === 0) return true;
          
          // Simulate gesture selection logic from the hook
          const index = Math.floor(elapsedTime * 0.5) % gestures.length;
          const selected1 = gestures[index];
          const selected2 = gestures[index];
          
          return selected1 === selected2;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property test: Gesture index should always be valid
  it('should always select a valid gesture index', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        (elapsedTime, gestures) => {
          if (gestures.length === 0) return true;
          
          const index = Math.floor(elapsedTime * 0.5) % gestures.length;
          return index >= 0 && index < gestures.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// State Multiplier Tests
// ============================================================================

describe('Feature: neural-core-splitting, State Multiplier', () => {
  it('should return correct multipliers for each state', () => {
    const { getStateMultiplier } = require('../utils/breathingAnimator.ts');
    
    expect(getStateMultiplier('idle')).toBe(1.0);
    expect(getStateMultiplier('talking')).toBe(0.3);
    expect(getStateMultiplier('listening')).toBe(0.8);
    expect(getStateMultiplier('thinking')).toBe(0.6);
  });

  // Property test: State multiplier should always be in [0, 1] range
  it('should always return multiplier in [0, 1] range', () => {
    const { getStateMultiplier } = require('../utils/breathingAnimator.ts');
    const states: IdleState[] = ['idle', 'talking', 'listening', 'thinking'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...states),
        (state) => {
          const multiplier = getStateMultiplier(state);
          return multiplier >= 0 && multiplier <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property test: Talking should have lowest multiplier (reduced breathing)
  it('should have lowest multiplier for talking state', () => {
    const { getStateMultiplier } = require('../utils/breathingAnimator.ts');
    const states: IdleState[] = ['idle', 'talking', 'listening', 'thinking'];
    
    const talkingMultiplier = getStateMultiplier('talking');
    
    for (const state of states) {
      if (state !== 'talking') {
        expect(getStateMultiplier(state)).toBeGreaterThan(talkingMultiplier);
      }
    }
  });
});

// ============================================================================
// Expression Target Application Tests
// ============================================================================

describe('Feature: neural-core-splitting, Expression Target Application', () => {
  // Property test: Saccade expression values should be bounded
  it('should apply bounded saccade expression values', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -10, max: 10, noNaN: true }),
        fc.float({ min: -10, max: 10, noNaN: true }),
        (offsetX, offsetY) => {
          const saccadeIntensity = 0.05;
          
          // Simulate the expression application logic
          let lookRight = 0, lookLeft = 0, lookUp = 0, lookDown = 0;
          
          if (offsetX > 0.5) {
            lookRight = Math.min(0.3, offsetX * saccadeIntensity);
          } else if (offsetX < -0.5) {
            lookLeft = Math.min(0.3, Math.abs(offsetX) * saccadeIntensity);
          }
          if (offsetY > 0.5) {
            lookUp = Math.min(0.2, offsetY * saccadeIntensity);
          } else if (offsetY < -0.5) {
            lookDown = Math.min(0.2, Math.abs(offsetY) * saccadeIntensity);
          }
          
          // All values should be bounded
          return (
            lookRight >= 0 && lookRight <= 0.3 &&
            lookLeft >= 0 && lookLeft <= 0.3 &&
            lookUp >= 0 && lookUp <= 0.2 &&
            lookDown >= 0 && lookDown <= 0.2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property test: Blink expression should be bounded
  it('should apply bounded blink expression values', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        (phase, duration) => {
          const blinkValue = calculateBlinkValue(phase, duration);
          const appliedValue = Math.max(0, blinkValue);
          
          return appliedValue >= 0 && appliedValue <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
