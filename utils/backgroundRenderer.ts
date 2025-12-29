// Background Renderer - Applies background configurations to THREE.js scenes

import type { BackgroundConfig, SolidBackground, GradientBackground, HdriBackground } from '../types/enhancementTypes';

// Storage key for background preferences
const STORAGE_KEY = 'aura_background_preference';

// API base URL
const API_BASE = '';

/**
 * Parse a hex color string to RGB values (0-1 range)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Support 3-digit and 6-digit hex
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  }
  
  if (fullHex.length !== 6) return null;
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) return null;
  
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * Validate a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#?([a-f\d]{3}|[a-f\d]{6})$/i.test(color);
}

/**
 * Create a gradient texture for use as scene background
 * @param colors - Tuple of [topColor, bottomColor] in hex format
 * @param angle - Gradient angle in degrees (0 = vertical, 90 = horizontal)
 * @param size - Texture size (default 512)
 */
export function createGradientTexture(
  colors: [string, string],
  angle: number = 0,
  size: number = 512
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for gradient texture');
  }
  
  // Convert angle to radians and calculate gradient endpoints
  const angleRad = (angle * Math.PI) / 180;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;
  
  // Calculate start and end points based on angle
  const x0 = centerX - Math.sin(angleRad) * radius;
  const y0 = centerY - Math.cos(angleRad) * radius;
  const x1 = centerX + Math.sin(angleRad) * radius;
  const y1 = centerY + Math.cos(angleRad) * radius;
  
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  
  // Ensure colors have # prefix
  const color0 = colors[0].startsWith('#') ? colors[0] : `#${colors[0]}`;
  const color1 = colors[1].startsWith('#') ? colors[1] : `#${colors[1]}`;
  
  gradient.addColorStop(0, color0);
  gradient.addColorStop(1, color1);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  return canvas;
}

/**
 * Apply a solid color background to a THREE.js scene
 */
export function applySolidBackground(
  scene: any, // THREE.Scene
  THREE: any, // THREE module
  config: SolidBackground
): void {
  const rgb = hexToRgb(config.color);
  if (!rgb) {
    console.warn('Invalid solid background color:', config.color);
    return;
  }
  
  scene.background = new THREE.Color(rgb.r, rgb.g, rgb.b);
}

/**
 * Apply a gradient background to a THREE.js scene
 */
export function applyGradientBackground(
  scene: any, // THREE.Scene
  THREE: any, // THREE module
  config: GradientBackground
): void {
  const canvas = createGradientTexture(config.colors, config.angle);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  scene.background = texture;
}

/**
 * Apply an HDRI environment map background to a THREE.js scene
 * Note: This requires the RGBELoader from three/examples
 */
export async function applyHdriBackground(
  scene: any, // THREE.Scene
  THREE: any, // THREE module
  config: HdriBackground,
  RGBELoader?: any // Optional RGBELoader class
): Promise<void> {
  if (!RGBELoader) {
    console.warn('RGBELoader not provided, cannot load HDRI');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    loader.load(
      config.url,
      (texture: any) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        
        // Apply intensity by adjusting exposure (if renderer supports it)
        // This is typically done at the renderer level, not here
        
        resolve();
      },
      undefined,
      (error: Error) => {
        console.error('Failed to load HDRI:', error);
        reject(error);
      }
    );
  });
}

/**
 * Apply a background configuration to a THREE.js scene
 */
export async function applyBackground(
  scene: any, // THREE.Scene
  THREE: any, // THREE module
  config: BackgroundConfig,
  RGBELoader?: any
): Promise<void> {
  switch (config.type) {
    case 'solid':
      applySolidBackground(scene, THREE, config);
      break;
    case 'gradient':
      applyGradientBackground(scene, THREE, config);
      break;
    case 'hdri':
      await applyHdriBackground(scene, THREE, config, RGBELoader);
      break;
    default:
      console.warn('Unknown background type:', (config as any).type);
  }
}

/**
 * Clear the scene background (set to null/transparent)
 */
export function clearBackground(scene: any): void {
  scene.background = null;
  scene.environment = null;
}

/**
 * Save background preference to server (async)
 */
export async function saveBackgroundPreference(config: BackgroundConfig): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/preferences/${STORAGE_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      console.warn('Failed to save background preference to server');
    }
  } catch (e) {
    console.warn('Failed to save background preference:', e);
  }
}

/**
 * Load background preference from server (async)
 */
export async function loadBackgroundPreference(): Promise<BackgroundConfig | null> {
  try {
    const response = await fetch(`${API_BASE}/api/preferences/${STORAGE_KEY}`);
    
    if (!response.ok) return null;
    
    const config = await response.json() as BackgroundConfig;
    
    // Return null if empty object
    if (!config || Object.keys(config).length === 0) return null;
    
    // Validate the loaded config
    if (!config.type) return null;
    
    switch (config.type) {
      case 'solid':
        if (!isValidHexColor(config.color)) return null;
        break;
      case 'gradient':
        if (!Array.isArray(config.colors) || config.colors.length !== 2) return null;
        if (!config.colors.every(isValidHexColor)) return null;
        if (typeof config.angle !== 'number') return null;
        break;
      case 'hdri':
        if (typeof config.url !== 'string') return null;
        if (typeof config.intensity !== 'number') return null;
        break;
      default:
        return null;
    }
    
    return config;
  } catch (e) {
    console.warn('Failed to load background preference:', e);
    return null;
  }
}

/**
 * Get default background config
 */
export function getDefaultBackground(): BackgroundConfig {
  return {
    type: 'solid',
    color: '#000000',
  };
}

/**
 * Preset background configurations
 */
export const BACKGROUND_PRESETS: Record<string, BackgroundConfig> = {
  black: { type: 'solid', color: '#000000' },
  white: { type: 'solid', color: '#ffffff' },
  darkBlue: { type: 'solid', color: '#0a1628' },
  purple: { type: 'solid', color: '#1a0a28' },
  sunset: { type: 'gradient', colors: ['#ff7e5f', '#feb47b'], angle: 180 },
  ocean: { type: 'gradient', colors: ['#2193b0', '#6dd5ed'], angle: 180 },
  night: { type: 'gradient', colors: ['#0f0c29', '#302b63'], angle: 180 },
  forest: { type: 'gradient', colors: ['#134e5e', '#71b280'], angle: 180 },
  cyber: { type: 'gradient', colors: ['#0a0a0a', '#1a1a2e'], angle: 180 },
  neon: { type: 'gradient', colors: ['#12c2e9', '#c471ed'], angle: 45 },
};
