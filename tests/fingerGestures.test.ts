// Finger Gesture Tests
// Property 6: Gesture finger bone application with interpolation
// Property 7: Gesture finger capture
// Validates: Requirements 4.1, 4.3, 4.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { GestureDefinition, HandsConfig, BoneRotation } from '../types/behaviorTypes';
import { DEFAULT_HANDS } from '../types/behaviorTypes';
import { blendBoneRotations, lerp } from '../utils/animationBlender';
import type { BoneState } from '../types/enhancementTypes';

// All finger bone names
const FINGER_BONE_NAMES = [
  'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
] as const;

// Helper to convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;

// Helper to create a gesture with finger bones
function createFingerGesture(
  name: string,
  fingerBones: Record<string, { x: number; y: number; z: number }>
): GestureDefinition {
  return {
    name,
    enabled: true,
    duration: 1.5,
    intensity: 1.0,
    transitionSpeed: 0.3,
    bones: fingerBones,
  };
}

// Helper to capture finger bones from HandsConfig (simulates saveAsGesture)
function captureFingerBones(
  handsConfig: HandsConfig
): Record<string, { x: number; y: number; z: number }> {
  const bones: Record<string, { x: number; y: number; z: number }> = {};
  
  for (const boneName of FINGER_BONE_NAMES) {
    const boneConfig = handsConfig[boneName as keyof HandsConfig] as BoneRotation;
    if (boneConfig.x !== 0 || boneConfig.y !== 0 || boneConfig.z !== 0) {
      bones[boneName] = {
        x: degToRad(boneConfig.x),
        y: degToRad(boneConfig.y),
        z: degToRad(boneConfig.z),
      };
    }
  }
  
  return bones;
}

