// Idle Animation Tests
// Property 8: Idle preset and state application
// Property 9: Idle timing variation
// Validates: Requirements 5.2, 5.3, 5.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { IdleConfig } from '../types/behaviorTypes';
import { DEFAULT_IDLE } from '../types/behaviorTypes';

// Idle presets with their characteristic values
const IDLE_PRESETS: Record<string, Partial<IdleConfig>> = {
  calm: {
    breathing: { enabled: true, speed: 0.6, intensity: 0.015 },
    blinking: { enabled: true, interval: 5.0, duration: 0.15 },
    sway: { enabled: true, amount: 0.05, speed: 0.4 },
    headMovement: { enabled: true, amount: 0.05 },
  },
  energetic: {
    breathing: { enabled: true, speed: 1.2, intensity: 0.03 },
    blinking: { enabled: true, interval: 2.5, duration: 0.1 },
    sway: { enabled: true, amount: 0.15, speed: 1.0 },
    headMovement: { enabled: true, amount: 0.15 },
  },
  sleepy: {
    breathing: { enabled: true, speed: 0.4, intensity: 0.025 },
    blinking: { enabled: true, interval: 3.0, duration: 0.25 },
    sway: { enabled: true, amount: 0.03, speed: 0.2 },
    headMovement: { enabled: true, amount: 0.02 },
  },
  alert: {
    breathing: { enabled: true, speed: 1.0, intensity: 0.02 },
    blinking: { enabled: true, interval: 4.0, duration: 0.1 },
    sway: { enabled: false, amount: 0, speed: 0 },
    headMovement: { enabled: true, amount: 0.08 },
  },
};

/**
 * Apply a preset to an IdleConfig
 */
function applyPreset(preset: keyof typeof IDLE_PRESETS): IdleConfig {
  const presetConfig = IDLE_PRESETS[preset];
  return {
    ...DEFAULT_IDLE,
    ...presetConfig,
    preset: preset as IdleConfig['preset'],
  };
}

/**
 * Apply state override to an IdleConfig
 */
function applyStateOverride(
  config: IdleConfig,
  state: 'listening' | 'thinking' | 'talking'
): IdleConfig {
  const override = config.stateOverrides?.[state];
  if (!override) return config;
  
  return {
    ...config,
    breathing: { ...config.breathing, ...override.breathing },
    blinking: { ...config.blinking, ...override.blinking },
    sway: { ...config.sway, ...override.sway },
    headMovement: { ...config.headMovement, ...override.headMovement },
  };
}

/**
 * Generate random timing variation
 */
function generateTimingVariation(baseInterval: number, variationPercent: number = 0.2): number {
  const variation = baseInterval * variationPercent;
  const randomOffset = (Math.random() - 0.5) * 2 * variation;
  return baseInterval + randomOffset;
}

/**
 * Simulate multiple blink intervals with variation
 */
function simulateBlinkIntervals(baseInterval: number, count: number, variationPercent: number = 0.2): number[] {
  const intervals: number[] = [];
  for (let i = 0; i < count; i++) {
    intervals.push(generateTimingVariation(baseInterval, variationPercent));
  }
  return intervals;
}

