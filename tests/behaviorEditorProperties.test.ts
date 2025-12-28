// Feature: vrm-modular-behavior-system
// Property 6: Position Update Consistency
// Property 7: Preview Callback Invocation
// Property 8: Enable/Disable Toggle Consistency

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  loadModelBehaviors,
  getCurrentBehaviors,
  updateBehavior,
  resetManager,
  onBehaviorChanged,
} from '../services/behaviorManager';
import { clearCache } from '../services/configLoader';
import {
  createDefaultModelBehaviors,
  GestureDefinition,
  ReactionDefinition,
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

function mock404() {
  return Promise.resolve({ ok: false, status: 404 });
}

// Helper for 32-bit floats
const f = Math.fround;

describe('Property 6: Position Update Consistency', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    localStorageMock.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('updating position reflects exact values in behavior state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: f(-5), max: f(5), noNaN: true }),
        fc.float({ min: f(-5), max: f(5), noNaN: true }),
        fc.float({ min: f(-5), max: f(5), noNaN: true }),
        async (x, y, z) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          updateBehavior('transform', { position: { x, y, z } });
          
          const current = getCurrentBehaviors();
          expect(current?.transform.position.x).toBe(x);
          expect(current?.transform.position.y).toBe(y);
          expect(current?.transform.position.z).toBe(z);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating rotation reflects exact value in behavior state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: f(0), max: f(360), noNaN: true }),
        async (rotation) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          updateBehavior('transform', { rotation });
          
          const current = getCurrentBehaviors();
          expect(current?.transform.rotation).toBe(rotation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating scale reflects exact value in behavior state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: f(0.5), max: f(2.0), noNaN: true }),
        async (scale) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          updateBehavior('transform', { scale });
          
          const current = getCurrentBehaviors();
          expect(current?.transform.scale).toBe(scale);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Preview Callback Invocation', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    localStorageMock.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('behavior change callback is invoked with correct type and config', async () => {
    await loadModelBehaviors('TestModel');
    
    const callback = vi.fn();
    onBehaviorChanged(callback);
    
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: f(0.5), max: f(2.0), noNaN: true }),
        async (scale) => {
          callback.mockClear();
          
          updateBehavior('transform', { scale });
          
          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith('transform', expect.objectContaining({ scale }));
        }
      ),
      { numRuns: 50 }
    );
  });

  it('multiple callbacks are all invoked', async () => {
    await loadModelBehaviors('TestModel');
    
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();
    
    onBehaviorChanged(callback1);
    onBehaviorChanged(callback2);
    onBehaviorChanged(callback3);
    
    updateBehavior('transform', { scale: 1.5 });
    
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback3).toHaveBeenCalledTimes(1);
  });

  it('unsubscribed callbacks are not invoked', async () => {
    await loadModelBehaviors('TestModel');
    
    const callback = vi.fn();
    const unsubscribe = onBehaviorChanged(callback);
    
    updateBehavior('transform', { scale: 1.5 });
    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    callback.mockClear();
    
    updateBehavior('transform', { scale: 1.8 });
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('Property 8: Enable/Disable Toggle Consistency', () => {
  beforeEach(() => {
    resetManager();
    clearCache();
    localStorageMock.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mock404());
  });

  it('toggling gesture enabled state updates config correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (enabled, gestureName) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          // Add a gesture to toggle
          const gesture: GestureDefinition = {
            name: gestureName,
            enabled: !enabled, // Start with opposite
            duration: 1.5,
            intensity: 1.0,
            transitionSpeed: 5.0,
            bones: {},
          };
          
          updateBehavior('gestures', { gestures: [gesture] });
          
          // Toggle the enabled state
          const current = getCurrentBehaviors();
          const gestures = [...(current?.gestures.gestures || [])];
          if (gestures.length > 0) {
            gestures[0] = { ...gestures[0], enabled };
            updateBehavior('gestures', { gestures });
          }
          
          const updated = getCurrentBehaviors();
          expect(updated?.gestures.gestures[0]?.enabled).toBe(enabled);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('toggling reaction enabled state updates config correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (enabled, reactionName) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          // Add a reaction to toggle
          const reaction: ReactionDefinition = {
            name: reactionName,
            enabled: !enabled, // Start with opposite
            expressions: [],
            gestures: [],
            posture: 'neutral',
            duration: 2.0,
            mode: 'ACTIVE',
          };
          
          updateBehavior('reactions', { reactions: [reaction] });
          
          // Toggle the enabled state
          const current = getCurrentBehaviors();
          const reactions = [...(current?.reactions.reactions || [])];
          if (reactions.length > 0) {
            reactions[0] = { ...reactions[0], enabled };
            updateBehavior('reactions', { reactions });
          }
          
          const updated = getCurrentBehaviors();
          expect(updated?.reactions.reactions[0]?.enabled).toBe(enabled);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('double toggle returns to original state', async () => {
    await loadModelBehaviors('TestModel');
    
    const gesture: GestureDefinition = {
      name: 'test_gesture',
      enabled: true,
      duration: 1.5,
      intensity: 1.0,
      transitionSpeed: 5.0,
      bones: {},
    };
    
    updateBehavior('gestures', { gestures: [gesture] });
    
    // First toggle: true -> false
    let current = getCurrentBehaviors();
    let gestures = [...(current?.gestures.gestures || [])];
    gestures[0] = { ...gestures[0], enabled: false };
    updateBehavior('gestures', { gestures });
    
    expect(getCurrentBehaviors()?.gestures.gestures[0]?.enabled).toBe(false);
    
    // Second toggle: false -> true
    current = getCurrentBehaviors();
    gestures = [...(current?.gestures.gestures || [])];
    gestures[0] = { ...gestures[0], enabled: true };
    updateBehavior('gestures', { gestures });
    
    expect(getCurrentBehaviors()?.gestures.gestures[0]?.enabled).toBe(true);
  });

  it('toggling idle feature enabled state updates config correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (enabled) => {
          resetManager();
          clearCache();
          
          await loadModelBehaviors('TestModel');
          
          // Toggle breathing enabled
          updateBehavior('idle', { 
            breathing: { 
              enabled, 
              speed: 0.8, 
              intensity: 0.02 
            } 
          });
          
          const current = getCurrentBehaviors();
          expect(current?.idle.breathing.enabled).toBe(enabled);
        }
      ),
      { numRuns: 50 }
    );
  });
});
