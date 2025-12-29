// LOD (Level of Detail) Manager
// Manages quality settings based on camera distance for performance optimization

import * as THREE from 'three';

/**
 * Shadow quality levels
 */
export type ShadowQuality = 'high' | 'medium' | 'low' | 'none';

/**
 * LOD level configuration
 */
export interface LodLevel {
  distance: number;
  shadowQuality: ShadowQuality;
  particleMultiplier: number;
  textureQuality?: number; // 0-1, for future texture LOD
}

/**
 * LOD system configuration
 */
export interface LodConfig {
  enabled: boolean;
  thresholds: number[]; // Camera distances for LOD transitions
  levels: LodLevel[];
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LodConfig = {
  enabled: true,
  thresholds: [2, 5, 10], // Close, medium, far distances
  levels: [
    { distance: 0, shadowQuality: 'high', particleMultiplier: 1.0 },
    { distance: 2, shadowQuality: 'medium', particleMultiplier: 0.7 },
    { distance: 5, shadowQuality: 'low', particleMultiplier: 0.4 },
    { distance: 10, shadowQuality: 'none', particleMultiplier: 0.2 },
  ],
};

/**
 * Shadow map sizes for each quality level
 */
const SHADOW_MAP_SIZES: Record<ShadowQuality, number> = {
  high: 2048,
  medium: 1024,
  low: 512,
  none: 0,
};

/**
 * Calculate the appropriate LOD level based on camera distance
 * 
 * @param cameraDistance - Distance from camera to subject
 * @param config - LOD configuration
 * @returns The LOD level to apply
 */
export function calculateLodLevel(
  cameraDistance: number,
  config: LodConfig = DEFAULT_LOD_CONFIG
): LodLevel {
  if (!config.enabled || config.levels.length === 0) {
    // Return highest quality if LOD is disabled
    return {
      distance: 0,
      shadowQuality: 'high',
      particleMultiplier: 1.0,
    };
  }

  // Ensure distance is non-negative
  const distance = Math.max(0, cameraDistance);

  // Sort levels by distance (ascending)
  const sortedLevels = [...config.levels].sort((a, b) => a.distance - b.distance);

  // Find the appropriate level based on distance
  let selectedLevel = sortedLevels[0];
  
  for (const level of sortedLevels) {
    if (distance >= level.distance) {
      selectedLevel = level;
    } else {
      break;
    }
  }

  return selectedLevel;
}

/**
 * Apply LOD settings to a THREE.js scene
 * 
 * @param scene - The THREE.js scene to modify
 * @param level - The LOD level to apply
 * @param options - Additional options for applying LOD
 */
export function applyLodSettings(
  scene: THREE.Scene,
  level: LodLevel,
  options: {
    particleSystem?: THREE.Points;
    baseParticleCount?: number;
    lights?: THREE.Light[];
  } = {}
): void {
  const { particleSystem, baseParticleCount, lights } = options;

  // Apply shadow quality to lights
  if (lights && lights.length > 0) {
    for (const light of lights) {
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
        if (level.shadowQuality === 'none') {
          light.castShadow = false;
        } else {
          light.castShadow = true;
          const shadowMapSize = SHADOW_MAP_SIZES[level.shadowQuality];
          if (light.shadow && light.shadow.mapSize) {
            light.shadow.mapSize.width = shadowMapSize;
            light.shadow.mapSize.height = shadowMapSize;
          }
        }
      }
    }
  }

  // Apply particle multiplier
  if (particleSystem && baseParticleCount !== undefined) {
    const targetCount = Math.floor(baseParticleCount * level.particleMultiplier);
    updateParticleCount(particleSystem, targetCount);
  }
}

/**
 * Update the visible particle count in a particle system
 * 
 * @param particles - The THREE.Points particle system
 * @param targetCount - The target number of visible particles
 */
function updateParticleCount(particles: THREE.Points, targetCount: number): void {
  const geometry = particles.geometry;
  if (!geometry) return;

  // Use draw range to limit visible particles
  const positionAttribute = geometry.getAttribute('position');
  if (positionAttribute) {
    const maxCount = positionAttribute.count;
    const visibleCount = Math.min(targetCount, maxCount);
    geometry.setDrawRange(0, visibleCount);
  }
}

