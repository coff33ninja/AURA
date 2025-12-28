// VRM Validator Tests
// Property 2: VRM validation correctly identifies valid/invalid files
// Validates: Requirements 2.1, 2.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateVrmBuffer,
  isVrmFilename,
} from '../utils/vrmValidator';

// glTF magic bytes
const GLTF_MAGIC = new Uint8Array([0x67, 0x6C, 0x54, 0x46]); // 'glTF'

/**
 * Create a minimal valid glTF binary buffer
 */
function createGltfBuffer(json: object): ArrayBuffer {
  const jsonString = JSON.stringify(json);
  const jsonBytes = new TextEncoder().encode(jsonString);
  
  // Pad to 4-byte alignment
  const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const paddedJson = new Uint8Array(paddedLength);
  paddedJson.set(jsonBytes);
  // Fill padding with spaces (0x20)
  for (let i = jsonBytes.length; i < paddedLength; i++) {
    paddedJson[i] = 0x20;
  }
  
  // Total size: 12 (header) + 8 (chunk header) + paddedLength
  const totalLength = 12 + 8 + paddedLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  // Header
  bytes.set(GLTF_MAGIC, 0);           // magic
  view.setUint32(4, 2, true);          // version
  view.setUint32(8, totalLength, true); // total length
  
  // JSON chunk header
  view.setUint32(12, paddedLength, true); // chunk length
  view.setUint32(16, 0x4E4F534A, true);   // chunk type 'JSON'
  
  // JSON data
  bytes.set(paddedJson, 20);
  
  return buffer;
}

/**
 * Create a valid VRM 0.x buffer
 */
function createVrm0Buffer(name: string, expressions: string[]): ArrayBuffer {
  const gltf = {
    asset: { version: '2.0' },
    extensions: {
      VRM: {
        meta: { title: name },
        blendShapeMaster: {
          blendShapeGroups: expressions.map(e => ({ name: e })),
        },
      },
    },
    extensionsUsed: ['VRM'],
  };
  return createGltfBuffer(gltf);
}

/**
 * Create a valid VRM 1.0 buffer
 */
function createVrm1Buffer(name: string, expressions: string[]): ArrayBuffer {
  const preset: Record<string, object> = {};
  expressions.forEach(e => { preset[e] = {}; });
  
  const gltf = {
    asset: { version: '2.0' },
    extensions: {
      VRMC_vrm: {
        meta: { name },
      },
      VRMC_vrm_expressions: {
        preset,
        custom: {},
      },
    },
    extensionsUsed: ['VRMC_vrm', 'VRMC_vrm_expressions'],
  };
  return createGltfBuffer(gltf);
}

