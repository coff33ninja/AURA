import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

export interface CameraTrackingState {
  enabled: boolean;
  intensity: number;
}

export interface UseCameraTrackingReturn {
  cameraTrackingRef: React.MutableRefObject<CameraTrackingState>;
  targetHeadRotation: React.MutableRefObject<{ x: number; y: number; z: number }>;
  cameraTargetPosition: React.MutableRefObject<{ x: number; y: number; z: number }>;
  cameraTargetLookAt: React.MutableRefObject<{ x: number; y: number; z: number }>;
  updateCameraTracking: (camera: THREE.PerspectiveCamera | null, vrm: VRM | null) => void;
  setLookAtTarget: (x: number, y: number, z: number) => void;
  setCameraTrackingIntensity: (intensity: number) => void;
  setCameraTrackingEnabled: (enabled: boolean) => void;
}

export function useCameraTracking(): UseCameraTrackingReturn {
  const cameraTrackingRef = useRef<CameraTrackingState>({ enabled: true, intensity: 0.7 });
  const targetHeadRotation = useRef({ x: 0, y: 0, z: 0 });
  const cameraTargetPosition = useRef({ x: 0, y: 1.4, z: 1.5 });
  const cameraTargetLookAt = useRef({ x: 0, y: 1.3, z: 0 });

  const updateCameraTracking = useCallback((camera: THREE.PerspectiveCamera | null, vrm: VRM | null) => {
    if (!cameraTrackingRef.current.enabled || !camera || !vrm) return;

    const cameraPos = camera.position;
    const headBone = vrm.humanoid.getNormalizedBoneNode('head');
    if (!headBone) return;

    const headWorldPos = new THREE.Vector3();
    headBone.getWorldPosition(headWorldPos);

    // Vector from head to camera
    const dirToCamera = new THREE.Vector3().subVectors(cameraPos, headWorldPos).normalize();

    // Convert to local rotation
    const lookAtEuler = new THREE.Euler();
    lookAtEuler.setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dirToCamera
      )
    );

    // Blend with idle head movement based on intensity
    const intensity = cameraTrackingRef.current.intensity;
    targetHeadRotation.current = {
      x: lookAtEuler.x * intensity,
      y: lookAtEuler.y * intensity,
      z: lookAtEuler.z * intensity * 0.3, // Less z rotation
    };
  }, []);

  const setLookAtTarget = useCallback((x: number, y: number, z: number) => {
    targetHeadRotation.current = { x, y, z };
  }, []);

  const setCameraTrackingIntensity = useCallback((intensity: number) => {
    cameraTrackingRef.current.intensity = intensity;
  }, []);

  const setCameraTrackingEnabled = useCallback((enabled: boolean) => {
    cameraTrackingRef.current.enabled = enabled;
  }, []);

  return {
    cameraTrackingRef,
    targetHeadRotation,
    cameraTargetPosition,
    cameraTargetLookAt,
    updateCameraTracking,
    setLookAtTarget,
    setCameraTrackingIntensity,
    setCameraTrackingEnabled,
  };
}
