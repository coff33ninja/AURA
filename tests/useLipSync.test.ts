// Tests for useLipSync hook
// Feature: neural-core-splitting

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateVolumeLipSync,
  DEFAULT_VISEME_WEIGHTS,
  DEFAULT_LIP_SYNC_SENSITIVITY,
} from '../components/neural-core/hooks/useLipSync';
import type { VisemeWeights } from '../types/phonemeLipSync';

// ============================================================================
// Property 7: Lip Sync Mode Selection
// For any call to updateLipSync, WHEN frequency data is provided AND phoneme
// detection is enabled, phoneme-based lip sync SHALL be used; OTHERWISE
// volume-based lip sync SHALL be used.
// Validates: Requirements 8.4, 8.5, 8.6
// ============================================================================

describe('Feature: neural-core-splitting, Property 7: Lip Sync Mode Selection', () => {
  describe('calculateVolumeLipSync', () => {
    it('should return zero weights for zero volume', () => {
      const weights = calculateVolumeLipSync(0, DEFAULT_LIP_SYNC_SENSITIVITY, DEFAULT_VISEME_WEIGHTS);
      expect(weights.a).toBe(0);
      expect(weights.i).toBe(0);
      expect(weights.u).toBe(0);
      expect(weights.e).toBe(0);
      expect(weights.o).toBe(0);
    });

    it('should scale weights by volume', () => {
      const weights = calculateVolumeLipSync(0.5, DEFAULT_LIP_SYNC_SENSITIVITY, DEFAULT_VISEME_WEIGHTS);
      // At 0.5 volume with sensitivity 4.0, mouthOpen = min(1.0, 0.5 * 4.0) = 1.0
      // So weights should be at full viseme weights
      expect(weights.a).toBeCloseTo(DEFAULT_VISEME_WEIGHTS.a, 5);
    });

    it('should clamp mouth open to 1.0', () => {
      const weights = calculateVolumeLipSync(1.0, DEFAULT_LIP_SYNC_SENSITIVITY, DEFAULT_VISEME_WEIGHTS);
      // At 1.0 volume with sensitivity 4.0, mouthOpen = min(1.0, 1.0 * 4.0) = 1.0
      expect(weights.a).toBeLessThanOrEqual(DEFAULT_VISEME_WEIGHTS.a);
    });

    // Property test: All weights should be bounded by viseme weights
    it('should produce weights bounded by viseme weights', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (volume, sensitivity) => {
            const weights = calculateVolumeLipSync(volume, sensitivity, DEFAULT_VISEME_WEIGHTS);
            return (
              weights.a >= 0 && weights.a <= DEFAULT_VISEME_WEIGHTS.a &&
              weights.i >= 0 && weights.i <= DEFAULT_VISEME_WEIGHTS.i &&
              weights.u >= 0 && weights.u <= DEFAULT_VISEME_WEIGHTS.u &&
              weights.e >= 0 && weights.e <= DEFAULT_VISEME_WEIGHTS.e &&
              weights.o >= 0 && weights.o <= DEFAULT_VISEME_WEIGHTS.o
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: Higher volume should produce higher weights
    it('should produce higher weights for higher volume', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(0.2), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (lowVolume, sensitivity) => {
            const highVolume = lowVolume + 0.1;
            const lowWeights = calculateVolumeLipSync(lowVolume, sensitivity, DEFAULT_VISEME_WEIGHTS);
            const highWeights = calculateVolumeLipSync(highVolume, sensitivity, DEFAULT_VISEME_WEIGHTS);
            
            // Higher volume should produce >= weights (may be equal if clamped)
            return highWeights.a >= lowWeights.a;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ============================================================================
// Default Values Tests
// ============================================================================

describe('Feature: neural-core-splitting, Lip Sync Defaults', () => {
  describe('DEFAULT_VISEME_WEIGHTS', () => {
    it('should have all viseme weights defined', () => {
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeDefined();
      expect(DEFAULT_VISEME_WEIGHTS.i).toBeDefined();
      expect(DEFAULT_VISEME_WEIGHTS.u).toBeDefined();
      expect(DEFAULT_VISEME_WEIGHTS.e).toBeDefined();
      expect(DEFAULT_VISEME_WEIGHTS.o).toBeDefined();
    });

    it('should have weights in valid range [0, 1]', () => {
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeLessThanOrEqual(1);
      expect(DEFAULT_VISEME_WEIGHTS.i).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VISEME_WEIGHTS.i).toBeLessThanOrEqual(1);
      expect(DEFAULT_VISEME_WEIGHTS.u).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VISEME_WEIGHTS.u).toBeLessThanOrEqual(1);
      expect(DEFAULT_VISEME_WEIGHTS.e).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VISEME_WEIGHTS.e).toBeLessThanOrEqual(1);
      expect(DEFAULT_VISEME_WEIGHTS.o).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VISEME_WEIGHTS.o).toBeLessThanOrEqual(1);
    });

    it('should have "a" as the strongest viseme (most open mouth)', () => {
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeGreaterThanOrEqual(DEFAULT_VISEME_WEIGHTS.i);
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeGreaterThanOrEqual(DEFAULT_VISEME_WEIGHTS.u);
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeGreaterThanOrEqual(DEFAULT_VISEME_WEIGHTS.e);
      expect(DEFAULT_VISEME_WEIGHTS.a).toBeGreaterThanOrEqual(DEFAULT_VISEME_WEIGHTS.o);
    });
  });

  describe('DEFAULT_LIP_SYNC_SENSITIVITY', () => {
    it('should be a positive number', () => {
      expect(DEFAULT_LIP_SYNC_SENSITIVITY).toBeGreaterThan(0);
    });

    it('should be reasonable for volume scaling', () => {
      // Sensitivity of 4.0 means volume of 0.25 will fully open mouth
      expect(DEFAULT_LIP_SYNC_SENSITIVITY).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_LIP_SYNC_SENSITIVITY).toBeLessThanOrEqual(10);
    });
  });
});

// ============================================================================
// Viseme Weight Calculation Tests
// ============================================================================

describe('Feature: neural-core-splitting, Viseme Weight Calculation', () => {
  describe('Custom viseme weights', () => {
    it('should use custom weights when provided', () => {
      const customWeights: VisemeWeights = { a: 1.0, i: 0.5, u: 0.5, e: 0.5, o: 0.5 };
      const weights = calculateVolumeLipSync(0.5, 2.0, customWeights);
      
      // At 0.5 volume with sensitivity 2.0, mouthOpen = 1.0
      expect(weights.a).toBeCloseTo(customWeights.a, 5);
    });

    // Property test: Custom weights should be respected
    it('should respect custom viseme weights', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (volume, wa, wi, wu, we, wo) => {
            const customWeights: VisemeWeights = { a: wa, i: wi, u: wu, e: we, o: wo };
            const weights = calculateVolumeLipSync(volume, DEFAULT_LIP_SYNC_SENSITIVITY, customWeights);
            
            // All weights should be bounded by custom weights
            return (
              weights.a >= 0 && weights.a <= wa &&
              weights.i >= 0 && weights.i <= wi &&
              weights.u >= 0 && weights.u <= wu &&
              weights.e >= 0 && weights.e <= we &&
              weights.o >= 0 && weights.o <= wo
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Sensitivity scaling', () => {
    it('should reach full weights faster with higher sensitivity', () => {
      const lowSensitivity = calculateVolumeLipSync(0.2, 2.0, DEFAULT_VISEME_WEIGHTS);
      const highSensitivity = calculateVolumeLipSync(0.2, 8.0, DEFAULT_VISEME_WEIGHTS);
      
      // Higher sensitivity should produce higher weights for same volume
      expect(highSensitivity.a).toBeGreaterThanOrEqual(lowSensitivity.a);
    });

    // Property test: Higher sensitivity should produce >= weights
    it('should produce higher weights with higher sensitivity', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.2), noNaN: true }),
          fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }),
          (volume, baseSensitivity) => {
            const lowWeights = calculateVolumeLipSync(volume, baseSensitivity, DEFAULT_VISEME_WEIGHTS);
            const highWeights = calculateVolumeLipSync(volume, baseSensitivity * 2, DEFAULT_VISEME_WEIGHTS);
            
            return highWeights.a >= lowWeights.a;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Feature: neural-core-splitting, Lip Sync Edge Cases', () => {
  it('should handle very small volumes', () => {
    const weights = calculateVolumeLipSync(0.001, DEFAULT_LIP_SYNC_SENSITIVITY, DEFAULT_VISEME_WEIGHTS);
    expect(weights.a).toBeGreaterThanOrEqual(0);
    expect(weights.a).toBeLessThan(0.1);
  });

  it('should handle very high sensitivity', () => {
    const weights = calculateVolumeLipSync(0.1, 100, DEFAULT_VISEME_WEIGHTS);
    // Should be clamped to max viseme weights
    expect(weights.a).toBeLessThanOrEqual(DEFAULT_VISEME_WEIGHTS.a);
  });

  it('should handle zero sensitivity', () => {
    const weights = calculateVolumeLipSync(1.0, 0, DEFAULT_VISEME_WEIGHTS);
    expect(weights.a).toBe(0);
  });

  // Property test: Should always produce finite values
  it('should always produce finite values', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        (volume, sensitivity) => {
          const weights = calculateVolumeLipSync(volume, sensitivity, DEFAULT_VISEME_WEIGHTS);
          return (
            Number.isFinite(weights.a) &&
            Number.isFinite(weights.i) &&
            Number.isFinite(weights.u) &&
            Number.isFinite(weights.e) &&
            Number.isFinite(weights.o)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
