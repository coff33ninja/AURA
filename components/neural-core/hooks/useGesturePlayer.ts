import { useRef, useCallback } from 'react';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { GestureDefinition, ReactionStep } from '../../../types/behaviorTypes';
import type { EasingType } from '../../../utils/animationBlender';

export interface GestureState {
  active: boolean;
  elapsed: number;
  duration: number;
  currentGesture: string | null;
  transitionSpeed: number;
  easing: EasingType;
  fromPose: Record<string, { x: number; y: number; z: number }>;
  toPose: Record<string, { x: number; y: number; z: number }>;
}

export interface UseGesturePlayerReturn {
  gesturesMapRef: React.MutableRefObject<Map<string, GestureDefinition>>;
  gestureQueue: React.MutableRefObject<Array<{ name: string; duration: number }>>;
  gestureStateRef: React.MutableRefObject<GestureState>;
  boneTargets: React.MutableRefObject<Record<string, { x: number; y: number; z: number }>>;
  getGestureRotations: (gestureName: string) => Record<string, { x: number; y: number; z: number }> | null;
  playGesture: (gestureName: string, duration?: number) => void;
  playNextGesture: (vrm: VRM | null) => void;
  setBoneRotation: (boneName: string, rotation: { x: number; y: number; z: number }) => void;
  setGesturesMap: (gestures: GestureDefinition[]) => void;
  clearGestureQueue: () => void;
  executeReactionSteps: (
    steps: ReactionStep[],
    addExpressionTarget: (alias: string, value: number) => void,
    setExpressionValue: (name: string, value: number, vrm: VRM | null) => void,
    vrm: VRM | null
  ) => void;
}

