import { useRef, useCallback } from 'react';

export type PostureState = 'neutral' | 'leaning_forward' | 'leaning_back' | 'rotating_toward_camera';
export type AiMode = 'ACTIVE' | 'PASSIVE';

export interface UsePostureControlReturn {
  bodyPositionRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
  bodyRotationRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
  baseRotationY: React.MutableRefObject<number>;
  postureStateRef: React.MutableRefObject<PostureState>;
  aiModeRef: React.MutableRefObject<AiMode>;
  updatePosture: (emotion: string) => void;
  setAiMode: (mode: AiMode, setCameraIntensity: (intensity: number) => void) => void;
  setBaseRotationY: (rotation: number) => void;
}

export function usePostureControl(): UsePostureControlReturn {
  const bodyPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const bodyRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const baseRotationY = useRef(0);
  const postureStateRef = useRef<PostureState>('neutral');
  const aiModeRef = useRef<AiMode>('ACTIVE');

  const updatePosture = useCallback((emotion: string) => {
    switch (emotion) {
      case 'joy':
      case 'excited':
      case 'emphatic':
        postureStateRef.current = 'leaning_forward';
        bodyPositionRef.current.z = 0.3;
        bodyRotationRef.current.x = 0.2;
        break;
      case 'thoughtful':
      case 'listening':
      case 'uncertain':
        postureStateRef.current = 'leaning_back';
        bodyPositionRef.current.z = -0.2;
        bodyRotationRef.current.x = -0.1;
        break;
      case 'engaged':
      case 'interested':
        postureStateRef.current = 'rotating_toward_camera';
        bodyRotationRef.current.y = baseRotationY.current + 0.3;
        break;
      default:
        postureStateRef.current = 'neutral';
        bodyPositionRef.current.x = 0;
        bodyPositionRef.current.z = 0;
        bodyRotationRef.current = { x: 0, y: baseRotationY.current, z: 0 };
    }
  }, []);

  const setAiMode = useCallback((mode: AiMode, setCameraIntensity: (intensity: number) => void) => {
    aiModeRef.current = mode;
    if (mode === 'ACTIVE') {
      setCameraIntensity(0.8);
      postureStateRef.current = 'neutral';
    } else {
      setCameraIntensity(0.4);
      postureStateRef.current = 'neutral';
    }
  }, []);

  const setBaseRotationY = useCallback((rotation: number) => {
    baseRotationY.current = rotation;
    bodyRotationRef.current.y = rotation;
  }, []);

  return {
    bodyPositionRef,
    bodyRotationRef,
    baseRotationY,
    postureStateRef,
    aiModeRef,
    updatePosture,
    setAiMode,
    setBaseRotationY,
  };
}
