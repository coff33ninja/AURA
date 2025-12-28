// Walking Controller Tests - Property-based and unit tests
// Tests for leg pose calculation, arm swing, and walking presets

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateLegPose,
  calculateArmSwingPose,
  getWalkingPreset,
  applyWalkingStyle,
  createDefaultWalkingBehavior,
  calculateWalkPhase,
  isValidLegPose,
  isValidArmSwingPose,
  type LegPose,
  type ArmSwingPose,
} from '../utils/walkingController';
import {
  DEFAULT_WALKING_BEHAVIOR,
  WALKING_PRESETS,
  isValidWalkingBehaviorConfig,
  isValidLegConfig,
  isValidArmSwingConfig,
  type WalkingBehaviorConfig,
  type WalkingStyle,
  type WalkingDirection,
} from '../types/walkingBehaviorTypes';

// Arbitrary generators for walking types
const walkingStyleArb = fc.constantFrom<WalkingStyle>('casual', 'march', 'sneak', 'run');
const walkingDirectionArb = fc.constantFrom<WalkingDirection>('forward', 'backward', 'strafeLeft', 'strafeRight');

const legConfigArb = fc.record({
  strideLength: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
  liftHeight: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
  bendAmount: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
});

const armSwingConfigArb = fc.record({
  enabled: fc.boolean(),
  intensity: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
  syncWithLegs: fc.boolean(),
});

const walkingBehaviorConfigArb = fc.record({
  enabled: fc.boolean(),
  speed: fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }),
  direction: walkingDirectionArb,
  bobIntensity: fc.float({ min: Math.fround(0), max: Math.fround(0.1), noNaN: true }),
  bobFrequency: fc.float({ min: Math.fround(0.5), max: Math.fround(4), noNaN: true }),
  legs: legConfigArb,
  armSwing: armSwingConfigArb,
  style: walkingStyleArb,
});

const phaseArb = fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true });

