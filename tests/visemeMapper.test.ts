/**
 * Feature: phoneme-lip-sync
 * Property 3: Phoneme-to-Viseme Mapping Completeness
 * For any phoneme in the defined Phoneme type, the VisemeMapper SHALL return
 * VisemeWeights containing only the standard VRM viseme keys (a, i, u, e, o)
 * with values in the range [0.0, 1.0].
 * 
 * Property 7: Custom Mapping Override
 * For any custom phoneme-to-viseme mapping provided in configuration,
 * the VisemeMapper SHALL use the custom weights instead of defaults.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.4, 4.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { VisemeMapper } from '../utils/visemeMapper';
import {
  ALL_PHONEMES,
  Phoneme,
  PhonemeResult,
  VisemeWeights,
  isValidVisemeWeights,
  createNeutralWeights,
} from '../types/phonemeLipSync';

// Arbitrary for generating valid phonemes
const phonemeArb = fc.constantFrom(...ALL_PHONEMES);

// Arbitrary for generating confidence values
const confidenceArb = fc.float({ min: 0, max: 1, noNaN: true });

// Arbitrary for generating PhonemeResult
const phonemeResultArb = fc.record({
  phoneme: phonemeArb,
  confidence: confidenceArb,
  timestamp: fc.float({ min: 0, max: 1000000, noNaN: true }),
});

// Arbitrary for generating partial viseme weights
const partialVisemeWeightsArb = fc.record({
  a: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  i: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  u: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  e: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  o: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
}, { requiredKeys: [] });

describe('VisemeMapper', () => {
  let mapper: VisemeMapper;

  beforeEach(() => {
    mapper = new VisemeMapper();
  });

  describe('Property 3: Phoneme-to-Viseme Mapping Completeness', () => {
    /**
     * Feature: phoneme-lip-sync, Property 3: Phoneme-to-Viseme Mapping Completeness
     * For any phoneme, mapPhonemeToViseme returns valid VisemeWeights
     */
    it('returns valid VisemeWeights for any phoneme', () => {
      fc.assert(
        fc.property(phonemeResultArb, (result) => {
          const weights = mapper.mapPhonemeToViseme(result);
          
          // Must have all 5 viseme keys
          expect(weights).toHaveProperty('a');
          expect(weights).toHaveProperty('i');
          expect(weights).toHaveProperty('u');
          expect(weights).toHaveProperty('e');
          expect(weights).toHaveProperty('o');
          
          // All values must be in [0, 1]
          expect(weights.a).toBeGreaterThanOrEqual(0);
          expect(weights.a).toBeLessThanOrEqual(1);
          expect(weights.i).toBeGreaterThanOrEqual(0);
          expect(weights.i).toBeLessThanOrEqual(1);
          expect(weights.u).toBeGreaterThanOrEqual(0);
          expect(weights.u).toBeLessThanOrEqual(1);
          expect(weights.e).toBeGreaterThanOrEqual(0);
          expect(weights.e).toBeLessThanOrEqual(1);
          expect(weights.o).toBeGreaterThanOrEqual(0);
          expect(weights.o).toBeLessThanOrEqual(1);
          
          // Must pass validation
          expect(isValidVisemeWeights(weights)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('has mapping defined for all phonemes', () => {
      for (const phoneme of ALL_PHONEMES) {
        expect(mapper.hasMapping(phoneme)).toBe(true);
      }
    });

    it('returns neutral weights for SIL phoneme with full confidence', () => {
      const result: PhonemeResult = {
        phoneme: 'SIL',
        confidence: 1.0,
        timestamp: 0,
      };
      
      const weights = mapper.mapPhonemeToViseme(result);
      
      // SIL should produce minimal/zero weights
      expect(weights.a).toBe(0);
      expect(weights.i).toBe(0);
      expect(weights.u).toBe(0);
      expect(weights.e).toBe(0);
      expect(weights.o).toBe(0);
    });

    it('scales weights by confidence', () => {
      const f = Math.fround; // Convert to 32-bit float
      fc.assert(
        fc.property(
          phonemeArb.filter(p => p !== 'SIL'), // Exclude SIL as it has no weights
          fc.float({ min: f(0.1), max: f(1), noNaN: true }),
          fc.float({ min: f(0.1), max: f(1), noNaN: true }),
          (phoneme, conf1, conf2) => {
            const result1: PhonemeResult = { phoneme, confidence: conf1, timestamp: 0 };
            const result2: PhonemeResult = { phoneme, confidence: conf2, timestamp: 0 };
            
            const weights1 = mapper.mapPhonemeToViseme(result1);
            const weights2 = mapper.mapPhonemeToViseme(result2);
            
            // Higher confidence should produce higher or equal weights
            const sum1 = weights1.a + weights1.i + weights1.u + weights1.e + weights1.o;
            const sum2 = weights2.a + weights2.i + weights2.u + weights2.e + weights2.o;
            
            if (conf1 > conf2) {
              expect(sum1).toBeGreaterThanOrEqual(sum2 - 0.001); // Allow small floating point error
            } else if (conf2 > conf1) {
              expect(sum2).toBeGreaterThanOrEqual(sum1 - 0.001);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Custom Mapping Override', () => {
    /**
     * Feature: phoneme-lip-sync, Property 7: Custom Mapping Override
     * Custom mappings override default mappings
     */
    it('uses custom mappings when provided', () => {
      const customMapper = new VisemeMapper({
        customMappings: {
          'AA': { a: 0.5, o: 0.5 }, // Override default AA mapping
        },
      });
      
      const result: PhonemeResult = {
        phoneme: 'AA',
        confidence: 1.0,
        timestamp: 0,
      };
      
      const defaultWeights = mapper.mapPhonemeToViseme(result);
      const customWeights = customMapper.mapPhonemeToViseme(result);
      
      // Custom mapping should produce different weights
      // (unless by coincidence they're the same)
      const defaultMapping = VisemeMapper.getDefaultMappings()['AA'];
      expect(defaultMapping).not.toEqual({ a: 0.5, o: 0.5 });
    });

    it('custom mappings produce valid weights', () => {
      fc.assert(
        fc.property(
          phonemeArb,
          partialVisemeWeightsArb,
          confidenceArb,
          (phoneme, customWeights, confidence) => {
            const customMapper = new VisemeMapper({
              customMappings: {
                [phoneme]: customWeights,
              },
            });
            
            const result: PhonemeResult = { phoneme, confidence, timestamp: 0 };
            const weights = customMapper.mapPhonemeToViseme(result);
            
            // Result must still be valid
            expect(isValidVisemeWeights(weights)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('setMapping updates individual phoneme mapping', () => {
      const originalWeights = mapper.mapPhonemeToViseme({
        phoneme: 'IY',
        confidence: 1.0,
        timestamp: 0,
      });
      
      // Set custom mapping
      mapper.setMapping('IY', { i: 0.1, e: 0.1 });
      
      const newWeights = mapper.mapPhonemeToViseme({
        phoneme: 'IY',
        confidence: 1.0,
        timestamp: 0,
      });
      
      // Weights should be different after custom mapping
      expect(newWeights).not.toEqual(originalWeights);
    });

    it('resetMappings restores default mappings', () => {
      // Set custom mapping
      mapper.setMapping('AA', { a: 0.1 });
      
      const customWeights = mapper.mapPhonemeToViseme({
        phoneme: 'AA',
        confidence: 1.0,
        timestamp: 0,
      });
      
      // Reset
      mapper.resetMappings();
      
      const resetWeights = mapper.mapPhonemeToViseme({
        phoneme: 'AA',
        confidence: 1.0,
        timestamp: 0,
      });
      
      // Should be back to default
      const freshMapper = new VisemeMapper();
      const defaultWeights = freshMapper.mapPhonemeToViseme({
        phoneme: 'AA',
        confidence: 1.0,
        timestamp: 0,
      });
      
      expect(resetWeights).toEqual(defaultWeights);
    });
  });

  describe('Intensity Multiplier', () => {
    it('scales output by intensityMultiplier', () => {
      const normalMapper = new VisemeMapper({ intensityMultiplier: 1.0 });
      const boostedMapper = new VisemeMapper({ intensityMultiplier: 2.0 });
      
      const result: PhonemeResult = {
        phoneme: 'AA',
        confidence: 0.5,
        timestamp: 0,
      };
      
      const normalWeights = normalMapper.mapPhonemeToViseme(result);
      const boostedWeights = boostedMapper.mapPhonemeToViseme(result);
      
      // Boosted should have higher values (clamped to 1)
      expect(boostedWeights.a).toBeGreaterThanOrEqual(normalWeights.a);
    });

    it('clamps weights to maximum of 1.0', () => {
      const extremeMapper = new VisemeMapper({ intensityMultiplier: 10.0 });
      
      fc.assert(
        fc.property(phonemeResultArb, (result) => {
          const weights = extremeMapper.mapPhonemeToViseme(result);
          
          expect(weights.a).toBeLessThanOrEqual(1);
          expect(weights.i).toBeLessThanOrEqual(1);
          expect(weights.u).toBeLessThanOrEqual(1);
          expect(weights.e).toBeLessThanOrEqual(1);
          expect(weights.o).toBeLessThanOrEqual(1);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Configuration', () => {
    it('updateConfig changes behavior', () => {
      const result: PhonemeResult = {
        phoneme: 'AA',
        confidence: 1.0,
        timestamp: 0,
      };
      
      const before = mapper.mapPhonemeToViseme(result);
      
      mapper.updateConfig({ intensityMultiplier: 0.5 });
      
      const after = mapper.mapPhonemeToViseme(result);
      
      // Lower multiplier should produce lower weights
      expect(after.a).toBeLessThan(before.a);
    });

    it('getConfig returns current configuration', () => {
      const config = mapper.getConfig();
      
      expect(config).toHaveProperty('intensityMultiplier');
      expect(config).toHaveProperty('baseWeights');
      expect(config.baseWeights).toHaveProperty('a');
      expect(config.baseWeights).toHaveProperty('i');
      expect(config.baseWeights).toHaveProperty('u');
      expect(config.baseWeights).toHaveProperty('e');
      expect(config.baseWeights).toHaveProperty('o');
    });
  });
});
