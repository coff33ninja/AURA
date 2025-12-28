// Device Detector - Detects device capabilities for performance optimization
// Provides mobile detection and optimal settings recommendations

/**
 * Device capabilities detected from the browser environment
 */
export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  maxParticles: number;
  recommendedLod: number;
  hasWebGL2: boolean;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: number | null; // GB, null if not available
}

/**
 * Default capabilities for when detection fails
 */
const DEFAULT_CAPABILITIES: DeviceCapabilities = {
  isMobile: false,
  isLowEnd: false,
  maxParticles: 150,
  recommendedLod: 0,
  hasWebGL2: true,
  devicePixelRatio: 1,
  hardwareConcurrency: 4,
  deviceMemory: null,
};

/**
 * Particle count recommendations based on device type
 */
const PARTICLE_COUNTS = {
  desktop: 150,
  mobile: 75,
  lowEnd: 50,
};

/**
 * Detect if the device is mobile based on user agent and screen size
 */
function detectMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android',
    'webos',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'opera mini',
    'mobile',
  ];
  
  const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Also check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUserAgent || (hasTouchScreen && isSmallScreen);
}

/**
 * Detect if the device is low-end based on hardware indicators
 */
function detectLowEnd(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) {
    return true;
  }

  // Check device memory if available (Chrome only)
  const memory = (navigator as any).deviceMemory;
  if (memory !== undefined && memory <= 2) {
    return true;
  }

  // Check for WebGL capabilities
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      return true;
    }
    
    // Check for low-end GPU indicators
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const lowEndGpus = ['intel', 'mesa', 'swiftshader', 'llvmpipe'];
      if (lowEndGpus.some(gpu => renderer.toLowerCase().includes(gpu))) {
        return true;
      }
    }
  } catch (e) {
    // If WebGL detection fails, assume not low-end
  }

  return false;
}

/**
 * Check if WebGL2 is available
 */
function detectWebGL2(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (e) {
    return false;
  }
}

/**
 * Detect device capabilities for performance optimization
 * 
 * @returns Device capabilities object
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return DEFAULT_CAPABILITIES;
  }

  const isMobile = detectMobile();
  const isLowEnd = detectLowEnd();
  const hasWebGL2 = detectWebGL2();
  const devicePixelRatio = window.devicePixelRatio || 1;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as any).deviceMemory || null;

  // Determine max particles based on device type
  let maxParticles = PARTICLE_COUNTS.desktop;
  if (isLowEnd) {
    maxParticles = PARTICLE_COUNTS.lowEnd;
  } else if (isMobile) {
    maxParticles = PARTICLE_COUNTS.mobile;
  }

  // Determine recommended LOD level
  // 0 = highest quality, higher numbers = lower quality
  let recommendedLod = 0;
  if (isLowEnd) {
    recommendedLod = 2;
  } else if (isMobile) {
    recommendedLod = 1;
  }

  return {
    isMobile,
    isLowEnd,
    maxParticles,
    recommendedLod,
    hasWebGL2,
    devicePixelRatio,
    hardwareConcurrency,
    deviceMemory,
  };
}

/**
 * Get optimal particle count based on device capabilities
 * 
 * @param baseCount - The base particle count for desktop
 * @param capabilities - Device capabilities (optional, will detect if not provided)
 * @returns Optimal particle count for the device
 */
export function getOptimalParticleCount(
  baseCount: number,
  capabilities?: DeviceCapabilities
): number {
  const caps = capabilities || detectDeviceCapabilities();
  
  if (caps.isLowEnd) {
    // Low-end devices get 33% of base count
    return Math.floor(baseCount * 0.33);
  } else if (caps.isMobile) {
    // Mobile devices get 50% of base count
    return Math.floor(baseCount * 0.5);
  }
  
  // Desktop gets full count
  return baseCount;
}

/**
 * Get optimal render scale based on device capabilities
 * 
 * @param capabilities - Device capabilities (optional, will detect if not provided)
 * @returns Render scale multiplier (0.5 - 1.0)
 */
export function getOptimalRenderScale(capabilities?: DeviceCapabilities): number {
  const caps = capabilities || detectDeviceCapabilities();
  
  if (caps.isLowEnd) {
    return 0.5;
  } else if (caps.isMobile) {
    // On mobile, reduce scale if pixel ratio is high
    if (caps.devicePixelRatio > 2) {
      return 0.75;
    }
    return 0.85;
  }
  
  return 1.0;
}

/**
 * Check if device should use reduced animations
 * 
 * @param capabilities - Device capabilities (optional, will detect if not provided)
 * @returns True if reduced animations are recommended
 */
export function shouldReduceAnimations(capabilities?: DeviceCapabilities): boolean {
  const caps = capabilities || detectDeviceCapabilities();
  
  // Check for prefers-reduced-motion media query
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      return true;
    }
  }
  
  return caps.isLowEnd;
}

/**
 * Get a summary string of device capabilities for debugging
 * 
 * @param capabilities - Device capabilities (optional, will detect if not provided)
 * @returns Human-readable summary string
 */
export function getCapabilitiesSummary(capabilities?: DeviceCapabilities): string {
  const caps = capabilities || detectDeviceCapabilities();
  
  const parts = [
    caps.isMobile ? 'Mobile' : 'Desktop',
    caps.isLowEnd ? 'Low-End' : 'Standard',
    `${caps.hardwareConcurrency} cores`,
    caps.deviceMemory ? `${caps.deviceMemory}GB RAM` : 'RAM unknown',
    caps.hasWebGL2 ? 'WebGL2' : 'WebGL1',
    `${caps.devicePixelRatio}x DPR`,
  ];
  
  return parts.join(', ');
}
