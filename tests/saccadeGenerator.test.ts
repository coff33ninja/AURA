// Saccade Generator Tests
// Property 11: Saccade generation within bounds
// Validates: Requirements 7.1, 7.2, 7.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateSaccade,
  getNextSaccadeInterval,
  updateSaccadeState,
  blendWithGaze,
  createSaccadeState,
  isValidSaccadeOffset,
  degToRad,
  saccadeToRadians,
  DEFAULT_SACCADE_CONFIG,
} from '../utils/saccadeGenerator';
import type { SaccadeConfig, SaccadeState } from '../types/enhancementTypes';

describe('Saccade Generator', () => {
  describe('Property 11: Saccade generation within bounds', () => {
    /**
     * For any saccade configuration, generated saccades should have
     * amplitude within the configured range and occur at intervals
     * within minInterval to maxInterval.
     */
    it('should generate saccades within amplitude bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10, noNaN: true }), // amplitude
          (amplitude) => {
            const config: SaccadeConfig = {
              enabled: true,
              minInterval: 0.5,
              maxInterval: 2.0,
              amplitude,
            };
            
            // Generate many saccades and check bounds
            for (let i = 0; i < 50; i++) {
              const saccade = generateSaccade(config);
              const magnitude = Math.sqrt(saccade.x * saccade.x + saccade.y * saccade.y);
              
              expect(magnitude).toBeLessThanOrEqual(amplitude + 0.001);
              expect(magnitude).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate intervals within min/max bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: 2, noNaN: true }), // minInterval
          fc.float({ min: 2, max: 10, noNaN: true }),  // maxInterval
          (minInterval, maxInterval) => {
            const config: SaccadeConfig = {
              enabled: true,
              minInterval,
              maxInterval,
              amplitude: 3.0,
            };
            
            // Generate many intervals and check bounds
            for (let i = 0; i < 50; i++) {
              const interval = getNextSaccadeInterval(config);
              
              expect(interval).toBeGreaterThanOrEqual(minInterval - 0.001);
              expect(interval).toBeLessThanOrEqual(maxInterval + 0.001);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return zero offset when disabled', () => {
      const config: SaccadeConfig = {
        enabled: false,
        minInterval: 0.5,
        maxInterval: 2.0,
        amplitude: 5.0,
      };
      
      for (let i = 0; i < 10; i++) {
        const saccade = generateSaccade(config);
        expect(saccade.x).toBe(0);
        expect(saccade.y).toBe(0);
      }
    });
  });

  describe('updateSaccadeState', () => {
    it('should trigger new saccade when time expires', () => {
      const config: SaccadeConfig = {
        enabled: true,
        minInterval: 0.5,
        maxInterval: 2.0,
        amplitude: 3.0,
      };
      
      const initialState: SaccadeState = {
        offsetX: 0,
        offsetY: 0,
        nextSaccadeTime: 0.1, // About to trigger
      };
      
      // Update with enough time to trigger
      const newState = updateSaccadeState(initialState, config, 0.2);
      
      // Should have new offset (may be zero by chance, but nextSaccadeTime should reset)
      expect(newState.nextSaccadeTime).toBeGreaterThanOrEqual(config.minInterval);
      expect(newState.nextSaccadeTime).toBeLessThanOrEqual(config.maxInterval);
    });

    it('should decay offset over time', () => {
      const config: SaccadeConfig = {
        enabled: true,
        minInterval: 0.5,
        maxInterval: 2.0,
        amplitude: 3.0,
      };
      
      const initialState: SaccadeState = {
        offsetX: 2.0,
        offsetY: 1.5,
        nextSaccadeTime: 5.0, // Won't trigger soon
      };
      
      // Update with small delta
      const newState = updateSaccadeState(initialState, config, 0.1);
      
      // Offset should decay (get smaller)
      expect(Math.abs(newState.offsetX)).toBeLessThan(Math.abs(initialState.offsetX));
      expect(Math.abs(newState.offsetY)).toBeLessThan(Math.abs(initialState.offsetY));
    });

    it('should reset offset when disabled', () => {
      const config: SaccadeConfig = {
        enabled: false,
        minInterval: 0.5,
        maxInterval: 2.0,
        amplitude: 3.0,
      };
      
      const initialState: SaccadeState = {
        offsetX: 2.0,
        offsetY: 1.5,
        nextSaccadeTime: 1.0,
      };
      
      const newState = updateSaccadeState(initialState, config, 0.1);
      
      expect(newState.offsetX).toBe(0);
      expect(newState.offsetY).toBe(0);
    });
  });

  describe('blendWithGaze', () => {
    it('should add saccade offset to gaze direction', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -30, max: 30, noNaN: true }), // gazeX
          fc.float({ min: -30, max: 30, noNaN: true }), // gazeY
          fc.float({ min: -5, max: 5, noNaN: true }),   // saccadeX
          fc.float({ min: -5, max: 5, noNaN: true }),   // saccadeY
          (gazeX, gazeY, saccadeX, saccadeY) => {
            const gaze = { x: gazeX, y: gazeY };
            const saccade = { x: saccadeX, y: saccadeY };
            
            const result = blendWithGaze(gaze, saccade, 1.0);
            
            expect(result.x).toBeCloseTo(gazeX + saccadeX, 5);
            expect(result.y).toBeCloseTo(gazeY + saccadeY, 5);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should scale saccade by blend factor', () => {
      const gaze = { x: 10, y: 5 };
      const saccade = { x: 2, y: 1 };
      
      const result50 = blendWithGaze(gaze, saccade, 0.5);
      expect(result50.x).toBeCloseTo(10 + 2 * 0.5, 5);
      expect(result50.y).toBeCloseTo(5 + 1 * 0.5, 5);
      
      const result0 = blendWithGaze(gaze, saccade, 0);
      expect(result0.x).toBeCloseTo(10, 5);
      expect(result0.y).toBeCloseTo(5, 5);
    });

    it('should clamp blend factor to 0-1', () => {
      const gaze = { x: 10, y: 5 };
      const saccade = { x: 2, y: 1 };
      
      // Blend factor > 1 should be clamped to 1
      const resultHigh = blendWithGaze(gaze, saccade, 2.0);
      expect(resultHigh.x).toBeCloseTo(12, 5);
      expect(resultHigh.y).toBeCloseTo(6, 5);
      
      // Blend factor < 0 should be clamped to 0
      const resultLow = blendWithGaze(gaze, saccade, -1.0);
      expect(resultLow.x).toBeCloseTo(10, 5);
      expect(resultLow.y).toBeCloseTo(5, 5);
    });
  });

  describe('createSaccadeState', () => {
    it('should create state with zero offset', () => {
      const state = createSaccadeState();
      
      expect(state.offsetX).toBe(0);
      expect(state.offsetY).toBe(0);
    });

    it('should create state with positive next saccade time', () => {
      const state = createSaccadeState();
      
      expect(state.nextSaccadeTime).toBeGreaterThan(0);
    });
  });

  describe('isValidSaccadeOffset', () => {
    it('should return true for offsets within bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10, noNaN: true }), // maxAmplitude
          (maxAmplitude) => {
            // Generate offset within bounds
            const angle = Math.random() * Math.PI * 2;
            const magnitude = Math.random() * maxAmplitude * 0.9; // 90% of max
            const offset = {
              x: Math.cos(angle) * magnitude,
              y: Math.sin(angle) * magnitude,
            };
            
            expect(isValidSaccadeOffset(offset, maxAmplitude)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return false for offsets exceeding bounds', () => {
      const offset = { x: 10, y: 10 }; // Magnitude ~14.14
      expect(isValidSaccadeOffset(offset, 5)).toBe(false);
    });
  });

  describe('degToRad and saccadeToRadians', () => {
    it('should convert degrees to radians correctly', () => {
      expect(degToRad(0)).toBeCloseTo(0, 5);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(degToRad(180)).toBeCloseTo(Math.PI, 5);
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2, 5);
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should convert saccade offset to radians', () => {
      const offset = { x: 90, y: 45 };
      const radians = saccadeToRadians(offset);
      
      expect(radians.x).toBeCloseTo(Math.PI / 2, 5);
      expect(radians.y).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('DEFAULT_SACCADE_CONFIG', () => {
    it('should have sensible default values', () => {
      expect(DEFAULT_SACCADE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_SACCADE_CONFIG.minInterval).toBeGreaterThan(0);
      expect(DEFAULT_SACCADE_CONFIG.maxInterval).toBeGreaterThan(DEFAULT_SACCADE_CONFIG.minInterval);
      expect(DEFAULT_SACCADE_CONFIG.amplitude).toBeGreaterThan(0);
      expect(DEFAULT_SACCADE_CONFIG.amplitude).toBeLessThan(10); // Reasonable eye movement
    });
  });
});
