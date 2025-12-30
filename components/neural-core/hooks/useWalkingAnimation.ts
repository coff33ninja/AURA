import { useRef, useCallback } from 'react';
import type { WalkingBehaviorConfig } from '../../../types/walkingBehaviorTypes';
import { DEFAULT_WALKING_BEHAVIOR } from '../../../types/walkingBehaviorTypes';

export interface WalkState {
  speed: number;
  direction: number;
  isWalking: boolean;
  position: { x: number; y: number; z: number };
}

export interface UseWalkingAnimationReturn {
  walkStateRef: React.MutableRefObject<WalkState>;
  legAngleRef: React.MutableRefObject<number>;
  walkBobOffsetRef: React.MutableRefObject<number>;
  walkingBehaviorRef: React.MutableRefObject<WalkingBehaviorConfig>;
  walk: (direction: number, speed?: number) => void;
  stopWalking: () => void;
  setWalkingBehavior: (config: Partial<WalkingBehaviorConfig>) => void;
  getWalkingBehavior: () => WalkingBehaviorConfig;
  startWalking: () => void;
  isWalking: () => boolean;
}

export function useWalkingAnimation(): UseWalkingAnimationReturn {
  const walkStateRef = useRef<WalkState>({
    speed: 0,
    direction: 0,
    isWalking: false,
    position: { x: 0, y: 0, z: 0 },
  });
  const legAngleRef = useRef(0);
  const walkBobOffsetRef = useRef(0);
  const walkingBehaviorRef = useRef<WalkingBehaviorConfig>({ ...DEFAULT_WALKING_BEHAVIOR });

  const walk = useCallback((direction: number, speed: number = 1.0) => {
    walkStateRef.current.direction = direction;
    walkStateRef.current.speed = speed;
    walkStateRef.current.isWalking = speed > 0;
    walkingBehaviorRef.current.enabled = speed > 0;
    walkingBehaviorRef.current.speed = speed;
  }, []);

  const stopWalking = useCallback(() => {
    walkStateRef.current.isWalking = false;
    walkStateRef.current.speed = 0;
    walkingBehaviorRef.current.enabled = false;
    walkingBehaviorRef.current.speed = 0;
  }, []);

  const setWalkingBehavior = useCallback((config: Partial<WalkingBehaviorConfig>) => {
    walkingBehaviorRef.current = { ...walkingBehaviorRef.current, ...config };
    if (config.enabled !== undefined) {
      walkStateRef.current.isWalking = config.enabled;
    }
    if (config.speed !== undefined) {
      walkStateRef.current.speed = config.speed;
    }
  }, []);

  const getWalkingBehavior = useCallback((): WalkingBehaviorConfig => {
    return { ...walkingBehaviorRef.current };
  }, []);

  const startWalking = useCallback(() => {
    walkingBehaviorRef.current.enabled = true;
    if (walkingBehaviorRef.current.speed <= 0) {
      walkingBehaviorRef.current.speed = 1.0;
    }
    walkStateRef.current.isWalking = true;
    walkStateRef.current.speed = walkingBehaviorRef.current.speed;
  }, []);

  const isWalking = useCallback((): boolean => {
    return walkStateRef.current.isWalking;
  }, []);

  return {
    walkStateRef,
    legAngleRef,
    walkBobOffsetRef,
    walkingBehaviorRef,
    walk,
    stopWalking,
    setWalkingBehavior,
    getWalkingBehavior,
    startWalking,
    isWalking,
  };
}
