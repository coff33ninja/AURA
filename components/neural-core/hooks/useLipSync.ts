// useLipSync - Hook for managing lip sync animation
// Handles both phoneme-based and volume-based lip sync

import { useRef, useCallback } from 'react';
import type { LipSyncConfig } from '../../../types/behaviorTypes';
import type { VisemeWeights } from '../../../types/phonemeLipSync';
import { LipSyncController, type LipSyncControllerConfig } from '../../../utils/lipSyncController';

// Types
export interface UseLipSyncOptions {
  lipsyncConfig: LipSyncConfig | undefined;
  addExpressionTarget: (alias: string, value: number) => void;
}

export interface UseLipSyncReturn {
  // State refs
  lipSyncController: React.MutableRefObject<LipSyncController | null>;
  // Functions
  initializeLipSync: (config: Partial<LipSyncControllerConfig>) => void;
  updateLipSync: (
    volume: number,
    frequencyData: Uint8Array | null,
    delta: number
  ) => void;
  updateConfig: (config: Partial<LipSyncControllerConfig>) => void;
  isPhonemeEnabled: () => boolean;
  reset: () => void;
}

/**
 * Default viseme weights for fallback lip sync
 */
export const DEFAULT_VISEME_WEIGHTS: VisemeWeights = {
  a: 0.8,
  i: 0.3,
  u: 0.25,
  e: 0.3,
  o: 0.6,
};

/**
 * Default lip sync sensitivity
 */
export const DEFAULT_LIP_SYNC_SENSITIVITY = 4.0;


/**
 * Calculate fallback lip sync weights based on volume
 */
export function calculateVolumeLipSync(
  volume: number,
  sensitivity: number,
  visemeWeights: VisemeWeights
): VisemeWeights {
  const mouthOpen = Math.min(1.0, volume * sensitivity);
  return {
    a: mouthOpen * visemeWeights.a,
    i: mouthOpen * visemeWeights.i,
    u: mouthOpen * visemeWeights.u,
    e: mouthOpen * visemeWeights.e,
    o: mouthOpen * visemeWeights.o,
  };
}

/**
 * Hook for managing lip sync animation
 */
export function useLipSync(options: UseLipSyncOptions): UseLipSyncReturn {
  const { lipsyncConfig, addExpressionTarget } = options;

  // Lip sync controller ref
  const lipSyncController = useRef<LipSyncController | null>(null);

  /**
   * Initialize the lip sync controller
   */
  const initializeLipSync = useCallback((config: Partial<LipSyncControllerConfig>) => {
    lipSyncController.current = new LipSyncController(config);
  }, []);

  /**
   * Update lip sync for the current frame
   */
  const updateLipSync = useCallback(
    (volume: number, frequencyData: Uint8Array | null, delta: number) => {
      if (lipSyncController.current) {
        const phonemeEnabled = lipsyncConfig?.phonemeDetection?.enabled ?? false;
        let weights: VisemeWeights;

        if (phonemeEnabled && frequencyData) {
          // Phoneme-based lip sync using FFT frequency data
          weights = lipSyncController.current.processFrequencyData(frequencyData, delta);
        } else {
          // Volume-based lip sync (legacy behavior)
          weights = lipSyncController.current.processVolume(volume, delta);
        }

        // Apply viseme weights to expressions
        addExpressionTarget('a', weights.a);
        addExpressionTarget('i', weights.i);
        addExpressionTarget('u', weights.u);
        addExpressionTarget('e', weights.e);
        addExpressionTarget('o', weights.o);
      } else {
        // Fallback: direct volume-based lip sync if controller not initialized
        const sensitivity = lipsyncConfig?.sensitivity ?? DEFAULT_LIP_SYNC_SENSITIVITY;
        const visemeWeights = lipsyncConfig?.visemeWeights ?? DEFAULT_VISEME_WEIGHTS;

        const weights = calculateVolumeLipSync(volume, sensitivity, visemeWeights);
        addExpressionTarget('a', weights.a);
        addExpressionTarget('i', weights.i);
        addExpressionTarget('u', weights.u);
        addExpressionTarget('e', weights.e);
        addExpressionTarget('o', weights.o);
      }
    },
    [lipsyncConfig, addExpressionTarget]
  );

  /**
   * Update lip sync configuration
   */
  const updateConfig = useCallback((config: Partial<LipSyncControllerConfig>) => {
    if (lipSyncController.current) {
      lipSyncController.current.updateConfig(config);
    }
  }, []);

  /**
   * Check if phoneme detection is enabled
   */
  const isPhonemeEnabled = useCallback(() => {
    return lipSyncController.current?.isPhonemeDetectionEnabled() ?? false;
  }, []);

  /**
   * Reset lip sync to neutral state
   */
  const reset = useCallback(() => {
    if (lipSyncController.current) {
      lipSyncController.current.reset();
    }
  }, []);

  return {
    lipSyncController,
    initializeLipSync,
    updateLipSync,
    updateConfig,
    isPhonemeEnabled,
    reset,
  };
}