/**
 * Get the shadow map size for a quality level
 * 
 * @param quality - The shadow quality level
 * @returns The shadow map size in pixels
 */
export function getShadowMapSize(quality: ShadowQuality): number {
  return SHADOW_MAP_SIZES[quality];
}

/**
 * Create a LOD configuration with custom thresholds
 * 
 * @param thresholds - Array of distance thresholds
 * @returns A LOD configuration with levels at each threshold
 */
export function createLodConfig(thresholds: number[]): LodConfig {
  const sortedThresholds = [...thresholds].sort((a, b) => a - b);
  
  const qualities: ShadowQuality[] = ['high', 'medium', 'low', 'none'];
  const particleMultipliers = [1.0, 0.7, 0.4, 0.2];
  
  const levels: LodLevel[] = sortedThresholds.map((distance, index) => ({
    distance,
    shadowQuality: qualities[Math.min(index, qualities.length - 1)],
    particleMultiplier: particleMultipliers[Math.min(index, particleMultipliers.length - 1)],
  }));

  // Add a base level at distance 0 if not present
  if (levels.length === 0 || levels[0].distance > 0) {
    levels.unshift({
      distance: 0,
      shadowQuality: 'high',
      particleMultiplier: 1.0,
    });
  }

  return {
    enabled: true,
    thresholds: sortedThresholds,
    levels,
  };
}

/**
 * Create a LOD configuration optimized for the device's capabilities
 * 
 * @param isMobile - Whether the device is mobile
 * @param isLowEnd - Whether the device is low-end
 * @returns A LOD configuration optimized for the device
 */
export function createDeviceOptimizedLodConfig(isMobile: boolean = false, isLowEnd: boolean = false): LodConfig {
  // Desktop: standard LOD at normal distances
  if (!isMobile && !isLowEnd) {
    return DEFAULT_LOD_CONFIG;
  }

  // Low-end device: much more aggressive, earlier quality drops
  if (isLowEnd) {
    return {
      enabled: true,
      thresholds: [0.5, 1.5, 3],
      levels: [
        { distance: 0, shadowQuality: 'medium', particleMultiplier: 0.5 },
        { distance: 0.5, shadowQuality: 'low', particleMultiplier: 0.3 },
        { distance: 1.5, shadowQuality: 'none', particleMultiplier: 0.15 },
        { distance: 3, shadowQuality: 'none', particleMultiplier: 0.1 },
      ],
    };
  }

  // Mobile device: more aggressive than desktop, less than low-end
  if (isMobile) {
    return {
      enabled: true,
      thresholds: [1, 3, 6],
      levels: [
        { distance: 0, shadowQuality: 'high', particleMultiplier: 0.8 },
        { distance: 1, shadowQuality: 'medium', particleMultiplier: 0.5 },
        { distance: 3, shadowQuality: 'low', particleMultiplier: 0.25 },
        { distance: 6, shadowQuality: 'none', particleMultiplier: 0.1 },
      ],
    };
  }

  return DEFAULT_LOD_CONFIG;
}

/**
 * Interpolate between two LOD levels for smooth transitions
 * 
 * @param from - Starting LOD level
 * @param to - Target LOD level
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated LOD level
 */
export function interpolateLodLevels(
  from: LodLevel,
  to: LodLevel,
  t: number
): LodLevel {
  const clampedT = Math.max(0, Math.min(1, t));
  
  return {
    distance: from.distance + (to.distance - from.distance) * clampedT,
    // Shadow quality doesn't interpolate - use the target if t > 0.5
    shadowQuality: clampedT > 0.5 ? to.shadowQuality : from.shadowQuality,
    particleMultiplier: from.particleMultiplier + (to.particleMultiplier - from.particleMultiplier) * clampedT,
  };
}

/**
 * Check if LOD level has changed significantly enough to warrant an update
 * 
 * @param current - Current LOD level
 * @param next - Next LOD level
 * @returns True if the levels are different enough to update
 */
export function shouldUpdateLod(current: LodLevel, next: LodLevel): boolean {
  // Check shadow quality change
  if (current.shadowQuality !== next.shadowQuality) {
    return true;
  }
  
  // Check particle multiplier change (with small threshold to avoid constant updates)
  const particleDiff = Math.abs(current.particleMultiplier - next.particleMultiplier);
  if (particleDiff > 0.05) {
    return true;
  }
  
  return false;
}
