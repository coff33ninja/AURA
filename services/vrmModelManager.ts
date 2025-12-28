// VRM Model Manager - Lazy loading with caching for VRM models
// Provides on-demand loading, caching, and preloading capabilities

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';

/**
 * Cache entry for a loaded VRM model
 */
export interface ModelCacheEntry {
  vrm: VRM;
  loadedAt: number;
  size: number; // Estimated size in bytes
  url: string;
}

/**
 * Loading state for a model
 */
export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  error: string | null;
}

/**
 * Options for creating a VRM model manager
 */
export interface VrmModelManagerOptions {
  maxCacheSize?: number; // Max cache size in bytes (default 100MB)
  maxCacheEntries?: number; // Max number of cached models (default 5)
  onLoadStart?: (modelName: string) => void;
  onLoadProgress?: (modelName: string, progress: number) => void;
  onLoadComplete?: (modelName: string, vrm: VRM) => void;
  onLoadError?: (modelName: string, error: Error) => void;
}

/**
 * VRM Model Manager interface
 */
export interface VrmModelManager {
  loadModel: (modelUrl: string) => Promise<VRM>;
  isLoaded: (modelUrl: string) => boolean;
  preloadModel: (modelUrl: string) => void;
  clearCache: () => void;
  removeFromCache: (modelUrl: string) => void;
  getCacheStats: () => { count: number; totalSize: number; entries: string[] };
  getLoadingState: (modelUrl: string) => LoadingState | null;
  dispose: () => void;
}

// Default options
const DEFAULT_OPTIONS: Required<Omit<VrmModelManagerOptions, 'onLoadStart' | 'onLoadProgress' | 'onLoadComplete' | 'onLoadError'>> = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxCacheEntries: 5,
};

/**
 * Estimate the memory size of a VRM model
 */
function estimateVrmSize(vrm: VRM): number {
  let size = 0;
  
  // Traverse the scene and estimate geometry/texture sizes
  vrm.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;
      if (geometry) {
        // Estimate geometry size from attributes
        for (const name in geometry.attributes) {
          const attr = geometry.attributes[name];
          if (attr && attr.array) {
            size += attr.array.byteLength;
          }
        }
        if (geometry.index) {
          size += geometry.index.array.byteLength;
        }
      }
      
      // Estimate material/texture sizes
      const material = object.material;
      if (material) {
        const materials = Array.isArray(material) ? material : [material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            const textures = [mat.map, mat.normalMap, mat.emissiveMap, mat.aoMap];
            for (const tex of textures) {
              if (tex && tex.image) {
                // Estimate texture size (width * height * 4 bytes for RGBA)
                const img = tex.image;
                if (img.width && img.height) {
                  size += img.width * img.height * 4;
                }
              }
            }
          }
        }
      }
    }
  });
  
  // Add base overhead for VRM metadata and structures
  size += 50 * 1024; // 50KB base overhead
  
  return size;
}

/**
 * Create a VRM model manager with caching and lazy loading
 */
