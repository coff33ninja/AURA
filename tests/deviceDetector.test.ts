// Device Detector Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  detectDeviceCapabilities,
  getOptimalParticleCount,
  getOptimalRenderScale,
  shouldReduceAnimations,
  getCapabilitiesSummary,
  type DeviceCapabilities,
} from '../utils/deviceDetector';

describe('deviceDetector', () => {
  // Store original values
  let originalNavigator: Navigator;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    // Store originals
    originalNavigator = global.navigator;
    originalWindow = global.window;
  });

  afterEach(() => {
    // Restore originals
    vi.restoreAllMocks();
  });

  describe('detectDeviceCapabilities', () => {
    it('should return default capabilities in non-browser environment', () => {
      // Mock undefined window
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const caps = detectDeviceCapabilities();
      
      expect(caps.isMobile).toBe(false);
      expect(caps.isLowEnd).toBe(false);
      expect(caps.maxParticles).toBe(150);
      
      global.window = originalWindow;
    });

    it('should detect desktop capabilities', () => {
      const caps = detectDeviceCapabilities();
      
      // In test environment (Node.js), should return desktop defaults
      expect(caps).toHaveProperty('isMobile');
      expect(caps).toHaveProperty('isLowEnd');
      expect(caps).toHaveProperty('maxParticles');
      expect(caps).toHaveProperty('recommendedLod');
      expect(caps).toHaveProperty('hasWebGL2');
      expect(caps).toHaveProperty('devicePixelRatio');
      expect(caps).toHaveProperty('hardwareConcurrency');
    });

    it('should have valid particle count', () => {
      const caps = detectDeviceCapabilities();
      expect(caps.maxParticles).toBeGreaterThan(0);
      expect(caps.maxParticles).toBeLessThanOrEqual(150);
    });

    it('should have valid LOD recommendation', () => {
      const caps = detectDeviceCapabilities();
      expect(caps.recommendedLod).toBeGreaterThanOrEqual(0);
      expect(caps.recommendedLod).toBeLessThanOrEqual(3);
    });
  });

  describe('getOptimalParticleCount', () => {
    // Property test: Mobile optimization reduces particles (Property 16)
    it('should return count <= baseCount for any device (Property 16)', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (baseCount) => {
            const count = getOptimalParticleCount(baseCount);
            return count <= baseCount && count > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return full count for desktop', () => {
      const desktopCaps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const count = getOptimalParticleCount(150, desktopCaps);
      expect(count).toBe(150);
    });

    it('should return reduced count for mobile', () => {
      const mobileCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: false,
        maxParticles: 75,
        recommendedLod: 1,
        hasWebGL2: true,
        devicePixelRatio: 2,
        hardwareConcurrency: 4,
        deviceMemory: 4,
      };
      
      const count = getOptimalParticleCount(150, mobileCaps);
      expect(count).toBe(75); // 50% of base
    });

    it('should return minimal count for low-end devices', () => {
      const lowEndCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: true,
        maxParticles: 50,
        recommendedLod: 2,
        hasWebGL2: false,
        devicePixelRatio: 1,
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      
      const count = getOptimalParticleCount(150, lowEndCaps);
      expect(count).toBe(49); // 33% of base (floor)
    });

    // Property test: Low-end always gets fewer particles than mobile
    it('should give low-end fewer particles than mobile', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 1000 }),
          (baseCount) => {
            const mobileCaps: DeviceCapabilities = {
              isMobile: true,
              isLowEnd: false,
              maxParticles: 75,
              recommendedLod: 1,
              hasWebGL2: true,
              devicePixelRatio: 2,
              hardwareConcurrency: 4,
              deviceMemory: 4,
            };
            
            const lowEndCaps: DeviceCapabilities = {
              isMobile: true,
              isLowEnd: true,
              maxParticles: 50,
              recommendedLod: 2,
              hasWebGL2: false,
              devicePixelRatio: 1,
              hardwareConcurrency: 2,
              deviceMemory: 2,
            };
            
            const mobileCount = getOptimalParticleCount(baseCount, mobileCaps);
            const lowEndCount = getOptimalParticleCount(baseCount, lowEndCaps);
            
            return lowEndCount <= mobileCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getOptimalRenderScale', () => {
    it('should return 1.0 for desktop', () => {
      const desktopCaps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const scale = getOptimalRenderScale(desktopCaps);
      expect(scale).toBe(1.0);
    });

    it('should return reduced scale for mobile', () => {
      const mobileCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: false,
        maxParticles: 75,
        recommendedLod: 1,
        hasWebGL2: true,
        devicePixelRatio: 2,
        hardwareConcurrency: 4,
        deviceMemory: 4,
      };
      
      const scale = getOptimalRenderScale(mobileCaps);
      expect(scale).toBeLessThan(1.0);
      expect(scale).toBeGreaterThan(0.5);
    });

    it('should return 0.5 for low-end devices', () => {
      const lowEndCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: true,
        maxParticles: 50,
        recommendedLod: 2,
        hasWebGL2: false,
        devicePixelRatio: 1,
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      
      const scale = getOptimalRenderScale(lowEndCaps);
      expect(scale).toBe(0.5);
    });

    it('should reduce scale for high DPR mobile', () => {
      const highDprMobile: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: false,
        maxParticles: 75,
        recommendedLod: 1,
        hasWebGL2: true,
        devicePixelRatio: 3,
        hardwareConcurrency: 4,
        deviceMemory: 4,
      };
      
      const scale = getOptimalRenderScale(highDprMobile);
      expect(scale).toBe(0.75);
    });
  });

  describe('shouldReduceAnimations', () => {
    it('should return true for low-end devices', () => {
      const lowEndCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: true,
        maxParticles: 50,
        recommendedLod: 2,
        hasWebGL2: false,
        devicePixelRatio: 1,
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      
      const shouldReduce = shouldReduceAnimations(lowEndCaps);
      expect(shouldReduce).toBe(true);
    });

    it('should return false for desktop', () => {
      const desktopCaps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const shouldReduce = shouldReduceAnimations(desktopCaps);
      expect(shouldReduce).toBe(false);
    });
  });

  describe('getCapabilitiesSummary', () => {
    it('should return a non-empty string', () => {
      const summary = getCapabilitiesSummary();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include device type', () => {
      const desktopCaps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const summary = getCapabilitiesSummary(desktopCaps);
      expect(summary).toContain('Desktop');
    });

    it('should include mobile indicator', () => {
      const mobileCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: false,
        maxParticles: 75,
        recommendedLod: 1,
        hasWebGL2: true,
        devicePixelRatio: 2,
        hardwareConcurrency: 4,
        deviceMemory: 4,
      };
      
      const summary = getCapabilitiesSummary(mobileCaps);
      expect(summary).toContain('Mobile');
    });

    it('should include low-end indicator', () => {
      const lowEndCaps: DeviceCapabilities = {
        isMobile: true,
        isLowEnd: true,
        maxParticles: 50,
        recommendedLod: 2,
        hasWebGL2: false,
        devicePixelRatio: 1,
        hardwareConcurrency: 2,
        deviceMemory: 2,
      };
      
      const summary = getCapabilitiesSummary(lowEndCaps);
      expect(summary).toContain('Low-End');
    });

    it('should include core count', () => {
      const caps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const summary = getCapabilitiesSummary(caps);
      expect(summary).toContain('8 cores');
    });

    it('should include WebGL version', () => {
      const caps: DeviceCapabilities = {
        isMobile: false,
        isLowEnd: false,
        maxParticles: 150,
        recommendedLod: 0,
        hasWebGL2: true,
        devicePixelRatio: 1,
        hardwareConcurrency: 8,
        deviceMemory: 16,
      };
      
      const summary = getCapabilitiesSummary(caps);
      expect(summary).toContain('WebGL2');
    });
  });
});
