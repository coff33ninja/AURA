// Tests for useReactionSystem hook
// Feature: neural-core-splitting

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  degToRad,
  calculateCumulativeDelay,
  getIdleGestureForPosture,
  FINGER_BONE_NAMES,
} from '../components/neural-core/hooks/useReactionSystem';
import type { ReactionStep } from '../types/behaviorTypes';

// ============================================================================
// Property 8: Reaction Step Execution Order
// For any reaction with multiple steps, executeReactionStepsChain SHALL
// execute steps in order, respecting delay and duration values, with
// cumulative timing.
// Validates: Requirements 9.4, 9.6
// ============================================================================

describe('Feature: neural-core-splitting, Property 8: Reaction Step Execution Order', () => {
  describe('calculateCumulativeDelay', () => {
    it('should return 0 for first step with no delay', () => {
      const steps: ReactionStep[] = [
        { type: 'expression', name: 'step1', delay: 0, duration: 1 },
      ];
      expect(calculateCumulativeDelay(steps, 0)).toBe(0);
    });

    it('should include delay for first step', () => {
      const steps: ReactionStep[] = [
        { type: 'expression', name: 'step1', delay: 0.5, duration: 1 },
      ];
      expect(calculateCumulativeDelay(steps, 0)).toBe(500);
    });

    it('should accumulate delays and durations for subsequent steps', () => {
      const steps: ReactionStep[] = [
        { type: 'expression', name: 'step1', delay: 0.5, duration: 1 },
        { type: 'gesture', name: 'step2', delay: 0.2, duration: 0.5 },
      ];
      // Step 2: delay1 (500) + duration1 (1000) + delay2 (200) = 1700
      expect(calculateCumulativeDelay(steps, 1)).toBe(1700);
    });

    it('should handle three steps correctly', () => {
      const steps: ReactionStep[] = [
        { type: 'expression', name: 'step1', delay: 0.1, duration: 0.5 },
        { type: 'gesture', name: 'step2', delay: 0.2, duration: 0.3 },
        { type: 'body', name: 'step3', delay: 0.1, duration: 0.4 },
      ];
      // Step 3: delay1 (100) + duration1 (500) + delay2 (200) + duration2 (300) + delay3 (100) = 1200
      expect(calculateCumulativeDelay(steps, 2)).toBe(1200);
    });

    // Property test: Cumulative delay should always be non-negative
    it('should always produce non-negative delay', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('expression', 'gesture', 'body', 'hands', 'facial'),
              name: fc.string(),
              delay: fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
              duration: fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (steps) => {
            for (let i = 0; i < steps.length; i++) {
              const delay = calculateCumulativeDelay(steps as ReactionStep[], i);
              if (delay < 0) return false;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Later steps should have >= delay than earlier steps
    it('should have monotonically increasing delays', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('expression', 'gesture', 'body', 'hands', 'facial'),
              name: fc.string(),
              delay: fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
              duration: fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (steps) => {
            let prevDelay = 0;
            for (let i = 0; i < steps.length; i++) {
              const delay = calculateCumulativeDelay(steps as ReactionStep[], i);
              if (delay < prevDelay) return false;
              prevDelay = delay;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Feature: neural-core-splitting, Reaction System Utilities', () => {
  describe('degToRad', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(degToRad(0)).toBe(0);
    });

    it('should convert 180 degrees to PI radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
    });

    it('should convert 90 degrees to PI/2 radians', () => {
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should convert 360 degrees to 2*PI radians', () => {
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2, 10);
    });

    it('should handle negative degrees', () => {
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2, 10);
    });

    // Property test: degToRad should be linear
    it('should be linear (degToRad(a + b) = degToRad(a) + degToRad(b))', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-360), max: Math.fround(360), noNaN: true }),
          fc.float({ min: Math.fround(-360), max: Math.fround(360), noNaN: true }),
          (a, b) => {
            const sum = degToRad(a + b);
            const parts = degToRad(a) + degToRad(b);
            return Math.abs(sum - parts) < 1e-10;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: degToRad should produce finite values
    it('should always produce finite values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          (deg) => {
            return Number.isFinite(degToRad(deg));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getIdleGestureForPosture', () => {
    it('should return head_tilt for thoughtful posture', () => {
      expect(getIdleGestureForPosture('thoughtful')).toBe('head_tilt');
    });

    it('should return head_tilt for anxious posture', () => {
      expect(getIdleGestureForPosture('anxious')).toBe('head_tilt');
    });

    it('should return sway for other postures', () => {
      expect(getIdleGestureForPosture('neutral')).toBe('sway');
      expect(getIdleGestureForPosture('confident')).toBe('sway');
      expect(getIdleGestureForPosture('relaxed')).toBe('sway');
    });

    // Property test: Should always return a valid gesture name
    it('should always return a non-empty string', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (posture) => {
            const gesture = getIdleGestureForPosture(posture);
            return typeof gesture === 'string' && gesture.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Finger Bone Names Tests
// ============================================================================

describe('Feature: neural-core-splitting, Finger Bone Names', () => {
  describe('FINGER_BONE_NAMES', () => {
    it('should contain all left hand finger bones', () => {
      const leftBones = FINGER_BONE_NAMES.filter(name => name.startsWith('left'));
      expect(leftBones.length).toBe(14); // 5 fingers * 2-3 bones each
    });

    it('should contain all right hand finger bones', () => {
      const rightBones = FINGER_BONE_NAMES.filter(name => name.startsWith('right'));
      expect(rightBones.length).toBe(14);
    });

    it('should have 28 total finger bones', () => {
      expect(FINGER_BONE_NAMES.length).toBe(28);
    });

    it('should include thumb bones', () => {
      expect(FINGER_BONE_NAMES).toContain('leftThumbProximal');
      expect(FINGER_BONE_NAMES).toContain('leftThumbDistal');
      expect(FINGER_BONE_NAMES).toContain('rightThumbProximal');
      expect(FINGER_BONE_NAMES).toContain('rightThumbDistal');
    });

    it('should include index finger bones', () => {
      expect(FINGER_BONE_NAMES).toContain('leftIndexProximal');
      expect(FINGER_BONE_NAMES).toContain('leftIndexIntermediate');
      expect(FINGER_BONE_NAMES).toContain('leftIndexDistal');
    });
  });
});

// ============================================================================
// Reaction Step Type Tests
// ============================================================================

describe('Feature: neural-core-splitting, Reaction Step Types', () => {
  it('should support body step type', () => {
    const step: ReactionStep = {
      type: 'body',
      name: 'raise arms',
      delay: 0,
      duration: 1,
      bodyConfig: {
        leftUpperArm: { x: 45, y: 0, z: 0 },
      },
    };
    expect(step.type).toBe('body');
    expect(step.bodyConfig).toBeDefined();
  });

  it('should support hands step type', () => {
    const step: ReactionStep = {
      type: 'hands',
      name: 'open hands',
      delay: 0,
      duration: 1,
      handsConfig: {},
    };
    expect(step.type).toBe('hands');
  });

  it('should support facial step type', () => {
    const step: ReactionStep = {
      type: 'facial',
      name: 'smile',
      delay: 0,
      duration: 1,
      facialConfig: {
        expressions: { happy: 0.8 },
      },
    };
    expect(step.type).toBe('facial');
    expect(step.facialConfig?.expressions).toBeDefined();
  });

  it('should support gesture step type', () => {
    const step: ReactionStep = {
      type: 'gesture',
      name: 'wave',
      delay: 0,
      duration: 1.5,
      gestureName: 'wave',
    };
    expect(step.type).toBe('gesture');
    expect(step.gestureName).toBe('wave');
  });

  it('should support expression step type', () => {
    const step: ReactionStep = {
      type: 'expression',
      name: 'joy',
      delay: 0,
      duration: 1,
      expressionName: 'happy',
      expressionValue: 0.9,
    };
    expect(step.type).toBe('expression');
    expect(step.expressionName).toBe('happy');
    expect(step.expressionValue).toBe(0.9);
  });
});
