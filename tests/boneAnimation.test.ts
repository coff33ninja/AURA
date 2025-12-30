/**
 * Property-based tests for boneAnimation utilities
 * 
 * Feature: neural-core-splitting, Property 4: Bone Rotation Interpolation
 * Validates: Requirements 4.6, 11.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  interpolatePose,
  getEasingFunction,
  degToRad,
  radToDeg,
  rotationFromDegrees,
  mergePoses,
  scalePose,
  type BonePose,
  type BoneRotation,
  type EasingType,
  ALL_BONE_NAMES,
  FINGER_BONE_NAMES,
  BODY_BONE_NAMES,
  GESTURE_BONE_NAMES,
} from '../components/neural-core/utils/boneAnimation';

// Arbitrary generators for property tests
const boneRotationArb = fc.record({
  x: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
  y: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
  z: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
});

const bonePoseArb = fc.dictionary(
  fc.constantFrom(...GESTURE_BONE_NAMES),
  boneRotationArb
);

const easingTypeArb = fc.constantFrom<EasingType>('linear', 'easeIn', 'easeOut', 'easeInOut');

describe('boneAnimation', () => {
  describe('Property 4: Bone Rotation Interpolation', () => {
    /**
     * Feature: neural-core-splitting, Property 4: Bone Rotation Interpolation
     * For any from-pose, to-pose, and progress value in [0, 1], interpolatePose 
     * SHALL return a pose where each bone rotation is linearly interpolated 
     * (or eased) between the from and to values.
     */

    it('interpolatePose at progress=0 should return from pose', () => {
      fc.assert(
        fc.property(
          bonePoseArb,
          bonePoseArb,
          (from, to) => {
            const result = interpolatePose(from, to, 0);
            
            // All bones from 'from' pose should match exactly
            for (const [boneName, rotation] of Object.entries(from)) {
              expect(result[boneName]).toBeDefined();
              expect(result[boneName].x).toBeCloseTo(rotation.x, 10);
              expect(result[boneName].y).toBeCloseTo(rotation.y, 10);
              expect(result[boneName].z).toBeCloseTo(rotation.z, 10);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('interpolatePose at progress=1 should return to pose', () => {
      fc.assert(
        fc.property(
          bonePoseArb,
          bonePoseArb,
          (from, to) => {
            const result = interpolatePose(from, to, 1);
            
            // All bones from 'to' pose should match exactly
            for (const [boneName, rotation] of Object.entries(to)) {
              expect(result[boneName]).toBeDefined();
              expect(result[boneName].x).toBeCloseTo(rotation.x, 10);
              expect(result[boneName].y).toBeCloseTo(rotation.y, 10);
              expect(result[boneName].z).toBeCloseTo(rotation.z, 10);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('interpolatePose should produce values between from and to for 0 < progress < 1', () => {
      fc.assert(
        fc.property(
          boneRotationArb,
          boneRotationArb,
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
          (fromRot, toRot, progress) => {
            const from: BonePose = { spine: fromRot };
            const to: BonePose = { spine: toRot };
            const result = interpolatePose(from, to, progress);
            
            // Result should be between from and to (or equal if they're the same)
            const checkBetween = (val: number, a: number, b: number) => {
              const min = Math.min(a, b);
              const max = Math.max(a, b);
              return val >= min - 0.0001 && val <= max + 0.0001;
            };
            
            expect(checkBetween(result.spine.x, fromRot.x, toRot.x)).toBe(true);
            expect(checkBetween(result.spine.y, fromRot.y, toRot.y)).toBe(true);
            expect(checkBetween(result.spine.z, fromRot.z, toRot.z)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('interpolatePose should clamp progress to [0, 1]', () => {
      const from: BonePose = { spine: { x: 0, y: 0, z: 0 } };
      const to: BonePose = { spine: { x: 1, y: 1, z: 1 } };
      
      // Progress < 0 should behave like 0
      const resultNegative = interpolatePose(from, to, -0.5);
      expect(resultNegative.spine.x).toBeCloseTo(0, 10);
      
      // Progress > 1 should behave like 1
      const resultOver = interpolatePose(from, to, 1.5);
      expect(resultOver.spine.x).toBeCloseTo(1, 10);
    });

    it('interpolatePose should handle missing bones in either pose', () => {
      const from: BonePose = { spine: { x: 0, y: 0, z: 0 } };
      const to: BonePose = { chest: { x: 1, y: 1, z: 1 } };
      
      const result = interpolatePose(from, to, 0.5);
      
      // Both bones should be in result
      expect(result.spine).toBeDefined();
      expect(result.chest).toBeDefined();
      
      // spine: from has it, to doesn't (defaults to 0)
      expect(result.spine.x).toBeCloseTo(0, 10);
      
      // chest: from doesn't have it (defaults to 0), to has it
      expect(result.chest.x).toBeCloseTo(0.5, 10);
    });

    it('interpolatePose with different easing types should produce valid results', () => {
      fc.assert(
        fc.property(
          boneRotationArb,
          boneRotationArb,
          fc.float({ min: 0, max: 1, noNaN: true }),
          easingTypeArb,
          (fromRot, toRot, progress, easing) => {
            const from: BonePose = { spine: fromRot };
            const to: BonePose = { spine: toRot };
            const result = interpolatePose(from, to, progress, easing);
            
            // Result should always be defined
            expect(result.spine).toBeDefined();
            expect(typeof result.spine.x).toBe('number');
            expect(typeof result.spine.y).toBe('number');
            expect(typeof result.spine.z).toBe('number');
            
            // Result should not be NaN
            expect(Number.isNaN(result.spine.x)).toBe(false);
            expect(Number.isNaN(result.spine.y)).toBe(false);
            expect(Number.isNaN(result.spine.z)).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getEasingFunction', () => {
    it('linear easing should return input unchanged', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          (t) => {
            const fn = getEasingFunction('linear');
            expect(fn(t)).toBeCloseTo(t, 10);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('all easing functions should return 0 at t=0 and 1 at t=1', () => {
      const easings: EasingType[] = ['linear', 'easeIn', 'easeOut', 'easeInOut'];
      
      for (const easing of easings) {
        const fn = getEasingFunction(easing);
        expect(fn(0)).toBeCloseTo(0, 10);
        expect(fn(1)).toBeCloseTo(1, 10);
      }
    });

    it('easeIn should be slower at start (below linear)', () => {
      const fn = getEasingFunction('easeIn');
      // At t=0.5, easeIn (t*t) = 0.25, which is less than linear (0.5)
      expect(fn(0.5)).toBeLessThan(0.5);
    });

    it('easeOut should be faster at start (above linear)', () => {
      const fn = getEasingFunction('easeOut');
      // At t=0.5, easeOut = t*(2-t) = 0.5*1.5 = 0.75, which is greater than linear (0.5)
      expect(fn(0.5)).toBeGreaterThan(0.5);
    });
  });

  describe('degToRad and radToDeg', () => {
    it('degToRad and radToDeg should be inverses', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -360, max: 360, noNaN: true }),
          (degrees) => {
            const radians = degToRad(degrees);
            const backToDegrees = radToDeg(radians);
            expect(backToDegrees).toBeCloseTo(degrees, 10);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('degToRad should convert known values correctly', () => {
      expect(degToRad(0)).toBeCloseTo(0, 10);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10);
      expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2, 10);
    });
  });

  describe('rotationFromDegrees', () => {
    it('should convert all components from degrees to radians', () => {
      const rotation = rotationFromDegrees(90, 180, 270);
      expect(rotation.x).toBeCloseTo(Math.PI / 2, 10);
      expect(rotation.y).toBeCloseTo(Math.PI, 10);
      expect(rotation.z).toBeCloseTo(Math.PI * 1.5, 10);
    });
  });

  describe('mergePoses', () => {
    it('overlay should take priority over base', () => {
      const base: BonePose = { 
        spine: { x: 1, y: 1, z: 1 },
        chest: { x: 2, y: 2, z: 2 },
      };
      const overlay: BonePose = { 
        spine: { x: 10, y: 10, z: 10 },
      };
      
      const result = mergePoses(base, overlay);
      
      // spine should be from overlay
      expect(result.spine.x).toBe(10);
      // chest should be from base
      expect(result.chest.x).toBe(2);
    });

    it('should include all bones from both poses', () => {
      fc.assert(
        fc.property(
          bonePoseArb,
          bonePoseArb,
          (base, overlay) => {
            const result = mergePoses(base, overlay);
            
            // All bones from base should be in result
            for (const boneName of Object.keys(base)) {
              expect(result[boneName]).toBeDefined();
            }
            
            // All bones from overlay should be in result
            for (const boneName of Object.keys(overlay)) {
              expect(result[boneName]).toBeDefined();
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('scalePose', () => {
    it('scaling by 1 should return same pose', () => {
      fc.assert(
        fc.property(
          bonePoseArb,
          (pose) => {
            const result = scalePose(pose, 1);
            
            for (const [boneName, rotation] of Object.entries(pose)) {
              expect(result[boneName].x).toBeCloseTo(rotation.x, 10);
              expect(result[boneName].y).toBeCloseTo(rotation.y, 10);
              expect(result[boneName].z).toBeCloseTo(rotation.z, 10);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('scaling by 0 should return zero rotations', () => {
      const pose: BonePose = { spine: { x: 1, y: 2, z: 3 } };
      const result = scalePose(pose, 0);
      
      expect(result.spine.x).toBe(0);
      expect(result.spine.y).toBe(0);
      expect(result.spine.z).toBe(0);
    });

    it('scaling by 2 should double all rotations', () => {
      const pose: BonePose = { spine: { x: 1, y: 2, z: 3 } };
      const result = scalePose(pose, 2);
      
      expect(result.spine.x).toBe(2);
      expect(result.spine.y).toBe(4);
      expect(result.spine.z).toBe(6);
    });
  });

  describe('Bone Name Constants', () => {
    it('ALL_BONE_NAMES should contain BODY_BONE_NAMES', () => {
      for (const boneName of BODY_BONE_NAMES) {
        expect(ALL_BONE_NAMES).toContain(boneName);
      }
    });

    it('ALL_BONE_NAMES should contain FINGER_BONE_NAMES', () => {
      for (const boneName of FINGER_BONE_NAMES) {
        expect(ALL_BONE_NAMES).toContain(boneName);
      }
    });

    it('GESTURE_BONE_NAMES should be subset of BODY_BONE_NAMES', () => {
      for (const boneName of GESTURE_BONE_NAMES) {
        expect(BODY_BONE_NAMES).toContain(boneName);
      }
    });

    it('FINGER_BONE_NAMES should not overlap with BODY_BONE_NAMES', () => {
      for (const boneName of FINGER_BONE_NAMES) {
        expect(BODY_BONE_NAMES).not.toContain(boneName);
      }
    });
  });
});
