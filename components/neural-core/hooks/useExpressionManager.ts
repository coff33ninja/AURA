import { useRef, useCallback } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { VrmConfig } from '../../../types/vrmConfig';

export interface UseExpressionManagerReturn {
  // Expression targets (alias-level)
  expressionTargets: React.MutableRefObject<Record<string, number>>;
  expressionValues: React.MutableRefObject<Record<string, number>>;
  // Real-name targets (after resolving aliases)
  expressionTargetsActual: React.MutableRefObject<Record<string, number>>;
  expressionValuesActual: React.MutableRefObject<Record<string, number>>;
  // Persistent expressions
  expressionPersist: React.MutableRefObject<Record<string, number>>;
  // Sidecar data
  sidecarRef: React.MutableRefObject<any | null>;
  // Functions
  resolveExpressionAlias: (alias: string) => string[];
  addExpressionTarget: (alias: string, value: number) => void;
  setExpressionValue: (expressionName: string, value: number, vrm: VRM | null) => void;
  resetExpressions: () => void;
  setSidecar: (sidecar: any) => void;
  setVrmConfig: (config: VrmConfig) => void;
}

export function useExpressionManager(): UseExpressionManagerReturn {
  const expressionTargets = useRef<Record<string, number>>({});
  const expressionValues = useRef<Record<string, number>>({});
  const expressionTargetsActual = useRef<Record<string, number>>({});
  const expressionValuesActual = useRef<Record<string, number>>({});
  const expressionPersist = useRef<Record<string, number>>({});
  const sidecarRef = useRef<any | null>(null);
  const vrmConfigRef = useRef<VrmConfig | null>(null);

  const resolveExpressionAlias = useCallback((alias: string): string[] => {
    try {
      const lowerAlias = alias.toLowerCase();

      // First: check config expressions mapping (highest priority - user-defined)
      const config = vrmConfigRef.current;
      if (config?.expressions) {
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
        const preset = (groupData as any).presetName?.toLowerCase();
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
      const matches = keys.filter((k) => k.toLowerCase() === lowerAlias);
      if (matches.length > 0) return matches;

      // Fallback: partial match
      const partialMatches = keys.filter(
        (k) => k.toLowerCase().includes(lowerAlias) || lowerAlias.includes(k.toLowerCase())
      );
      if (partialMatches.length > 0) return partialMatches;
    } catch (e) {
      console.warn('Error resolving expression alias:', alias, e);
    }
    return [alias];
  }, []);

  const addExpressionTarget = useCallback((alias: string, value: number) => {
    expressionTargets.current[alias] = value;
    const resolved = resolveExpressionAlias(alias);
    for (const rn of resolved) {
      expressionTargetsActual.current[rn] = value;
    }
  }, [resolveExpressionAlias]);

  const setExpressionValue = useCallback((expressionName: string, value: number, vrm: VRM | null) => {
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
      em.setValue(expressionName, value);
    }
  }, []);

  const resetExpressions = useCallback(() => {
    expressionPersist.current = {};
    for (const name of Object.keys(expressionTargetsActual.current)) {
      expressionTargetsActual.current[name] = 0;
    }
  }, []);

  const setSidecar = useCallback((sidecar: any) => {
    sidecarRef.current = sidecar;
  }, []);

  const setVrmConfig = useCallback((config: VrmConfig) => {
    vrmConfigRef.current = config;
  }, []);

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
    setSidecar,
    setVrmConfig,
  };
}
