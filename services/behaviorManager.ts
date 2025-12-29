// BehaviorManager Service - Central coordinator for VRM behaviors
// Handles loading, updating, persisting, and exporting behavior configs
// Now uses SQLite via API instead of localStorage

import {
  BehaviorType,
  BehaviorConfigs,
  ModelBehaviors,
  ValidationResult,
  deepMergeConfig,
  isValidTransformConfig,
  isValidBodyConfig,
  isValidHandsConfig,
  isValidFacialConfig,
  isValidGesturesConfig,
  isValidIdleConfig,
  isValidLipSyncConfig,
  isValidReactionsConfig,
  isValidExpressionsConfig,
} from '../types/behaviorTypes';
import { loadAllConfigs } from './configLoader';

// Current loaded behaviors
let currentBehaviors: ModelBehaviors | null = null;

// Current session ID for tracking changes
let currentSessionId: string | null = null;

// Event callbacks
type BehaviorsLoadedCallback = (behaviors: ModelBehaviors) => void;
type BehaviorChangedCallback = (type: BehaviorType, config: BehaviorConfigs[BehaviorType]) => void;

let onBehaviorsLoadedCallbacks: BehaviorsLoadedCallback[] = [];
let onBehaviorChangedCallbacks: BehaviorChangedCallback[] = [];

// Storage key prefix (for localStorage fallback)
const STORAGE_PREFIX = 'vrm-behaviors:';

// API base URL (empty for same-origin)
const API_BASE = '';

/**
 * Get storage key for a model (localStorage fallback)
 */
function getStorageKey(modelName: string): string {
  return `${STORAGE_PREFIX}${modelName}`;
}

// ============ API Methods ============

/**
 * Save behavior config to server
 */
async function saveToServer(modelName: string, behaviorType: string, config: object): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/behaviors/${modelName}/${behaviorType}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.ok;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to save to server:', error);
    return false;
  }
}

/**
 * Load behavior configs from server
 */
async function loadFromServer(modelName: string): Promise<Partial<ModelBehaviors> | null> {
  try {
    const response = await fetch(`${API_BASE}/api/behaviors/${modelName}`);
    if (!response.ok) return null;
    const data = await response.json();
    // Return null if empty object
    if (Object.keys(data).length === 0) return null;
    return data;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to load from server:', error);
    return null;
  }
}

/**
 * Clear behavior configs on server
 */
async function clearServerStorage(modelName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/behaviors/${modelName}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to clear server storage:', error);
    return false;
  }
}

/**
 * Start a new session for tracking behavior changes
 */
export async function startSession(metadata?: object): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    currentSessionId = data.sessionId;
    console.log('[BehaviorManager] Session started:', currentSessionId);
    return currentSessionId;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to start session:', error);
    return null;
  }
}

/**
 * End the current session
 */
