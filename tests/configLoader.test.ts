// Feature: vrm-modular-behavior-system
// Property 1: Config Loading Completeness
// Property 2: Config Fallback Behavior
// Property 4: Config Caching Idempotence

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  loadConfig,
  loadAllConfigs,
  clearCache,
  getFetchCount,
  resetFetchCount,
  isCached,
} from '../services/configLoader';
import {
  BehaviorType,
  DEFAULT_TRANSFORM,
  DEFAULT_GESTURES,
  DEFAULT_IDLE,
  DEFAULT_LIPSYNC,
  DEFAULT_REACTIONS,
  DEFAULT_EXPRESSIONS,
  isValidTransformConfig,
  isValidGesturesConfig,
  isValidIdleConfig,
  isValidLipSyncConfig,
  isValidReactionsConfig,
  isValidExpressionsConfig,
} from '../types/behaviorTypes';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response
function mockResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  });
}

// Helper to create 404 response
function mock404() {
  return Promise.resolve({
    ok: false,
    status: 404,
  });
}

const behaviorTypes: BehaviorType[] = ['transform', 'expressions', 'gestures', 'idle', 'lipsync', 'reactions'];

const defaultConfigs: Record<BehaviorType, unknown> = {
  transform: DEFAULT_TRANSFORM,
  expressions: DEFAULT_EXPRESSIONS,
  gestures: DEFAULT_GESTURES,
  idle: DEFAULT_IDLE,
  lipsync: DEFAULT_LIPSYNC,
  reactions: DEFAULT_REACTIONS,
};

const validators: Record<BehaviorType, (config: unknown) => boolean> = {
  transform: isValidTransformConfig,
  expressions: isValidExpressionsConfig,
  gestures: isValidGesturesConfig,
  idle: isValidIdleConfig,
  lipsync: isValidLipSyncConfig,
  reactions: isValidReactionsConfig,
};

describe('Property 1: Config Loading Completeness', () => {
  beforeEach(() => {
    clearCache();
    resetFetchCount();
    mockFetch.mockReset();
  });

  it('loadAllConfigs attempts to load all behavior types', async () => {
    // Mock all fetches to return 404 (will use defaults)
    mockFetch.mockImplementation(() => mock404());

    const modelName = 'TestModel';
    const result = await loadAllConfigs(modelName);

    // Should have all behavior types in result
    expect(result.transform).toBeDefined();
    expect(result.expressions).toBeDefined();
    expect(result.gestures).toBeDefined();
    expect(result.idle).toBeDefined();
    expect(result.lipsync).toBeDefined();
    expect(result.reactions).toBeDefined();
    expect(result.modelName).toBe(modelName);
    expect(result.version).toBe('1.0.0');
  });

  it('each loaded config type is valid', async () => {
    mockFetch.mockImplementation(() => mock404());

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...behaviorTypes),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (type, modelName) => {
          clearCache();
          const config = await loadConfig(modelName, type);
          expect(validators[type](config)).toBe(true);
        }
      ),
      { numRuns: 30 } // 30 runs * 6 types = 180 validations
    );
  });
});

describe('Property 2: Config Fallback Behavior', () => {
  beforeEach(() => {
    clearCache();
    resetFetchCount();
    mockFetch.mockReset();
  });

  it('falls back to default config when model-specific does not exist', async () => {
    // First call (model-specific) returns 404, second call (default) also 404
    mockFetch.mockImplementation(() => mock404());

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...behaviorTypes),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (type, modelName) => {
          clearCache();
          const config = await loadConfig(modelName, type);
          
          // Should still return a valid config (from hardcoded defaults)
          expect(validators[type](config)).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('uses default file when model-specific 404s but default exists', async () => {
    const customDefault = {
      ...DEFAULT_TRANSFORM,
      scale: 1.5, // Custom value to verify default file was used
    };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('_default')) {
        return mockResponse(customDefault);
      }
      return mock404();
    });

    clearCache();
    const config = await loadConfig('NonExistentModel', 'transform');
    
    expect(config.scale).toBe(1.5);
    expect(isValidTransformConfig(config)).toBe(true);
  });

  it('merges partial config with defaults', async () => {
    const partialConfig = {
      scale: 1.8,
      // Missing other required fields
    };

    mockFetch.mockImplementation(() => mockResponse(partialConfig));

    clearCache();
    const config = await loadConfig('TestModel', 'transform');
    
    // Should have the custom value
    expect(config.scale).toBe(1.8);
    // Should have defaults for missing fields
    expect(config.position).toEqual(DEFAULT_TRANSFORM.position);
    expect(config.rotation).toBe(DEFAULT_TRANSFORM.rotation);
    expect(isValidTransformConfig(config)).toBe(true);
  });
});

describe('Property 4: Config Caching Idempotence', () => {
  beforeEach(() => {
    clearCache();
    resetFetchCount();
    mockFetch.mockReset();
  });

  it('loading same config twice results in exactly one fetch per path', async () => {
    mockFetch.mockImplementation(() => mock404());

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...behaviorTypes),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (type, modelName) => {
          clearCache();
          resetFetchCount();

          // Load twice
          await loadConfig(modelName, type);
          const countAfterFirst = getFetchCount();
          
          await loadConfig(modelName, type);
          const countAfterSecond = getFetchCount();

          // Second load should not increase fetch count (cached)
          expect(countAfterSecond).toBe(countAfterFirst);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('cache returns identical object on subsequent loads', async () => {
    const testConfig = { ...DEFAULT_TRANSFORM, scale: 1.234 };
    mockFetch.mockImplementation(() => mockResponse(testConfig));

    clearCache();
    
    const first = await loadConfig('TestModel', 'transform');
    const second = await loadConfig('TestModel', 'transform');

    // Should be the exact same object reference (cached)
    expect(first).toBe(second);
  });

  it('isCached returns true after loading', async () => {
    mockFetch.mockImplementation(() => mock404());

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...behaviorTypes),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (type, modelName) => {
          clearCache();
          
          expect(isCached(modelName, type)).toBe(false);
          await loadConfig(modelName, type);
          expect(isCached(modelName, type)).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('clearCache removes all cached configs', async () => {
    mockFetch.mockImplementation(() => mock404());

    // Load all types for a model
    await loadAllConfigs('TestModel');
    
    // Verify all are cached
    for (const type of behaviorTypes) {
      expect(isCached('TestModel', type)).toBe(true);
    }

    // Clear cache
    clearCache();

    // Verify none are cached
    for (const type of behaviorTypes) {
      expect(isCached('TestModel', type)).toBe(false);
    }
  });
});
