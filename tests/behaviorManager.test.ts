// Feature: vrm-modular-behavior-system
// Property 5: Config Persistence Round-Trip
// Property 10: Import Validation Correctness
// Property 11: Export Version Inclusion

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  loadModelBehaviors,
  getCurrentBehaviors,
  updateBehavior,
  saveToStorage,
  loadFromStorage,
  clearStorage,
  exportConfig,
  importConfig,
  resetManager,
  setBehaviors,
  onBehaviorChanged,
} from '../services/behaviorManager';
import { clearCache } from '../services/configLoader';
import {
  ModelBehaviors,
  createDefaultModelBehaviors,
  DEFAULT_TRANSFORM,
  DEFAULT_IDLE,
  DEFAULT_LIPSYNC,
} from '../types/behaviorTypes';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Helper to create 404 response
function mock404() {
  return Promise.resolve({ ok: false, status: 404 });
}

// Helper for 32-bit floats
const f = Math.fround;

describe('Property 5: Config Persistence Round-Trip', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    localStorageMock.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('saving and loading from storage produces equivalent object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.float({ min: f(0), max: f(360), noNaN: true }),
        fc.float({ min: f(0.5), max: f(2.0), noNaN: true }),
        async (modelName, rotation, scale) => {
          resetManager();
          clearCache();
          localStorageMock.clear();

          // Load initial behaviors
          await loadModelBehaviors(modelName);
          
          // Update with custom values
          updateBehavior('transform', { rotation, scale });
          
          // Save to storage (now async)
          await saveToStorage(modelName);
          
          // Reset and reload
          resetManager();
          clearCache();
          
          // Load again (should merge with storage)
          const reloaded = await loadModelBehaviors(modelName);
          
          // Values should match
          expect(reloaded.transform.rotation).toBe(rotation);
          expect(reloaded.transform.scale).toBe(scale);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('loadFromStorage returns null when no data exists', () => {
    localStorageMock.clear();
    const result = loadFromStorage('NonExistentModel');
    expect(result).toBeNull();
  });

  it('clearStorage removes saved data', async () => {
    await loadModelBehaviors('TestModel');
    await saveToStorage('TestModel');
    
    expect(loadFromStorage('TestModel')).not.toBeNull();
    
    await clearStorage('TestModel');
    
    expect(loadFromStorage('TestModel')).toBeNull();
  });
});

describe('Property 10: Import Validation Correctness', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('valid configs import successfully', async () => {
    await loadModelBehaviors('TestModel');
    
    const validConfig: ModelBehaviors = {
      modelName: 'ImportedModel',
      version: '1.0.0',
      transform: { ...DEFAULT_TRANSFORM, scale: 1.5 },
      expressions: { mappings: {} },
      gestures: { gestures: [] },
      idle: { ...DEFAULT_IDLE },
      lipsync: { ...DEFAULT_LIPSYNC },
      reactions: { reactions: [] },
    };
    
    const result = importConfig(JSON.stringify(validConfig));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid JSON returns error', async () => {
    await loadModelBehaviors('TestModel');
    
    const result = importConfig('not valid json {{{');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid JSON format');
  });

  it('missing version field returns error', async () => {
    await loadModelBehaviors('TestModel');
    
    const invalidConfig = {
      modelName: 'Test',
      transform: DEFAULT_TRANSFORM,
      expressions: { mappings: {} },
      gestures: { gestures: [] },
      idle: DEFAULT_IDLE,
      lipsync: DEFAULT_LIPSYNC,
      reactions: { reactions: [] },
    };
    
    const result = importConfig(JSON.stringify(invalidConfig));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('missing modelName field returns error', async () => {
    await loadModelBehaviors('TestModel');
    
    const invalidConfig = {
      version: '1.0.0',
      transform: DEFAULT_TRANSFORM,
      expressions: { mappings: {} },
      gestures: { gestures: [] },
      idle: DEFAULT_IDLE,
      lipsync: DEFAULT_LIPSYNC,
      reactions: { reactions: [] },
    };
    
    const result = importConfig(JSON.stringify(invalidConfig));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('modelName'))).toBe(true);
  });

  it('invalid transform config returns error', async () => {
    await loadModelBehaviors('TestModel');
    
    const invalidConfig = {
      modelName: 'Test',
      version: '1.0.0',
      transform: { scale: 'not a number' }, // Invalid
      expressions: { mappings: {} },
      gestures: { gestures: [] },
      idle: DEFAULT_IDLE,
      lipsync: DEFAULT_LIPSYNC,
      reactions: { reactions: [] },
    };
    
    const result = importConfig(JSON.stringify(invalidConfig));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('transform'))).toBe(true);
  });

  it('property: invalid configs always return valid=false with non-empty errors', async () => {
    await loadModelBehaviors('TestModel');
    
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('not json'),
          fc.constant('{}'),
          fc.constant('{"version": 123}'), // wrong type
          fc.constant('{"modelName": 123}'), // wrong type
          fc.constant('null'),
        ),
        async (invalidJson) => {
          const result = importConfig(invalidJson);
          if (!result.valid) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 11: Export Version Inclusion', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('exported config contains version field with semver string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (modelName) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors(modelName);
          const exported = exportConfig();
          const parsed = JSON.parse(exported);
          
          expect(parsed.version).toBeDefined();
          expect(typeof parsed.version).toBe('string');
          // Check semver format (x.y.z)
          expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('exported config contains all behavior types', async () => {
    await loadModelBehaviors('TestModel');
    const exported = exportConfig();
    const parsed = JSON.parse(exported);
    
    expect(parsed.transform).toBeDefined();
    expect(parsed.expressions).toBeDefined();
    expect(parsed.gestures).toBeDefined();
    expect(parsed.idle).toBeDefined();
    expect(parsed.lipsync).toBeDefined();
    expect(parsed.reactions).toBeDefined();
  });

  it('export throws when no behaviors loaded', () => {
    resetManager();
    expect(() => exportConfig()).toThrow('No behaviors loaded');
  });
});

describe('BehaviorManager - updateBehavior', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('updateBehavior modifies current behaviors', async () => {
    await loadModelBehaviors('TestModel');
    
    updateBehavior('transform', { scale: 1.75 });
    
    const current = getCurrentBehaviors();
    expect(current?.transform.scale).toBe(1.75);
  });

  it('updateBehavior triggers callback', async () => {
    await loadModelBehaviors('TestModel');
    
    const callback = vi.fn();
    onBehaviorChanged(callback);
    
    updateBehavior('transform', { scale: 1.5 });
    
    expect(callback).toHaveBeenCalledWith('transform', expect.objectContaining({ scale: 1.5 }));
  });

  it('updateBehavior throws when no behaviors loaded', () => {
    resetManager();
    expect(() => updateBehavior('transform', { scale: 1.5 })).toThrow('No behaviors loaded');
  });

  it('updateBehavior preserves other fields', async () => {
    await loadModelBehaviors('TestModel');
    
    const originalRotation = getCurrentBehaviors()?.transform.rotation;
    
    updateBehavior('transform', { scale: 1.5 });
    
    expect(getCurrentBehaviors()?.transform.rotation).toBe(originalRotation);
  });
});
