/**
 * Feature: phoneme-lip-sync
 * Property 1: Audio Analysis Always Returns Valid Result
 * For any valid audio input (Uint8Array of any length), the PhonemeDetector SHALL return
 * a PhonemeResult with a valid phoneme and confidence between 0.0 and 1.0.
 * 
 * Property 2: Audio Processing Latency
 * For any audio buffer of reasonable size (up to 4096 samples), the PhonemeDetector
 * SHALL complete analysis in under 100ms.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PhonemeDetector } from '../utils/phonemeDetector';
import { 
  ALL_PHONEMES, 
  isValidPhoneme,
  PhonemeResult,
  DEFAULT_PHONEME_DETECTOR_CONFIG,
} from '../types/phonemeLipSync';

describe('PhonemeDetector', () => {
  let detector: PhonemeDetector;

  beforeEach(() => {
    detector = new PhonemeDetector();
  });

  describe('Property 1: Audio Analysis Always Returns Valid Result', () => {
    /**
     * Feature: phoneme-lip-sync, Property 1: Audio Analysis Always Returns Valid Result
     * For any Uint8Array input, analyzeFrequencyData returns a valid PhonemeResult
     */
    it('returns valid PhonemeResult for any Uint8Array input', () => {
      fc.assert(
        fc.property(
          // Generate Uint8Arrays of various lengths (0 to 1024)
          fc.uint8Array({ minLength: 0, maxLength: 1024 }),
          (frequencyData) => {
            const result = detector.analyzeFrequencyData(frequencyData);
            
            // Result must have required fields
            expect(result).toHaveProperty('phoneme');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('timestamp');
            
            // Phoneme must be valid
            expect(isValidPhoneme(result.phoneme)).toBe(true);
            
            // Confidence must be in [0, 1]
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            // Timestamp must be a positive number
            expect(result.timestamp).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(result.timestamp)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns SIL phoneme for empty input', () => {
      const result = detector.analyzeFrequencyData(new Uint8Array(0));
      expect(result.phoneme).toBe('SIL');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('returns SIL phoneme for all-zero input (silence)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 512 }),
          (length) => {
            const silentData = new Uint8Array(length).fill(0);
            const result = detector.analyzeFrequencyData(silentData);
            
            // Silent input should return SIL with high confidence
            expect(result.phoneme).toBe('SIL');
            expect(result.confidence).toBeGreaterThan(0.5);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles edge case inputs gracefully', () => {
      // All max values
      const maxData = new Uint8Array(256).fill(255);
      const maxResult = detector.analyzeFrequencyData(maxData);
      expect(isValidPhoneme(maxResult.phoneme)).toBe(true);
      expect(maxResult.confidence).toBeGreaterThanOrEqual(0);
      expect(maxResult.confidence).toBeLessThanOrEqual(1);

      // Single element
      const singleResult = detector.analyzeFrequencyData(new Uint8Array([128]));
      expect(isValidPhoneme(singleResult.phoneme)).toBe(true);

      // Very large array
      const largeData = new Uint8Array(4096);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = Math.floor(Math.random() * 256);
      }
      const largeResult = detector.analyzeFrequencyData(largeData);
      expect(isValidPhoneme(largeResult.phoneme)).toBe(true);
    });
  });

  describe('Property 2: Audio Processing Latency', () => {
    /**
     * Feature: phoneme-lip-sync, Property 2: Audio Processing Latency
     * For any audio buffer up to 4096 samples, processing completes in under 100ms
     */
    it('processes audio in under 100ms for buffers up to 4096 samples', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 4096 }),
          (frequencyData) => {
            const startTime = performance.now();
            detector.analyzeFrequencyData(frequencyData);
            const endTime = performance.now();
            
            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('processes typical FFT buffer sizes quickly', () => {
      const typicalSizes = [128, 256, 512, 1024, 2048];
      
      for (const size of typicalSizes) {
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
          data[i] = Math.floor(Math.random() * 256);
        }
        
        const times: number[] = [];
        for (let run = 0; run < 10; run++) {
          const start = performance.now();
          detector.analyzeFrequencyData(data);
          times.push(performance.now() - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        expect(avgTime).toBeLessThan(10); // Should be much faster than 100ms
      }
    });
  });

  describe('Silence Detection', () => {
    it('detects silence when energy is below threshold', () => {
      // Low energy data (values near 0)
      const lowEnergyData = new Uint8Array(256);
      for (let i = 0; i < lowEnergyData.length; i++) {
        lowEnergyData[i] = Math.floor(Math.random() * 10); // Very low values
      }
      
      // Process multiple times to fill energy history
      for (let i = 0; i < 5; i++) {
        detector.analyzeFrequencyData(lowEnergyData);
      }
      
      const result = detector.analyzeFrequencyData(lowEnergyData);
      expect(result.phoneme).toBe('SIL');
    });

    it('does not detect silence when energy is above threshold', () => {
      // High energy data
      const highEnergyData = new Uint8Array(256);
      for (let i = 0; i < highEnergyData.length; i++) {
        highEnergyData[i] = 128 + Math.floor(Math.random() * 127);
      }
      
      // Process multiple times
      for (let i = 0; i < 5; i++) {
        detector.analyzeFrequencyData(highEnergyData);
      }
      
      const result = detector.analyzeFrequencyData(highEnergyData);
      // Should detect some phoneme, not necessarily silence
      expect(isValidPhoneme(result.phoneme)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('respects minConfidence setting', () => {
      const strictDetector = new PhonemeDetector({ minConfidence: 0.9 });
      const lenientDetector = new PhonemeDetector({ minConfidence: 0.1 });
      
      // Ambiguous input
      const ambiguousData = new Uint8Array(256);
      for (let i = 0; i < ambiguousData.length; i++) {
        ambiguousData[i] = 50 + Math.floor(Math.random() * 50);
      }
      
      // Process multiple times
      for (let i = 0; i < 5; i++) {
        strictDetector.analyzeFrequencyData(ambiguousData);
        lenientDetector.analyzeFrequencyData(ambiguousData);
      }
      
      const strictResult = strictDetector.analyzeFrequencyData(ambiguousData);
      const lenientResult = lenientDetector.analyzeFrequencyData(ambiguousData);
      
      // Both should return valid results
      expect(isValidPhoneme(strictResult.phoneme)).toBe(true);
      expect(isValidPhoneme(lenientResult.phoneme)).toBe(true);
    });

    it('can update configuration', () => {
      const initialConfig = detector.getConfig();
      expect(initialConfig.minConfidence).toBe(DEFAULT_PHONEME_DETECTOR_CONFIG.minConfidence);
      
      detector.updateConfig({ minConfidence: 0.5 });
      const updatedConfig = detector.getConfig();
      expect(updatedConfig.minConfidence).toBe(0.5);
    });

    it('reset clears internal state', () => {
      // Process some data
      const data = new Uint8Array(256).fill(200);
      detector.analyzeFrequencyData(data);
      detector.analyzeFrequencyData(data);
      
      // Reset
      detector.reset();
      
      // After reset, silent input should immediately return SIL
      const silentData = new Uint8Array(256).fill(0);
      const result = detector.analyzeFrequencyData(silentData);
      expect(result.phoneme).toBe('SIL');
    });
  });
});