describe('Walking Controller', () => {
  describe('calculateLegPose', () => {
    // Property 18: Leg poses alternate correctly during walk cycle
    it('Property 18: legs alternate correctly - left forward when right back', () => {
      fc.assert(
        fc.property(walkingBehaviorConfigArb, (config) => {
          // At phase 0, left leg should be at neutral/forward, right at back
          const pose0 = calculateLegPose(0, config);
          // At phase π, positions should be reversed
          const posePi = calculateLegPose(Math.PI, config);
          
          expect(isValidLegPose(pose0)).toBe(true);
          expect(isValidLegPose(posePi)).toBe(true);
          
          // Left and right upper legs should have opposite signs at any phase
          // (one forward, one back)
          if (config.legs.strideLength > 0.01) {
            // At phase 0: left forward (positive x), right back (negative x) for forward walking
            // At phase π: reversed
            const leftSign0 = Math.sign(pose0.leftUpperLeg.x);
            const rightSign0 = Math.sign(pose0.rightUpperLeg.x);
            const leftSignPi = Math.sign(posePi.leftUpperLeg.x);
            const rightSignPi = Math.sign(posePi.rightUpperLeg.x);
            
            // Signs should be opposite between left and right
            if (leftSign0 !== 0 && rightSign0 !== 0) {
              expect(leftSign0).toBe(-rightSign0);
            }
            if (leftSignPi !== 0 && rightSignPi !== 0) {
              expect(leftSignPi).toBe(-rightSignPi);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('produces valid leg poses for any phase and config', () => {
      fc.assert(
        fc.property(phaseArb, walkingBehaviorConfigArb, (phase, config) => {
          const pose = calculateLegPose(phase, config);
          expect(isValidLegPose(pose)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('returns zero rotations when stride length is zero', () => {
      const config: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        legs: { strideLength: 0, liftHeight: 0, bendAmount: 0 },
      };
      
      const pose = calculateLegPose(Math.PI / 2, config);
      
      // Use toBeCloseTo to handle -0 vs 0
      expect(pose.leftUpperLeg.x).toBeCloseTo(0, 10);
      expect(pose.rightUpperLeg.x).toBeCloseTo(0, 10);
    });

    it('reverses leg motion for backward direction', () => {
      const forwardConfig: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        direction: 'forward',
        legs: { strideLength: 0.5, liftHeight: 0.3, bendAmount: 0.4 },
      };
      const backwardConfig: WalkingBehaviorConfig = {
        ...forwardConfig,
        direction: 'backward',
      };
      
      const forwardPose = calculateLegPose(Math.PI / 4, forwardConfig);
      const backwardPose = calculateLegPose(Math.PI / 4, backwardConfig);
      
      // Upper leg x rotation should be opposite
      expect(Math.sign(forwardPose.leftUpperLeg.x)).toBe(-Math.sign(backwardPose.leftUpperLeg.x));
    });

    it('reduces forward motion during strafe', () => {
      const forwardConfig: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        direction: 'forward',
        legs: { strideLength: 0.5, liftHeight: 0.3, bendAmount: 0.4 },
      };
      const strafeConfig: WalkingBehaviorConfig = {
        ...forwardConfig,
        direction: 'strafeLeft',
      };
      
      const forwardPose = calculateLegPose(Math.PI / 4, forwardConfig);
      const strafePose = calculateLegPose(Math.PI / 4, strafeConfig);
      
      // Strafe should have reduced forward/back motion
      expect(Math.abs(strafePose.leftUpperLeg.x)).toBeLessThan(Math.abs(forwardPose.leftUpperLeg.x));
    });

    it('knee bend is always non-negative', () => {
      fc.assert(
        fc.property(phaseArb, walkingBehaviorConfigArb, (phase, config) => {
          const pose = calculateLegPose(phase, config);
          expect(pose.leftLowerLeg.x).toBeGreaterThanOrEqual(0);
          expect(pose.rightLowerLeg.x).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateArmSwingPose', () => {
    // Property 19: Arm swing is opposite to leg movement
    it('Property 19: arm swing opposite to legs when syncWithLegs enabled', () => {
      fc.assert(
        fc.property(
          phaseArb,
          walkingBehaviorConfigArb.filter(c => c.armSwing.enabled && c.armSwing.syncWithLegs && c.armSwing.intensity > 0.01),
          (phase, config) => {
            const legPose = calculateLegPose(phase, config);
            const armPose = calculateArmSwingPose(phase, config);
            
            expect(isValidArmSwingPose(armPose)).toBe(true);
            
            // When left leg is forward (positive x), left arm should be back (negative x)
            // and vice versa (arms swing opposite to same-side leg)
            if (Math.abs(legPose.leftUpperLeg.x) > 0.01 && Math.abs(armPose.leftUpperArm.x) > 0.01) {
              expect(Math.sign(legPose.leftUpperLeg.x)).toBe(-Math.sign(armPose.leftUpperArm.x));
            }
            if (Math.abs(legPose.rightUpperLeg.x) > 0.01 && Math.abs(armPose.rightUpperArm.x) > 0.01) {
              expect(Math.sign(legPose.rightUpperLeg.x)).toBe(-Math.sign(armPose.rightUpperArm.x));
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns zero rotations when arm swing disabled', () => {
      const config: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        armSwing: { enabled: false, intensity: 0.5, syncWithLegs: true },
      };
      
      const pose = calculateArmSwingPose(Math.PI / 2, config);
      
      expect(pose.leftUpperArm.x).toBe(0);
      expect(pose.leftUpperArm.y).toBe(0);
      expect(pose.leftUpperArm.z).toBe(0);
      expect(pose.rightUpperArm.x).toBe(0);
      expect(pose.rightUpperArm.y).toBe(0);
      expect(pose.rightUpperArm.z).toBe(0);
    });

    it('arm swing intensity scales with config intensity', () => {
      const lowIntensity: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        armSwing: { enabled: true, intensity: 0.2, syncWithLegs: true },
      };
      const highIntensity: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        armSwing: { enabled: true, intensity: 0.8, syncWithLegs: true },
      };
      
      const lowPose = calculateArmSwingPose(Math.PI / 4, lowIntensity);
      const highPose = calculateArmSwingPose(Math.PI / 4, highIntensity);
      
      expect(Math.abs(highPose.leftUpperArm.x)).toBeGreaterThan(Math.abs(lowPose.leftUpperArm.x));
    });

    it('produces valid arm poses for any phase and config', () => {
      fc.assert(
        fc.property(phaseArb, walkingBehaviorConfigArb, (phase, config) => {
          const pose = calculateArmSwingPose(phase, config);
          expect(isValidArmSwingPose(pose)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('getWalkingPreset', () => {
    // Property 20: Walking presets produce valid configurations
    it('Property 20: all presets produce valid partial configs', () => {
      fc.assert(
        fc.property(walkingStyleArb, (style) => {
          const preset = getWalkingPreset(style);
          
          // Preset should have expected fields
          expect(preset).toBeDefined();
          
          if (preset.legs) {
            expect(isValidLegConfig(preset.legs)).toBe(true);
            expect(preset.legs.strideLength).toBeGreaterThanOrEqual(0);
            expect(preset.legs.strideLength).toBeLessThanOrEqual(1);
            expect(preset.legs.liftHeight).toBeGreaterThanOrEqual(0);
            expect(preset.legs.liftHeight).toBeLessThanOrEqual(1);
            expect(preset.legs.bendAmount).toBeGreaterThanOrEqual(0);
            expect(preset.legs.bendAmount).toBeLessThanOrEqual(1);
          }
          
          if (preset.armSwing) {
            expect(isValidArmSwingConfig(preset.armSwing)).toBe(true);
            expect(preset.armSwing.intensity).toBeGreaterThanOrEqual(0);
            expect(preset.armSwing.intensity).toBeLessThanOrEqual(1);
          }
          
          if (preset.bobIntensity !== undefined) {
            expect(preset.bobIntensity).toBeGreaterThanOrEqual(0);
          }
          
          if (preset.bobFrequency !== undefined) {
            expect(preset.bobFrequency).toBeGreaterThan(0);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('returns casual preset for invalid style', () => {
      const preset = getWalkingPreset('invalid' as WalkingStyle);
      expect(preset).toEqual(WALKING_PRESETS.casual);
    });

    it('each style has distinct characteristics', () => {
      const casual = getWalkingPreset('casual');
      const march = getWalkingPreset('march');
      const sneak = getWalkingPreset('sneak');
      const run = getWalkingPreset('run');
      
      // March has higher lift than casual
      expect(march.legs!.liftHeight).toBeGreaterThan(casual.legs!.liftHeight);
      
      // Sneak has lower bob intensity
      expect(sneak.bobIntensity!).toBeLessThan(casual.bobIntensity!);
      
      // Run has highest stride length
      expect(run.legs!.strideLength).toBeGreaterThan(casual.legs!.strideLength);
      
      // Sneak has arm swing disabled
      expect(sneak.armSwing!.enabled).toBe(false);
    });
  });

  describe('applyWalkingStyle', () => {
    it('applies preset values to base config', () => {
      const base = createDefaultWalkingBehavior();
      const result = applyWalkingStyle(base, 'march');
      
      expect(result.style).toBe('march');
      expect(result.legs).toEqual(WALKING_PRESETS.march.legs);
      expect(result.armSwing).toEqual(WALKING_PRESETS.march.armSwing);
      expect(result.bobIntensity).toBe(WALKING_PRESETS.march.bobIntensity);
    });

    it('preserves non-preset fields', () => {
      const base: WalkingBehaviorConfig = {
        ...DEFAULT_WALKING_BEHAVIOR,
        enabled: true,
        speed: 1.5,
        direction: 'backward',
      };
      
      const result = applyWalkingStyle(base, 'sneak');
      
      expect(result.enabled).toBe(true);
      expect(result.speed).toBe(1.5);
      expect(result.direction).toBe('backward');
    });

    it('produces valid config for any style', () => {
      fc.assert(
        fc.property(walkingBehaviorConfigArb, walkingStyleArb, (config, style) => {
          const result = applyWalkingStyle(config, style);
          expect(isValidWalkingBehaviorConfig(result)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('calculateWalkPhase', () => {
    it('returns 0 when speed is 0', () => {
      expect(calculateWalkPhase(10, 0)).toBe(0);
    });

    it('returns 0 when speed is negative', () => {
      expect(calculateWalkPhase(10, -1)).toBe(0);
    });

    it('phase increases with time', () => {
      // Use smaller time values to avoid wrap-around to 0
      const phase1 = calculateWalkPhase(0.1, 1);
      const phase2 = calculateWalkPhase(0.2, 1);
      
      // Phase should increase (accounting for wrap-around)
      expect(phase1).toBeGreaterThan(0);
      expect(phase2).toBeGreaterThan(phase1);
    });

    it('phase is always in valid range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(2), noNaN: true }),
          (time, speed) => {
            const phase = calculateWalkPhase(time, speed);
            expect(phase).toBeGreaterThanOrEqual(0);
            expect(phase).toBeLessThan(Math.PI * 2 + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('faster speed means faster phase progression', () => {
      const slowPhase = calculateWalkPhase(0.5, 0.5);
      const fastPhase = calculateWalkPhase(0.5, 1.5);
      
      // At same time, faster speed should have progressed more
      // (before wrap-around)
      expect(fastPhase).toBeGreaterThan(slowPhase);
    });
  });

  describe('createDefaultWalkingBehavior', () => {
    it('returns valid default config', () => {
      const config = createDefaultWalkingBehavior();
      expect(isValidWalkingBehaviorConfig(config)).toBe(true);
    });

    it('returns new object each time', () => {
      const config1 = createDefaultWalkingBehavior();
      const config2 = createDefaultWalkingBehavior();
      expect(config1).not.toBe(config2);
    });

    it('has expected default values', () => {
      const config = createDefaultWalkingBehavior();
      expect(config.enabled).toBe(false);
      expect(config.speed).toBe(0);
      expect(config.direction).toBe('forward');
      expect(config.style).toBe('casual');
    });
  });

  describe('Type validation', () => {
    it('isValidLegPose detects invalid poses', () => {
      expect(isValidLegPose({
        leftUpperLeg: { x: NaN, y: 0, z: 0 },
        rightUpperLeg: { x: 0, y: 0, z: 0 },
        leftLowerLeg: { x: 0, y: 0, z: 0 },
        rightLowerLeg: { x: 0, y: 0, z: 0 },
        leftFoot: { x: 0, y: 0, z: 0 },
        rightFoot: { x: 0, y: 0, z: 0 },
      })).toBe(false);
      
      expect(isValidLegPose({
        leftUpperLeg: { x: Infinity, y: 0, z: 0 },
        rightUpperLeg: { x: 0, y: 0, z: 0 },
        leftLowerLeg: { x: 0, y: 0, z: 0 },
        rightLowerLeg: { x: 0, y: 0, z: 0 },
        leftFoot: { x: 0, y: 0, z: 0 },
        rightFoot: { x: 0, y: 0, z: 0 },
      })).toBe(false);
    });

    it('isValidArmSwingPose detects invalid poses', () => {
      expect(isValidArmSwingPose({
        leftUpperArm: { x: NaN, y: 0, z: 0 },
        rightUpperArm: { x: 0, y: 0, z: 0 },
      })).toBe(false);
    });
  });
});