describe('vrmValidator', () => {
  describe('validateVrmBuffer', () => {
    /**
     * Property 2: VRM validation correctly identifies valid/invalid files
     * For any file input, validateVrmFile should return valid=true only for
     * files with correct VRM/glTF structure, and return descriptive errors
     * for invalid files.
     */
    
    it('should reject buffers that are too small', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 19 }),
          (size) => {
            const buffer = new ArrayBuffer(size);
            const result = validateVrmBuffer(buffer);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('too small');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject buffers without glTF magic bytes', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 100, maxLength: 200 }),
          (bytes) => {
            // Ensure first 4 bytes are NOT the glTF magic
            const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            const view = new DataView(buffer);
            
            // Make sure it's not accidentally valid glTF magic
            if (view.getUint32(0, true) === 0x46546C67) {
              view.setUint32(0, 0x00000000, true);
            }
            
            const result = validateVrmBuffer(buffer);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid VRM 0.x buffers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9 _-]+$/.test(s)),
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            { minLength: 0, maxLength: 10 }
          ),
          (name, expressions) => {
            const buffer = createVrm0Buffer(name, expressions);
            const result = validateVrmBuffer(buffer);
            
            expect(result.valid).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata?.name).toBe(name);
            expect(result.metadata?.version).toBe('0.x');
            expect(result.metadata?.expressions).toEqual(expressions);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid VRM 1.0 buffers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9 _-]+$/.test(s)),
          fc.uniqueArray(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s) && s !== '__proto__' && s !== 'constructor' && s !== 'prototype'),
            { minLength: 0, maxLength: 10 }
          ),
          (name, expressions) => {
            const buffer = createVrm1Buffer(name, expressions);
            const result = validateVrmBuffer(buffer);
            
            expect(result.valid).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata?.name).toBe(name);
            expect(result.metadata?.version).toBe('1.0');
            // VRM 1.0 expressions are stored as preset keys
            expect(result.metadata?.expressions.sort()).toEqual(expressions.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject glTF without VRM extension', () => {
      const gltf = {
        asset: { version: '2.0' },
        // No VRM extension
      };
      const buffer = createGltfBuffer(gltf);
      const result = validateVrmBuffer(buffer);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('VRM extension');
    });
  });

  describe('isVrmFilename', () => {
    it('should return true for .vrm files', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          (basename) => {
            expect(isVrmFilename(`${basename}.vrm`)).toBe(true);
            expect(isVrmFilename(`${basename}.VRM`)).toBe(true);
            expect(isVrmFilename(`${basename}.Vrm`)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for non-.vrm files', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.constantFrom('.glb', '.gltf', '.fbx', '.obj', '.txt', ''),
          (basename, ext) => {
            expect(isVrmFilename(`${basename}${ext}`)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// Property 3: Config generation for custom VRM
// For any valid VRM file, loading it should result in behavior configs
// being created with all required fields populated.
// Validates: Requirements 2.3

import { loadModelBehaviors, resetManager } from '../services/behaviorManager';
import { clearCache } from '../services/configLoader';
import type { ModelBehaviors } from '../types/behaviorTypes';

describe('Custom VRM Config Generation', () => {
  /**
   * Property 3: Config generation for custom VRM
   * For any valid custom VRM name, loadModelBehaviors should return
   * a complete ModelBehaviors object with all required fields populated.
   */
  
  it('should generate complete behavior configs for any custom VRM name', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid custom VRM names (simulating custom: prefix models)
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9 _-]+$/.test(s)),
        async (customName) => {
          // Clear cache to ensure fresh load
          clearCache();
          resetManager();
          
          // Load behaviors for the custom model (will use defaults since no config files exist)
          const behaviors = await loadModelBehaviors(customName);
          
          // Verify all required top-level fields exist
          expect(behaviors).toBeDefined();
          expect(behaviors.modelName).toBe(customName);
          expect(behaviors.version).toBeDefined();
          
          // Verify all behavior types are present
          expect(behaviors.transform).toBeDefined();
          expect(behaviors.body).toBeDefined();
          expect(behaviors.hands).toBeDefined();
          expect(behaviors.facial).toBeDefined();
          expect(behaviors.expressions).toBeDefined();
          expect(behaviors.gestures).toBeDefined();
          expect(behaviors.idle).toBeDefined();
          expect(behaviors.lipsync).toBeDefined();
          expect(behaviors.reactions).toBeDefined();
          
          // Verify transform has required fields
          expect(typeof behaviors.transform.position).toBe('object');
          expect(typeof behaviors.transform.rotation).toBe('number');
          expect(typeof behaviors.transform.scale).toBe('number');
          
          // Verify body has required fields
          expect(behaviors.body.leftUpperArm).toBeDefined();
          expect(behaviors.body.rightUpperArm).toBeDefined();
          expect(behaviors.body.spine).toBeDefined();
          expect(behaviors.body.eyeTracking).toBeDefined();
          
          // Verify hands has finger bone configs
          expect(behaviors.hands.leftThumbProximal).toBeDefined();
          expect(behaviors.hands.rightThumbProximal).toBeDefined();
          expect(behaviors.hands.leftIndexProximal).toBeDefined();
          expect(behaviors.hands.rightIndexProximal).toBeDefined();
          
          // Verify gestures has required structure
          expect(Array.isArray(behaviors.gestures.gestures)).toBe(true);
          
          // Verify idle has required fields
          expect(typeof behaviors.idle.breathing).toBe('object');
          expect(typeof behaviors.idle.blinking).toBe('object');
          expect(typeof behaviors.idle.sway).toBe('object');
          
          // Verify lipsync has required fields
          expect(typeof behaviors.lipsync.sensitivity).toBe('number');
          expect(typeof behaviors.lipsync.smoothing).toBe('number');
          
          // Verify reactions has required structure
          expect(Array.isArray(behaviors.reactions.reactions)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should generate valid default values for all numeric fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
        async (customName) => {
          clearCache();
          resetManager();
          const behaviors = await loadModelBehaviors(customName);
          
          // Transform numeric values should be valid
          expect(Number.isFinite(behaviors.transform.rotation)).toBe(true);
          expect(Number.isFinite(behaviors.transform.scale)).toBe(true);
          expect(behaviors.transform.scale).toBeGreaterThan(0);
          
          // Position should have valid coordinates
          expect(Number.isFinite(behaviors.transform.position.x)).toBe(true);
          expect(Number.isFinite(behaviors.transform.position.y)).toBe(true);
          expect(Number.isFinite(behaviors.transform.position.z)).toBe(true);
          
          // Idle timing values should be positive
          expect(behaviors.idle.breathing.speed).toBeGreaterThan(0);
          expect(behaviors.idle.blinking.interval).toBeGreaterThan(0);
          expect(behaviors.idle.blinking.duration).toBeGreaterThan(0);
          
          // Lipsync sensitivity should be positive
          expect(behaviors.lipsync.sensitivity).toBeGreaterThan(0);
          expect(behaviors.lipsync.smoothing).toBeGreaterThanOrEqual(0);
          expect(behaviors.lipsync.smoothing).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
