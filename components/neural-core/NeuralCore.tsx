/**
 * NeuralCore Component
 * 
 * Main VRM avatar rendering and animation component.
 * Orchestrates hooks for modular functionality.
 */

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import type { VrmCommand } from '../../services/liveManager';
import { loadModelBehaviors, getCurrentBehaviors, onBehaviorChanged } from '../../services/behaviorManager';
import type { ModelBehaviors, GestureDefinition, ReactionDefinition } from '../../types/behaviorTypes';
import type { WalkingBehaviorConfig } from '../../types/walkingBehaviorTypes';
import type { LodLevel, LodConfig } from '../../utils/lodManager';

import {
  useVrmLoader,
  useExpressionManager,
  useGesturePlayer,
  useIdleAnimations,
  useWalkingAnimation,
  useCameraTracking,
  useLipSync,
  useReactionSystem,
} from './hooks';

import {
  setupScene,
  handleResize,
  disposeScene,
  applyBodyConfig,
  applyHeadTracking,
  applyAnimationBoneTargets,
  updateLod,
  loadSidecar,
  handleVrmCommand,
  type BonePose,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export interface PoseSettings {
  rotation: number;
  leftArmZ: number;
  rightArmZ: number;
}

export interface NeuralCoreHandle {
  previewGesture: (gestureName: string, duration?: number) => void;
  previewExpression: (expressionName: string, value: number) => void;
  previewReaction: (reactionName: string) => void;
  resetExpressions: () => void;
  setWalkingBehavior: (config: Partial<WalkingBehaviorConfig>) => void;
  getWalkingBehavior: () => WalkingBehaviorConfig;
  startWalking: () => void;
  stopWalking: () => void;
  isWalking: () => boolean;
  setBoneRotation: (boneName: string, rotation: { x: number; y: number; z: number }) => void;
}

export interface NeuralCoreProps {
  volume: number;
  isActive: boolean;
  vrmCommand: VrmCommand | null;
  vrmModel?: string;
  onVrmExpressionsLoaded: (expressions: string[]) => void;
  poseSettings?: PoseSettings;
  onConfigLoaded?: (config: any) => void;
  frequencyDataRef?: React.MutableRefObject<Uint8Array | null>;
}

// ============================================================================
// Component
// ============================================================================

export const NeuralCore = forwardRef<NeuralCoreHandle, NeuralCoreProps>(({
  volume, isActive, vrmCommand, vrmModel, onVrmExpressionsLoaded, poseSettings, onConfigLoaded, frequencyDataRef,
}, ref) => {
  // Core refs
  const mountRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const smoothedVolume = useRef(0);
  const boneTargets = useRef<BonePose>({});
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Behavior refs
  const behaviorsRef = useRef<ModelBehaviors | null>(null);
  const gesturesMapRef = useRef<Map<string, GestureDefinition>>(new Map());
  const reactionsMapRef = useRef<Map<string, ReactionDefinition>>(new Map());
  
  // Scene refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const lightsRef = useRef<THREE.Light[]>([]);
  const lodConfigRef = useRef<LodConfig | null>(null);
  const currentLodLevelRef = useRef<LodLevel | null>(null);
  const baseParticleCountRef = useRef<number>(150);
  
  // Posture refs
  const bodyPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const bodyRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const baseRotationY = useRef(0);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Initialize hooks
  const vrmLoader = useVrmLoader({ onConfigLoaded, onExpressionsLoaded: onVrmExpressionsLoaded });
  const expressionManager = useExpressionManager({ vrmRef: vrmLoader.vrmRef, configRef: vrmLoader.configRef });
  const gesturePlayer = useGesturePlayer({ vrmRef: vrmLoader.vrmRef, gesturesMapRef, boneTargets });
  const idleAnimations = useIdleAnimations({ idleConfig: behaviorsRef.current?.idle, boneTargets, addExpressionTarget: expressionManager.addExpressionTarget });
  const walkingAnimation = useWalkingAnimation({ vrmRef: vrmLoader.vrmRef, bodyRotationRef });
  const cameraTracking = useCameraTracking({ vrmRef: vrmLoader.vrmRef, cameraRef });
  const lipSync = useLipSync({ lipsyncConfig: behaviorsRef.current?.lipsync, addExpressionTarget: expressionManager.addExpressionTarget });

  const updatePosture = useCallback((emotion: string) => {
    const postures: Record<string, { z?: number; x?: number; y?: number }> = {
      joy: { z: 0.3, x: 0.2 }, excited: { z: 0.3, x: 0.2 }, emphatic: { z: 0.3, x: 0.2 },
      thoughtful: { z: -0.2, x: -0.1 }, listening: { z: -0.2, x: -0.1 }, uncertain: { z: -0.2, x: -0.1 },
      engaged: { y: baseRotationY.current + 0.3 }, interested: { y: baseRotationY.current + 0.3 },
    };
    const p = postures[emotion];
    if (p) {
      if (p.z !== undefined) bodyPositionRef.current.z = p.z;
      if (p.x !== undefined) bodyRotationRef.current.x = p.x;
      if (p.y !== undefined) bodyRotationRef.current.y = p.y;
    } else {
      bodyPositionRef.current = { x: 0, y: bodyPositionRef.current.y, z: 0 };
      bodyRotationRef.current = { x: 0, y: baseRotationY.current, z: 0 };
    }
  }, []);

  const setAiMode = useCallback((mode: 'ACTIVE' | 'PASSIVE') => {
    cameraTracking.setTrackingIntensity(mode === 'ACTIVE' ? 0.8 : 0.4);
  }, [cameraTracking]);

  const reactionSystem = useReactionSystem({
    reactionsMapRef, setExpressionValue: expressionManager.setExpressionValue, playGesture: gesturePlayer.playGesture,
    updatePosture, setLookAtTarget: cameraTracking.setLookAtTarget, playIdleGesture: idleAnimations.playIdleGesture,
    setAiMode, boneTargets, addExpressionTarget: expressionManager.addExpressionTarget,
  });

  // Imperative handle
  useImperativeHandle(ref, () => ({
    previewGesture: gesturePlayer.playGesture,
    previewExpression: expressionManager.setExpressionValue,
    previewReaction: reactionSystem.triggerEmotion,
    resetExpressions: expressionManager.resetExpressions,
    setWalkingBehavior: walkingAnimation.setWalkingBehavior,
    getWalkingBehavior: walkingAnimation.getWalkingBehavior,
    startWalking: walkingAnimation.startWalking,
    stopWalking: walkingAnimation.stopWalking,
    isWalking: walkingAnimation.isWalking,
    setBoneRotation: (boneName, rotation) => { boneTargets.current[boneName] = rotation; },
  }), [gesturePlayer, expressionManager, reactionSystem, walkingAnimation]);


  // Scene setup & animation loop
  useEffect(() => {
    if (!mountRef.current) return;

    const sceneSetup = setupScene(mountRef.current);
    const { scene, camera, renderer, lights, particles, lodConfig, actualParticleCount } = sceneSetup;
    
    vrmLoader.sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particlesRef.current = particles;
    lightsRef.current = lights;
    lodConfigRef.current = lodConfig;
    baseParticleCountRef.current = actualParticleCount;

    const modelBaseName = vrmModel?.replace('.vrm', '').replace('custom:', '') || 'AvatarSample_D';
    
    // Load behaviors
    loadModelBehaviors(modelBaseName).then(behaviors => {
      behaviorsRef.current = behaviors;
      gesturesMapRef.current.clear();
      reactionsMapRef.current.clear();
      behaviors.gestures.gestures.forEach(g => gesturesMapRef.current.set(g.name, g));
      behaviors.reactions.reactions.forEach(r => reactionsMapRef.current.set(r.name, r));
      lipSync.initializeLipSync(behaviors.lipsync);
      applyBodyConfig(behaviors.body, boneTargets, cameraTracking);
    });

    const unsubscribe = onBehaviorChanged((type) => {
      const behaviors = getCurrentBehaviors();
      if (!behaviors) return;
      behaviorsRef.current = behaviors;
      if (type === 'gestures') { gesturesMapRef.current.clear(); behaviors.gestures.gestures.forEach(g => gesturesMapRef.current.set(g.name, g)); }
      else if (type === 'reactions') { reactionsMapRef.current.clear(); behaviors.reactions.reactions.forEach(r => reactionsMapRef.current.set(r.name, r)); }
      else if (type === 'body') applyBodyConfig(behaviors.body, boneTargets, cameraTracking);
      else if (type === 'lipsync') lipSync.updateConfig(behaviors.lipsync);
    });

    // Load VRM
    vrmLoader.loadModel(vrmModel || 'Arlecchino-Normal_look.vrm', scene).then(vrm => {
      if (!vrm) return;
      const config = vrmLoader.configRef.current;
      const rotationRad = ((poseSettings?.rotation ?? config.transform.rotation) * Math.PI) / 180;
      baseRotationY.current = rotationRad;
      bodyRotationRef.current.y = rotationRad;
      
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const modelHeight = box.max.y - box.min.y;
      const yOffset = 1.0 - (box.min.y + modelHeight * 0.65);
      vrm.scene.position.y = yOffset;
      walkingAnimation.walkState.current.position.y = yOffset;
      bodyPositionRef.current.y = yOffset;
      
      const headY = box.min.y + yOffset + modelHeight * 0.92;
      const chestY = box.min.y + yOffset + modelHeight * 0.65;
      const camLookAtY = (headY + chestY) / 2;
      cameraTracking.setCameraTarget({ x: 0, y: camLookAtY + 0.1, z: 2.0 * Math.max(1.0, modelHeight / 1.6) }, { x: 0, y: camLookAtY, z: 0 });
      
      mixerRef.current = new THREE.AnimationMixer(vrm.scene);
      expressionManager.initializeExpressions();
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();
      const vrm = vrmLoader.vrmRef.current;

      if (vrm) {
        cameraTracking.updateCameraTracking();
        walkingAnimation.updateWalkingAnimation(delta, elapsedTime);
        
        const lerpSpeed = 5 * delta;
        vrm.scene.position.x += (bodyPositionRef.current.x - vrm.scene.position.x) * lerpSpeed;
        vrm.scene.position.z += (bodyPositionRef.current.z - vrm.scene.position.z) * lerpSpeed;
        vrm.scene.rotation.y += (bodyRotationRef.current.y - vrm.scene.rotation.y) * lerpSpeed;

        lipSync.updateLipSync(smoothedVolume.current, frequencyDataRef?.current ?? null, delta);
        idleAnimations.updateIdleAnimations(delta, elapsedTime, smoothedVolume.current, isActive);
        mixerRef.current?.update(delta);
        gesturePlayer.updateGestureState(delta);
        applyHeadTracking(vrm, elapsedTime, isActive, smoothedVolume.current, behaviorsRef.current?.idle, cameraTracking, boneTargets, delta);
        applyAnimationBoneTargets(vrm, boneTargets.current, gesturePlayer.gestureState.current, delta);
        expressionManager.applyExpressions(delta);
        vrm.update(delta);
      }

      cameraTracking.updateCameraPosition(delta);
      updateLod(vrmLoader.vrmRef.current, scene, camera, lodConfigRef.current, currentLodLevelRef, particlesRef.current, baseParticleCountRef.current, lightsRef.current);
      if (particlesRef.current) particlesRef.current.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => { if (mountRef.current) handleResize(camera, renderer, mountRef.current.clientWidth, mountRef.current.clientHeight); };
    window.addEventListener('resize', onResize);
    loadSidecar(vrmModel, expressionManager, onVrmExpressionsLoaded);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      unsubscribe();
      mixerRef.current?.stopAllAction();
      disposeScene(sceneSetup);
    };
  }, [vrmModel]);

  // Pose settings
  useEffect(() => {
    if (!poseSettings) return;
    baseRotationY.current = (poseSettings.rotation * Math.PI) / 180;
    bodyRotationRef.current.y = baseRotationY.current;
    boneTargets.current.leftUpperArm = { ...boneTargets.current.leftUpperArm, z: (poseSettings.leftArmZ * Math.PI) / 180 };
    boneTargets.current.rightUpperArm = { ...boneTargets.current.rightUpperArm, z: (poseSettings.rightArmZ * Math.PI) / 180 };
  }, [poseSettings]);

  // VRM commands
  useEffect(() => {
    if (vrmCommand) handleVrmCommand(vrmCommand, expressionManager, gesturePlayer, idleAnimations, walkingAnimation, reactionSystem, updatePosture, setAiMode, boneTargets);
  }, [vrmCommand]);

  // Volume smoothing
  useEffect(() => {
    const t = volume, c = smoothedVolume.current;
    smoothedVolume.current = c + (t - c) * (t > c ? 0.6 : 0.3);
  }, [volume]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {vrmLoader.isLoading && (
        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <div className="text-cyan-400 font-mono text-sm">LOADING AVATAR... {vrmLoader.loadProgress}%</div>
          <div className="w-48 h-1 bg-cyan-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${vrmLoader.loadProgress}%` }} />
          </div>
        </div>
      )}
      {vrmLoader.loadError && !vrmLoader.isLoading && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center pointer-events-none">
          <div className="text-red-400 font-mono text-sm">⚠ {vrmLoader.loadError}</div>
        </div>
      )}
    </div>
  );
});

NeuralCore.displayName = 'NeuralCore';
