// Background Renderer Tests
// Property 4: Gradient background rendering
// Property 5: Background preference persistence
// Validates: Requirements 3.1, 3.2, 3.5

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  hexToRgb,
  isValidHexColor,
  createGradientTexture,
  saveBackgroundPreference,
  loadBackgroundPreference,
  getDefaultBackground,
  BACKGROUND_PRESETS,
} from '../utils/backgroundRenderer';
import type { SolidBackground, GradientBackground } from '../types/enhancementTypes';

describe('backgroundRenderer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('hexToRgb', () => {
    it('should parse valid 6-digit hex colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          (r, g, b) => {
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            const result = hexToRgb(hex);
            
            expect(result).not.toBeNull();
            expect(result!.r).toBeCloseTo(r / 255, 5);
            expect(result!.g).toBeCloseTo(g / 255, 5);
            expect(result!.b).toBeCloseTo(b / 255, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse valid 3-digit hex colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 15 }),
          (r, g, b) => {
            const hex = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
            const result = hexToRgb(hex);
            
            expect(result).not.toBeNull();
            // 3-digit hex expands: #RGB -> #RRGGBB
            const expandedR = r * 17; // 0xF -> 0xFF, 0x1 -> 0x11
            const expandedG = g * 17;
            const expandedB = b * 17;
            expect(result!.r).toBeCloseTo(expandedR / 255, 5);
            expect(result!.g).toBeCloseTo(expandedG / 255, 5);
            expect(result!.b).toBeCloseTo(expandedB / 255, 5);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return null for invalid hex colors', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !isValidHexColor(s)),
          (invalidHex) => {
            const result = hexToRgb(invalidHex);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('isValidHexColor', () => {
    it('should return true for valid hex colors', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xFFFFFF }),
          (colorNum) => {
            const hex6 = `#${colorNum.toString(16).padStart(6, '0')}`;
            expect(isValidHexColor(hex6)).toBe(true);
            
            // Also test without #
            expect(isValidHexColor(hex6.slice(1))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for invalid hex colors', () => {
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('#')).toBe(false);
      expect(isValidHexColor('#12')).toBe(false);
      expect(isValidHexColor('#1234')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('#1234567')).toBe(false);
      expect(isValidHexColor('#gggggg')).toBe(false);
      expect(isValidHexColor('not a color')).toBe(false);
    });
  });

  describe('createGradientTexture', () => {
    /**
     * Property 4: Gradient background rendering
     * For any two valid hex colors and angle, createGradientTexture
     * should produce a valid canvas element.
     */
    it('should create gradient texture for any valid colors and angle', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xFFFFFF }),
          fc.integer({ min: 0, max: 0xFFFFFF }),
          fc.integer({ min: 0, max: 360 }),
          (color1Num, color2Num, angle) => {
            const color1 = `#${color1Num.toString(16).padStart(6, '0')}`;
            const color2 = `#${color2Num.toString(16).padStart(6, '0')}`;
            
            const canvas = createGradientTexture([color1, color2], angle);
            
            expect(canvas).toBeDefined();
            expect(canvas.width).toBe(512); // Default size
            expect(canvas.height).toBe(512);
            expect(canvas instanceof HTMLCanvasElement).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should support custom texture sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 64, max: 2048 }),
          (size) => {
            const canvas = createGradientTexture(['#000000', '#ffffff'], 0, size);
            
            expect(canvas.width).toBe(size);
            expect(canvas.height).toBe(size);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Background Preference Persistence', () => {
    /**
     * Property 5: Background preference persistence
     * For any background selection, the preference should be retrievable
     * from localStorage with identical values.
     */
    it('should persist and retrieve solid background preferences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xFFFFFF }),
          (colorNum) => {
            const color = `#${colorNum.toString(16).padStart(6, '0')}`;
            const config: SolidBackground = { type: 'solid', color };
            
            saveBackgroundPreference(config);
            const loaded = loadBackgroundPreference();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.type).toBe('solid');
            expect((loaded as SolidBackground).color).toBe(color);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should persist and retrieve gradient background preferences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xFFFFFF }),
          fc.integer({ min: 0, max: 0xFFFFFF }),
          fc.integer({ min: 0, max: 360 }),
          (color1Num, color2Num, angle) => {
            const color1 = `#${color1Num.toString(16).padStart(6, '0')}`;
            const color2 = `#${color2Num.toString(16).padStart(6, '0')}`;
            const config: GradientBackground = {
              type: 'gradient',
              colors: [color1, color2],
              angle,
            };
            
            saveBackgroundPreference(config);
            const loaded = loadBackgroundPreference();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.type).toBe('gradient');
            const loadedGradient = loaded as GradientBackground;
            expect(loadedGradient.colors[0]).toBe(color1);
            expect(loadedGradient.colors[1]).toBe(color2);
            expect(loadedGradient.angle).toBe(angle);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return null for invalid stored preferences', () => {
      // Store invalid JSON
      localStorage.setItem('aura_background_preference', 'not valid json');
      expect(loadBackgroundPreference()).toBeNull();
      
      // Store valid JSON but invalid config
      localStorage.setItem('aura_background_preference', JSON.stringify({ type: 'unknown' }));
      expect(loadBackgroundPreference()).toBeNull();
      
      // Store solid with invalid color
      localStorage.setItem('aura_background_preference', JSON.stringify({ type: 'solid', color: 'invalid' }));
      expect(loadBackgroundPreference()).toBeNull();
      
      // Store gradient with missing colors
      localStorage.setItem('aura_background_preference', JSON.stringify({ type: 'gradient', angle: 0 }));
      expect(loadBackgroundPreference()).toBeNull();
    });

    it('should return null when no preference is stored', () => {
      localStorage.clear();
      expect(loadBackgroundPreference()).toBeNull();
    });
  });

  describe('getDefaultBackground', () => {
    it('should return a valid solid black background', () => {
      const defaultBg = getDefaultBackground();
      
      expect(defaultBg.type).toBe('solid');
      expect((defaultBg as SolidBackground).color).toBe('#000000');
    });
  });

  describe('BACKGROUND_PRESETS', () => {
    it('should have valid configurations for all presets', () => {
      for (const [name, config] of Object.entries(BACKGROUND_PRESETS)) {
        expect(config.type).toBeDefined();
        
        if (config.type === 'solid') {
          expect(isValidHexColor(config.color)).toBe(true);
        } else if (config.type === 'gradient') {
          expect(config.colors).toHaveLength(2);
          expect(isValidHexColor(config.colors[0])).toBe(true);
          expect(isValidHexColor(config.colors[1])).toBe(true);
          expect(typeof config.angle).toBe('number');
        }
      }
    });

    it('should include expected preset names', () => {
      const expectedPresets = ['black', 'white', 'sunset', 'ocean', 'night', 'cyber', 'neon'];
      for (const preset of expectedPresets) {
        expect(BACKGROUND_PRESETS[preset]).toBeDefined();
      }
    });
  });
});
