/**
 * Property-based tests for sceneSetup utilities
 * 
 * Feature: neural-core-splitting, Property 9: Scene Setup Returns Valid Objects
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import {
  createScene,
  createCamera,
  createLights,
  createParticles,
  handleResize,
} from '../components/neural-core/utils/sceneSetup';

describe('sceneSetup', () => {
  describe('Property 9: Scene Setup Returns Valid Objects', () => {
    /**
     * Feature: neural-core-splitting, Property 9: Scene Setup Returns Valid Objects
     * For any call to scene setup functions, the returned Three.js objects 
     * SHALL be valid instances of their respective types.
     */

    it('createScene should return a valid THREE.Scene instance', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            const scene = createScene();
            
            // Verify it's a Scene instance
            expect(scene).toBeInstanceOf(THREE.Scene);
            
            // Verify it has expected properties
            expect(scene.type).toBe('Scene');
            expect(scene.children).toBeDefined();
            expect(Array.isArray(scene.children)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('createCamera should return a valid PerspectiveCamera for any positive dimensions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 4000 }), // width
          fc.integer({ min: 100, max: 4000 }), // height
          (width, height) => {
            const camera = createCamera(width, height);
            
            // Verify it's a PerspectiveCamera instance
            expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
            
            // Verify aspect ratio is set correctly
            const expectedAspect = width / height;
            expect(camera.aspect).toBeCloseTo(expectedAspect, 5);
            
            // Verify FOV is set (30 degrees as per implementation)
            expect(camera.fov).toBe(30);
            
            // Verify near/far planes
            expect(camera.near).toBe(0.1);
            expect(camera.far).toBe(20);
            
            // Verify position is set for portrait framing
            expect(camera.position.y).toBeCloseTo(1.4, 5);
            expect(camera.position.z).toBeCloseTo(1.5, 5);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createLights should return valid light instances', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const lights = createLights();
            
            // Verify directional light
            expect(lights.directionalLight).toBeInstanceOf(THREE.DirectionalLight);
            expect(lights.directionalLight.intensity).toBe(1.0);
            
            // Verify ambient light
            expect(lights.ambientLight).toBeInstanceOf(THREE.AmbientLight);
            expect(lights.ambientLight.intensity).toBe(2.0);
            
            // Verify rim light
            expect(lights.rimLight).toBeInstanceOf(THREE.SpotLight);
            expect(lights.rimLight.intensity).toBe(5);
            
            // Verify allLights array contains expected lights
            expect(lights.allLights).toContain(lights.directionalLight);
            expect(lights.allLights).toContain(lights.rimLight);
            expect(lights.allLights.length).toBe(2);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('createParticles should return valid Points with correct particle count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }), // particle count
          (count) => {
            const particles = createParticles(count);
            
            // Verify it's a Points instance
            expect(particles).toBeInstanceOf(THREE.Points);
            
            // Verify geometry has correct number of positions
            const positions = particles.geometry.getAttribute('position');
            expect(positions).toBeDefined();
            expect(positions.count).toBe(count);
            
            // Verify material is PointsMaterial
            expect(particles.material).toBeInstanceOf(THREE.PointsMaterial);
            
            // Verify material properties
            const material = particles.material as THREE.PointsMaterial;
            expect(material.size).toBe(0.02);
            expect(material.transparent).toBe(true);
            expect(material.opacity).toBe(0.4);
            expect(material.blending).toBe(THREE.AdditiveBlending);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('particle positions should be within expected bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 500 }),
          (count) => {
            const particles = createParticles(count);
            const positions = particles.geometry.getAttribute('position');
            const array = positions.array as Float32Array;
            
            // All positions should be within [-1.5, 1.5] (half of 3x3x3 cube)
            for (let i = 0; i < array.length; i++) {
              if (array[i] < -1.5 || array[i] > 1.5) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('handleResize', () => {
    it('should update camera aspect ratio and renderer size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 4000 }),
          fc.integer({ min: 100, max: 4000 }),
          fc.integer({ min: 100, max: 4000 }),
          fc.integer({ min: 100, max: 4000 }),
          (initialWidth, initialHeight, newWidth, newHeight) => {
            const camera = createCamera(initialWidth, initialHeight);
            
            // Create a mock renderer with setSize
            const mockRenderer = {
              setSize: vi.fn(),
            } as unknown as THREE.WebGLRenderer;
            
            handleResize(camera, mockRenderer, newWidth, newHeight);
            
            // Verify camera aspect was updated
            expect(camera.aspect).toBeCloseTo(newWidth / newHeight, 5);
            
            // Verify renderer setSize was called
            expect(mockRenderer.setSize).toHaveBeenCalledWith(newWidth, newHeight);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('createCamera should handle extreme aspect ratios', () => {
      // Very wide
      const wideCamera = createCamera(4000, 100);
      expect(wideCamera.aspect).toBeCloseTo(40, 5);
      
      // Very tall
      const tallCamera = createCamera(100, 4000);
      expect(tallCamera.aspect).toBeCloseTo(0.025, 5);
      
      // Square
      const squareCamera = createCamera(500, 500);
      expect(squareCamera.aspect).toBeCloseTo(1, 5);
    });

    it('createParticles should handle minimum particle count', () => {
      const particles = createParticles(1);
      const positions = particles.geometry.getAttribute('position');
      expect(positions.count).toBe(1);
    });

    it('createParticles should handle large particle counts', () => {
      const particles = createParticles(10000);
      const positions = particles.geometry.getAttribute('position');
      expect(positions.count).toBe(10000);
    });
  });
});
