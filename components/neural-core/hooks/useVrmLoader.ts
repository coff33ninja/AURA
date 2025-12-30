/**
 * useVrmLoader Hook
 * 
 * Manages VRM model loading, caching, and lifecycle.
 * Uses the global VRM model manager for efficient caching.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { VRM, VRMUtils } from '@pixiv/three-vrm';
import { getGlobalVrmModelManager } from '../../../services/vrmModelManager';
import { VrmConfig, getVrmConfig, DEFAULT_VRM_CONFIG } from '../../../types/vrmConfig';

// ============================================================================
// Types
// ============================================================================

export interface UseVrmLoaderOptions {
  /** Callback when model loading starts */
  onLoadStart?: (modelName: string) => void;
  /** Callback for loading progress updates */
  onLoadProgress?: (modelName: string, progress: number) => void;
  /** Callback when model loading completes */
  onLoadComplete?: (modelName: string, vrm: VRM) => void;
  /** Callback when model loading fails */
  onLoadError?: (modelName: string, error: Error) => void;
  /** Callback when VRM config is loaded */
  onConfigLoaded?: (config: VrmConfig) => void;
  /** Callback when VRM expressions are discovered */
  onExpressionsLoaded?: (expressions: string[]) => void;
}

export interface UseVrmLoaderReturn {
  /** Reference to the loaded VRM instance */
  vrmRef: React.MutableRefObject<VRM | null>;
  /** Reference to the Three.js scene */
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  /** Reference to the loaded VRM config */
  configRef: React.MutableRefObject<VrmConfig>;
  /** Whether a model is currently loading */
  isLoading: boolean;
  /** Loading progress (0-100) */
  loadProgress: number;
  /** Error message if loading failed */
  loadError: string | null;
  /** Load a VRM model by name or URL */
  loadModel: (modelName: string, scene: THREE.Scene) => Promise<VRM | null>;
  /** Dispose of the current model */
  disposeModel: () => void;
  /** Get the base name of the current model */
  getModelBaseName: () => string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing VRM model loading and lifecycle
 */
export function useVrmLoader(options?: UseVrmLoaderOptions): UseVrmLoaderReturn {
  const {
    onLoadStart,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onConfigLoaded,
    onExpressionsLoaded,
  } = options ?? {};

  // Refs
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const configRef = useRef<VrmConfig>(DEFAULT_VRM_CONFIG);
  const modelBaseNameRef = useRef<string | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get the model manager instance
  const modelManagerRef = useRef(getGlobalVrmModelManager({
    onLoadStart: (modelName) => {
      console.log('[useVrmLoader] Model load started:', modelName);
      setIsLoading(true);
      setLoadProgress(0);
      onLoadStart?.(modelName);
    },
    onLoadProgress: (modelName, progress) => {
      setLoadProgress(Math.round(progress));
      onLoadProgress?.(modelName, progress);
    },
    onLoadComplete: (modelName, vrm) => {
      console.log('[useVrmLoader] Model load complete:', modelName);
      onLoadComplete?.(modelName, vrm);
    },
    onLoadError: (modelName, error) => {
      console.error('[useVrmLoader] Model load error:', modelName, error);
      setLoadError(`Failed to load model: ${modelName}`);
      setIsLoading(false);
      onLoadError?.(modelName, error);
    },
  }));

  /**
   * Resolve model name to URL and base name
   */
  const resolveModelUrl = useCallback((modelName: string): { url: string; baseName: string } | null => {
    if (modelName.startsWith('custom:')) {
      // Custom VRM - look for object URL in window
      const customName = modelName.replace('custom:', '');
      const customVrmUrl = (window as any).__customVrmUrls?.[customName];
      
      if (!customVrmUrl) {
        console.error('[useVrmLoader] Custom VRM URL not found for:', customName);
        setLoadError(`Custom VRM not found: ${customName}`);
        return null;
      }
      
      return { url: customVrmUrl, baseName: customName };
    }
    
    // Built-in model
    const url = `/VRM-Models/${modelName || 'Arlecchino-Normal_look.vrm'}`;
    const baseName = modelName?.replace('.vrm', '') || 'AvatarSample_D';
    
    return { url, baseName };
  }, []);

  /**
   * Load VRM config for a model
   */
  const loadConfig = useCallback(async (baseName: string): Promise<VrmConfig> => {
    try {
      const config = await getVrmConfig(baseName);
      configRef.current = config;
      console.log('[useVrmLoader] Loaded config for', baseName, config);
      onConfigLoaded?.(config);
      return config;
    } catch (error) {
      console.warn('[useVrmLoader] Failed to load config for', baseName, error);
      return DEFAULT_VRM_CONFIG;
    }
  }, [onConfigLoaded]);

  /**
   * Extract expression names from VRM
   */
  const extractExpressions = useCallback((vrm: VRM): string[] => {
    const expressions: string[] = [];
    
    try {
      const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
      if (em && typeof em.setValue === 'function') {
        const presets = (em as any)._presets || (em as any).presets || undefined;
        if (Array.isArray(presets)) {
          presets.forEach((p: any) => {
            const name = p.name || p.presetName || p.preset || String(p);
            expressions.push(name);
          });
        }
      }
    } catch (e) {
      console.warn('[useVrmLoader] Failed to extract expressions:', e);
    }
    
    // Return default expressions if none found
    if (expressions.length === 0) {
      return ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];
    }
    
    return expressions;
  }, []);