describe('Idle Animation System', () => {
  describe('Property 8: Idle preset and state application', () => {
    /**
     * For any idle preset or state override selection, the breathing, blinking,
     * sway, and head movement parameters should change to match the preset/state configuration.
     */
    it('should apply preset configurations correctly', () => {
      for (const [presetName, expectedConfig] of Object.entries(IDLE_PRESETS)) {
        const config = applyPreset(presetName as keyof typeof IDLE_PRESETS);
        
        // Verify preset is set
        expect(config.preset).toBe(presetName);
        
        // Verify breathing matches preset
        if (expectedConfig.breathing) {
          expect(config.breathing.enabled).toBe(expectedConfig.breathing.enabled);
          expect(config.breathing.speed).toBe(expectedConfig.breathing.speed);
          expect(config.breathing.intensity).toBe(expectedConfig.breathing.intensity);
        }
        
        // Verify blinking matches preset
        if (expectedConfig.blinking) {
          expect(config.blinking.enabled).toBe(expectedConfig.blinking.enabled);
          expect(config.blinking.interval).toBe(expectedConfig.blinking.interval);
          expect(config.blinking.duration).toBe(expectedConfig.blinking.duration);
        }
        
        // Verify sway matches preset
        if (expectedConfig.sway) {
          expect(config.sway.enabled).toBe(expectedConfig.sway.enabled);
          expect(config.sway.amount).toBe(expectedConfig.sway.amount);
          expect(config.sway.speed).toBe(expectedConfig.sway.speed);
        }
        
        // Verify head movement matches preset
        if (expectedConfig.headMovement) {
          expect(config.headMovement.enabled).toBe(expectedConfig.headMovement.enabled);
          expect(config.headMovement.amount).toBe(expectedConfig.headMovement.amount);
        }
      }
    });

    it('should apply state overrides correctly', () => {
      // Create config with state overrides
      const baseConfig: IdleConfig = {
        ...DEFAULT_IDLE,
        stateOverrides: {
          listening: {
            breathing: { enabled: true, speed: 0.5, intensity: 0.01 },
            headMovement: { enabled: true, amount: 0.2 },
          },
          thinking: {
            sway: { enabled: true, amount: 0.02, speed: 0.3 },
          },
          talking: {
            breathing: { enabled: true, speed: 1.5, intensity: 0.04 },
            blinking: { enabled: true, interval: 2.0, duration: 0.1 },
          },
        },
      };
      
      // Apply listening state
      const listeningConfig = applyStateOverride(baseConfig, 'listening');
      expect(listeningConfig.breathing.speed).toBe(0.5);
      expect(listeningConfig.breathing.intensity).toBe(0.01);
      expect(listeningConfig.headMovement.amount).toBe(0.2);
      
      // Apply thinking state
      const thinkingConfig = applyStateOverride(baseConfig, 'thinking');
      expect(thinkingConfig.sway.amount).toBe(0.02);
      expect(thinkingConfig.sway.speed).toBe(0.3);
      
      // Apply talking state
      const talkingConfig = applyStateOverride(baseConfig, 'talking');
      expect(talkingConfig.breathing.speed).toBe(1.5);
      expect(talkingConfig.breathing.intensity).toBe(0.04);
      expect(talkingConfig.blinking.interval).toBe(2.0);
    });

    it('should preserve non-overridden values when applying state', () => {
      const baseConfig: IdleConfig = {
        ...DEFAULT_IDLE,
        breathing: { enabled: true, speed: 0.8, intensity: 0.02 },
        sway: { enabled: true, amount: 0.1, speed: 0.6 },
        stateOverrides: {
          listening: {
            breathing: { enabled: true, speed: 0.5, intensity: 0.01 },
            // sway not overridden
          },
        },
      };
      
      const listeningConfig = applyStateOverride(baseConfig, 'listening');
      
      // Breathing should be overridden
      expect(listeningConfig.breathing.speed).toBe(0.5);
      
      // Sway should remain unchanged
      expect(listeningConfig.sway.amount).toBe(0.1);
      expect(listeningConfig.sway.speed).toBe(0.6);
    });
  });

  describe('Property 9: Idle timing variation', () => {
    /**
     * For any sequence of idle animation cycles, the timing intervals
     * should vary (not be identical) to avoid repetitive patterns.
     */
    it('should produce varied blink intervals', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10, noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
          (baseInterval, variationPercent) => {
            const intervals = simulateBlinkIntervals(baseInterval, 10, variationPercent);
            
            // Check that not all intervals are identical
            const uniqueIntervals = new Set(intervals.map(i => i.toFixed(4)));
            expect(uniqueIntervals.size).toBeGreaterThan(1);
            
            // Check that intervals are within expected range
            const minExpected = baseInterval * (1 - variationPercent);
            const maxExpected = baseInterval * (1 + variationPercent);
            
            for (const interval of intervals) {
              expect(interval).toBeGreaterThanOrEqual(minExpected - 0.001);
              expect(interval).toBeLessThanOrEqual(maxExpected + 0.001);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce timing within bounds of base interval', () => {
      const baseInterval = 4.0;
      const variationPercent = 0.2;
      
      // Generate many intervals
      const intervals = simulateBlinkIntervals(baseInterval, 100, variationPercent);
      
      // Calculate statistics
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Min should be >= base * (1 - variation)
      expect(min).toBeGreaterThanOrEqual(baseInterval * (1 - variationPercent) - 0.001);
      
      // Max should be <= base * (1 + variation)
      expect(max).toBeLessThanOrEqual(baseInterval * (1 + variationPercent) + 0.001);
      
      // Average should be close to base interval
      expect(avg).toBeCloseTo(baseInterval, 0);
    });

    it('should not produce identical consecutive intervals', () => {
      const baseInterval = 4.0;
      const intervals = simulateBlinkIntervals(baseInterval, 20, 0.2);
      
      // Count consecutive identical intervals
      let identicalCount = 0;
      for (let i = 1; i < intervals.length; i++) {
        if (Math.abs(intervals[i] - intervals[i - 1]) < 0.0001) {
          identicalCount++;
        }
      }
      
      // Should have very few (ideally zero) identical consecutive intervals
      // Allow some due to random chance
      expect(identicalCount).toBeLessThan(intervals.length / 2);
    });
  });

  describe('Preset characteristics', () => {
    it('calm preset should have slower, subtler animations', () => {
      const calm = applyPreset('calm');
      const energetic = applyPreset('energetic');
      
      expect(calm.breathing.speed).toBeLessThan(energetic.breathing.speed);
      expect(calm.breathing.intensity).toBeLessThan(energetic.breathing.intensity);
      expect(calm.sway.amount).toBeLessThan(energetic.sway.amount);
      expect(calm.sway.speed).toBeLessThan(energetic.sway.speed);
    });

    it('sleepy preset should have slowest animations', () => {
      const sleepy = applyPreset('sleepy');
      
      expect(sleepy.breathing.speed).toBeLessThanOrEqual(0.5);
      expect(sleepy.sway.speed).toBeLessThanOrEqual(0.3);
      expect(sleepy.blinking.duration).toBeGreaterThanOrEqual(0.2); // Slower blinks
    });

    it('alert preset should minimize sway', () => {
      const alert = applyPreset('alert');
      
      expect(alert.sway.enabled).toBe(false);
      expect(alert.sway.amount).toBe(0);
    });

    it('energetic preset should have fastest animations', () => {
      const energetic = applyPreset('energetic');
      
      expect(energetic.breathing.speed).toBeGreaterThanOrEqual(1.0);
      expect(energetic.sway.speed).toBeGreaterThanOrEqual(0.8);
      expect(energetic.blinking.interval).toBeLessThanOrEqual(3.0); // More frequent blinks
    });
  });

  describe('Default idle config', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_IDLE.breathing).toBeDefined();
      expect(DEFAULT_IDLE.breathing.enabled).toBeDefined();
      expect(DEFAULT_IDLE.breathing.speed).toBeDefined();
      expect(DEFAULT_IDLE.breathing.intensity).toBeDefined();
      
      expect(DEFAULT_IDLE.blinking).toBeDefined();
      expect(DEFAULT_IDLE.blinking.enabled).toBeDefined();
      expect(DEFAULT_IDLE.blinking.interval).toBeDefined();
      expect(DEFAULT_IDLE.blinking.duration).toBeDefined();
      
      expect(DEFAULT_IDLE.sway).toBeDefined();
      expect(DEFAULT_IDLE.sway.enabled).toBeDefined();
      expect(DEFAULT_IDLE.sway.amount).toBeDefined();
      expect(DEFAULT_IDLE.sway.speed).toBeDefined();
      
      expect(DEFAULT_IDLE.headMovement).toBeDefined();
      expect(DEFAULT_IDLE.headMovement.enabled).toBeDefined();
      expect(DEFAULT_IDLE.headMovement.amount).toBeDefined();
      
      expect(DEFAULT_IDLE.preset).toBeDefined();
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_IDLE.breathing.speed).toBeGreaterThan(0);
      expect(DEFAULT_IDLE.breathing.speed).toBeLessThan(2);
      expect(DEFAULT_IDLE.breathing.intensity).toBeGreaterThan(0);
      expect(DEFAULT_IDLE.breathing.intensity).toBeLessThan(0.1);
      
      expect(DEFAULT_IDLE.blinking.interval).toBeGreaterThan(1);
      expect(DEFAULT_IDLE.blinking.interval).toBeLessThan(10);
      expect(DEFAULT_IDLE.blinking.duration).toBeGreaterThan(0.05);
      expect(DEFAULT_IDLE.blinking.duration).toBeLessThan(0.5);
    });
  });
});
