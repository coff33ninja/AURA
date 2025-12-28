// Feature: vrm-modular-behavior-system
// Property 3: Config Merge Completeness
// For any partial config merged with defaults, the resulting config SHALL contain
// all required fields with valid values (no undefined or null required fields).

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  deepMergeConfig,
  DEFAULT_TRANSFORM,
  DEFAULT_GESTURES,
  DEFAULT_IDLE,
  DEFAULT_LIPSYNC,
  DEFAULT_REACTIONS,
  DEFAULT_EXPRESSIONS,
  TransformConfig,
  GesturesConfig,
  IdleConfig,
  LipSyncConfig,
  ReactionsConfig,
  ExpressionsConfig,
  isValidTransformConfig,
  isValidGesturesConfig,
  isValidIdleConfig,
  isValidLipSyncConfig,
  isValidReactionsConfig,
  isValidExpressionsConfig,
} from '../types/behaviorTypes';

// Helper to create 32-bit float constraints
const f = Math.fround;

// Arbitraries for generating partial configs
const partialPositionArb = fc.record({
  x: fc.option(fc.float({ min: f(-10), max: f(10), noNaN: true }), { nil: undefined }),
  y: fc.option(fc.float({ min: f(-10), max: f(10), noNaN: true }), { nil: undefined }),
  z: fc.option(fc.float({ min: f(-10), max: f(10), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const partialTransformArb = fc.record({
  position: fc.option(partialPositionArb, { nil: undefined }),
  rotation: fc.option(fc.float({ min: f(0), max: f(360), noNaN: true }), { nil: undefined }),
  scale: fc.option(fc.float({ min: f(0.5), max: f(2.0), noNaN: true }), { nil: undefined }),
  cameraDistance: fc.option(fc.float({ min: f(0.5), max: f(10), noNaN: true }), { nil: undefined }),
  cameraHeight: fc.option(fc.float({ min: f(0), max: f(3), noNaN: true }), { nil: undefined }),
  cameraLookAtHeight: fc.option(fc.float({ min: f(0), max: f(3), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const partialBreathingArb = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  speed: fc.option(fc.float({ min: f(0.1), max: f(2), noNaN: true }), { nil: undefined }),
  intensity: fc.option(fc.float({ min: f(0), max: f(0.1), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const partialBlinkingArb = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  interval: fc.option(fc.float({ min: f(1), max: f(10), noNaN: true }), { nil: undefined }),
  duration: fc.option(fc.float({ min: f(0.05), max: f(0.5), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const partialSwayArb = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  amount: fc.option(fc.float({ min: f(0), max: f(0.5), noNaN: true }), { nil: undefined }),
  speed: fc.option(fc.float({ min: f(0.1), max: f(2), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const partialHeadMovementArb = fc.record({
  enabled: fc.option(fc.boolean(), { nil: undefined }),
  amount: fc.option(fc.float({ min: f(0), max: f(0.5), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const idlePresetArb = fc.constantFrom('calm', 'energetic', 'sleepy', 'alert', 'custom' as const);

const partialIdleArb = fc.record({
  breathing: fc.option(partialBreathingArb, { nil: undefined }),
  blinking: fc.option(partialBlinkingArb, { nil: undefined }),
  sway: fc.option(partialSwayArb, { nil: undefined }),
  headMovement: fc.option(partialHeadMovementArb, { nil: undefined }),
  preset: fc.option(idlePresetArb, { nil: undefined }),
}, { requiredKeys: [] });

const partialVisemeWeightsArb = fc.record({
  a: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
  i: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
  u: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
  e: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
  o: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

const lipsyncPresetArb = fc.constantFrom('subtle', 'normal', 'exaggerated', 'custom' as const);

const partialLipSyncArb = fc.record({
  sensitivity: fc.option(fc.float({ min: f(0.5), max: f(10), noNaN: true }), { nil: undefined }),
  smoothing: fc.option(fc.float({ min: f(0), max: f(1), noNaN: true }), { nil: undefined }),
  visemeWeights: fc.option(partialVisemeWeightsArb, { nil: undefined }),
  preset: fc.option(lipsyncPresetArb, { nil: undefined }),
}, { requiredKeys: [] });

const gestureArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  enabled: fc.boolean(),
  duration: fc.float({ min: f(0.1), max: f(5), noNaN: true }),
  intensity: fc.float({ min: f(0), max: f(1), noNaN: true }),
  transitionSpeed: fc.float({ min: f(0.1), max: f(10), noNaN: true }),
  bones: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.record({ 
      x: fc.float({ min: f(-10), max: f(10), noNaN: true }), 
      y: fc.float({ min: f(-10), max: f(10), noNaN: true }), 
      z: fc.float({ min: f(-10), max: f(10), noNaN: true }) 
    })
  ),
});

const partialGesturesArb = fc.record({
  gestures: fc.option(fc.array(gestureArb, { maxLength: 5 }), { nil: undefined }),
}, { requiredKeys: [] });

const reactionArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  enabled: fc.boolean(),
  expressions: fc.array(fc.record({ 
    name: fc.string(), 
    value: fc.float({ min: f(0), max: f(1), noNaN: true }) 
  }), { maxLength: 3 }),
  gestures: fc.array(fc.string(), { maxLength: 3 }),
  posture: fc.string(),
  duration: fc.float({ min: f(0.1), max: f(10), noNaN: true }),
  mode: fc.constantFrom('ACTIVE', 'PASSIVE' as const),
});

const partialReactionsArb = fc.record({
  reactions: fc.option(fc.array(reactionArb, { maxLength: 5 }), { nil: undefined }),
}, { requiredKeys: [] });

const partialExpressionsArb = fc.record({
  mappings: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }),
  intensityOverrides: fc.option(fc.dictionary(fc.string(), fc.float({ min: f(0), max: f(1), noNaN: true })), { nil: undefined }),
}, { requiredKeys: [] });

describe('Property 3: Config Merge Completeness', () => {
  it('TransformConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialTransformArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_TRANSFORM, partial as Partial<TransformConfig>);
        expect(isValidTransformConfig(merged)).toBe(true);
        expect(merged.position).toBeDefined();
        expect(typeof merged.position.x).toBe('number');
        expect(typeof merged.position.y).toBe('number');
        expect(typeof merged.position.z).toBe('number');
        expect(typeof merged.rotation).toBe('number');
        expect(typeof merged.scale).toBe('number');
        expect(typeof merged.cameraDistance).toBe('number');
        expect(typeof merged.cameraHeight).toBe('number');
        expect(typeof merged.cameraLookAtHeight).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('GesturesConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialGesturesArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_GESTURES, partial as Partial<GesturesConfig>);
        expect(isValidGesturesConfig(merged)).toBe(true);
        expect(Array.isArray(merged.gestures)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('IdleConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialIdleArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_IDLE, partial as Partial<IdleConfig>);
        expect(isValidIdleConfig(merged)).toBe(true);
        expect(merged.breathing).toBeDefined();
        expect(typeof merged.breathing.enabled).toBe('boolean');
        expect(typeof merged.breathing.speed).toBe('number');
        expect(typeof merged.breathing.intensity).toBe('number');
        expect(merged.blinking).toBeDefined();
        expect(merged.sway).toBeDefined();
        expect(merged.headMovement).toBeDefined();
        expect(typeof merged.preset).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('LipSyncConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialLipSyncArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_LIPSYNC, partial as Partial<LipSyncConfig>);
        expect(isValidLipSyncConfig(merged)).toBe(true);
        expect(typeof merged.sensitivity).toBe('number');
        expect(typeof merged.smoothing).toBe('number');
        expect(merged.visemeWeights).toBeDefined();
        expect(typeof merged.visemeWeights.a).toBe('number');
        expect(typeof merged.visemeWeights.i).toBe('number');
        expect(typeof merged.visemeWeights.u).toBe('number');
        expect(typeof merged.visemeWeights.e).toBe('number');
        expect(typeof merged.visemeWeights.o).toBe('number');
        expect(typeof merged.preset).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('ReactionsConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialReactionsArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_REACTIONS, partial as Partial<ReactionsConfig>);
        expect(isValidReactionsConfig(merged)).toBe(true);
        expect(Array.isArray(merged.reactions)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('ExpressionsConfig: merged result has all required fields', () => {
    fc.assert(
      fc.property(partialExpressionsArb, (partial) => {
        const merged = deepMergeConfig(DEFAULT_EXPRESSIONS, partial as Partial<ExpressionsConfig>);
        expect(isValidExpressionsConfig(merged)).toBe(true);
        expect(merged.mappings).toBeDefined();
        expect(typeof merged.mappings).toBe('object');
      }),
      { numRuns: 100 }
    );
  });

  it('deepMergeConfig preserves provided values over defaults', () => {
    fc.assert(
      fc.property(
        fc.float({ min: f(0), max: f(360), noNaN: true }),
        fc.float({ min: f(0.5), max: f(2.0), noNaN: true }),
        (rotation, scale) => {
          const partial = { rotation, scale };
          const merged = deepMergeConfig(DEFAULT_TRANSFORM, partial);
          expect(merged.rotation).toBe(rotation);
          expect(merged.scale).toBe(scale);
          // Defaults should still be present
          expect(merged.position).toEqual(DEFAULT_TRANSFORM.position);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deepMergeConfig handles deeply nested partial objects', () => {
    fc.assert(
      fc.property(
        fc.float({ min: f(-10), max: f(10), noNaN: true }),
        (x) => {
          const partial = { position: { x } };
          const merged = deepMergeConfig(DEFAULT_TRANSFORM, partial as Partial<TransformConfig>);
          expect(merged.position.x).toBe(x);
          // Other position fields should come from defaults
          expect(merged.position.y).toBe(DEFAULT_TRANSFORM.position.y);
          expect(merged.position.z).toBe(DEFAULT_TRANSFORM.position.z);
        }
      ),
      { numRuns: 100 }
    );
  });
});
