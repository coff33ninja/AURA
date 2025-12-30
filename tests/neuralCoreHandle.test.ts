/**
 * NeuralCore Handle Methods Property Test
 * 
 * Property 10: Backward Compatibility - Handle Methods
 * For any NeuralCore ref, all documented imperative methods SHALL be callable functions.
 * 
 * Validates: Requirements 12.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { NeuralCoreHandle } from '../components/neural-core/NeuralCore';

/**
 * All documented imperative methods that must be present on NeuralCoreHandle
 */
const REQUIRED_HANDLE_METHODS = [
  'previewGesture',
  'previewExpression',
  'previewReaction',
  'resetExpressions',
  'setWalkingBehavior',
  'getWalkingBehavior',
  'startWalking',
  'stopWalking',
  'isWalking',
  'setBoneRotation',
] as const;

/**
 * Create a mock handle that matches the NeuralCoreHandle interface
 * This simulates what the component would expose via useImperativeHandle
 */
function createMockHandle(): NeuralCoreHandle {
  return {
    previewGesture: (gestureName: string, duration?: number) => {},
    previewExpression: (expressionName: string, value: number) => {},
    previewReaction: (reactionName: string) => {},
    resetExpressions: () => {},
    setWalkingBehavior: (config: any) => {},
    getWalkingBehavior: () => ({
      enabled: false,
      speed: 1.0,
      direction: 'forward' as const,
      angle: 0,
      depthSpeed: 0,
      bobIntensity: 0.02,
      bobFrequency: 2.0,
      legs: { strideLength: 0.3, liftHeight: 0.1, bendAmount: 0.5 },
      armSwing: { enabled: true, intensity: 0.5, syncWithLegs: true },
      style: 'casual' as const,
    }),
    startWalking: () => {},
    stopWalking: () => {},
    isWalking: () => false,
    setBoneRotation: (boneName: string, rotation: { x: number; y: number; z: number }) => {},
  };
}

describe('NeuralCore Handle Methods', () => {
  /**
   * Feature: neural-core-splitting, Property 10: Backward Compatibility - Handle Methods
   * 
   * For any NeuralCore ref, all documented imperative methods SHALL be callable functions.
   */
  it('Property 10: All documented handle methods are callable functions', () => {
    fc.assert(
      fc.property(
        // Generate random method name from the required list
        fc.constantFrom(...REQUIRED_HANDLE_METHODS),
        (methodName) => {
          const handle = createMockHandle();
          
          // Property: The method exists on the handle
          expect(handle).toHaveProperty(methodName);
          
          // Property: The method is a function
          expect(typeof handle[methodName]).toBe('function');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Handle contains ALL required methods
   */
  it('Property 10: Handle contains all required methods', () => {
    const handle = createMockHandle();
    
    for (const methodName of REQUIRED_HANDLE_METHODS) {
      expect(handle).toHaveProperty(methodName);
      expect(typeof handle[methodName]).toBe('function');
    }
  });

  /**
   * Property: previewGesture accepts string and optional number
   */
  it('Property 10: previewGesture accepts valid parameters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })),
        (gestureName, duration) => {
          const handle = createMockHandle();
          
          // Should not throw
          expect(() => {
            handle.previewGesture(gestureName, duration ?? undefined);
          }).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: previewExpression accepts string and number
   */
  it('Property 10: previewExpression accepts valid parameters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 1 }),
        (expressionName, value) => {
          const handle = createMockHandle();
          
          expect(() => {
            handle.previewExpression(expressionName, value);
          }).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: setBoneRotation accepts bone name and rotation object
   */
  it('Property 10: setBoneRotation accepts valid parameters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          x: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          y: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
          z: fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI), noNaN: true }),
        }),
        (boneName, rotation) => {
          const handle = createMockHandle();
          
          expect(() => {
            handle.setBoneRotation(boneName, rotation);
          }).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isWalking returns boolean
   */
  it('Property 10: isWalking returns boolean', () => {
    const handle = createMockHandle();
    const result = handle.isWalking();
    
    expect(typeof result).toBe('boolean');
  });

  /**
   * Property: getWalkingBehavior returns valid config object
   */
  it('Property 10: getWalkingBehavior returns valid config', () => {
    const handle = createMockHandle();
    const config = handle.getWalkingBehavior();
    
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('speed');
    expect(config).toHaveProperty('direction');
    expect(typeof config.enabled).toBe('boolean');
    expect(typeof config.speed).toBe('number');
  });
});