export async function endSession(): Promise<boolean> {
  if (!currentSessionId) return false;
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${currentSessionId}/end`, {
      method: 'POST',
    });
    if (response.ok) {
      console.log('[BehaviorManager] Session ended:', currentSessionId);
      currentSessionId = null;
    }
    return response.ok;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to end session:', error);
    return false;
  }
}

/**
 * Log a behavior change to the current session
 */
export async function logBehaviorChange(
  modelName: string,
  behaviorType: string,
  context: string,
  oldValue: object,
  newValue: object
): Promise<boolean> {
  if (!currentSessionId) return false;
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${currentSessionId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName, behaviorType, context, oldValue, newValue }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[BehaviorManager] Failed to log change:', error);
    return false;
  }
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Load behaviors for a model
 * Merges file configs (sidecars) with server DB overrides
 * Falls back to localStorage if server unavailable
 */
export async function loadModelBehaviors(modelName: string): Promise<ModelBehaviors> {
  // Load from config files (sidecars - these are the defaults)
  const fileBehaviors = await loadAllConfigs(modelName);
  
  // Try to load overrides from server first
  let storageOverrides = await loadFromServer(modelName);
  
  // Fall back to localStorage if server unavailable
  if (storageOverrides === null) {
    storageOverrides = loadFromStorage(modelName);
    if (storageOverrides) {
      console.log('[BehaviorManager] Using localStorage fallback for', modelName);
    }
  } else {
    console.log('[BehaviorManager] Loaded overrides from server for', modelName);
  }
  
  // Merge storage overrides on top of file configs
  if (storageOverrides) {
    currentBehaviors = {
      ...fileBehaviors,
      transform: deepMergeConfig(fileBehaviors.transform, storageOverrides.transform || {}),
      body: deepMergeConfig(fileBehaviors.body, storageOverrides.body || {}),
      hands: deepMergeConfig(fileBehaviors.hands, storageOverrides.hands || {}),
      facial: deepMergeConfig(fileBehaviors.facial, storageOverrides.facial || {}),
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
  
  // Create a new behaviors object to ensure React detects the change
  currentBehaviors = {
    ...currentBehaviors,
    [type]: updatedConfig,
  };
  
  // Notify listeners
  for (const callback of onBehaviorChangedCallbacks) {
    callback(type, updatedConfig);
  }
}

/**
 * Save current behaviors to server (and localStorage as fallback)
 */
export async function saveToStorage(modelName: string): Promise<void> {
  if (!currentBehaviors) {
    throw new Error('No behaviors loaded. Call loadModelBehaviors first.');
  }
  
  const types: BehaviorType[] = ['transform', 'body', 'hands', 'facial', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
  
  // Save each behavior type to server
  let serverSuccess = true;
  for (const type of types) {
    const config = currentBehaviors[type];
    const success = await saveToServer(modelName, type, config);
    if (!success) serverSuccess = false;
  }
  
  // Also save to localStorage as fallback
  try {
    const key = getStorageKey(modelName);
    const data = JSON.stringify(currentBehaviors);
    localStorage.setItem(key, data);
  } catch (error) {
    console.warn('Failed to save behaviors to localStorage:', error);
  }
  
  if (serverSuccess) {
    console.log('[BehaviorManager] Saved to server:', modelName);
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
 * Clear storage for a model (server and localStorage)
 */
export async function clearStorage(modelName: string): Promise<void> {
  // Clear server storage
  await clearServerStorage(modelName);
  
  // Clear localStorage
  try {
    const key = getStorageKey(modelName);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

/**
 * Clear ALL behavior caches (server and localStorage)
 * Call this from browser console: window.clearAllBehaviorCaches()
 */
export async function clearAllBehaviorCaches(): Promise<number> {
  let cleared = 0;
  
  // Clear server database
  try {
    const response = await fetch(`${API_BASE}/api/admin/clear`, { method: 'POST' });
    if (response.ok) {
      console.log('[BehaviorManager] Cleared server database');
      cleared++;
    }
  } catch (error) {
    console.warn('Failed to clear server database:', error);
  }
  
  // Clear localStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      cleared++;
    }
    // Also clear vrm config caches
    const configKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vrm_config_')) {
        configKeysToRemove.push(key);
      }
    }
    for (const key of configKeysToRemove) {
      localStorage.removeItem(key);
      cleared++;
    }
    console.log(`[BehaviorManager] Cleared ${cleared} cached behavior entries`);
  } catch (error) {
    console.warn('Failed to clear behavior caches:', error);
  }
  return cleared;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).clearAllBehaviorCaches = clearAllBehaviorCaches;
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
    case 'hands':
      isValid = isValidHandsConfig(config);
      if (!isValid) errors.push('Invalid hands config: missing required finger bones');
      break;
    case 'facial':
      isValid = isValidFacialConfig(config);
      if (!isValid) errors.push('Invalid facial config: missing expressions, mouth, eyes, or customPresets');
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
  const types: BehaviorType[] = ['transform', 'body', 'hands', 'facial', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
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


// ============ Migration from localStorage ============

/**
 * Check if there's localStorage data that needs migration
 */
export function hasLocalStorageData(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        return true;
      }
    }
  } catch {
    // localStorage not available
  }
  return false;
}

/**
 * Get all model names that have localStorage data
 */
export function getLocalStorageModelNames(): string[] {
  const models: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const modelName = key.substring(STORAGE_PREFIX.length);
        models.push(modelName);
      }
    }
  } catch {
    // localStorage not available
  }
  return models;
}

/**
 * Migrate localStorage data to server database
 * Returns number of models migrated
 */
export async function migrateLocalStorageToServer(): Promise<{ migrated: number; failed: string[] }> {
  const models = getLocalStorageModelNames();
  let migrated = 0;
  const failed: string[] = [];
  
  for (const modelName of models) {
    try {
      const data = loadFromStorage(modelName);
      if (!data) continue;
      
      // Save each behavior type to server
      const types: BehaviorType[] = ['transform', 'body', 'hands', 'facial', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];
      let allSuccess = true;
      
      for (const type of types) {
        const config = data[type];
        if (config) {
          const success = await saveToServer(modelName, type, config as object);
          if (!success) allSuccess = false;
        }
      }
      
      if (allSuccess) {
        // Clear localStorage for this model after successful migration
        const key = getStorageKey(modelName);
        localStorage.removeItem(key);
        migrated++;
        console.log(`[BehaviorManager] Migrated ${modelName} to server`);
      } else {
        failed.push(modelName);
      }
    } catch (error) {
      console.warn(`[BehaviorManager] Failed to migrate ${modelName}:`, error);
      failed.push(modelName);
    }
  }
  
  return { migrated, failed };
}

/**
 * Auto-migrate localStorage data on first load
 * Call this once when the app starts
 */
export async function autoMigrateIfNeeded(): Promise<void> {
  if (!hasLocalStorageData()) return;
  
  console.log('[BehaviorManager] Found localStorage data, attempting migration...');
  const result = await migrateLocalStorageToServer();
  
  if (result.migrated > 0) {
    console.log(`[BehaviorManager] Successfully migrated ${result.migrated} model(s) to server`);
  }
  if (result.failed.length > 0) {
    console.warn(`[BehaviorManager] Failed to migrate: ${result.failed.join(', ')}`);
  }
}
