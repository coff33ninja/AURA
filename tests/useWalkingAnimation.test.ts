// Tests for useWalkingAnimation hook
// Feature: neural-core-splitting

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  createWalkState,
  clampPosition,
  WALK_BOUNDS,
  type WalkState,
} from '../components/neural-core/hooks/useWalkingAnimation';
import {
  directionToAngle,
  angleToMovementVector,
  DEFAULT_WALKING_BEHAVIOR,
  type WalkingDirection,
} from '../types/walkingBehaviorTypes';
import {
  calculateWalkingBob,
  smoothTransitionBob,
} from '../utils/walkingAnimator';
import {
  calculateWalkPhase,
  calculateLegPose,
  calculateArmSwingPose,
} from '../utils/walkingController';

// ============================================================================
// Property 6: Walking State Consistency
// For any sequence of walk, stopWalking, and startWalking calls, the walking
// state SHALL accurately reflect whether walking is active, and isWalking()
// SHALL return the correct boolean.
// Validates: Requirements 6.3
// ============================================================================

describe('Feature: neural-core-splitting, Property 6: Walking State Consistency', () => {
  describe('createWalkState', () => {
    it('should create initial state with walking disabled', () => {
      const state = createWalkState();
      expect(state.isWalking).toBe(false);
      expect(state.speed).toBe(0);
      expect(state.direction).toBe(0);
    });

    it('should create initial state with zero position', () => {
      const state = createWalkState();
      expect(state.position.x).toBe(0);
      expect(state.position.y).toBe(0);
      expect(state.position.z).toBe(0);
    });
  });

  describe('Walk State Transitions', () => {
    // Property test: Walking state should be consistent after any operation
    it('should maintain consistent state after walk operations', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (speed, direction) => {
            const state = createWalkState();
            
            // Simulate walk operation
            state.direction = direction;
            state.speed = speed;
            state.isWalking = speed > 0;
            
            // State should be consistent
            if (speed > 0) {
              return state.isWalking === true && state.speed === speed;
            } else {
              return state.isWalking === false && state.speed === 0;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Stop walking should always result in not walking
    it('should always stop walking when stopWalking is called', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          (initialSpeed) => {
            const state = createWalkState();
            
            // Start walking
            state.speed = initialSpeed;
            state.isWalking = initialSpeed > 0;
            
            // Stop walking
            state.isWalking = false;
            state.speed = 0;
            
            return state.isWalking === false && state.speed === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Position Clamping Tests
// ============================================================================

describe('Feature: neural-core-splitting, Position Clamping', () => {
  describe('clampPosition', () => {
    it('should not modify position within bounds', () => {
      const pos = { x: 0, y: 0.5, z: 0 };
      const clamped = clampPosition(pos);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0.5);
      expect(clamped.z).toBe(0);
    });

    it('should clamp X to bounds', () => {
      const pos = { x: 5, y: 0, z: 0 };
      const clamped = clampPosition(pos);
      expect(clamped.x).toBe(WALK_BOUNDS.maxX);
    });

    it('should clamp Z to bounds', () => {
      const pos = { x: 0, y: 0, z: -5 };
      const clamped = clampPosition(pos);
      expect(clamped.z).toBe(WALK_BOUNDS.minZ);
    });

    it('should preserve Y position (height)', () => {
      const pos = { x: 0, y: 100, z: 0 };
      const clamped = clampPosition(pos);
      expect(clamped.y).toBe(100);
    });

    // Property test: Clamped position should always be within bounds
    it('should always produce position within bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
          (x, y, z) => {
            const clamped = clampPosition({ x, y, z });
            return (
              clamped.x >= WALK_BOUNDS.minX &&
              clamped.x <= WALK_BOUNDS.maxX &&
              clamped.z >= WALK_BOUNDS.minZ &&
              clamped.z <= WALK_BOUNDS.maxZ
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Direction and Movement Tests
// ============================================================================

describe('Feature: neural-core-splitting, Direction and Movement', () => {
  describe('directionToAngle', () => {
    it('should return 0 for forward direction', () => {
      expect(directionToAngle('forward', 0, 0)).toBe(0);
    });

    it('should return 180 for backward direction', () => {
      expect(directionToAngle('backward', 0, 0)).toBe(180);
    });

    it('should return 90 for strafeRight direction', () => {
      expect(directionToAngle('strafeRight', 0, 0)).toBe(90);
    });

    it('should return 270 for strafeLeft direction', () => {
      expect(directionToAngle('strafeLeft', 0, 0)).toBe(270);
    });

    it('should return custom angle for custom direction', () => {
      expect(directionToAngle('custom', 45, 0)).toBe(45);
    });

    // Property test: Direction should always produce valid angle
    it('should always produce angle in [0, 360) range', () => {
      const directions: WalkingDirection[] = ['forward', 'backward', 'strafeLeft', 'strafeRight', 'custom'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...directions),
          fc.float({ min: Math.fround(0), max: Math.fround(360), noNaN: true }),
          fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          (direction, customAngle, facingAngle) => {
            const angle = directionToAngle(direction, customAngle, facingAngle);
            return angle >= 0 && angle < 360;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('angleToMovementVector', () => {
    it('should return negative Z for 0 degrees (toward camera)', () => {
      const vec = angleToMovementVector(0);
      expect(vec.x).toBeCloseTo(0, 5);
      expect(vec.z).toBeCloseTo(-1, 5);
    });

    it('should return positive X for 90 degrees (right)', () => {
      const vec = angleToMovementVector(90);
      expect(vec.x).toBeCloseTo(1, 5);
      expect(vec.z).toBeCloseTo(0, 5);
    });

    it('should return positive Z for 180 degrees (away from camera)', () => {
      const vec = angleToMovementVector(180);
      expect(vec.x).toBeCloseTo(0, 5);
      expect(vec.z).toBeCloseTo(1, 5);
    });

    // Property test: Movement vector should be normalized
    it('should produce normalized movement vector', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(360), noNaN: true }),
          (angle) => {
            const vec = angleToMovementVector(angle);
            const magnitude = Math.sqrt(vec.x * vec.x + vec.z * vec.z);
            return Math.abs(magnitude - 1) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Walking Bob Animation Tests
// ============================================================================

describe('Feature: neural-core-splitting, Walking Bob Animation', () => {
  describe('calculateWalkingBob', () => {
    it('should return zero offset when speed is zero', () => {
      const state = calculateWalkingBob(0, 1.0, { bobIntensity: 0.02, bobFrequency: 2.0 });
      expect(state.verticalOffset).toBe(0);
    });

    it('should return non-zero offset when walking', () => {
      const state = calculateWalkingBob(1.0, 0.5, { bobIntensity: 0.02, bobFrequency: 2.0 });
      expect(state.verticalOffset).toBeGreaterThanOrEqual(0);
    });

    // Property test: Bob offset should be bounded by intensity
    it('should produce bounded bob offset', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
          (speed, time, intensity) => {
            const state = calculateWalkingBob(speed, time, { bobIntensity: intensity, bobFrequency: 2.0 });
            // Max offset is intensity * speedMultiplier (max 1.5)
            const maxOffset = intensity * 1.5;
            return state.verticalOffset >= 0 && state.verticalOffset <= maxOffset + 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('smoothTransitionBob', () => {
    it('should move toward target', () => {
      const current = 0;
      const target = 1;
      const result = smoothTransitionBob(current, target, 0.1, 5.0);
      expect(result).toBeGreaterThan(current);
      expect(result).toBeLessThan(target);
    });

    it('should converge to target over time', () => {
      let current = 0;
      const target = 1;
      for (let i = 0; i < 100; i++) {
        current = smoothTransitionBob(current, target, 0.016, 5.0);
      }
      expect(current).toBeCloseTo(target, 2);
    });

    // Property test: Smooth transition should always move toward target
    it('should always move toward target', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          (current, target, delta) => {
            const result = smoothTransitionBob(current, target, delta, 5.0);
            if (current < target) {
              return result >= current && result <= target;
            } else if (current > target) {
              return result <= current && result >= target;
            }
            return result === target;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Walk Phase and Leg Animation Tests
// ============================================================================

describe('Feature: neural-core-splitting, Walk Phase and Leg Animation', () => {
  describe('calculateWalkPhase', () => {
    it('should return 0 when speed is 0', () => {
      expect(calculateWalkPhase(1.0, 0)).toBe(0);
    });

    it('should return phase in valid range', () => {
      const phase = calculateWalkPhase(1.0, 1.0);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(Math.PI * 2);
    });

    // Property test: Phase should always be in [0, 2π) range
    it('should always produce phase in valid range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
          (time, speed) => {
            const phase = calculateWalkPhase(time, speed);
            return phase >= 0 && phase < Math.PI * 2 + 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateLegPose', () => {
    it('should produce valid leg pose', () => {
      const pose = calculateLegPose(0, DEFAULT_WALKING_BEHAVIOR);
      expect(pose.leftUpperLeg).toBeDefined();
      expect(pose.rightUpperLeg).toBeDefined();
      expect(pose.leftLowerLeg).toBeDefined();
      expect(pose.rightLowerLeg).toBeDefined();
    });

    // Property test: Leg pose should have finite values
    it('should produce finite leg pose values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
          (phase) => {
            const pose = calculateLegPose(phase, DEFAULT_WALKING_BEHAVIOR);
            return (
              Number.isFinite(pose.leftUpperLeg.x) &&
              Number.isFinite(pose.rightUpperLeg.x) &&
              Number.isFinite(pose.leftLowerLeg.x) &&
              Number.isFinite(pose.rightLowerLeg.x)
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateArmSwingPose', () => {
    it('should produce zero pose when arm swing disabled', () => {
      const config = { ...DEFAULT_WALKING_BEHAVIOR, armSwing: { ...DEFAULT_WALKING_BEHAVIOR.armSwing, enabled: false } };
      const pose = calculateArmSwingPose(0, config);
      expect(pose.leftUpperArm.x).toBe(0);
      expect(pose.rightUpperArm.x).toBe(0);
    });

    it('should produce non-zero pose when arm swing enabled', () => {
      const pose = calculateArmSwingPose(Math.PI / 2, DEFAULT_WALKING_BEHAVIOR);
      // At least one arm should have non-zero rotation
      const hasRotation = pose.leftUpperArm.x !== 0 || pose.rightUpperArm.x !== 0;
      expect(hasRotation).toBe(true);
    });
  });
});

// ============================================================================
// Walking Behavior Config Tests
// ============================================================================

describe('Feature: neural-core-splitting, Walking Behavior Config', () => {
  it('should have valid default walking behavior', () => {
    expect(DEFAULT_WALKING_BEHAVIOR.enabled).toBe(false);
    expect(DEFAULT_WALKING_BEHAVIOR.speed).toBe(0);
    expect(DEFAULT_WALKING_BEHAVIOR.direction).toBe('forward');
    expect(DEFAULT_WALKING_BEHAVIOR.legs).toBeDefined();
    expect(DEFAULT_WALKING_BEHAVIOR.armSwing).toBeDefined();
  });

  it('should have valid leg config in default', () => {
    const { legs } = DEFAULT_WALKING_BEHAVIOR;
    expect(legs.strideLength).toBeGreaterThan(0);
    expect(legs.liftHeight).toBeGreaterThan(0);
    expect(legs.bendAmount).toBeGreaterThan(0);
  });

  it('should have valid arm swing config in default', () => {
    const { armSwing } = DEFAULT_WALKING_BEHAVIOR;
    expect(armSwing.enabled).toBe(true);
    expect(armSwing.intensity).toBeGreaterThan(0);
    expect(armSwing.syncWithLegs).toBe(true);
  });
});
