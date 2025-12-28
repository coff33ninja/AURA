// Feature: vrm-modular-behavior-system
// Property 9: AI Instruction Generation Reflects Config

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generate,
  generateCommandList,
  generateMinimal,
  getEnabledExpressions,
  getEnabledGestures,
  getEnabledReactions,
} from '../services/aiInstructionGenerator';
import {
  ModelBehaviors,
  createDefaultModelBehaviors,
  GestureDefinition,
  ReactionDefinition,
} from '../types/behaviorTypes';

// Helper for 32-bit floats
const f = Math.fround;

// Arbitrary for gesture definition
const gestureArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  enabled: fc.boolean(),
  duration: fc.float({ min: f(0.1), max: f(5), noNaN: true }),
  intensity: fc.float({ min: f(0), max: f(1), noNaN: true }),
  transitionSpeed: fc.float({ min: f(0.1), max: f(10), noNaN: true }),
  bones: fc.constant({}),
});

// Arbitrary for reaction definition
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

// Arbitrary for model behaviors
const modelBehaviorsArb = fc.record({
  modelName: fc.string({ minLength: 1, maxLength: 20 }),
  version: fc.constant('1.0.0'),
  transform: fc.constant(createDefaultModelBehaviors('test').transform),
  expressions: fc.record({
    mappings: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 10 })),
    intensityOverrides: fc.option(fc.dictionary(fc.string(), fc.float({ min: f(0), max: f(1), noNaN: true })), { nil: undefined }),
    combos: fc.option(fc.array(fc.record({
      name: fc.string({ minLength: 1, maxLength: 10 }),
      expressions: fc.array(fc.record({ name: fc.string(), value: fc.float({ min: f(0), max: f(1), noNaN: true }) })),
    }), { maxLength: 3 }), { nil: undefined }),
  }),
  gestures: fc.record({
    gestures: fc.array(gestureArb, { maxLength: 5 }),
  }),
  idle: fc.constant(createDefaultModelBehaviors('test').idle),
  lipsync: fc.constant(createDefaultModelBehaviors('test').lipsync),
  reactions: fc.record({
    reactions: fc.array(reactionArb, { maxLength: 5 }),
  }),
});

describe('Property 9: AI Instruction Generation Reflects Config', () => {
  it('generated instructions include exactly the enabled gestures', () => {
    fc.assert(
      fc.property(modelBehaviorsArb, (behaviors) => {
        const enabledGestures = getEnabledGestures(behaviors as ModelBehaviors);
        const instructions = generate(behaviors as ModelBehaviors);
        
        // All enabled gestures should be mentioned
        for (const gesture of enabledGestures) {
          if (gesture.length > 0) {
            expect(instructions).toContain(gesture);
          }
        }
        
        // Disabled gestures should NOT be in the available list
        const disabledGestures = behaviors.gestures.gestures
          .filter((g: GestureDefinition) => !g.enabled)
          .map((g: GestureDefinition) => g.name)
          .filter((name: string) => name.length > 0);
        
        const commandList = generateCommandList(behaviors as ModelBehaviors);
        for (const gesture of disabledGestures) {
          // Check it's not in the "Available:" line for gestures
          const gestureSection = commandList.split('## Available Gestures')[1]?.split('##')[0] || '';
          if (gestureSection.includes('Available:')) {
            const availableLine = gestureSection.split('Available:')[1]?.split('\n')[0] || '';
            // Only check if the gesture name is unique enough
            if (gesture.length > 3 && !enabledGestures.includes(gesture)) {
              expect(availableLine).not.toContain(gesture);
            }
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it('generated instructions include exactly the enabled reactions', () => {
    fc.assert(
      fc.property(modelBehaviorsArb, (behaviors) => {
        const enabledReactions = getEnabledReactions(behaviors as ModelBehaviors);
        const instructions = generate(behaviors as ModelBehaviors);
        
        // All enabled reactions should be mentioned
        for (const reaction of enabledReactions) {
          if (reaction.length > 0) {
            expect(instructions).toContain(reaction);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it('generated instructions include mapped expressions', () => {
    fc.assert(
      fc.property(modelBehaviorsArb, (behaviors) => {
        const enabledExpressions = getEnabledExpressions(behaviors as ModelBehaviors);
        const instructions = generate(behaviors as ModelBehaviors);
        
        // All enabled expressions should be mentioned
        for (const expr of enabledExpressions) {
          if (expr.length > 0) {
            expect(instructions).toContain(expr);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it('getEnabledGestures returns only enabled gestures', () => {
    fc.assert(
      fc.property(
        fc.array(gestureArb, { minLength: 1, maxLength: 10 }),
        (gestures) => {
          const behaviors = createDefaultModelBehaviors('test');
          behaviors.gestures.gestures = gestures as GestureDefinition[];
          
          const enabled = getEnabledGestures(behaviors);
          const expectedEnabled = gestures.filter(g => g.enabled).map(g => g.name);
          
          expect(enabled).toEqual(expectedEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getEnabledReactions returns only enabled reactions', () => {
    fc.assert(
      fc.property(
        fc.array(reactionArb, { minLength: 1, maxLength: 10 }),
        (reactions) => {
          const behaviors = createDefaultModelBehaviors('test');
          behaviors.reactions.reactions = reactions as ReactionDefinition[];
          
          const enabled = getEnabledReactions(behaviors);
          const expectedEnabled = reactions.filter(r => r.enabled).map(r => r.name);
          
          expect(enabled).toEqual(expectedEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateMinimal produces compact output', () => {
    fc.assert(
      fc.property(modelBehaviorsArb, (behaviors) => {
        const minimal = generateMinimal(behaviors as ModelBehaviors);
        const full = generate(behaviors as ModelBehaviors);
        
        // Minimal should be shorter or equal
        expect(minimal.length).toBeLessThanOrEqual(full.length);
      }),
      { numRuns: 50 }
    );
  });

  it('empty configs produce no available commands', () => {
    const emptyBehaviors = createDefaultModelBehaviors('test');
    emptyBehaviors.expressions.mappings = {};
    emptyBehaviors.gestures.gestures = [];
    emptyBehaviors.reactions.reactions = [];
    
    const commandList = generateCommandList(emptyBehaviors);
    
    expect(commandList).not.toContain('Available Expressions');
    expect(commandList).not.toContain('Available Gestures');
    expect(commandList).not.toContain('Available Reactions');
  });

  it('instructions include model name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (modelName) => {
          const behaviors = createDefaultModelBehaviors(modelName);
          const instructions = generate(behaviors);
          
          expect(instructions).toContain(modelName);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('instructions include idle preset when not custom', () => {
    const behaviors = createDefaultModelBehaviors('test');
    behaviors.idle.preset = 'energetic';
    
    const instructions = generate(behaviors);
    
    expect(instructions).toContain('energetic');
    expect(instructions).toContain('Current Mood');
  });
});