export function createVrmModelManager(options: VrmModelManagerOptions = {}): VrmModelManager {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const cache = new Map<string, ModelCacheEntry>();
  const loadingStates = new Map<string, LoadingState>();
  const pendingLoads = new Map<string, Promise<VRM>>();
  
  // Create shared loader
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  
  /**
   * Evict oldest entries if cache is full
   */
  function evictIfNeeded(requiredSize: number = 0): void {
    // Check entry count
    while (cache.size >= config.maxCacheEntries) {
      const oldestKey = findOldestEntry();
      if (oldestKey) {
        removeFromCache(oldestKey);
      } else {
        break;
      }
    }
    
    // Check total size
    let totalSize = getTotalCacheSize();
    while (totalSize + requiredSize > config.maxCacheSize && cache.size > 0) {
      const oldestKey = findOldestEntry();
      if (oldestKey) {
        removeFromCache(oldestKey);
        totalSize = getTotalCacheSize();
      } else {
        break;
      }
    }
  }
  
  /**
   * Find the oldest cache entry
   */
  function findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of cache.entries()) {
      if (entry.loadedAt < oldestTime) {
        oldestTime = entry.loadedAt;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * Get total cache size in bytes
   */
  function getTotalCacheSize(): number {
    let total = 0;
    for (const entry of cache.values()) {
      total += entry.size;
    }
    return total;
  }
  
  /**
   * Remove a model from cache and dispose resources
   */
  function removeFromCache(modelUrl: string): void {
    const entry = cache.get(modelUrl);
    if (entry) {
      // Dispose VRM resources
      VRMUtils.deepDispose(entry.vrm.scene);
      cache.delete(modelUrl);
    }
  }
  
  /**
   * Load a VRM model (from cache or network)
   */
  async function loadModel(modelUrl: string): Promise<VRM> {
    // Check cache first
    const cached = cache.get(modelUrl);
    if (cached) {
      // Update access time for LRU
      cached.loadedAt = Date.now();
      return cached.vrm;
    }
    
    // Check if already loading
    const pending = pendingLoads.get(modelUrl);
    if (pending) {
      return pending;
    }
    
    // Start new load
    const loadPromise = loadModelFromNetwork(modelUrl);
    pendingLoads.set(modelUrl, loadPromise);
    
    try {
      const vrm = await loadPromise;
      return vrm;
    } finally {
      pendingLoads.delete(modelUrl);
    }
  }
  
  /**
   * Load model from network
   */
  function loadModelFromNetwork(modelUrl: string): Promise<VRM> {
    return new Promise((resolve, reject) => {
      // Set loading state
      loadingStates.set(modelUrl, { isLoading: true, progress: 0, error: null });
      options.onLoadStart?.(modelUrl);
      
      loader.load(
        modelUrl,
        async (gltf) => {
          try {
            const vrm = gltf.userData.vrm as VRM;
            
            if (!vrm) {
              throw new Error('Failed to load VRM data from file');
            }
            
            // Estimate size and evict if needed
            const size = estimateVrmSize(vrm);
            evictIfNeeded(size);
            
            // Add to cache
            cache.set(modelUrl, {
              vrm,
              loadedAt: Date.now(),
              size,
              url: modelUrl,
            });
            
            // Update loading state
            loadingStates.set(modelUrl, { isLoading: false, progress: 100, error: null });
            options.onLoadComplete?.(modelUrl, vrm);
            
            resolve(vrm);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            loadingStates.set(modelUrl, { isLoading: false, progress: 0, error: err.message });
            options.onLoadError?.(modelUrl, err);
            reject(err);
          }
        },
        (progress) => {
          // Progress callback
          const percent = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
          loadingStates.set(modelUrl, { isLoading: true, progress: percent, error: null });
          options.onLoadProgress?.(modelUrl, percent);
        },
        (error) => {
          const err = error instanceof Error ? error : new Error(String(error));
          loadingStates.set(modelUrl, { isLoading: false, progress: 0, error: err.message });
          options.onLoadError?.(modelUrl, err);
          reject(err);
        }
      );
    });
  }
  
  /**
   * Check if a model is loaded in cache
   */
  function isLoaded(modelUrl: string): boolean {
    return cache.has(modelUrl);
  }
  
  /**
   * Preload a model in the background
   */
  function preloadModel(modelUrl: string): void {
    if (!isLoaded(modelUrl) && !pendingLoads.has(modelUrl)) {
      loadModel(modelUrl).catch((error) => {
        console.warn(`[VrmModelManager] Preload failed for ${modelUrl}:`, error);
      });
    }
  }
  
  /**
   * Clear all cached models
   */
  function clearCache(): void {
    for (const modelUrl of cache.keys()) {
      removeFromCache(modelUrl);
    }
  }
  
  /**
   * Get cache statistics
   */
  function getCacheStats(): { count: number; totalSize: number; entries: string[] } {
    return {
      count: cache.size,
      totalSize: getTotalCacheSize(),
      entries: Array.from(cache.keys()),
    };
  }
  
  /**
   * Get loading state for a model
   */
  function getLoadingState(modelUrl: string): LoadingState | null {
    return loadingStates.get(modelUrl) || null;
  }
  
  /**
   * Dispose the manager and all cached models
   */
  function dispose(): void {
    clearCache();
    loadingStates.clear();
    pendingLoads.clear();
  }
  
  return {
    loadModel,
    isLoaded,
    preloadModel,
    clearCache,
    removeFromCache,
    getCacheStats,
    getLoadingState,
    dispose,
  };
}

// Singleton instance for app-wide use
let globalManager: VrmModelManager | null = null;

/**
 * Get or create the global VRM model manager
 */
export function getGlobalVrmModelManager(options?: VrmModelManagerOptions): VrmModelManager {
  if (!globalManager) {
    globalManager = createVrmModelManager(options);
  }
  return globalManager;
}

/**
 * Reset the global manager (useful for testing)
 */
export function resetGlobalVrmModelManager(): void {
  if (globalManager) {
    globalManager.dispose();
    globalManager = null;
  }
}
