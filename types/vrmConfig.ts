// VRM Configuration Types

export interface VrmConfig {
  modelName: string;
  vrmVersion: '0' | '1';
  
  transform: {
    rotation: number;
    scale: number;
    offsetY: number;
  };
  
  defaultPose: {
    leftUpperArm: { x: number; y: number; z: number };
    rightUpperArm: { x: number; y: number; z: number };
    leftLowerArm?: { x: number; y: number; z: number };
    rightLowerArm?: { x: number; y: number; z: number };
    spine?: { x: number; y: number; z: number };
    chest?: { x: number; y: number; z: number };
    neck?: { x: number; y: number; z: number };
    head?: { x: number; y: number; z: number };
  };
  
  camera: {
    distance: number;
    height: number;
    lookAtHeight: number;
    fov?: number;
  };
  
  expressions?: {
    [standardName: string]: string;
  };
  
  lipSync?: {
    sensitivity: number;
    smoothing: number;
    visemeWeights?: {
      a: number;
      i: number;
      u: number;
      e: number;
      o: number;
    };
  };
  
  idle?: {
    breathingSpeed: number;
    breathingIntensity: number;
    blinkInterval: number;
    blinkDuration: number;
    swayAmount: number;
  };
  
  physics?: {
    gravityMultiplier: number;
    windStrength: number;
    stiffnessMultiplier: number;
  };
}

// Default configuration
export const DEFAULT_VRM_CONFIG: VrmConfig = {
  modelName: '_default',
  vrmVersion: '0',
  transform: {
    rotation: 180,
    scale: 1.0,
    offsetY: 0,
  },
  defaultPose: {
    leftUpperArm: { x: 0, y: 0, z: 1.222 },  // 70 degrees in radians (arms down)
    rightUpperArm: { x: 0, y: 0, z: -1.222 },  // -70 degrees in radians
  },
  camera: {
    distance: 2.0,
    height: 1.3,
    lookAtHeight: 1.2,
  },
  lipSync: {
    sensitivity: 4.0,
    smoothing: 0.3,
    visemeWeights: {
      a: 0.8,
      i: 0.3,
      u: 0.25,
      e: 0.3,
      o: 0.6,
    },
  },
  idle: {
    breathingSpeed: 0.8,
    breathingIntensity: 0.02,
    blinkInterval: 4.0,
    blinkDuration: 0.15,
    swayAmount: 0.1,
  },
};

// Deep merge helper
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(
          (target[key] as object) || {},
          source[key] as object
        ) as T[typeof key];
      } else {
        result[key] = source[key] as T[typeof key];
      }
    }
  }
  return result;
}

// Config cache
const configCache = new Map<string, VrmConfig>();

// API base URL
const API_BASE = '';

// Load VRM config for a model
export async function loadVrmConfig(modelName: string): Promise<VrmConfig> {
  // Check cache first
  if (configCache.has(modelName)) {
    return configCache.get(modelName)!;
  }
  
  const configPath = `/VRM-Models/sidecars/${modelName}.vrm.config.json`;
  
  try {
    const response = await fetch(configPath);
    if (response.ok) {
      const config = await response.json() as Partial<VrmConfig>;
      // Merge with defaults to ensure all fields exist
      const mergedConfig = deepMerge(DEFAULT_VRM_CONFIG, config);
      mergedConfig.modelName = modelName;
      configCache.set(modelName, mergedConfig);
      console.log(`[VrmConfig] Loaded config for ${modelName}`);
      return mergedConfig;
    }
  } catch (e) {
    console.log(`[VrmConfig] No config found for ${modelName}, using defaults`);
  }
  
  // Return defaults with model name
  const defaultConfig = { ...DEFAULT_VRM_CONFIG, modelName };
  configCache.set(modelName, defaultConfig);
  return defaultConfig;
}

// Save VRM config to server (async)
export async function saveVrmConfigToStorage(modelName: string, config: Partial<VrmConfig>): Promise<void> {
  try {
    // Get existing config from server first
    const existingConfig = await loadVrmConfigFromStorage(modelName) || {};
    const merged = deepMerge(existingConfig as VrmConfig, config);
    
    const response = await fetch(`${API_BASE}/api/vrm-configs/${encodeURIComponent(modelName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    
    if (!response.ok) {
      console.warn('[VrmConfig] Failed to save config to server');
    }
  } catch (error) {
    console.warn('[VrmConfig] Failed to save config:', error);
  }
}

// Load VRM config overrides from server (async)
export async function loadVrmConfigFromStorage(modelName: string): Promise<Partial<VrmConfig> | null> {
  try {
    const response = await fetch(`${API_BASE}/api/vrm-configs/${encodeURIComponent(modelName)}`);
    
    if (!response.ok) return null;
    
    const config = await response.json();
    // Return null if empty object
    if (Object.keys(config).length === 0) return null;
    
    return config;
  } catch (error) {
    console.warn('[VrmConfig] Failed to load config from server:', error);
    return null;
  }
}

// Get final config (file config + server overrides)
export async function getVrmConfig(modelName: string): Promise<VrmConfig> {
  const fileConfig = await loadVrmConfig(modelName);
  const storageOverrides = await loadVrmConfigFromStorage(modelName);
  
  if (storageOverrides) {
    return deepMerge(fileConfig, storageOverrides);
  }
  
  return fileConfig;
}

// Clear config cache (useful when reloading)
export function clearConfigCache(): void {
  configCache.clear();
}
