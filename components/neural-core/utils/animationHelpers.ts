/**
 * Animation Helper Functions
 * 
 * Helper functions for NeuralCore animation loop
 */

import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { getEasingFunction } from '../../../utils/animationBlender';
import { calculateLodLevel, applyLodSettings, shouldUpdateLod, type LodLevel, type LodConfig } from '../../../utils/lodManager';
import type { VrmCommand } from '../../../services/liveManager';
import type { BonePose } from './boneAnimation';

/**
 * Apply body config to bone targets
 */
export function applyBodyConfig(
  bodyConfig: any,
  boneTargets: React.MutableRefObject<BonePose>,
  cameraTracking: any
): void {
  if (!bodyConfig) return;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  
  const bones = ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'spine', 'chest'];
  bones.forEach(bone => {
    if (bodyConfig[bone]) {
      boneTargets.current[bone] = {
        x: degToRad(bodyConfig[bone].x),
        y: degToRad(bodyConfig[bone].y),
        z: degToRad(bodyConfig[bone].z),
      };
    }
  });
  
  if (bodyConfig.eyeTracking) {
    cameraTracking.setTrackingEnabled(bodyConfig.eyeTracking.enabled);
    cameraTracking.setTrackingIntensity(bodyConfig.eyeTracking.intensity);
  }
}

/**
 * Apply head tracking with idle movement
 */
export function applyHeadTracking(
  vrm: VRM,
  elapsedTime: number,
  isActive: boolean,
  volume: number,
  idleConfig: any,
  cameraTracking: any,
  boneTargets: React.MutableRefObject<BonePose>,
  delta: number
): void {
  const head = vrm.humanoid.getNormalizedBoneNode('head');
  if (!head) return;
  
  const headMovementEnabled = idleConfig?.headMovement?.enabled !== false;
  const headMovementAmount = idleConfig?.headMovement?.amount ?? 0.1;
  
  head.rotation.y = headMovementEnabled ? Math.sin(elapsedTime * 0.5) * headMovementAmount : 0;
  head.rotation.z = headMovementEnabled ? Math.cos(elapsedTime * 0.3) * headMovementAmount * 0.5 : 0;
  head.rotation.x = (isActive && volume > 0.1) ? Math.sin(elapsedTime * 10) * 0.02 * volume : 0;
  
  const trackingLerp = 3 * delta;
  const targetRot = cameraTracking.targetHeadRotation.current;
  head.rotation.x += (targetRot.x - head.rotation.x) * trackingLerp;
  head.rotation.y += (targetRot.y - head.rotation.y) * trackingLerp;
  head.rotation.z += (targetRot.z - head.rotation.z) * trackingLerp;
  
  const btarget = boneTargets.current['head'];
  if (btarget) {
    const lerpFactor = Math.min(1, 5 * delta);
    head.rotation.x += (btarget.x - head.rotation.x) * lerpFactor;
    head.rotation.y += (btarget.y - head.rotation.y) * lerpFactor;
    head.rotation.z += (btarget.z - head.rotation.z) * lerpFactor;
  }
}

/** Bone names for animation */
const ANIMATION_BONE_NAMES: VRMHumanBoneName[] = [
  'spine', 'chest', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'rightUpperLeg',
  'leftThumbProximal', 'leftThumbDistal', 'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal', 'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightThumbProximal', 'rightThumbDistal', 'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal', 'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
];

/**
 * Apply bone targets with gesture blending
 */
export function applyAnimationBoneTargets(
  vrm: VRM,
  targets: BonePose,
  gestureState: any,
  delta: number
): void {
  const smoothingSpeed = 5.0;
  
  for (const boneName of ANIMATION_BONE_NAMES) {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
    const btarget = targets[boneName];
    if (!bone || !btarget) continue;
    
    if (gestureState.active && gestureState.fromPose[boneName] && gestureState.toPose[boneName]) {
      const progress = Math.min(1, gestureState.elapsed / gestureState.transitionSpeed);
      const easedProgress = getEasingFunction(gestureState.easing)(progress);
      const from = gestureState.fromPose[boneName];
      const to = gestureState.toPose[boneName];
      bone.rotation.x = from.x + (to.x - from.x) * easedProgress;
      bone.rotation.y = from.y + (to.y - from.y) * easedProgress;
      bone.rotation.z = from.z + (to.z - from.z) * easedProgress;
    } else {
      const lerpFactor = Math.min(1, smoothingSpeed * delta);
      bone.rotation.x += (btarget.x - bone.rotation.x) * lerpFactor;
      bone.rotation.y += (btarget.y - bone.rotation.y) * lerpFactor;
      bone.rotation.z += (btarget.z - bone.rotation.z) * lerpFactor;
    }
  }
}

