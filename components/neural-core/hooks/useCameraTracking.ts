// useCameraTracking - Hook for managing camera tracking and eye contact
// Handles head rotation toward camera and smooth camera transitions

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

// Types
export interface TrackingState {
  enabled: boolean;
  intensity: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface UseCameraTrackingOptions {
  vrmRef: React.MutableRefObject<VRM | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export interface UseCameraTrackingReturn {
  // State refs
  trackingState: React.MutableRefObject<TrackingState>;
  targetHeadRotation: React.MutableRefObject<Vector3>;
  cameraTargetPosition: React.MutableRefObject<Vector3>;
  cameraTargetLookAt: React.MutableRefObject<Vector3>;
  // Functions
  updateCameraTracking: () => void;
  setLookAtTarget: (x: number, y: number, z: number) => void;
  setTrackingIntensity: (intensity: number) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  updateCameraPosition: (delta: number) => void;
  setCameraTarget: (position: Vector3, lookAt: Vector3) => void;
}

/**
 * Default tracking state
 */
export const DEFAULT_TRACKING_STATE: TrackingState = {
  enabled: true,
  intensity: 0.7,
};

/**
 * Default camera position
 */
export const DEFAULT_CAMERA_POSITION: Vector3 = { x: 0, y: 1.4, z: 1.5 };

/**
 * Default camera look-at target
 */
export const DEFAULT_CAMERA_LOOK_AT: Vector3 = { x: 0, y: 1.3, z: 0 };


/**
 * Calculate head rotation to look at camera
 */
export function calculateLookAtRotation(
  headWorldPos: THREE.Vector3,
  cameraPos: THREE.Vector3,
  intensity: number
): Vector3 {
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

  // Apply intensity scaling
  return {
    x: lookAtEuler.x * intensity,
    y: lookAtEuler.y * intensity,
    z: lookAtEuler.z * intensity * 0.3, // Less z rotation for natural look
  };
}

/**
 * Lerp a value toward target
 */
export function lerpValue(current: number, target: number, speed: number): number {
  return current + (target - current) * speed;
}

/**
 * Hook for managing camera tracking and eye contact
 */
export function useCameraTracking(options: UseCameraTrackingOptions): UseCameraTrackingReturn {
  const { vrmRef, cameraRef } = options;

  // Tracking state refs
  const trackingState = useRef<TrackingState>({ ...DEFAULT_TRACKING_STATE });
  const targetHeadRotation = useRef<Vector3>({ x: 0, y: 0, z: 0 });
  const cameraTargetPosition = useRef<Vector3>({ ...DEFAULT_CAMERA_POSITION });
  const cameraTargetLookAt = useRef<Vector3>({ ...DEFAULT_CAMERA_LOOK_AT });

  /**
   * Update camera tracking for eye contact
   */
  const updateCameraTracking = useCallback(() => {
    if (!trackingState.current.enabled || !cameraRef.current) return;

    const cameraPos = cameraRef.current.position;
    const vrm = vrmRef.current;
    if (!vrm) return;

    // Get head bone position
    const headBone = vrm.humanoid.getNormalizedBoneNode('head');
    if (!headBone) return;

    const headWorldPos = new THREE.Vector3();
    headBone.getWorldPosition(headWorldPos);

    // Calculate look-at rotation
    targetHeadRotation.current = calculateLookAtRotation(
      headWorldPos,
      cameraPos,
      trackingState.current.intensity
    );
  }, [vrmRef, cameraRef]);

  /**
   * Directly set head rotation target for emotional expressions
   */
  const setLookAtTarget = useCallback((x: number, y: number, z: number) => {
    targetHeadRotation.current = { x, y, z };
  }, []);

  /**
   * Set tracking intensity
   */
  const setTrackingIntensity = useCallback((intensity: number) => {
    trackingState.current.intensity = Math.max(0, Math.min(1, intensity));
  }, []);

  /**
   * Enable or disable tracking
   */
  const setTrackingEnabled = useCallback((enabled: boolean) => {
    trackingState.current.enabled = enabled;
  }, []);


  /**
   * Update camera position with smooth lerping
   */
  const updateCameraPosition = useCallback(
    (delta: number) => {
      const cam = cameraRef.current;
      if (!cam) return;

      const camLerpSpeed = 3 * delta;
      const target = cameraTargetPosition.current;
      const lookAt = cameraTargetLookAt.current;

      // Lerp position
      cam.position.x = lerpValue(cam.position.x, target.x, camLerpSpeed);
      cam.position.y = lerpValue(cam.position.y, target.y, camLerpSpeed);
      cam.position.z = lerpValue(cam.position.z, target.z, camLerpSpeed);

      // Update lookAt target
      cam.lookAt(lookAt.x, lookAt.y, lookAt.z);
    },
    [cameraRef]
  );

  /**
   * Set camera target position and look-at
   */
  const setCameraTarget = useCallback((position: Vector3, lookAt: Vector3) => {
    cameraTargetPosition.current = { ...position };
    cameraTargetLookAt.current = { ...lookAt };
  }, []);

  return {
    trackingState,
    targetHeadRotation,
    cameraTargetPosition,
    cameraTargetLookAt,
    updateCameraTracking,
    setLookAtTarget,
    setTrackingIntensity,
    setTrackingEnabled,
    updateCameraPosition,
    setCameraTarget,
  };
}
