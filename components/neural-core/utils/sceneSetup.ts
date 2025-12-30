/**
 * Scene Setup Utilities
 * 
 * Provides functions for initializing Three.js scene components
 * for VRM avatar rendering with portrait framing.
 */

import * as THREE from 'three';
import { detectDeviceCapabilities, getOptimalParticleCount } from '../../../utils/deviceDetector';
import { createDeviceOptimizedLodConfig, type LodConfig } from '../../../utils/lodManager';

// ============================================================================
// Types
// ============================================================================

export interface SceneSetupOptions {
  width: number;
  height: number;
  particleCount?: number;
}

export interface SceneSetupResult {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lights: THREE.Light[];
  particles: THREE.Points;
  lodConfig: LodConfig;
  actualParticleCount: number;
}

export interface LightSetupResult {
  directionalLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  rimLight: THREE.SpotLight;
  allLights: THREE.Light[];
}

// ============================================================================
// Scene Creation Functions
// ============================================================================

/**
 * Create a new Three.js scene
 */
export function createScene(): THREE.Scene {
  return new THREE.Scene();
}

/**
 * Create a perspective camera configured for portrait VRM framing
 * 
 * @param width - Viewport width
 * @param height - Viewport height
 * @returns Configured PerspectiveCamera
 */
export function createCamera(width: number, height: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);
  // Position for portrait shot - eye level
  camera.position.set(0, 1.4, 1.5);
  camera.lookAt(0, 1.3, 0);
  return camera;
}

/**
 * Create a WebGL renderer with VRM-appropriate settings
 * 
 * @param width - Viewport width
 * @param height - Viewport height
 * @returns Configured WebGLRenderer
 */
export function createRenderer(width: number, height: number): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true 
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  // VRM color space handling
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/**
 * Create lighting setup for VRM avatar
 * Includes directional, ambient, and rim lights for anime-style rendering
 * 
 * @returns Light setup with all light references
 */
export function createLights(): LightSetupResult {
  // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(1, 1, 1).normalize();
  
  // Ambient light - boosted for anime style
  const ambientLight = new THREE.AmbientLight(0x222222, 2.0);
  
  // Rim light for edge highlighting
  const rimLight = new THREE.SpotLight(0x38bdf8, 5);
  rimLight.position.set(0, 2, -2);
  rimLight.lookAt(0, 1, 0);
  
  return {
    directionalLight,
    ambientLight,
    rimLight,
    allLights: [directionalLight, rimLight], // For LOD management (ambient excluded)
  };
}

/**
 * Create particle system for data stream effect
 * 
 * @param count - Number of particles to create
 * @returns Points object with particle geometry and material
 */
export function createParticles(count: number): THREE.Points {
  const particleGeo = new THREE.BufferGeometry();
  const posArray = new Float32Array(count * 3);
  
  // Randomize particle positions in a 3x3x3 cube
  for (let i = 0; i < count * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 3;
  }
  
  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  const particleMat = new THREE.PointsMaterial({
    size: 0.02,
    color: 0xa855f7, // Purple
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });
  
  return new THREE.Points(particleGeo, particleMat);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Set up complete scene with all components
 * 
 * @param container - DOM element to attach renderer to
 * @param options - Optional configuration
 * @returns Complete scene setup result
 */
export function setupScene(
  container: HTMLElement,
  options?: Partial<SceneSetupOptions>
): SceneSetupResult {
  const width = options?.width ?? container.clientWidth;
  const height = options?.height ?? container.clientHeight;
  
  // Detect device capabilities for optimization
  const deviceCaps = detectDeviceCapabilities();
  const baseParticleCount = options?.particleCount ?? 150;
  const actualParticleCount = getOptimalParticleCount(baseParticleCount, deviceCaps);
  
  // Create LOD configuration based on device
  const lodConfig = createDeviceOptimizedLodConfig(deviceCaps.isMobile, deviceCaps.isLowEnd);
  
  console.log(
    `[SceneSetup] Device: ${deviceCaps.isMobile ? 'Mobile' : 'Desktop'} ` +
    `(LOD Level: ${deviceCaps.recommendedLod}), ` +
    `Particles: ${actualParticleCount}/${baseParticleCount}`
  );
  
  // Create all components
  const scene = createScene();
  const camera = createCamera(width, height);
  const renderer = createRenderer(width, height);
  const lightSetup = createLights();
  const particles = createParticles(actualParticleCount);
  
  // Add lights to scene
  scene.add(lightSetup.directionalLight);
  scene.add(lightSetup.ambientLight);
  scene.add(lightSetup.rimLight);
  
  // Add particles to scene
  scene.add(particles);
  
  // Attach renderer to container
  container.appendChild(renderer.domElement);
  
  return {
    scene,
    camera,
    renderer,
    lights: lightSetup.allLights,
    particles,
    lodConfig,
    actualParticleCount,
  };
}

/**
 * Dispose of scene resources to free memory
 * 
 * @param result - Scene setup result to dispose
 */
export function disposeScene(result: SceneSetupResult): void {
  // Dispose particles
  if (result.particles) {
    result.particles.geometry.dispose();
    if (result.particles.material instanceof THREE.Material) {
      result.particles.material.dispose();
    }
  }
  
  // Dispose renderer
  if (result.renderer) {
    result.renderer.dispose();
    // Remove canvas from DOM if still attached
    if (result.renderer.domElement.parentElement) {
      result.renderer.domElement.parentElement.removeChild(result.renderer.domElement);
    }
  }
  
  // Clear scene
  if (result.scene) {
    result.scene.clear();
  }
}

/**
 * Handle window resize for camera and renderer
 * 
 * @param camera - Camera to update
 * @param renderer - Renderer to resize
 * @param width - New width
 * @param height - New height
 */
export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): void {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