/**
 * Update LOD based on camera distance
 */
export function updateLod(
  vrm: VRM | null,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  lodConfig: LodConfig | null,
  currentLodLevelRef: React.MutableRefObject<LodLevel | null>,
  particles: THREE.Points | null,
  baseParticleCount: number,
  lights: THREE.Light[]
): void {
  if (!vrm || !lodConfig) return;
  
  const cameraDistance = camera.position.distanceTo(vrm.scene.position);
  const newLodLevel = calculateLodLevel(cameraDistance, lodConfig);
  
  if (!currentLodLevelRef.current || shouldUpdateLod(currentLodLevelRef.current, newLodLevel)) {
    applyLodSettings(scene, newLodLevel, {
      particleSystem: particles || undefined,
      baseParticleCount,
      lights,
    });
    currentLodLevelRef.current = newLodLevel;
  }
}

/**
 * Load expression sidecar data
 */
export async function loadSidecar(
  vrmModel: string | undefined,
  expressionManager: any,
  onVrmExpressionsLoaded: (expressions: string[]) => void
): Promise<void> {
  expressionManager.sidecarRef.current = null;
  if (!vrmModel) return;
  
  try {
    const resp = await fetch(`/VRM-Models/sidecars/${vrmModel}.expressions.json`);
    if (!resp.ok) {
      onVrmExpressionsLoaded(['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o']);
      return;
    }
    
    const data = await resp.json();
    expressionManager.sidecarRef.current = data;
    
    if (data?.groups) {
      const presetNames = new Set<string>();
      Object.values(data.groups).forEach((g: any) => {
        if (g.presetName && g.presetName !== 'unknown' && g.presetName !== 'neutral') {
          presetNames.add(g.presetName);
        }
      });
      
      const standardPresets = ['joy', 'angry', 'sorrow', 'fun', 'surprised', 'a', 'i', 'u', 'e', 'o', 'blink'];
      onVrmExpressionsLoaded(standardPresets.filter(p => presetNames.has(p)));
    }
  } catch {
    onVrmExpressionsLoaded(['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o']);
  }
}

/**
 * Handle VRM commands
 */
export function handleVrmCommand(
  cmd: VrmCommand,
  expressionManager: any,
  gesturePlayer: any,
  idleAnimations: any,
  walkingAnimation: any,
  reactionSystem: any,
  updatePosture: (emotion: string) => void,
  setAiMode: (mode: 'ACTIVE' | 'PASSIVE') => void,
  boneTargets: React.MutableRefObject<BonePose>
): void {
  switch (cmd.type) {
    case 'EXPRESSION':
      if (cmd.value > 0) expressionManager.expressionPersist.current[cmd.name] = cmd.value;
      else delete expressionManager.expressionPersist.current[cmd.name];
      expressionManager.addExpressionTarget(cmd.name, cmd.value);
      if (cmd.name.toLowerCase().includes('lookup')) idleAnimations.setBlinkAllowed(false);
      else idleAnimations.setBlinkAllowed(true);
      break;
    case 'BONE_ROT':
      if (cmd.bone) boneTargets.current[cmd.bone] = { x: cmd.x, y: cmd.y, z: cmd.z };
      break;
    case 'LOOKAT':
      boneTargets.current['head'] = { x: (cmd.x || 0) * 0.08, y: (cmd.y || 0) * 0.08, z: (cmd.z || 0) * 0.02 };
      break;
    case 'POSE':
      expressionManager.expressionPersist.current[cmd.name] = cmd.value;
      expressionManager.addExpressionTarget(cmd.name, cmd.value);
      break;
    case 'GESTURE':
      gesturePlayer.playGesture(cmd.name, cmd.duration || 1.5);
      break;
    case 'IDLE_GESTURE':
      idleAnimations.playIdleGesture(cmd.name);
      idleAnimations.setIdleState('talking');
      break;
    case 'POSTURE':
      updatePosture(cmd.emotion);
      break;
    case 'WALK':
      if (cmd.speed > 0) walkingAnimation.walk(cmd.direction, Math.min(cmd.speed, 2.0));
      else walkingAnimation.stopWalking();
      break;
    case 'MODE':
      setAiMode(cmd.mode);
      break;
    case 'EMOTION':
      reactionSystem.triggerEmotion(cmd.state);
      break;
  }
}