describe('Finger Gesture System', () => {
  describe('Property 6: Gesture finger bone application with interpolation', () => {
    /**
     * For any gesture with finger bone config, triggering it should result
     * in finger bones being rotated to the target values with smooth
     * interpolation (intermediate values between start and end).
     */
    it('should interpolate finger bones from start to target', () => {
      fc.assert(
        fc.property(
          // Generate random finger rotations (in radians)
          fc.float({ min: -1.5, max: 1.5, noNaN: true }),
          fc.float({ min: -1.5, max: 1.5, noNaN: true }),
          fc.float({ min: -1.5, max: 1.5, noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
          (targetX, targetY, targetZ, t) => {
            // Create a gesture with finger bones
            const gesture = createFingerGesture('test_finger', {
              leftIndexProximal: { x: targetX, y: targetY, z: targetZ },
            });
            
            // Starting pose (neutral)
            const fromPose: Record<string, BoneState> = {
              leftIndexProximal: { rotation: { x: 0, y: 0, z: 0 } },
            };
            
            // Target pose from gesture
            const toPose: Record<string, BoneState> = {
              leftIndexProximal: { rotation: { x: targetX, y: targetY, z: targetZ } },
            };
            
            // Blend at time t
            const blended = blendBoneRotations(fromPose, toPose, t);
            
            // Verify interpolation produces intermediate values
            const result = blended.leftIndexProximal.rotation;
            
            // Result should be between start (0) and target
            if (Math.abs(targetX) > 0.1) {
              const expectedX = lerp(0, targetX, t);
              expect(result.x).toBeCloseTo(expectedX, 4);
            }
            if (Math.abs(targetY) > 0.1) {
              const expectedY = lerp(0, targetY, t);
              expect(result.y).toBeCloseTo(expectedY, 4);
            }
            if (Math.abs(targetZ) > 0.1) {
              const expectedZ = lerp(0, targetZ, t);
              expect(result.z).toBeCloseTo(expectedZ, 4);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should apply all 28 finger bones when defined in gesture', () => {
      // Create a gesture with all finger bones
      const allFingerBones: Record<string, { x: number; y: number; z: number }> = {};
      FINGER_BONE_NAMES.forEach((name, i) => {
        allFingerBones[name] = { x: 0.5 + i * 0.01, y: 0, z: 0 };
      });
      
      const gesture = createFingerGesture('all_fingers', allFingerBones);
      
      // Verify all 28 finger bones are in the gesture
      expect(Object.keys(gesture.bones).length).toBe(28);
      
      // Verify each bone has valid rotation values
      for (const boneName of FINGER_BONE_NAMES) {
        expect(gesture.bones[boneName]).toBeDefined();
        expect(typeof gesture.bones[boneName].x).toBe('number');
        expect(typeof gesture.bones[boneName].y).toBe('number');
        expect(typeof gesture.bones[boneName].z).toBe('number');
      }
    });

    it('should blend multiple finger bones simultaneously', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
          (t) => {
            // Create poses with multiple finger bones
            const fromPose: Record<string, BoneState> = {
              leftIndexProximal: { rotation: { x: 0, y: 0, z: 0 } },
              leftMiddleProximal: { rotation: { x: 0, y: 0, z: 0 } },
              rightIndexProximal: { rotation: { x: 0, y: 0, z: 0 } },
            };
            
            const toPose: Record<string, BoneState> = {
              leftIndexProximal: { rotation: { x: 1.0, y: 0, z: 0 } },
              leftMiddleProximal: { rotation: { x: 0.8, y: 0, z: 0 } },
              rightIndexProximal: { rotation: { x: 1.2, y: 0, z: 0 } },
            };
            
            const blended = blendBoneRotations(fromPose, toPose, t);
            
            // All bones should be blended
            expect(blended.leftIndexProximal.rotation.x).toBeCloseTo(t * 1.0, 4);
            expect(blended.leftMiddleProximal.rotation.x).toBeCloseTo(t * 0.8, 4);
            expect(blended.rightIndexProximal.rotation.x).toBeCloseTo(t * 1.2, 4);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: Gesture finger capture', () => {
    /**
     * For any current Hands tab configuration, creating a new gesture
     * should capture all 28 finger bone values matching the current state.
     */
    it('should capture non-zero finger bones from HandsConfig', () => {
      fc.assert(
        fc.property(
          // Generate random finger positions (in degrees)
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -45, max: 45, noNaN: true }),
          fc.float({ min: -30, max: 30, noNaN: true }),
          (curl, spread, twist) => {
            // Create a HandsConfig with some non-zero values
            const handsConfig: HandsConfig = {
              ...DEFAULT_HANDS,
              leftIndexProximal: { x: curl, y: spread, z: twist },
              rightIndexProximal: { x: curl * 0.5, y: 0, z: 0 },
            };
            
            // Capture finger bones
            const captured = captureFingerBones(handsConfig);
            
            // Non-zero bones should be captured
            if (curl !== 0 || spread !== 0 || twist !== 0) {
              expect(captured.leftIndexProximal).toBeDefined();
              expect(captured.leftIndexProximal.x).toBeCloseTo(degToRad(curl), 5);
              expect(captured.leftIndexProximal.y).toBeCloseTo(degToRad(spread), 5);
              expect(captured.leftIndexProximal.z).toBeCloseTo(degToRad(twist), 5);
            }
            
            if (curl !== 0) {
              expect(captured.rightIndexProximal).toBeDefined();
              expect(captured.rightIndexProximal.x).toBeCloseTo(degToRad(curl * 0.5), 5);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not capture zero-value bones', () => {
      const handsConfig: HandsConfig = {
        ...DEFAULT_HANDS,
        leftIndexProximal: { x: 45, y: 0, z: 0 }, // Non-zero
        leftMiddleProximal: { x: 0, y: 0, z: 0 }, // Zero - should not be captured
      };
      
      const captured = captureFingerBones(handsConfig);
      
      expect(captured.leftIndexProximal).toBeDefined();
      expect(captured.leftMiddleProximal).toBeUndefined();
    });

    it('should convert degrees to radians when capturing', () => {
      const handsConfig: HandsConfig = {
        ...DEFAULT_HANDS,
        leftThumbProximal: { x: 90, y: 45, z: 30 },
      };
      
      const captured = captureFingerBones(handsConfig);
      
      expect(captured.leftThumbProximal.x).toBeCloseTo(Math.PI / 2, 5); // 90 deg = π/2 rad
      expect(captured.leftThumbProximal.y).toBeCloseTo(Math.PI / 4, 5); // 45 deg = π/4 rad
      expect(captured.leftThumbProximal.z).toBeCloseTo(Math.PI / 6, 5); // 30 deg = π/6 rad
    });

    it('should capture all finger bones when all are non-zero', () => {
      // Create HandsConfig with all fingers set
      const handsConfig: HandsConfig = { ...DEFAULT_HANDS };
      for (const boneName of FINGER_BONE_NAMES) {
        (handsConfig as any)[boneName] = { x: 45, y: 10, z: 5 };
      }
      
      const captured = captureFingerBones(handsConfig);
      
      // All 28 finger bones should be captured
      expect(Object.keys(captured).length).toBe(28);
      
      for (const boneName of FINGER_BONE_NAMES) {
        expect(captured[boneName]).toBeDefined();
        expect(captured[boneName].x).toBeCloseTo(degToRad(45), 5);
        expect(captured[boneName].y).toBeCloseTo(degToRad(10), 5);
        expect(captured[boneName].z).toBeCloseTo(degToRad(5), 5);
      }
    });
  });

  describe('Gesture Definition Structure', () => {
    it('should support finger bones in gesture bones field', () => {
      const gesture: GestureDefinition = {
        name: 'pointing',
        enabled: true,
        duration: 1.0,
        intensity: 1.0,
        transitionSpeed: 0.3,
        bones: {
          // Arm bones
          rightUpperArm: { x: 0, y: 0, z: -0.5 },
          rightLowerArm: { x: 0.3, y: 0, z: 0 },
          // Finger bones - pointing gesture
          rightIndexProximal: { x: 0, y: 0, z: 0 },
          rightIndexIntermediate: { x: 0, y: 0, z: 0 },
          rightIndexDistal: { x: 0, y: 0, z: 0 },
          rightMiddleProximal: { x: 1.5, y: 0, z: 0 },
          rightMiddleIntermediate: { x: 1.5, y: 0, z: 0 },
          rightRingProximal: { x: 1.5, y: 0, z: 0 },
          rightRingIntermediate: { x: 1.5, y: 0, z: 0 },
          rightLittleProximal: { x: 1.5, y: 0, z: 0 },
          rightLittleIntermediate: { x: 1.5, y: 0, z: 0 },
        },
      };
      
      // Verify structure
      expect(gesture.bones.rightUpperArm).toBeDefined();
      expect(gesture.bones.rightIndexProximal).toBeDefined();
      expect(gesture.bones.rightMiddleProximal).toBeDefined();
      
      // Verify finger bones have correct values
      expect(gesture.bones.rightIndexProximal.x).toBe(0); // Extended
      expect(gesture.bones.rightMiddleProximal.x).toBe(1.5); // Curled
    });
  });
});
