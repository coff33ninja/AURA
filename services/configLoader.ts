// ConfigLoader Service - Loads behavior configs from JSON files
// Implements caching and fallback to defaults

import {
  BehaviorType,
  BehaviorConfigs,
  ModelBehaviors,
  TransformConfig,
  BodyConfig,
  GesturesConfig,
  IdleConfig,
  LipSyncConfig,
  ReactionsConfig,
  ExpressionsConfig,
  getDefaultConfig,
  deepMergeConfig,
  isValidTransformConfig,
  isValidBodyConfig,
  isValidGesturesConfig,
  isValidIdleConfig,
  isValidLipSyncConfig,
  isValidReactionsConfig,
  isValidExpressionsConfig,
} from '../types/behaviorTypes';

// Cache for loaded configs
const configCache = new Map<string, BehaviorConfigs[BehaviorType]>();

// Track fetch requests for testing
let fetchCount = 0;

/**
 * Get the file path for a config type
 */
function getConfigPath(modelName: string, type: BehaviorType): string {
  return `/VRM-Models/sidecars/${modelName}.vrm.${type}.json`;
}

/**
 * Get the default config file path
 */
function getDefaultConfigPath(type: BehaviorType): string {
  return `/VRM-Models/sidecars/_default.vrm.${type}.json`;
}

/**
 * Get cache key for a config
 */
function getCacheKey(modelName: string, type: BehaviorType): string {
  return `${modelName}:${type}`;
}

/**
 * Validate a config based on its type
 */
function validateConfig(type: BehaviorType, config: unknown): boolean {
  switch (type) {
    case 'transform':
      return isValidTransformConfig(config);
    case 'body':
      return isValidBodyConfig(config);
    case 'gestures':
      return isValidGesturesConfig(config);
    case 'idle':
      return isValidIdleConfig(config);
    case 'lipsync':
      return isValidLipSyncConfig(config);
    case 'reactions':
      return isValidReactionsConfig(config);
    case 'expressions':
      return isValidExpressionsConfig(config);
    default:
      return false;
  }
}

/**
 * Fetch a JSON file with error handling
 */
async function fetchJson(path: string): Promise<unknown | null> {
  fetchCount++;
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Load a specific config type for a model
 * Falls back to default config if model-specific doesn't exist
 */
export async function loadConfig<T extends BehaviorType>(
  modelName: string,
  type: T
): Promise<BehaviorConfigs[T]> {
  const cacheKey = getCacheKey(modelName, type);
  
  // Check cache first
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey) as BehaviorConfigs[T];
  }
  
  const defaultConfig = getDefaultConfig(type);
  
  // Try model-specific config first
  const modelPath = getConfigPath(modelName, type);
  let data = await fetchJson(modelPath);
  
  // Fall back to default config file if model-specific doesn't exist
  if (data === null) {
    const defaultPath = getDefaultConfigPath(type);
    data = await fetchJson(defaultPath);
  }
  
  // If we got data, merge with defaults to ensure completeness
  let result: BehaviorConfigs[T];
  if (data !== null && typeof data === 'object') {
    // Merge with defaults to fill any missing fields
    result = deepMergeConfig(defaultConfig, data as Partial<BehaviorConfigs[T]>);
  } else {
    // Use pure defaults
    result = { ...defaultConfig };
  }
  
  // Cache the result
  configCache.set(cacheKey, result);
  
  return result;
}

/**
 * Load all configs for a model in parallel
 */
export async function loadAllConfigs(modelName: string): Promise<ModelBehaviors> {
  const types: BehaviorType[] = ['transform', 'body', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
  
  const results = await Promise.all(
    types.map(type => loadConfig(modelName, type))
  );
  
  return {
    modelName,
    version: '1.0.0',
    transform: results[0] as TransformConfig,
    body: results[1] as BodyConfig,
    expressions: results[2] as ExpressionsConfig,
    gestures: results[3] as GesturesConfig,
    idle: results[4] as IdleConfig,
    lipsync: results[5] as LipSyncConfig,
    reactions: results[6] as ReactionsConfig,
  };
}

/**
 * Check if a specific config file exists for a model
 */
export async function configExists(modelName: string, type: BehaviorType): Promise<boolean> {
  const path = getConfigPath(modelName, type);
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Clear the config cache
 */
export function clearCache(): void {
  configCache.clear();
}

/**
 * Clear cache for a specific model
 */
export function clearModelCache(modelName: string): void {
  const types: BehaviorType[] = ['transform', 'body', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
  for (const type of types) {
    configCache.delete(getCacheKey(modelName, type));
  }
}

/**
 * Get fetch count (for testing)
 */
export function getFetchCount(): number {
  return fetchCount;
}

/**
 * Reset fetch count (for testing)
 */
export function resetFetchCount(): void {
  fetchCount = 0;
}

/**
 * Check if a config is cached
 */
export function isCached(modelName: string, type: BehaviorType): boolean {
  return configCache.has(getCacheKey(modelName, type));
}
