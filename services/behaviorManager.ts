// BehaviorManager Service - Central coordinator for VRM behaviors
// Handles loading, updating, persisting, and exporting behavior configs

import {
  BehaviorType,
  BehaviorConfigs,
  ModelBehaviors,
  ValidationResult,
  deepMergeConfig,
  createDefaultModelBehaviors,
  isValidTransformConfig,
  isValidBodyConfig,
  isValidGesturesConfig,
  isValidIdleConfig,
  isValidLipSyncConfig,
  isValidReactionsConfig,
  isValidExpressionsConfig,
} from '../types/behaviorTypes';
import { loadAllConfigs, clearModelCache } from './configLoader';

// Current loaded behaviors
let currentBehaviors: ModelBehaviors | null = null;

// Event callbacks
type BehaviorsLoadedCallback = (behaviors: ModelBehaviors) => void;
type BehaviorChangedCallback = (type: BehaviorType, config: BehaviorConfigs[BehaviorType]) => void;

let onBehaviorsLoadedCallbacks: BehaviorsLoadedCallback[] = [];
let onBehaviorChangedCallbacks: BehaviorChangedCallback[] = [];

// Storage key prefix
const STORAGE_PREFIX = 'vrm-behaviors:';

/**
 * Get storage key for a model
 */
function getStorageKey(modelName: string): string {
  return `${STORAGE_PREFIX}${modelName}`;
}

/**
 * Load behaviors for a model
 * Merges file configs with localStorage overrides
 */
export async function loadModelBehaviors(modelName: string): Promise<ModelBehaviors> {
  // Load from config files
  const fileBehaviors = await loadAllConfigs(modelName);
  
  // Load localStorage overrides
  const storageOverrides = loadFromStorage(modelName);
  
  // Merge storage overrides on top of file configs
  if (storageOverrides) {
    currentBehaviors = {
      ...fileBehaviors,
      transform: deepMergeConfig(fileBehaviors.transform, storageOverrides.transform || {}),
      body: deepMergeConfig(fileBehaviors.body, storageOverrides.body || {}),
      expressions: deepMergeConfig(fileBehaviors.expressions, storageOverrides.expressions || {}),
      gestures: deepMergeConfig(fileBehaviors.gestures, storageOverrides.gestures || {}),
      idle: deepMergeConfig(fileBehaviors.idle, storageOverrides.idle || {}),
      lipsync: deepMergeConfig(fileBehaviors.lipsync, storageOverrides.lipsync || {}),
      reactions: deepMergeConfig(fileBehaviors.reactions, storageOverrides.reactions || {}),
    };
  } else {
    currentBehaviors = fileBehaviors;
  }
  
  // Notify listeners
  for (const callback of onBehaviorsLoadedCallbacks) {
    callback(currentBehaviors);
  }
  
  return currentBehaviors;
}

/**
 * Get current loaded behaviors
 */
export function getCurrentBehaviors(): ModelBehaviors | null {
  return currentBehaviors;
}

/**
 * Update a specific behavior config
 */
export function updateBehavior<T extends BehaviorType>(
  type: T,
  config: Partial<BehaviorConfigs[T]>
): void {
  if (!currentBehaviors) {
    throw new Error('No behaviors loaded. Call loadModelBehaviors first.');
  }
  
  // Deep merge the update
  const currentConfig = currentBehaviors[type] as BehaviorConfigs[T];
  const updatedConfig = deepMergeConfig(currentConfig, config);
  
  // Update current behaviors
  (currentBehaviors as any)[type] = updatedConfig;
  
  // Notify listeners
  for (const callback of onBehaviorChangedCallbacks) {
    callback(type, updatedConfig);
  }
}

/**
 * Save current behaviors to localStorage
 */
export function saveToStorage(modelName: string): void {
  if (!currentBehaviors) {
    throw new Error('No behaviors loaded. Call loadModelBehaviors first.');
  }
  
  try {
    const key = getStorageKey(modelName);
    const data = JSON.stringify(currentBehaviors);
    localStorage.setItem(key, data);
  } catch (error) {
    console.warn('Failed to save behaviors to localStorage:', error);
  }
}

/**
 * Load behaviors from localStorage
 */
