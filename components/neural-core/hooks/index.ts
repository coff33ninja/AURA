// Neural Core Hooks - Barrel Export
// Custom hooks for VRM avatar animation and interaction

export * from './useVrmLoader';
export * from './useExpressionManager';
export * from './useGesturePlayer';
export { 
  useIdleAnimations,
  getIdleGesturesForState,
  calculateBlinkValue,
  calculateNextBlinkTime,
  type IdleState,
  type SaccadeStateData,
  type UseIdleAnimationsOptions,
  type UseIdleAnimationsReturn,
} from './useIdleAnimations';
export * from './useWalkingAnimation';
export * from './useCameraTracking';
export * from './useLipSync';
export {
  useReactionSystem,
  calculateCumulativeDelay,
  getIdleGestureForPosture,
  type UseReactionSystemOptions,
  type UseReactionSystemReturn,
} from './useReactionSystem';

// Re-export BoneRotation from boneAnimation utils (single source of truth)
export type { BoneRotation, BonePose } from '../utils/boneAnimation';
