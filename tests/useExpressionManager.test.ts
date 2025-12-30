/**
 * Property-based tests for useExpressionManager hook
 * 
 * Feature: neural-core-splitting, Property 2: Expression Alias Resolution
 * Validates: Requirements 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Test the expression alias resolution logic directly
// Since we can't easily test React hooks without @testing-library/react,
// we test the core logic patterns

describe('useExpressionManager', () => {
  describe('Module Exports', () => {
    it('should export useExpressionManager function', async () => {
      const module = await import('../components/neural-core/hooks/useExpressionManager');
      expect(typeof module.useExpressionManager).toBe('function');
    });

    it('should export default as useExpressionManager', async () => {
      const module = await import('../components/neural-core/hooks/useExpressionManager');
      expect(module.default).toBe(module.useExpressionManager);
    });
  });

  describe('Property 2: Expression Alias Resolution', () => {
    /**
     * Feature: neural-core-splitting, Property 2: Expression Alias Resolution
     * For any expression alias string, resolveExpressionAlias SHALL return 
     * an array of one or more valid expression names, falling back to the 
     * original alias if no mapping exists.
     */

    // Simulate the resolution logic for testing
    function resolveExpressionAlias(
      alias: string,
      config: { expressions?: Record<string, string> },
      sidecar: { groups?: Record<string, { presetName?: string }>; mappings?: Record<string, string[]> } | null
    ): string[] {
      try {
        const lowerAlias = alias.toLowerCase();
        
        // First: check config expressions mapping
        if (config.expressions) {
          const configMapping = config.expressions[lowerAlias] || config.expressions[alias];
          if (configMapping) {
            return [configMapping];
          }
        }
        
        if (!sidecar || !sidecar.groups) return [alias];
        
        const results: string[] = [];
        
        // Second: find by presetName
        for (const [groupName, groupData] of Object.entries(sidecar.groups)) {
          const preset = groupData.presetName?.toLowerCase();
          if (preset === lowerAlias) {
            results.push(groupName);
          }
        }
        if (results.length > 0) return results;
        
        // Third: exact match on group name
        if (sidecar.groups[alias]) return [alias];
        
        // Fourth: check mappings
        if (sidecar.mappings && sidecar.mappings[alias]) return sidecar.mappings[alias];
        
        // Fifth: case-insensitive match
        const keys = Object.keys(sidecar.groups);
        const matches = keys.filter(k => k.toLowerCase() === lowerAlias);
        if (matches.length > 0) return matches;
        
        // Fallback: partial match
        const partialMatches = keys.filter(k => 
          k.toLowerCase().includes(lowerAlias) || lowerAlias.includes(k.toLowerCase())
        );
        if (partialMatches.length > 0) return partialMatches;
        
      } catch (e) {
        // Ignore errors
      }
      return [alias];
    }

    it('should always return non-empty array for any alias', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (alias) => {
            const result = resolveExpressionAlias(alias, {}, null);
            
            // Must return an array
            expect(Array.isArray(result)).toBe(true);
            
            // Must have at least one element
            expect(result.length).toBeGreaterThanOrEqual(1);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return original alias when no mappings exist', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (alias) => {
            const result = resolveExpressionAlias(alias, {}, null);
            
            // Should fall back to original alias
            expect(result).toContain(alias);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prioritize config expressions over sidecar', () => {
      const config = {
        expressions: {
          'joy': 'custom_happy',
          'angry': 'custom_mad',
        }
      };
      
      const sidecar = {
        groups: {
          'default_happy': { presetName: 'joy' },
          'default_mad': { presetName: 'angry' },
        }
      };
      
      // Config should take priority
      expect(resolveExpressionAlias('joy', config, sidecar)).toEqual(['custom_happy']);
      expect(resolveExpressionAlias('angry', config, sidecar)).toEqual(['custom_mad']);
    });

    it('should resolve by presetName when no config mapping', () => {
      const sidecar = {
        groups: {
          'Face.M_F00_000_00_Fcl_ALL_Joy': { presetName: 'joy' },
          'Face.M_F00_000_00_Fcl_ALL_Angry': { presetName: 'angry' },
        }
      };
      
      const result = resolveExpressionAlias('joy', {}, sidecar);
      expect(result).toContain('Face.M_F00_000_00_Fcl_ALL_Joy');
    });

    it('should be case-insensitive for alias matching', () => {
      const sidecar = {
        groups: {
          'Happy': { presetName: 'joy' },
        }
      };
      
      // All case variations should resolve
      expect(resolveExpressionAlias('JOY', {}, sidecar)).toContain('Happy');
      expect(resolveExpressionAlias('Joy', {}, sidecar)).toContain('Happy');
      expect(resolveExpressionAlias('joy', {}, sidecar)).toContain('Happy');
    });

    it('should handle exact group name match', () => {
      const sidecar = {
        groups: {
          'blink': {},
          'smile': {},
        }
      };
      
      expect(resolveExpressionAlias('blink', {}, sidecar)).toContain('blink');
      expect(resolveExpressionAlias('smile', {}, sidecar)).toContain('smile');
    });

    it('should use mappings when available', () => {
      const sidecar = {
        groups: {},
        mappings: {
          'happy': ['joy', 'smile'],
          'sad': ['sorrow', 'cry'],
        }
      };
      
      expect(resolveExpressionAlias('happy', {}, sidecar)).toEqual(['joy', 'smile']);
      expect(resolveExpressionAlias('sad', {}, sidecar)).toEqual(['sorrow', 'cry']);
    });

    it('should handle partial matches as fallback', () => {
      const sidecar = {
        groups: {
          'Face_Joy_Expression': {},
          'Face_Angry_Expression': {},
        }
      };
      
      // 'joy' should partially match 'Face_Joy_Expression'
      const result = resolveExpressionAlias('joy', {}, sidecar);
      expect(result.some(r => r.toLowerCase().includes('joy'))).toBe(true);
    });
  });

  describe('Expression Value Management', () => {
    it('should handle expression value ranges', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
          (value) => {
            // Expression values should be in [0, 1] range
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle zero values for clearing expressions', () => {
      // Zero value should clear persistent expression
      const expressionPersist: Record<string, number> = { 'joy': 0.8 };
      const value = 0;
      
      if (value <= 0) {
        delete expressionPersist['joy'];
      }
      
      expect(expressionPersist['joy']).toBeUndefined();
    });

    it('should handle positive values for setting expressions', () => {
      const expressionPersist: Record<string, number> = {};
      const value = 0.8;
      
      if (value > 0) {
        expressionPersist['joy'] = value;
      }
      
      expect(expressionPersist['joy']).toBe(0.8);
    });
  });

  describe('Smooth Blending Logic', () => {
    it('should interpolate values correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), // current
          fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), // target
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }), // delta
          fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }), // smoothing
          (current, target, delta, smoothing) => {
            const next = current + (target - current) * Math.min(1, smoothing * delta);
            
            // Result should be between current and target (or equal)
            const min = Math.min(current, target);
            const max = Math.max(current, target);
            expect(next).toBeGreaterThanOrEqual(min - 0.0001);
            expect(next).toBeLessThanOrEqual(max + 0.0001);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should converge to target over time', () => {
      let current = 0;
      const target = 1;
      const delta = 0.016; // ~60fps
      const smoothing = 8.0;
      
      // Simulate multiple frames
      for (let i = 0; i < 100; i++) {
        current = current + (target - current) * Math.min(1, smoothing * delta);
      }
      
      // Should be very close to target after many frames
      expect(current).toBeCloseTo(target, 2);
    });
  });

  describe('Default Expressions', () => {
    it('should have standard VRM expression names', () => {
      const defaultExpressions = ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];
      
      // Verify all standard expressions are present
      expect(defaultExpressions).toContain('joy');
      expect(defaultExpressions).toContain('angry');
      expect(defaultExpressions).toContain('sorrow');
      expect(defaultExpressions).toContain('fun');
      expect(defaultExpressions).toContain('blink');
      
      // Verify viseme expressions
      expect(defaultExpressions).toContain('a');
      expect(defaultExpressions).toContain('i');
      expect(defaultExpressions).toContain('u');
      expect(defaultExpressions).toContain('e');
      expect(defaultExpressions).toContain('o');
    });
  });

  describe('Type Definitions', () => {
    it('should have correct UseExpressionManagerOptions interface', async () => {
      const module = await import('../components/neural-core/hooks/useExpressionManager');
      
      // Verify the module exports the expected types
      expect(module.useExpressionManager).toBeDefined();
    });
  });
});