export function loadFromStorage(modelName: string): Partial<ModelBehaviors> | null {
  try {
    const key = getStorageKey(modelName);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load behaviors from localStorage:', error);
    return null;
  }
}

/**
 * Clear localStorage for a model
 */
export function clearStorage(modelName: string): void {
  try {
    const key = getStorageKey(modelName);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

/**
 * Export current behaviors as JSON string
 */
export function exportConfig(): string {
  if (!currentBehaviors) {
    throw new Error('No behaviors loaded. Call loadModelBehaviors first.');
  }
  
  return JSON.stringify(currentBehaviors, null, 2);
}

/**
 * Validate a config object
 */
function validateBehaviorConfig(type: BehaviorType, config: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: [`${type} config must be an object`] };
  }
  
  let isValid = false;
  switch (type) {
    case 'transform':
      isValid = isValidTransformConfig(config);
      if (!isValid) errors.push('Invalid transform config: missing required fields');
      break;
    case 'body':
      isValid = isValidBodyConfig(config);
      if (!isValid) errors.push('Invalid body config: missing required fields');
      break;
    case 'gestures':
      isValid = isValidGesturesConfig(config);
      if (!isValid) errors.push('Invalid gestures config: gestures must be an array');
      break;
    case 'idle':
      isValid = isValidIdleConfig(config);
      if (!isValid) errors.push('Invalid idle config: missing required fields');
      break;
    case 'lipsync':
      isValid = isValidLipSyncConfig(config);
      if (!isValid) errors.push('Invalid lipsync config: missing required fields');
      break;
    case 'reactions':
      isValid = isValidReactionsConfig(config);
      if (!isValid) errors.push('Invalid reactions config: reactions must be an array');
      break;
    case 'expressions':
      isValid = isValidExpressionsConfig(config);
      if (!isValid) errors.push('Invalid expressions config: mappings must be an object');
      break;
  }
  
  return { valid: isValid, errors };
}

/**
 * Import config from JSON string
 */
export function importConfig(json: string): ValidationResult {
  const errors: string[] = [];
  
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { valid: false, errors: ['Invalid JSON format'] };
  }
  
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Config must be an object'] };
  }
  
  const config = parsed as Record<string, unknown>;
  
  // Check for version
  if (!config.version || typeof config.version !== 'string') {
    errors.push('Missing or invalid version field');
  }
  
  // Check for modelName
  if (!config.modelName || typeof config.modelName !== 'string') {
    errors.push('Missing or invalid modelName field');
  }
  
  // Validate each behavior type
  const types: BehaviorType[] = ['transform', 'body', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
  for (const type of types) {
    if (config[type]) {
      const result = validateBehaviorConfig(type, config[type]);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Apply the imported config
  if (currentBehaviors) {
    const imported = config as unknown as ModelBehaviors;
    currentBehaviors = {
      ...currentBehaviors,
      ...imported,
      modelName: currentBehaviors.modelName, // Keep current model name
    };
    
    // Notify listeners for each changed type
    for (const type of types) {
      if (imported[type]) {
        for (const callback of onBehaviorChangedCallbacks) {
          callback(type, currentBehaviors[type]);
        }
      }
    }
  }
  
  return { valid: true, errors: [] };
}

/**
 * Register callback for behaviors loaded event
 */
export function onBehaviorsLoaded(callback: BehaviorsLoadedCallback): () => void {
  onBehaviorsLoadedCallbacks.push(callback);
  return () => {
    onBehaviorsLoadedCallbacks = onBehaviorsLoadedCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Register callback for behavior changed event
 */
export function onBehaviorChanged(callback: BehaviorChangedCallback): () => void {
  onBehaviorChangedCallbacks.push(callback);
  return () => {
    onBehaviorChangedCallbacks = onBehaviorChangedCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Reset manager state (for testing)
 */
export function resetManager(): void {
  currentBehaviors = null;
  onBehaviorsLoadedCallbacks = [];
  onBehaviorChangedCallbacks = [];
}

/**
 * Set behaviors directly (for testing)
 */
export function setBehaviors(behaviors: ModelBehaviors): void {
  currentBehaviors = behaviors;
}
