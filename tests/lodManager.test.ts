// LOD Manager Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateLodLevel,
  applyLodSettings,
  getShadowMapSize,
  createLodConfig,
  interpolateLodLevels,
  shouldUpdateLod,
  DEFAULT_LOD_CONFIG,
  type LodConfig,
  type LodLevel,
  type ShadowQuality,
} from '../utils/lodManager';
import * as THREE from 'three';

describe('lodManager', () => {
  describe('calculateLodLevel', () => {
    it('should return highest quality for close distances', () => {
      const level = calculateLodLevel(0, DEFAULT_LOD_CONFIG);
      expect(level.shadowQuality).toBe('high');
      expect(level.particleMultiplier).toBe(1.0);
    });

    it('should return lower quality for far distances', () => {
      const level = calculateLodLevel(15, DEFAULT_LOD_CONFIG);
      expect(level.shadowQuality).toBe('none');
      expect(level.particleMultiplier).toBeLessThan(1.0);
    });

    it('should return highest quality when LOD is disabled', () => {
      const disabledConfig: LodConfig = {
        ...DEFAULT_LOD_CONFIG,
        enabled: false,
      };
      const level = calculateLodLevel(100, disabledConfig);
      expect(level.shadowQuality).toBe('high');
      expect(level.particleMultiplier).toBe(1.0);
    });

    it('should handle empty levels array', () => {
      const emptyConfig: LodConfig = {
        enabled: true,
        thresholds: [],
        levels: [],
      };
      const level = calculateLodLevel(5, emptyConfig);
      expect(level.shadowQuality).toBe('high');
      expect(level.particleMultiplier).toBe(1.0);
    });

    it('should handle negative distances by treating as 0', () => {
      const level = calculateLodLevel(-5, DEFAULT_LOD_CONFIG);
      expect(level.shadowQuality).toBe('high');
      expect(level.particleMultiplier).toBe(1.0);
    });

    // Property test: LOD reduces detail at distance
    it('should reduce quality as distance increases (Property 15)', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          (distance1, distance2) => {
            // Skip if distances are equal or very close
            if (Math.abs(distance1 - distance2) < 0.1) return true;

            const level1 = calculateLodLevel(distance1, DEFAULT_LOD_CONFIG);
            const level2 = calculateLodLevel(distance2, DEFAULT_LOD_CONFIG);

            // If distance2 > distance1, quality should be same or lower
            if (distance2 > distance1) {
              // Particle multiplier should be same or lower at greater distance
              return level2.particleMultiplier <= level1.particleMultiplier;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property test: LOD level selection is deterministic
    it('should return consistent results for same distance', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
          (distance) => {
            const level1 = calculateLodLevel(distance, DEFAULT_LOD_CONFIG);
            const level2 = calculateLodLevel(distance, DEFAULT_LOD_CONFIG);
            
            return (
              level1.shadowQuality === level2.shadowQuality &&
              level1.particleMultiplier === level2.particleMultiplier
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getShadowMapSize', () => {
    it('should return correct sizes for each quality level', () => {
      expect(getShadowMapSize('high')).toBe(2048);
      expect(getShadowMapSize('medium')).toBe(1024);
      expect(getShadowMapSize('low')).toBe(512);
      expect(getShadowMapSize('none')).toBe(0);
    });
  });

  describe('createLodConfig', () => {
    it('should create config with sorted thresholds', () => {
      const config = createLodConfig([10, 2, 5]);
      expect(config.thresholds).toEqual([2, 5, 10]);
    });

    it('should add base level at distance 0', () => {
      const config = createLodConfig([5, 10]);
      expect(config.levels[0].distance).toBe(0);
      expect(config.levels[0].shadowQuality).toBe('high');
    });

    it('should create levels for each threshold', () => {
      const config = createLodConfig([2, 5, 10]);
      expect(config.levels.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty thresholds', () => {
      const config = createLodConfig([]);
      expect(config.enabled).toBe(true);
      expect(config.levels.length).toBe(1);
      expect(config.levels[0].distance).toBe(0);
    });
  });

  describe('interpolateLodLevels', () => {
    const fromLevel: LodLevel = {
      distance: 0,
      shadowQuality: 'high',
      particleMultiplier: 1.0,
    };

    const toLevel: LodLevel = {
      distance: 10,
      shadowQuality: 'low',
      particleMultiplier: 0.4,
    };

    it('should return from level at t=0', () => {
      const result = interpolateLodLevels(fromLevel, toLevel, 0);
      expect(result.particleMultiplier).toBe(1.0);
      expect(result.shadowQuality).toBe('high');
    });

    it('should return to level at t=1', () => {
      const result = interpolateLodLevels(fromLevel, toLevel, 1);
      expect(result.particleMultiplier).toBe(0.4);
      expect(result.shadowQuality).toBe('low');
    });

    it('should interpolate particle multiplier at t=0.5', () => {
      const result = interpolateLodLevels(fromLevel, toLevel, 0.5);
      expect(result.particleMultiplier).toBe(0.7);
    });

    it('should switch shadow quality at t > 0.5', () => {
      const result = interpolateLodLevels(fromLevel, toLevel, 0.51);
      expect(result.shadowQuality).toBe('low');
    });

    it('should keep from shadow quality at t <= 0.5', () => {
      const result = interpolateLodLevels(fromLevel, toLevel, 0.5);
      expect(result.shadowQuality).toBe('high');
    });

    it('should clamp t to 0-1 range', () => {
      const resultNegative = interpolateLodLevels(fromLevel, toLevel, -0.5);
      expect(resultNegative.particleMultiplier).toBe(1.0);

      const resultOver = interpolateLodLevels(fromLevel, toLevel, 1.5);
      expect(resultOver.particleMultiplier).toBe(0.4);
    });

    // Property test: interpolation produces intermediate values
    it('should produce intermediate values for 0 < t < 1', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
          (t) => {
            const result = interpolateLodLevels(fromLevel, toLevel, t);
            
            // Particle multiplier should be between from and to
            return (
              result.particleMultiplier > toLevel.particleMultiplier &&
              result.particleMultiplier < fromLevel.particleMultiplier
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('shouldUpdateLod', () => {
    it('should return true when shadow quality changes', () => {
      const current: LodLevel = { distance: 0, shadowQuality: 'high', particleMultiplier: 1.0 };
      const next: LodLevel = { distance: 5, shadowQuality: 'medium', particleMultiplier: 1.0 };
      expect(shouldUpdateLod(current, next)).toBe(true);
    });

    it('should return true when particle multiplier changes significantly', () => {
      const current: LodLevel = { distance: 0, shadowQuality: 'high', particleMultiplier: 1.0 };
      const next: LodLevel = { distance: 5, shadowQuality: 'high', particleMultiplier: 0.5 };
      expect(shouldUpdateLod(current, next)).toBe(true);
    });

    it('should return false when changes are minimal', () => {
      const current: LodLevel = { distance: 0, shadowQuality: 'high', particleMultiplier: 1.0 };
      const next: LodLevel = { distance: 1, shadowQuality: 'high', particleMultiplier: 0.98 };
      expect(shouldUpdateLod(current, next)).toBe(false);
    });
  });

  describe('applyLodSettings', () => {
    let scene: THREE.Scene;
    let directionalLight: THREE.DirectionalLight;
    let particles: THREE.Points;

    beforeEach(() => {
      scene = new THREE.Scene();
      directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Create particle system
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(300); // 100 particles * 3 components
      for (let i = 0; i < 300; i++) {
        positions[i] = Math.random() * 10 - 5;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ size: 0.1 });
      particles = new THREE.Points(geometry, material);
      scene.add(particles);
    });

    it('should disable shadows when quality is none', () => {
      const level: LodLevel = { distance: 10, shadowQuality: 'none', particleMultiplier: 0.2 };
      applyLodSettings(scene, level, { lights: [directionalLight] });
      expect(directionalLight.castShadow).toBe(false);
    });

    it('should enable shadows for non-none quality', () => {
      const level: LodLevel = { distance: 5, shadowQuality: 'medium', particleMultiplier: 0.7 };
      applyLodSettings(scene, level, { lights: [directionalLight] });
      expect(directionalLight.castShadow).toBe(true);
    });

    it('should update shadow map size based on quality', () => {
      const level: LodLevel = { distance: 5, shadowQuality: 'low', particleMultiplier: 0.4 };
      applyLodSettings(scene, level, { lights: [directionalLight] });
      expect(directionalLight.shadow.mapSize.width).toBe(512);
      expect(directionalLight.shadow.mapSize.height).toBe(512);
    });

    it('should update particle draw range', () => {
      const level: LodLevel = { distance: 5, shadowQuality: 'medium', particleMultiplier: 0.5 };
      applyLodSettings(scene, level, { 
        particleSystem: particles, 
        baseParticleCount: 100 
      });
      
      const geometry = particles.geometry;
      const drawRange = geometry.drawRange;
      expect(drawRange.count).toBe(50); // 100 * 0.5
    });

    it('should handle missing options gracefully', () => {
      const level: LodLevel = { distance: 5, shadowQuality: 'medium', particleMultiplier: 0.5 };
      // Should not throw
      expect(() => applyLodSettings(scene, level)).not.toThrow();
      expect(() => applyLodSettings(scene, level, {})).not.toThrow();
    });
  });
});