  /**
   * Dispose of the current VRM model
   */
  const disposeModel = useCallback(() => {
    if (vrmRef.current && sceneRef.current) {
      try {
        VRMUtils.deepDispose(vrmRef.current.scene);
        sceneRef.current.remove(vrmRef.current.scene);
      } catch (e) {
        console.warn('[useVrmLoader] Error disposing VRM:', e);
      }
      vrmRef.current = null;
    }
    
    modelBaseNameRef.current = null;
    setIsLoading(false);
    setLoadProgress(0);
    setLoadError(null);
  }, []);

  /**
   * Load a VRM model
   */
  const loadModel = useCallback(async (
    modelName: string,
    scene: THREE.Scene
  ): Promise<VRM | null> => {
    // Resolve URL
    const resolved = resolveModelUrl(modelName);
    if (!resolved) {
      return null;
    }
    
    const { url, baseName } = resolved;
    
    // Store scene reference
    sceneRef.current = scene;
    modelBaseNameRef.current = baseName;
    
    // Dispose previous model if any
    if (vrmRef.current) {
      disposeModel();
    }
    
    // Reset state
    setIsLoading(true);
    setLoadProgress(0);
    setLoadError(null);
    
    // Load config in parallel with model
    const configPromise = loadConfig(baseName);
    
    try {
      // Load VRM using model manager (with caching)
      const vrm = await modelManagerRef.current.loadModel(url);
      
      // Wait for config
      await configPromise;
      
      // Store VRM reference
      vrmRef.current = vrm;
      
      // Add to scene
      scene.add(vrm.scene);
      
      // Extract and notify expressions
      const expressions = extractExpressions(vrm);
      onExpressionsLoaded?.(expressions);
      
      // Log VRM version
      const isVRM0 = vrm.meta?.metaVersion === '0';
      console.log('[useVrmLoader] VRM version:', isVRM0 ? '0.x' : '1.0');
      
      setLoadProgress(100);
      setIsLoading(false);
      
      return vrm;
    } catch (error) {
      console.error('[useVrmLoader] Failed to load model:', error);
      setLoadError(`Failed to load model: ${modelName}`);
      setIsLoading(false);
      
      // Notify with default expressions on error
      onExpressionsLoaded?.(['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o']);
      
      return null;
    }
  }, [resolveModelUrl, loadConfig, extractExpressions, disposeModel, onExpressionsLoaded]);

  /**
   * Get the base name of the current model
   */
  const getModelBaseName = useCallback((): string | null => {
    return modelBaseNameRef.current;
  }, []);

  return {
    vrmRef,
    sceneRef,
    configRef,
    isLoading,
    loadProgress,
    loadError,
    loadModel,
    disposeModel,
    getModelBaseName,
  };
}

export default useVrmLoader;
