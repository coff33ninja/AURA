// Property-based tests for BehaviorStorageService
// Validates: Requirements 2.1, 2.2, 2.4

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { BehaviorStorageService } from '../services/behaviorStorageService';
import fs from 'fs';
import path from 'path';

// Use temp directory for test database
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-behaviors.db');

describe('BehaviorStorageService', () => {
  let service: BehaviorStorageService;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    service = new BehaviorStorageService(TEST_DB_PATH);
  });

  afterEach(() => {
    service.close();
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // Arbitrary for valid model names (alphanumeric with dashes/underscores)
  const modelNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/);
  
  // Arbitrary for behavior types
  const behaviorTypeArb = fc.constantFrom(
    'transform', 'body', 'hands', 'facial', 
    'expressions', 'gestures', 'idle', 'lipsync', 'reactions'
  );

  // Arbitrary for config objects (simple JSON-serializable objects)
  const configArb = fc.record({
    x: fc.integer({ min: -1000, max: 1000 }),
    y: fc.integer({ min: -1000, max: 1000 }),
    z: fc.integer({ min: -1000, max: 1000 }),
    enabled: fc.boolean(),
    intensity: fc.float({ min: 0, max: 1, noNaN: true }),
    name: fc.string({ minLength: 0, maxLength: 50 }),
  });

  /**
   * Property 1: Config Round-Trip Consistency
   * For any valid behavior config object, saving it to the database 
   * and then loading it back SHALL produce an equivalent object.
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1: Config round-trip consistency', () => {
    fc.assert(
      fc.property(
        modelNameArb,
        behaviorTypeArb,
        configArb,
        (modelName, behaviorType, config) => {
          // Save config
          service.saveConfig(modelName, behaviorType, config);
          
          // Load config back
          const loaded = service.getConfig(modelName, behaviorType);
          
          // Should be equivalent (deep equality)
          expect(loaded).toEqual(config);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Upsert Semantics
   * For any model name and behavior type, saving a config twice 
   * SHALL result in exactly one record in the database (update, not duplicate).
   * **Validates: Requirements 2.4**
   */
  it('Property 2: Upsert semantics - no duplicates', () => {
    fc.assert(
      fc.property(
        modelNameArb,
        behaviorTypeArb,
        configArb,
        configArb,
        (modelName, behaviorType, config1, config2) => {
          // Save first config
          service.saveConfig(modelName, behaviorType, config1);
          
          // Save second config with same key
          service.saveConfig(modelName, behaviorType, config2);
          
          // Load should return the second config
          const loaded = service.getConfig(modelName, behaviorType);
          expect(loaded).toEqual(config2);
          
          // getAllConfigs should have exactly one entry for this type
          const allConfigs = service.getAllConfigs(modelName);
          const typesForModel = Object.keys(allConfigs);
          const countOfThisType = typesForModel.filter(t => t === behaviorType).length;
          expect(countOfThisType).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: All Behavior Types Supported
   * For any behavior type, the service SHALL successfully store and retrieve configs.
   * **Validates: Requirements 2.5**
   */
  it('Property 3: All behavior types supported', () => {
    const behaviorTypes = [
      'transform', 'body', 'hands', 'facial',
      'expressions', 'gestures', 'idle', 'lipsync', 'reactions'
    ];
    
    fc.assert(
      fc.property(
        modelNameArb,
        configArb,
        (modelName, config) => {
          // Save and retrieve for each behavior type
          for (const behaviorType of behaviorTypes) {
            service.saveConfig(modelName, behaviorType, config);
            const loaded = service.getConfig(modelName, behaviorType);
            expect(loaded).toEqual(config);
          }
          
          // All types should be in getAllConfigs
          const allConfigs = service.getAllConfigs(modelName);
          expect(Object.keys(allConfigs).sort()).toEqual(behaviorTypes.sort());
        }
      ),
      { numRuns: 20 } // Fewer runs since we test all types each time
    );
  });
});


describe('BehaviorStorageService - Model Isolation', () => {
  let service: BehaviorStorageService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    service = new BehaviorStorageService(TEST_DB_PATH);
  });

  afterEach(() => {
    service.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  const modelNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/);
  const behaviorTypeArb = fc.constantFrom(
    'transform', 'body', 'hands', 'facial',
    'expressions', 'gestures', 'idle', 'lipsync', 'reactions'
  );
  const configArb = fc.record({
    x: fc.integer({ min: -1000, max: 1000 }),
    y: fc.integer({ min: -1000, max: 1000 }),
    enabled: fc.boolean(),
  });

  /**
   * Property 5: Model Isolation
   * For any two different model names, saving a config for one model 
   * SHALL NOT affect configs for the other model.
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 5: Model isolation - configs are independent per model', () => {
    fc.assert(
      fc.property(
        modelNameArb,
        modelNameArb,
        behaviorTypeArb,
        configArb,
        configArb,
        (modelA, modelB, behaviorType, configA, configB) => {
          // Skip if models are the same
          fc.pre(modelA !== modelB);
          
          // Save config for model A
          service.saveConfig(modelA, behaviorType, configA);
          
          // Save config for model B
          service.saveConfig(modelB, behaviorType, configB);
          
          // Model A should still have its original config
          const loadedA = service.getConfig(modelA, behaviorType);
          expect(loadedA).toEqual(configA);
          
          // Model B should have its config
          const loadedB = service.getConfig(modelB, behaviorType);
          expect(loadedB).toEqual(configB);
          
          // Deleting model B should not affect model A
          service.deleteConfig(modelB, behaviorType);
          const loadedAAfterDelete = service.getConfig(modelA, behaviorType);
          expect(loadedAAfterDelete).toEqual(configA);
          
          // Model B should now be empty
          const loadedBAfterDelete = service.getConfig(modelB, behaviorType);
          expect(loadedBAfterDelete).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('BehaviorStorageService - Session Tracking', () => {
  let service: BehaviorStorageService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    service = new BehaviorStorageService(TEST_DB_PATH);
  });

  afterEach(() => {
    service.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  /**
   * Property 4: Session Change Association
   * For any behavior change logged during a session, the change record 
   * SHALL be associated with the correct session ID.
   * **Validates: Requirements 3.1, 3.2**
   */
  it('Property 4: Session change association', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,20}$/),
        fc.constantFrom('body', 'gestures', 'reactions'),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({ value: fc.integer() }),
        fc.record({ value: fc.integer() }),
        (modelName, behaviorType, context, oldValue, newValue) => {
          // Start a session
          const sessionId = service.startSession({ test: true });
          expect(sessionId).toBeTruthy();
          
          // Log a change
          service.logChange(sessionId, modelName, behaviorType, context, oldValue, newValue);
          
          // Export and verify the change is associated with the session
          const exported = service.exportTrainingData();
          expect(exported.sessions.length).toBeGreaterThanOrEqual(1);
          
          const session = exported.sessions.find(s => s.sessionId === sessionId);
          expect(session).toBeTruthy();
          expect(session!.changes.length).toBe(1);
          expect(session!.changes[0].modelName).toBe(modelName);
          expect(session!.changes[0].behaviorType).toBe(behaviorType);
          expect(session!.changes[0].context).toBe(context);
          expect(session!.changes[0].oldValue).toEqual(oldValue);
          expect(session!.changes[0].newValue).toEqual(newValue);
          
          // End session
          service.endSession(sessionId);
        }
      ),
      { numRuns: 20 }
    );
  });
});
