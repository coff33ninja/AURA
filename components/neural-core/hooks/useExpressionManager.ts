/**
 * useExpressionManager Hook
 * 
 * Manages VRM facial expressions with alias resolution,
 * smooth blending, and persistent expression support.
 */

import { useRef, useCallback } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { VrmConfig } from '../../../types/vrmConfig';

// ============================================================================
// Types
// ============================================================================

export interface UseExpressionManagerOptions {
  /** Reference to the VRM instance */
  vrmRef: React.MutableRefObject<VRM | null>;
  /** Reference to the VRM config */
  configRef: React.MutableRefObject<VrmConfig>;
}

export interface SidecarData {
  groups?: Record<string, {
    presetName?: string;
    [key: string]: any;
  }>;
  mappings?: Record<string, string[]>;
}

export interface UseExpressionManagerReturn {
  /** Target expression values (alias-level) */
  expressionTargets: React.MutableRefObject<Record<string, number>>;
  /** Current expression values (alias-level) */
  expressionValues: React.MutableRefObject<Record<string, number>>;
  /** Target expression values (resolved names) */
  expressionTargetsActual: React.MutableRefObject<Record<string, number>>;
  /** Current expression values (resolved names) */
  expressionValuesActual: React.MutableRefObject<Record<string, number>>;
  /** Persistent expressions that don't reset each frame */
  expressionPersist: React.MutableRefObject<Record<string, number>>;
  /** Sidecar data for expression mapping */
  sidecarRef: React.MutableRefObject<SidecarData | null>;
  /** Resolve an expression alias to actual VRM expression names */
  resolveExpressionAlias: (alias: string) => string[];
  /** Add an expression target (will be smoothly blended) */
  addExpressionTarget: (alias: string, value: number) => void;
  /** Set an expression value immediately (persistent) */
  setExpressionValue: (name: string, value: number) => void;
  /** Reset all expressions to zero */
  resetExpressions: () => void;
  /** Apply expressions with smooth blending (call in animation loop) */
  applyExpressions: (delta: number, smoothing?: number) => void;
  /** Load sidecar data for a model */
  loadSidecar: (modelName: string) => Promise<string[]>;
  /** Initialize expression values from VRM */
  initializeExpressions: () => string[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing VRM facial expressions
 */
export function useExpressionManager(
  options: UseExpressionManagerOptions
): UseExpressionManagerReturn {
  const { vrmRef, configRef } = options;

  // Expression state refs
  const expressionTargets = useRef<Record<string, number>>({});
  const expressionValues = useRef<Record<string, number>>({});
  const expressionTargetsActual = useRef<Record<string, number>>({});
  const expressionValuesActual = useRef<Record<string, number>>({});
  const expressionPersist = useRef<Record<string, number>>({});
  const sidecarRef = useRef<SidecarData | null>(null);

  /**
   * Resolve an expression alias to actual VRM expression names
   * Allows consistent naming across different VRM models
   */
  const resolveExpressionAlias = useCallback((alias: string): string[] => {
    try {
      const lowerAlias = alias.toLowerCase();
      
      // First: check config expressions mapping (highest priority - user-defined)
      const config = configRef.current;
      if (config.expressions) {
        const configMapping = config.expressions[lowerAlias] || config.expressions[alias];
        if (configMapping) {
          return [configMapping];
        }
      }
      
      const sc = sidecarRef.current;
      if (!sc || !sc.groups) return [alias];
      
      const results: string[] = [];
      
      // Second: find by presetName (most reliable for cross-model consistency)
      for (const [groupName, groupData] of Object.entries(sc.groups)) {
        const preset = groupData.presetName?.toLowerCase();
        if (preset === lowerAlias) {
          results.push(groupName);
        }
      }
      if (results.length > 0) return results;
      
      // Third: exact match on group name
      if (sc.groups[alias]) return [alias];
      
      // Fourth: check mappings from patching
      if (sc.mappings && sc.mappings[alias]) return sc.mappings[alias];
      
      // Fifth: case-insensitive match on group name
      const keys = Object.keys(sc.groups);
      const matches = keys.filter(k => k.toLowerCase() === lowerAlias);
      if (matches.length > 0) return matches;
      
      // Fallback: partial match
      const partialMatches = keys.filter(k => 
        k.toLowerCase().includes(lowerAlias) || lowerAlias.includes(k.toLowerCase())
      );
      if (partialMatches.length > 0) return partialMatches;
      
    } catch (e) {
      console.warn('[useExpressionManager] Error resolving expression alias:', alias, e);
    }
    return [alias];
  }, [configRef]);

  /**
   * Add an expression target (will be smoothly blended in animation loop)
   */
  const addExpressionTarget = useCallback((alias: string, value: number) => {
    // Store alias-level target for debugging/merging
    expressionTargets.current[alias] = value;
    const resolved = resolveExpressionAlias(alias);
    for (const rn of resolved) {
      // Directly assign the value instead of Math.max to allow expressions to be reset to 0
      expressionTargetsActual.current[rn] = value;
    }
  }, [resolveExpressionAlias]);

  /**
   * Set an expression value immediately (persistent until cleared)
   */
  const setExpressionValue = useCallback((expressionName: string, value: number) => {
    const vrm = vrmRef.current;
    if (!vrm) return;
    
    const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
    if (!em) return;
    
    if (value <= 0) {
      delete expressionPersist.current[expressionName];
    } else {
      expressionPersist.current[expressionName] = value;
    }
    
    // Immediately apply the expression
    if (em.setValue) {
      try {
        em.setValue(expressionName, value);
      } catch (e) {
        // Ignore unknown expression names
      }
    }
  }, [vrmRef]);

  /**
   * Reset all expressions to zero
   */
  const resetExpressions = useCallback(() => {
    // Clear all persistent expressions
    expressionPersist.current = {};
    
    // Reset all expression targets
    for (const name of Object.keys(expressionTargetsActual.current)) {
      expressionTargetsActual.current[name] = 0;
    }
    
    // Reset alias-level targets
    for (const name of Object.keys(expressionTargets.current)) {
      expressionTargets.current[name] = 0;
    }
  }, []);

  /**
   * Apply expressions with smooth blending (call in animation loop)
   */
  const applyExpressions = useCallback((delta: number, smoothing: number = 8.0) => {
    const vrm = vrmRef.current;
    if (!vrm) return;
    
    const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
    if (!em || typeof em.setValue !== 'function') return;
    
    // Reset frame targets
    for (const name of Object.keys(expressionTargets.current)) {
      expressionTargets.current[name] = 0;
    }
    
    // Merge: frame targets + persistent expressions
    for (const alias of Object.keys(expressionTargets.current)) {
      const t = expressionTargets.current[alias] ?? 0;
      const resolved = resolveExpressionAlias(alias);
      for (const rn of resolved) {
        expressionTargetsActual.current[rn] = Math.max(expressionTargetsActual.current[rn] ?? 0, t);
      }
    }
    
    // Add persistent expressions (sticky ones from commands)
    for (const name of Object.keys(expressionPersist.current)) {
      const persistVal = expressionPersist.current[name] ?? 0;
      expressionTargetsActual.current[name] = Math.max(expressionTargetsActual.current[name] ?? 0, persistVal);
    }

    // Apply with smart blending
    for (const name of Object.keys(expressionTargetsActual.current)) {
      const target = expressionTargetsActual.current[name] ?? 0;
      const cur = expressionValuesActual.current[name] ?? 0;
      const next = cur + (target - cur) * Math.min(1, smoothing * delta);
      if (Math.abs(next - cur) > 1e-4) {
        try { 
          em.setValue(name, next); 
        } catch (e) { 
          // Ignore unknown names 
        }
        expressionValuesActual.current[name] = next;
      }
    }
  }, [vrmRef, resolveExpressionAlias]);

  /**
   * Load sidecar data for expression mapping
   */
  const loadSidecar = useCallback(async (modelName: string): Promise<string[]> => {
    try {
      const response = await fetch(`/VRM-Models/${modelName}.sidecar.json`);
      if (response.ok) {
        const sidecar = await response.json();
        sidecarRef.current = sidecar;
        console.log('[useExpressionManager] Loaded sidecar for', modelName);
        
        // Return available expression names
        if (sidecar.groups) {
          return Object.keys(sidecar.groups);
        }
      }
    } catch (e) {
      console.warn('[useExpressionManager] Failed to load sidecar for', modelName, e);
    }
    
    // Return default expressions if sidecar not found
    return ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];
  }, []);

  /**
   * Initialize expression values from VRM
   */
  const initializeExpressions = useCallback((): string[] => {
    const vrm = vrmRef.current;
    if (!vrm) return [];
    
    const expressions: string[] = [];
    
    try {
      const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
      if (em && typeof em.setValue === 'function') {
        const presets = (em as any)._presets || (em as any).presets || undefined;
        if (Array.isArray(presets)) {
          presets.forEach((p: any) => {
            const name = p.name || p.presetName || p.preset || String(p);
            expressions.push(name);
            expressionValues.current[name] = 0;
            expressionTargets.current[name] = 0;
            expressionValuesActual.current[name] = 0;
            expressionTargetsActual.current[name] = 0;
          });
        }
      }
    } catch (e) {
      console.warn('[useExpressionManager] Failed to initialize expressions:', e);
    }
    
    return expressions;
  }, [vrmRef]);

  return {
    expressionTargets,
    expressionValues,
    expressionTargetsActual,
    expressionValuesActual,
    expressionPersist,
    sidecarRef,
    resolveExpressionAlias,
    addExpressionTarget,
    setExpressionValue,
    resetExpressions,
    applyExpressions,
    loadSidecar,
    initializeExpressions,
  };
}

export default useExpressionManager;