export function useGesturePlayer(): UseGesturePlayerReturn {
  const gesturesMapRef = useRef<Map<string, GestureDefinition>>(new Map());
  const gestureQueue = useRef<Array<{ name: string; duration: number }>>([]);
  const gestureStateRef = useRef<GestureState>({
    active: false,
    elapsed: 0,
    duration: 0,
    currentGesture: null,
    transitionSpeed: 0.3,
    easing: 'easeInOut',
    fromPose: {},
    toPose: {},
  });
  const boneTargets = useRef<Record<string, { x: number; y: number; z: number }>>({});

  const getGestureRotations = useCallback(
    (gestureName: string): Record<string, { x: number; y: number; z: number }> | null => {
      const gesture = gesturesMapRef.current.get(gestureName);
      if (!gesture || !gesture.enabled) return null;

      const bones = { ...gesture.bones };
      const now = Date.now();

      // Apply dynamic animations for specific gestures
      if (gestureName === 'wave' && bones.rightLowerArm) {
        bones.rightLowerArm = { ...bones.rightLowerArm, x: Math.sin(now * 0.003) * 0.5 };
      } else if (gestureName === 'applause') {
        if (bones.rightHand) {
          bones.rightHand = { ...bones.rightHand, x: Math.sin(now * 0.005) * 0.3 };
        }
        if (bones.leftHand) {
          bones.leftHand = { ...bones.leftHand, x: Math.sin(now * 0.005 + Math.PI) * 0.3 };
        }
      } else if (gestureName === 'dismissive_wave' && bones.rightHand) {
        bones.rightHand = { ...bones.rightHand, x: Math.sin(now * 0.004) * 0.3 };
      }

      return bones;
    },
    []
  );

  const playGesture = useCallback(
    (gestureName: string, duration: number = 1.5) => {
      const rotations = getGestureRotations(gestureName);
      if (!rotations) {
        console.warn('Gesture not found or disabled:', gestureName);
        return;
      }

      const gesture = gesturesMapRef.current.get(gestureName);
      const actualDuration = gesture?.duration ?? duration;
      gestureQueue.current.push({ name: gestureName, duration: actualDuration });
    },
    [getGestureRotations]
  );

  const playNextGesture = useCallback(
    (vrm: VRM | null) => {
      if (gestureQueue.current.length === 0) {
        gestureStateRef.current = {
          active: false,
          elapsed: 0,
          duration: 0,
          currentGesture: null,
          transitionSpeed: 0.3,
          easing: 'easeInOut',
          fromPose: {},
          toPose: {},
        };
        return;
      }

      const { name, duration } = gestureQueue.current.shift()!;
      const rotations = getGestureRotations(name);
      if (!rotations) return;

      const gestureConfig = gesturesMapRef.current.get(name);

      // Capture current bone positions as starting pose
      const fromPose: Record<string, { x: number; y: number; z: number }> = {};
      if (vrm) {
        for (const boneName of Object.keys(rotations)) {
          const bone = vrm.humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
          if (bone) {
            fromPose[boneName] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
          } else {
            fromPose[boneName] = { x: 0, y: 0, z: 0 };
          }
        }
      }

      for (const [boneName, rot] of Object.entries(rotations)) {
        boneTargets.current[boneName] = rot;
      }

      gestureStateRef.current = {
        active: true,
        elapsed: 0,
        duration,
        currentGesture: name,
        transitionSpeed: gestureConfig?.transitionSpeed ?? 0.3,
        easing: 'easeInOut',
        fromPose,
        toPose: rotations,
      };
    },
    [getGestureRotations]
  );

  const setBoneRotation = useCallback((boneName: string, rotation: { x: number; y: number; z: number }) => {
    boneTargets.current[boneName] = rotation;
  }, []);

  const setGesturesMap = useCallback((gestures: GestureDefinition[]) => {
    gesturesMapRef.current.clear();
    for (const g of gestures) {
      gesturesMapRef.current.set(g.name, g);
    }
  }, []);

  const clearGestureQueue = useCallback(() => {
    gestureQueue.current = [];
    gestureStateRef.current = {
      active: false,
      elapsed: 0,
      duration: 0,
      currentGesture: null,
      transitionSpeed: 0.3,
      easing: 'easeInOut',
      fromPose: {},
      toPose: {},
    };
  }, []);

  const executeReactionSteps = useCallback(
    (
      steps: ReactionStep[],
      addExpressionTarget: (alias: string, value: number) => void,
      setExpressionValue: (name: string, value: number, vrm: VRM | null) => void,
      vrm: VRM | null
    ) => {
      const degToRad = (deg: number) => (deg * Math.PI) / 180;

      steps.forEach((step, index) => {
        let cumulativeDelay = 0;
        for (let i = 0; i <= index; i++) {
          cumulativeDelay += (steps[i].delay || 0) * 1000;
          if (i < index) {
            cumulativeDelay += (steps[i].duration || 1) * 1000;
          }
        }

        setTimeout(() => {
          switch (step.type) {
            case 'body':
              if (step.bodyConfig) {
                const bc = step.bodyConfig;
                if (bc.leftUpperArm) {
                  boneTargets.current.leftUpperArm = {
                    x: degToRad(bc.leftUpperArm.x),
                    y: degToRad(bc.leftUpperArm.y),
                    z: degToRad(bc.leftUpperArm.z),
                  };
                }
                if (bc.rightUpperArm) {
                  boneTargets.current.rightUpperArm = {
                    x: degToRad(bc.rightUpperArm.x),
                    y: degToRad(bc.rightUpperArm.y),
                    z: degToRad(bc.rightUpperArm.z),
                  };
                }
                if (bc.spine) {
                  boneTargets.current.spine = {
                    x: degToRad(bc.spine.x),
                    y: degToRad(bc.spine.y),
                    z: degToRad(bc.spine.z),
                  };
                }
                if (bc.chest) {
                  boneTargets.current.chest = {
                    x: degToRad(bc.chest.x),
                    y: degToRad(bc.chest.y),
                    z: degToRad(bc.chest.z),
                  };
                }
              }
              break;

            case 'hands':
              if (step.handsConfig) {
                const hc = step.handsConfig;
                const fingerBones = [
                  'leftThumbProximal', 'leftThumbDistal',
                  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
                  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
                  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
                  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
                  'rightThumbProximal', 'rightThumbDistal',
                  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
                  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
                  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
                  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
                ] as const;

                for (const boneName of fingerBones) {
                  const boneConfig = (hc as any)[boneName];
                  if (boneConfig) {
                    boneTargets.current[boneName] = {
                      x: degToRad(boneConfig.x),
                      y: degToRad(boneConfig.y),
                      z: degToRad(boneConfig.z),
                    };
                  }
                }
              }
              break;

            case 'facial':
              if (step.facialConfig) {
                const fc = step.facialConfig;
                if (fc.expressions) {
                  for (const [expr, value] of Object.entries(fc.expressions)) {
                    addExpressionTarget(expr, value);
                  }
                }
                if (fc.mouth) {
                  for (const [viseme, value] of Object.entries(fc.mouth)) {
                    addExpressionTarget(viseme, value);
                  }
                }
                if (fc.eyes) {
                  for (const [eye, value] of Object.entries(fc.eyes)) {
                    addExpressionTarget(eye, value);
                  }
                }
              }
              break;

            case 'gesture':
              if (step.gestureName) {
                playGesture(step.gestureName, step.duration || 1.5);
              }
              break;

            case 'expression':
              if (step.expressionName) {
                setExpressionValue(step.expressionName, step.expressionValue || 0.8, vrm);
              }
              break;
          }

          console.log(`[GesturePlayer] Executed reaction step ${index + 1}: ${step.type} - ${step.name}`);
        }, cumulativeDelay);
      });
    },
    [playGesture]
  );

  return {
    gesturesMapRef,
    gestureQueue,
    gestureStateRef,
    boneTargets,
    getGestureRotations,
    playGesture,
    playNextGesture,
    setBoneRotation,
    setGesturesMap,
    clearGestureQueue,
    executeReactionSteps,
  };
}
