import { useRef, useCallback } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { ModelBehaviors, ReactionDefinition, ReactionStep } from '../../../types/behaviorTypes';

export interface UseReactionSystemReturn {
  reactionsMapRef: React.MutableRefObject<Map<string, ReactionDefinition>>;
  behaviorsRef: React.MutableRefObject<ModelBehaviors | null>;
  getReaction: (emotionState: string) => ReactionDefinition | null;
  triggerEmotion: (
    emotionState: string,
    callbacks: {
      setExpressionValue: (name: string, value: number, vrm: VRM | null) => void;
      updatePosture: (emotion: string) => void;
      playGesture: (name: string, duration: number) => void;
      setLookAtTarget: (x: number, y: number, z: number) => void;
      playIdleGesture: (name: string) => void;
      setAiMode: (mode: 'ACTIVE' | 'PASSIVE', setCameraIntensity: (i: number) => void) => void;
      executeReactionSteps: (
        steps: ReactionStep[],
        addExpressionTarget: (alias: string, value: number) => void,
        setExpressionValue: (name: string, value: number, vrm: VRM | null) => void,
        vrm: VRM | null
      ) => void;
      addExpressionTarget: (alias: string, value: number) => void;
      setCameraIntensity: (intensity: number) => void;
    },
    vrm: VRM | null
  ) => void;
  setReactionsMap: (reactions: ReactionDefinition[]) => void;
  setBehaviors: (behaviors: ModelBehaviors | null) => void;
}

export function useReactionSystem(): UseReactionSystemReturn {
  const reactionsMapRef = useRef<Map<string, ReactionDefinition>>(new Map());
  const behaviorsRef = useRef<ModelBehaviors | null>(null);

  const getReaction = useCallback((emotionState: string): ReactionDefinition | null => {
    const reaction = reactionsMapRef.current.get(emotionState);
    if (!reaction || !reaction.enabled) return null;
    return reaction;
  }, []);

  const triggerEmotion = useCallback(
    (
      emotionState: string,
      callbacks: {
        setExpressionValue: (name: string, value: number, vrm: VRM | null) => void;
        updatePosture: (emotion: string) => void;
        playGesture: (name: string, duration: number) => void;
        setLookAtTarget: (x: number, y: number, z: number) => void;
        playIdleGesture: (name: string) => void;
        setAiMode: (mode: 'ACTIVE' | 'PASSIVE', setCameraIntensity: (i: number) => void) => void;
        executeReactionSteps: (
          steps: ReactionStep[],
          addExpressionTarget: (alias: string, value: number) => void,
          setExpressionValue: (name: string, value: number, vrm: VRM | null) => void,
          vrm: VRM | null
        ) => void;
        addExpressionTarget: (alias: string, value: number) => void;
        setCameraIntensity: (intensity: number) => void;
      },
      vrm: VRM | null
    ) => {
      const emotion = getReaction(emotionState);
      if (!emotion) {
        console.warn('Emotion not found or disabled:', emotionState);
        return;
      }

      // Trigger all coordinated responses
      emotion.expressions.forEach((expr) => {
        callbacks.setExpressionValue(expr.name, expr.value, vrm);
      });

      callbacks.updatePosture(emotion.posture);

      // Perform primary gesture
      if (emotion.gestures.length > 0) {
        emotion.gestures.forEach((gest) => callbacks.playGesture(gest, emotion.duration || 1.5));
      }

      // Update look direction if specified
      if (emotion.lookAt) {
        callbacks.setLookAtTarget(emotion.lookAt.x, emotion.lookAt.y, emotion.lookAt.z);
      }

      // Set idle gesture based on posture
      const idleGesture = emotion.posture === 'thoughtful' || emotion.posture === 'anxious' ? 'head_tilt' : 'sway';
      callbacks.playIdleGesture(idleGesture);

      // Switch interaction mode
      callbacks.setAiMode(emotion.mode, callbacks.setCameraIntensity);

      // Execute reaction steps chain if present
      if (emotion.steps && emotion.steps.length > 0) {
        callbacks.executeReactionSteps(
          emotion.steps,
          callbacks.addExpressionTarget,
          callbacks.setExpressionValue,
          vrm
        );
      }
    },
    [getReaction]
  );

  const setReactionsMap = useCallback((reactions: ReactionDefinition[]) => {
    reactionsMapRef.current.clear();
    for (const r of reactions) {
      reactionsMapRef.current.set(r.name, r);
    }
  }, []);

  const setBehaviors = useCallback((behaviors: ModelBehaviors | null) => {
    behaviorsRef.current = behaviors;
  }, []);

  return {
    reactionsMapRef,
    behaviorsRef,
    getReaction,
    triggerEmotion,
    setReactionsMap,
    setBehaviors,
  };
}
