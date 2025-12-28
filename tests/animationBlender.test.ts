// Animation Blender Tests
// Property 10: Animation blending produces intermediate values
// Validates: Requirements 6.1, 6.2, 6.3, 6.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  lerp,
  lerpRotation,
  blendBoneRotations,
  createBlendController,
  easingFunctions,
  getEasingFunction,
  clamp,
  createBoneState,
  createEmptyPose,
} from '../utils/animationBlender';
import type { BoneState } from '../types/enhancementTypes';

describe('animationBlender', () => {
  describe('lerp', () => {
    it('should return from value when t=0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          (from, to) => {
            expect(lerp(from, to, 0)).toBeCloseTo(from, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return to value when t=1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          (from, to) => {
            expect(lerp(from, to, 1)).toBeCloseTo(to, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return midpoint when t=0.5', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          (from, to) => {
            const mid = lerp(from, to, 0.5);
            expect(mid).toBeCloseTo((from + to) / 2, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('lerpRotation', () => {
    it('should interpolate all three axes', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (fx, fy, fz, tx, ty, tz, t) => {
            const from = { x: fx, y: fy, z: fz };
            const to = { x: tx, y: ty, z: tz };
            const result = lerpRotation(from, to, t);
            
            expect(result.x).toBeCloseTo(lerp(fx, tx, t), 5);
            expect(result.y).toBeCloseTo(lerp(fy, ty, t), 5);
            expect(result.z).toBeCloseTo(lerp(fz, tz, t), 5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('blendBoneRotations', () => {
    /**
     * Property 10: Animation blending produces intermediate values
     * For any two poses and blend factor t (0 < t < 1), blendBoneRotations
     * should produce values strictly between the start and end values.
     */
    it('should produce intermediate values for 0 < t < 1', () => {
      fc.assert(
        fc.property(
          // Generate two different rotation values
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }), // t strictly between 0 and 1
          (fromX, toX, t) => {
            // Ensure from and to are different enough to test
            if (Math.abs(fromX - toX) < 0.1) return true; // Skip if too close
            
            const from: Record<string, BoneState> = {
              testBone: { rotation: { x: fromX, y: 0, z: 0 } },
            };
            const to: Record<string, BoneState> = {
              testBone: { rotation: { x: toX, y: 0, z: 0 } },
            };
            
            const result = blendBoneRotations(from, to, t);
            const resultX = result.testBone.rotation.x;
            
            // Result should be strictly between from and to
            const minVal = Math.min(fromX, toX);
            const maxVal = Math.max(fromX, toX);
            
            expect(resultX).toBeGreaterThan(minVal - 0.001);
            expect(resultX).toBeLessThan(maxVal + 0.001);
            
            // Result should not equal either endpoint (for t strictly between 0 and 1)
            if (t > 0.01 && t < 0.99) {
              expect(Math.abs(resultX - fromX)).toBeGreaterThan(0.0001);
              expect(Math.abs(resultX - toX)).toBeGreaterThan(0.0001);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple bones', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (boneNames, t) => {
            // Filter out duplicates, invalid names, and reserved property names
            const reservedNames = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString'];
            const uniqueBones = [...new Set(boneNames.filter(n => n.trim().length > 0 && !reservedNames.includes(n)))];
            if (uniqueBones.length === 0) return true;
            
            const from: Record<string, BoneState> = {};
            const to: Record<string, BoneState> = {};
            
            uniqueBones.forEach((name, i) => {
              from[name] = { rotation: { x: i * 10, y: 0, z: 0 } };
              to[name] = { rotation: { x: i * 10 + 90, y: 0, z: 0 } };
            });
            
            const result = blendBoneRotations(from, to, t);
            
            // All bones should be present in result
            uniqueBones.forEach(name => {
              expect(result[name]).toBeDefined();
              expect(result[name].rotation).toBeDefined();
            });
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle bones only in from pose', () => {
      const from: Record<string, BoneState> = {
        onlyInFrom: { rotation: { x: 45, y: 0, z: 0 } },
      };
      const to: Record<string, BoneState> = {};
      
      const result = blendBoneRotations(from, to, 0.5);
      
      // Should blend from 45 to 0 (default)
      expect(result.onlyInFrom.rotation.x).toBeCloseTo(22.5, 5);
    });

    it('should handle bones only in to pose', () => {
      const from: Record<string, BoneState> = {};
      const to: Record<string, BoneState> = {
        onlyInTo: { rotation: { x: 90, y: 0, z: 0 } },
      };
      
      const result = blendBoneRotations(from, to, 0.5);
      
      // Should blend from 0 (default) to 90
      expect(result.onlyInTo.rotation.x).toBeCloseTo(45, 5);
    });
  });

  describe('easingFunctions', () => {
    it('should all return 0 when t=0', () => {
      for (const [name, fn] of Object.entries(easingFunctions)) {
        expect(fn(0)).toBeCloseTo(0, 5);
      }
    });

    it('should all return 1 when t=1', () => {
      for (const [name, fn] of Object.entries(easingFunctions)) {
        expect(fn(1)).toBeCloseTo(1, 5);
      }
    });

    it('should produce values between 0 and 1 for inputs between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          (t) => {
            for (const [name, fn] of Object.entries(easingFunctions)) {
              const result = fn(t);
              expect(result).toBeGreaterThanOrEqual(-0.001);
              expect(result).toBeLessThanOrEqual(1.001);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('easeIn should be slower at start (concave up)', () => {
      // At t=0.5, easeIn should be less than 0.5
      expect(easingFunctions.easeIn(0.5)).toBeLessThan(0.5);
    });

    it('easeOut should be faster at start (concave down)', () => {
      // At t=0.5, easeOut should be greater than 0.5
      expect(easingFunctions.easeOut(0.5)).toBeGreaterThan(0.5);
    });
  });

  describe('clamp', () => {
    it('should clamp values to range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          fc.float({ min: -100, max: 100, noNaN: true }),
          fc.float({ min: -100, max: 100, noNaN: true }),
          (value, a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const result = clamp(value, min, max);
            
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('createBlendController', () => {
    it('should progress from 0 to 1 over duration', () => {
      const from = { bone: createBoneState(0, 0, 0) };
      const to = { bone: createBoneState(90, 0, 0) };
      
      const controller = createBlendController(from, to, { duration: 1.0 });
      
      expect(controller.getProgress()).toBe(0);
      expect(controller.isComplete()).toBe(false);
      
      // Update halfway
      controller.update(0.5);
      expect(controller.getProgress()).toBeCloseTo(0.5, 5);
      expect(controller.isComplete()).toBe(false);
      
      // Update to completion
      controller.update(0.5);
      expect(controller.getProgress()).toBeCloseTo(1.0, 5);
      expect(controller.isComplete()).toBe(true);
    });

    it('should reset progress', () => {
      const from = { bone: createBoneState(0, 0, 0) };
      const to = { bone: createBoneState(90, 0, 0) };
      
      const controller = createBlendController(from, to, { duration: 1.0 });
      
      controller.update(1.0);
      expect(controller.isComplete()).toBe(true);
      
      controller.reset();
      expect(controller.getProgress()).toBe(0);
      expect(controller.isComplete()).toBe(false);
    });
  });

  describe('createEmptyPose', () => {
    it('should create pose with all zero rotations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
          (boneNames) => {
            const uniqueBones = [...new Set(boneNames.filter(n => n.trim().length > 0))];
            if (uniqueBones.length === 0) return true;
            
            const pose = createEmptyPose(uniqueBones);
            
            uniqueBones.forEach(name => {
              expect(pose[name]).toBeDefined();
              expect(pose[name].rotation.x).toBe(0);
              expect(pose[name].rotation.y).toBe(0);
              expect(pose[name].rotation.z).toBe(0);
            });
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
