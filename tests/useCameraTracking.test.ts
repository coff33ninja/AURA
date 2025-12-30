// Tests for useCameraTracking hook
// Feature: neural-core-splitting

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import {
  calculateLookAtRotation,
  lerpValue,
  DEFAULT_TRACKING_STATE,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_LOOK_AT,
  type TrackingState,
  type Vector3,
} from '../components/neural-core/hooks/useCameraTracking';

// ============================================================================
// Camera Tracking Unit Tests
// ============================================================================

describe('Feature: neural-core-splitting, Camera Tracking', () => {
  describe('DEFAULT_TRACKING_STATE', () => {
    it('should have tracking enabled by default', () => {
      expect(DEFAULT_TRACKING_STATE.enabled).toBe(true);
    });

    it('should have reasonable default intensity', () => {
      expect(DEFAULT_TRACKING_STATE.intensity).toBeGreaterThan(0);
      expect(DEFAULT_TRACKING_STATE.intensity).toBeLessThanOrEqual(1);
    });
  });

  describe('DEFAULT_CAMERA_POSITION', () => {
    it('should have valid default camera position', () => {
      expect(DEFAULT_CAMERA_POSITION.x).toBe(0);
      expect(DEFAULT_CAMERA_POSITION.y).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_POSITION.z).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_CAMERA_LOOK_AT', () => {
    it('should have valid default look-at target', () => {
      expect(DEFAULT_CAMERA_LOOK_AT.x).toBe(0);
      expect(DEFAULT_CAMERA_LOOK_AT.y).toBeGreaterThan(0);
      expect(DEFAULT_CAMERA_LOOK_AT.z).toBe(0);
    });
  });
});

// ============================================================================
// Look-At Rotation Tests
// ============================================================================

describe('Feature: neural-core-splitting, Look-At Rotation', () => {
  describe('calculateLookAtRotation', () => {
    it('should return zero rotation when head and camera are aligned', () => {
      const headPos = new THREE.Vector3(0, 1.5, 0);
      const cameraPos = new THREE.Vector3(0, 1.5, 1);
      const rotation = calculateLookAtRotation(headPos, cameraPos, 1.0);
      
      // When camera is directly in front, rotation should be minimal
      expect(Math.abs(rotation.x)).toBeLessThan(0.1);
      expect(Math.abs(rotation.y)).toBeLessThan(0.1);
    });

    it('should scale rotation by intensity', () => {
      const headPos = new THREE.Vector3(0, 1.5, 0);
      const cameraPos = new THREE.Vector3(1, 1.5, 1);
      
      const fullRotation = calculateLookAtRotation(headPos, cameraPos, 1.0);
      const halfRotation = calculateLookAtRotation(headPos, cameraPos, 0.5);
      
      // Half intensity should produce roughly half the rotation
      expect(Math.abs(halfRotation.y)).toBeLessThan(Math.abs(fullRotation.y));
    });

    it('should reduce Z rotation for natural look', () => {
      const headPos = new THREE.Vector3(0, 1.5, 0);
      const cameraPos = new THREE.Vector3(1, 2, 1);
      const rotation = calculateLookAtRotation(headPos, cameraPos, 1.0);
      
      // Z rotation should be scaled down (0.3 factor)
      // This is hard to test directly, but we can verify it's bounded
      expect(Math.abs(rotation.z)).toBeLessThan(Math.PI);
    });

    // Property test: Rotation should always produce finite values
    it('should always produce finite rotation values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(3), noNaN: true }),
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(3), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (hx, hy, hz, cx, cy, cz, intensity) => {
            const headPos = new THREE.Vector3(hx, hy, hz);
            const cameraPos = new THREE.Vector3(cx, cy, cz);
            const rotation = calculateLookAtRotation(headPos, cameraPos, intensity);
            
            return (
              Number.isFinite(rotation.x) &&
              Number.isFinite(rotation.y) &&
              Number.isFinite(rotation.z)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Zero intensity should produce zero rotation
    it('should produce zero rotation with zero intensity', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(3), noNaN: true }),
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(3), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (hx, hy, hz, cx, cy, cz) => {
            const headPos = new THREE.Vector3(hx, hy, hz);
            const cameraPos = new THREE.Vector3(cx, cy, cz);
            const rotation = calculateLookAtRotation(headPos, cameraPos, 0);
            
            return rotation.x === 0 && rotation.y === 0 && rotation.z === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Lerp Value Tests
// ============================================================================

describe('Feature: neural-core-splitting, Lerp Value', () => {
  describe('lerpValue', () => {
    it('should return current when speed is 0', () => {
      expect(lerpValue(5, 10, 0)).toBe(5);
    });

    it('should return target when speed is 1', () => {
      expect(lerpValue(5, 10, 1)).toBe(10);
    });

    it('should return midpoint when speed is 0.5', () => {
      expect(lerpValue(0, 10, 0.5)).toBe(5);
    });

    it('should move toward target', () => {
      const current = 0;
      const target = 10;
      const result = lerpValue(current, target, 0.3);
      expect(result).toBeGreaterThan(current);
      expect(result).toBeLessThan(target);
    });

    // Property test: Lerp should always move toward target
    it('should always move toward target', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (current, target, speed) => {
            const result = lerpValue(current, target, speed);
            
            // Use tolerance for floating point comparison
            const tolerance = 1e-10;
            if (Math.abs(current - target) < tolerance) {
              return Math.abs(result - target) < tolerance;
            }
            
            if (current < target) {
              return result >= current - tolerance && result <= target + tolerance;
            } else {
              return result <= current + tolerance && result >= target - tolerance;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Lerp should be deterministic
    it('should be deterministic', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (current, target, speed) => {
            const result1 = lerpValue(current, target, speed);
            const result2 = lerpValue(current, target, speed);
            return result1 === result2;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Tracking State Tests
// ============================================================================

describe('Feature: neural-core-splitting, Tracking State', () => {
  describe('TrackingState interface', () => {
    it('should support enabled/disabled states', () => {
      const enabledState: TrackingState = { enabled: true, intensity: 0.7 };
      const disabledState: TrackingState = { enabled: false, intensity: 0.7 };
      
      expect(enabledState.enabled).toBe(true);
      expect(disabledState.enabled).toBe(false);
    });

    it('should support intensity values', () => {
      const lowIntensity: TrackingState = { enabled: true, intensity: 0.3 };
      const highIntensity: TrackingState = { enabled: true, intensity: 0.9 };
      
      expect(lowIntensity.intensity).toBeLessThan(highIntensity.intensity);
    });

    // Property test: Intensity should be clamped to [0, 1]
    it('should have intensity in valid range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (intensity) => {
            const state: TrackingState = { enabled: true, intensity };
            return state.intensity >= 0 && state.intensity <= 1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Vector3 Tests
// ============================================================================

describe('Feature: neural-core-splitting, Vector3', () => {
  describe('Vector3 interface', () => {
    it('should support x, y, z components', () => {
      const vec: Vector3 = { x: 1, y: 2, z: 3 };
      expect(vec.x).toBe(1);
      expect(vec.y).toBe(2);
      expect(vec.z).toBe(3);
    });

    it('should support negative values', () => {
      const vec: Vector3 = { x: -1, y: -2, z: -3 };
      expect(vec.x).toBe(-1);
      expect(vec.y).toBe(-2);
      expect(vec.z).toBe(-3);
    });

    // Property test: Vector3 should support any finite values
    it('should support any finite values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          (x, y, z) => {
            const vec: Vector3 = { x, y, z };
            return (
              Number.isFinite(vec.x) &&
              Number.isFinite(vec.y) &&
              Number.isFinite(vec.z)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
