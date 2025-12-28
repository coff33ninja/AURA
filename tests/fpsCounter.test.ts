// FPS Counter Tests
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getFpsColor,
  createFpsCounter,
  formatFpsState,
  getFpsColorCss,
  type FpsState,
  type FpsColor,
} from '../utils/fpsCounter';

describe('fpsCounter', () => {
  describe('getFpsColor', () => {
    // Property test: FPS color coding (Property 17)
    it('should return correct color based on FPS thresholds (Property 17)', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(120), noNaN: true }),
          (fps) => {
            const color = getFpsColor(fps);
            
            if (fps > 50) {
              return color === 'green';
            } else if (fps >= 30) {
              return color === 'yellow';
            } else {
              return color === 'red';
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return green for fps > 50', () => {
      expect(getFpsColor(60)).toBe('green');
      expect(getFpsColor(51)).toBe('green');
      expect(getFpsColor(120)).toBe('green');
    });

    it('should return yellow for 30 <= fps <= 50', () => {
      expect(getFpsColor(50)).toBe('yellow');
      expect(getFpsColor(40)).toBe('yellow');
      expect(getFpsColor(30)).toBe('yellow');
    });

    it('should return red for fps < 30', () => {
      expect(getFpsColor(29)).toBe('red');
      expect(getFpsColor(15)).toBe('red');
      expect(getFpsColor(0)).toBe('red');
    });

    it('should respect custom thresholds', () => {
      // Custom thresholds: green > 40, yellow >= 20
      expect(getFpsColor(45, 40, 20)).toBe('green');
      expect(getFpsColor(35, 40, 20)).toBe('yellow');
      expect(getFpsColor(15, 40, 20)).toBe('red');
    });
  });

  describe('createFpsCounter', () => {
    it('should create a counter with default state', () => {
      const counter = createFpsCounter();
      const state = counter.getState();
      
      expect(state.fps).toBe(60);
      expect(state.frameTime).toBeCloseTo(16.67, 1);
      expect(state.color).toBe('green');
    });

    it('should update FPS based on frame times', () => {
      const counter = createFpsCounter({ sampleSize: 5 });
      
      // Simulate 60 FPS (16.67ms per frame)
      for (let i = 0; i < 5; i++) {
        counter.update(0.01667);
      }
      
      const state = counter.getState();
      expect(state.fps).toBeCloseTo(60, -1); // Within 10
    });

    it('should detect low FPS', () => {
      const counter = createFpsCounter({ sampleSize: 5 });
      
      // Simulate 20 FPS (50ms per frame)
      for (let i = 0; i < 5; i++) {
        counter.update(0.05);
      }
      
      const state = counter.getState();
      expect(state.fps).toBeCloseTo(20, -1);
      expect(state.color).toBe('red');
    });

    it('should reset to default state', () => {
      const counter = createFpsCounter({ sampleSize: 5 });
      
      // Add some frames
      for (let i = 0; i < 5; i++) {
        counter.update(0.05);
      }
      
      // Reset
      counter.reset();
      
      const state = counter.getState();
      expect(state.fps).toBe(60);
      expect(state.color).toBe('green');
    });

    it('should use rolling average', () => {
      const counter = createFpsCounter({ sampleSize: 3 });
      
      // Add varying frame times
      counter.update(0.01); // 100 FPS
      counter.update(0.02); // 50 FPS
      counter.update(0.03); // 33 FPS
      
      const state = counter.getState();
      // Average: (10 + 20 + 30) / 3 = 20ms = 50 FPS
      expect(state.fps).toBeCloseTo(50, -1);
    });

    it('should handle zero delta time', () => {
      const counter = createFpsCounter({ sampleSize: 5 });
      
      // Should not crash with zero delta
      counter.update(0);
      
      const state = counter.getState();
      expect(state).toBeDefined();
    });

    // Property test: FPS is always non-negative
    it('should always return non-negative FPS', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
            { minLength: 1, maxLength: 100 }
          ),
          (deltaTimes) => {
            const counter = createFpsCounter({ sampleSize: 60 });
            
            for (const dt of deltaTimes) {
              counter.update(dt);
            }
            
            const state = counter.getState();
            return state.fps >= 0 && state.frameTime >= 0;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('formatFpsState', () => {
    it('should format state as readable string', () => {
      const state: FpsState = {
        fps: 60,
        frameTime: 16.67,
        color: 'green',
      };
      
      const formatted = formatFpsState(state);
      expect(formatted).toBe('60 FPS (16.67ms)');
    });

    it('should handle low FPS', () => {
      const state: FpsState = {
        fps: 15,
        frameTime: 66.67,
        color: 'red',
      };
      
      const formatted = formatFpsState(state);
      expect(formatted).toBe('15 FPS (66.67ms)');
    });
  });

  describe('getFpsColorCss', () => {
    it('should return green CSS color', () => {
      const css = getFpsColorCss('green');
      expect(css).toBe('#22c55e');
    });

    it('should return yellow CSS color', () => {
      const css = getFpsColorCss('yellow');
      expect(css).toBe('#eab308');
    });

    it('should return red CSS color', () => {
      const css = getFpsColorCss('red');
      expect(css).toBe('#ef4444');
    });

    // Property test: all colors return valid CSS
    it('should return valid CSS color for all FpsColor values', () => {
      const colors: FpsColor[] = ['green', 'yellow', 'red'];
      
      for (const color of colors) {
        const css = getFpsColorCss(color);
        expect(css).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });
});
