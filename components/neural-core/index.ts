// Neural Core - Main Barrel Export
// Modular VRM avatar rendering and animation system

// Main component
export { NeuralCore } from './NeuralCore';
export type { NeuralCoreHandle, NeuralCoreProps, PoseSettings } from './NeuralCore';

// Re-export hooks (excluding types that conflict with utils)
export {
  useVrmLoader,
  useExpressionManager,
  useGesturePlayer,
  useIdleAnimations,
  useWalkingAnimation,
  useCameraTracking,
  useLipSync,
  useReactionSystem,
  getIdleGesturesForState,
  calculateBlinkValue,
  calculateNextBlinkTime,
  calculateCumulativeDelay,
  getIdleGestureForPosture,
} from './hooks';

// Re-export utilities (single source of truth for shared types)
export * from './utils';
