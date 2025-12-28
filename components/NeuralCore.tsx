import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName, VRMUtils } from '@pixiv/three-vrm';
import type { VrmCommand } from '../services/liveManager';
import { VrmConfig, getVrmConfig, saveVrmConfigToStorage, DEFAULT_VRM_CONFIG } from '../types/vrmConfig';
import { 
  loadModelBehaviors, 
  getCurrentBehaviors, 
  onBehaviorChanged 
} from '../services/behaviorManager';
import type { 
  ModelBehaviors,
  GestureDefinition, 
  ReactionDefinition,
  IdleConfig,
  LipSyncConfig,
  TransformConfig 
} from '../types/behaviorTypes';

export interface PoseSettings {
  rotation: number; // Y rotation in degrees (0-360)
  leftArmZ: number; // Left arm Z rotation (-90 to 90)
  rightArmZ: number; // Right arm Z rotation (-90 to 90)
}

// Preview API exposed via ref
export interface NeuralCoreHandle {
  previewGesture: (gestureName: string, duration?: number) => void;
  previewExpression: (expressionName: string, value: number) => void;
  previewReaction: (reactionName: string) => void;
  resetExpressions: () => void;
}

interface NeuralCoreProps {
  volume: number; // 0.0 to 1.0 (or higher peaks)
  isActive: boolean;
  vrmCommand: VrmCommand | null;
  vrmModel?: string; // filename under /VRM-Models, e.g. 'Arlecchino-Normal_look.vrm'
  onVrmExpressionsLoaded: (expressions: string[]) => void;
  poseSettings?: PoseSettings;
  onConfigLoaded?: (config: VrmConfig) => void; // Callback when config is loaded
}

export const NeuralCore = forwardRef<NeuralCoreHandle, NeuralCoreProps>(({ volume, isActive, vrmCommand, vrmModel, onVrmExpressionsLoaded, poseSettings, onConfigLoaded }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const vrmConfigRef = useRef<VrmConfig>(DEFAULT_VRM_CONFIG);
  
  // Behavior system refs - loaded from BehaviorManager
  const behaviorsRef = useRef<ModelBehaviors | null>(null);
  const gesturesMapRef = useRef<Map<string, GestureDefinition>>(new Map());
  const reactionsMapRef = useRef<Map<string, ReactionDefinition>>(new Map());

  // Scenery Refs
  const particlesRef = useRef<THREE.Points | null>(null);
  
  // State for loading
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Expression / bone targets for smooth transitions
  const expressionTargets = useRef<Record<string, number>>({});
  const expressionValues = useRef<Record<string, number>>({});
  // Real-name targets (after resolving aliases via sidecar)
  const expressionTargetsActual = useRef<Record<string, number>>({});
  const expressionValuesActual = useRef<Record<string, number>>({});
  const expressionPersist = useRef<Record<string, number>>({}); // Sticky expressions that persist
  const sidecarRef = useRef<any | null>(null);
  const boneTargets = useRef<Record<string, { x: number; y: number; z: number }>>({});
  
  // Animation support
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const availableAnimations = useRef<Map<string, THREE.AnimationClip>>(new Map());
  
  // Gesture support with queueing
  const gestureQueue = useRef<Array<{ name: string; duration: number }>>([]);
  const gestureStateRef = useRef<{ active: boolean; elapsed: number; duration: number; currentGesture: string | null }>({ active: false, elapsed: 0, duration: 0, currentGesture: null });
  const idleStateRef = useRef<'idle' | 'talking' | 'listening' | 'thinking'>('idle');
  const idleGesturesRef = useRef<string[]>([]);
  
  // Track smoothed volume for smoother animations
  const smoothedVolume = useRef(0);
  
  // Breathing animation
  const breathingTime = useRef(0);
  const breathingPhase = useRef(0);
  
  // Blink state with interruption control
  const blinkTimer = useRef(0);
  const nextBlinkTime = useRef(2); // Initial blink after 2s
  const blinkAllowedRef = useRef(true); // Can be set to false by commands
  
  // Camera tracking for eye contact
  const cameraTrackingRef = useRef({ enabled: true, intensity: 0.7 });
  const targetHeadRotation = useRef({ x: 0, y: 0, z: 0 });
  
  // AI Mode tracking (ACTIVE vs PASSIVE)
  const aiModeRef = useRef<'ACTIVE' | 'PASSIVE'>('ACTIVE');
  
  // Postural state (position and root rotation)
  const bodyPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const bodyRotationRef = useRef({ x: 0, y: 0, z: 0 }); // Set dynamically based on VRM version
  const baseRotationY = useRef(0); // Base Y rotation for facing camera (0 for VRM0, Math.PI for VRM1)
  const postureStateRef = useRef<'neutral' | 'leaning_forward' | 'leaning_back' | 'rotating_toward_camera'>('neutral');
  
  // Walk/movement state
  const walkStateRef = useRef({ speed: 0, direction: 0, isWalking: false, position: { x: 0, y: 0, z: 0 } });
  const legAngleRef = useRef(0); // For procedural leg animation

  // Camera smooth transition targets
  const cameraTargetPosition = useRef({ x: 0, y: 1.4, z: 1.5 });
  const cameraTargetLookAt = useRef({ x: 0, y: 1.3, z: 0 });

  // Resolve an expression alias (presetName like 'joy') to actual VRM expression names
  // This allows Gemini to use consistent names across all models
  const resolveExpressionAlias = (alias: string): string[] => {
    try {
      const lowerAlias = alias.toLowerCase();
      
      // First: check config expressions mapping (highest priority - user-defined)
      const config = vrmConfigRef.current;
      if (config.expressions) {
        const configMapping = config.expressions[lowerAlias] || config.expressions[alias];
        if (configMapping) {
          return [configMapping];
        }
      }
      
      const sc = sidecarRef.current;
      if (!sc || !sc.groups) return [alias];
      
      const results: string[] = [];
      
      // Second: find by presetName (most reliable for cross-model consistency)
      for (const [groupName, groupData] of Object.entries(sc.groups)) {
        const preset = (groupData as any).presetName?.toLowerCase();
        if (preset === lowerAlias) {
          results.push(groupName);
        }
      }
      if (results.length > 0) return results;
      
      // Third: exact match on group name
      if (sc.groups[alias]) return [alias];
      
      // Fourth: check mappings from patching
      if (sc.mappings && sc.mappings[alias]) return sc.mappings[alias];
      
      // Fifth: case-insensitive match on group name
      const keys = Object.keys(sc.groups);
      const matches = keys.filter(k => k.toLowerCase() === lowerAlias);
      if (matches.length > 0) return matches;
      
      // Fallback: partial match
      const partialMatches = keys.filter(k => 
        k.toLowerCase().includes(lowerAlias) || lowerAlias.includes(k.toLowerCase())
      );
      if (partialMatches.length > 0) return partialMatches;
      
    } catch (e) {
      console.warn('Error resolving expression alias:', alias, e);
    }
    return [alias];
  };

  const addExpressionTarget = (alias: string, value: number) => {
    // store alias-level target for debugging/merging
    expressionTargets.current[alias] = value;
    const resolved = resolveExpressionAlias(alias);
    for (const rn of resolved) {
      // Directly assign the value instead of Math.max to allow expressions to be reset to 0
      expressionTargetsActual.current[rn] = value;
    }
  };

  // Hand gesture definitions - now loaded from BehaviorManager
  // Helper to get gesture rotations from loaded config
  const getGestureRotations = useCallback((gestureName: string): Record<string, { x: number; y: number; z: number }> | null => {
    const gesture = gesturesMapRef.current.get(gestureName);
    if (!gesture || !gesture.enabled) return null;
    
    // For dynamic gestures (wave, applause), apply time-based animation
    const bones = { ...gesture.bones };
    const now = Date.now();
    
    // Apply dynamic animations for specific gestures
    if (gestureName === 'wave' && bones.rightLowerArm) {
      bones.rightLowerArm = {
        ...bones.rightLowerArm,
        x: Math.sin(now * 0.003) * 0.5
      };
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
  }, []);

  // Emotion choreography - now loaded from BehaviorManager
  // Helper to get reaction definition from loaded config
  const getReaction = useCallback((emotionState: string): ReactionDefinition | null => {
    const reaction = reactionsMapRef.current.get(emotionState);
    if (!reaction || !reaction.enabled) return null;
    return reaction;
  }, []);

  const setExpressionValue = (expressionName: string, value: number) => {
    if (!vrmRef.current) return;
    
    const em = (vrmRef.current as any).expressionManager || (vrmRef.current as any).blendShapeProxy;
    if (!em) return;
    
    if (value <= 0) {
      delete expressionPersist.current[expressionName];
    } else {
      expressionPersist.current[expressionName] = value;
    }
    
    // Immediately apply the expression
    if (em.setValue) {
      em.setValue(expressionName, value);
    }
  };

  const triggerEmotion = useCallback((emotionState: string) => {
    const emotion = getReaction(emotionState);
    if (!emotion) {
      console.warn('Emotion not found or disabled:', emotionState);
      return;
    }

    // Trigger all coordinated responses
    emotion.expressions.forEach(expr => {
      setExpressionValue(expr.name, expr.value);
    });
    
    updatePosture(emotion.posture);
    
    // Perform primary gesture
    if (emotion.gestures.length > 0) {
      emotion.gestures.forEach(gest => playGesture(gest, emotion.duration || 1.5));
    }
    
    // Update look direction if specified
    if (emotion.lookAt) {
      setLookAtTarget(emotion.lookAt.x, emotion.lookAt.y, emotion.lookAt.z);
    }
    
    // Set idle gesture based on posture
    const idleGesture = emotion.posture === 'thoughtful' || emotion.posture === 'anxious' ? 'head_tilt' : 'sway';
    playIdleGesture(idleGesture);
    
    // Switch interaction mode
    setAiMode(emotion.mode);
  }, [getReaction]);

  const playGesture = useCallback((gestureName: string, duration: number = 1.5) => {
    const rotations = getGestureRotations(gestureName);
    if (!rotations || !vrmRef.current) {
      console.warn('Gesture not found or disabled:', gestureName);
      return;
    }
    
    // Get gesture config for duration/intensity
    const gesture = gesturesMapRef.current.get(gestureName);
    const actualDuration = gesture?.duration ?? duration;
    
    // Queue the gesture
    gestureQueue.current.push({ name: gestureName, duration: actualDuration });
    
    // If no gesture is currently playing, start this one immediately
    if (!gestureStateRef.current.active) {
      playNextGesture();
    }
  }, [getGestureRotations]);

  const playNextGesture = useCallback(() => {
    if (gestureQueue.current.length === 0) {
      gestureStateRef.current = { active: false, elapsed: 0, duration: 0, currentGesture: null };
      return;
    }
    
    const { name, duration } = gestureQueue.current.shift()!;
    const rotations = getGestureRotations(name);
    if (!rotations) return;
    
    for (const [boneName, rot] of Object.entries(rotations)) {
      boneTargets.current[boneName] = rot;
    }
    
    gestureStateRef.current = { active: true, elapsed: 0, duration, currentGesture: name };
  }, [getGestureRotations]);

  // Idle gesture support with state management
  const playIdleGesture = (gestureName: string) => {
    idleGesturesRef.current = [gestureName];
  };

  const setIdleState = (state: 'idle' | 'talking' | 'listening' | 'thinking') => {
    idleStateRef.current = state;
    // Set appropriate idle gestures based on state
    if (state === 'talking') {
      idleGesturesRef.current = ['hand_wave', 'shoulder_shrug'];
    } else if (state === 'listening') {
      idleGesturesRef.current = ['head_tilt'];
    } else if (state === 'thinking') {
      idleGesturesRef.current = ['sway'];
    } else {
      idleGesturesRef.current = [];
    }
  };

  // Camera tracking for eye contact
  const updateCameraTracking = () => {
    if (!cameraTrackingRef.current.enabled || !cameraRef.current) return;
    
    const cameraPos = cameraRef.current.position;
    const vrm = vrmRef.current;
    if (!vrm) return;
    
    // Calculate direction from avatar to camera
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
      z: lookAtEuler.z * intensity * 0.3 // Less z rotation
    };
  };

  const setLookAtTarget = (x: number, y: number, z: number) => {
    // Directly set head rotation target for emotional expressions
    targetHeadRotation.current = { x, y, z };
  };

  // Set AI mode (ACTIVE or PASSIVE)
  const setAiMode = (mode: 'ACTIVE' | 'PASSIVE') => {
    aiModeRef.current = mode;
    if (mode === 'ACTIVE') {
      cameraTrackingRef.current.intensity = 0.8; // Strong eye contact
      postureStateRef.current = 'neutral';
    } else {
      cameraTrackingRef.current.intensity = 0.4; // Soft eye contact
      postureStateRef.current = 'neutral';
    }
  };

  // Update posture based on emotion
  const updatePosture = (emotion: string) => {
    // Preserve the base Y offset from height adjustment
    const baseY = walkStateRef.current.position.y;
    
    switch (emotion) {
      case 'joy':
      case 'excited':
      case 'emphatic':
        postureStateRef.current = 'leaning_forward';
        bodyPositionRef.current.z = 0.3; // Lean forward
        bodyRotationRef.current.x = 0.2;
        break;
      case 'thoughtful':
      case 'listening':
      case 'uncertain':
        postureStateRef.current = 'leaning_back';
        bodyPositionRef.current.z = -0.2; // Lean back
        bodyRotationRef.current.x = -0.1;
        break;
      case 'engaged':
      case 'interested':
        postureStateRef.current = 'rotating_toward_camera';
        bodyRotationRef.current.y = baseRotationY.current + 0.3; // Rotate slightly toward camera
        break;
      default:
        postureStateRef.current = 'neutral';
        bodyPositionRef.current.x = 0;
        bodyPositionRef.current.z = 0;
        // Keep Y unchanged - it holds the height offset
        bodyRotationRef.current = { x: 0, y: baseRotationY.current, z: 0 }; // Reset to base rotation
    }
  };

  // Walk/pace in space
  const walk = (direction: number, speed: number = 1.0) => {
    walkStateRef.current.direction = direction; // 0=forward, 1=backward, 0.5=strafe
    walkStateRef.current.speed = speed;
    walkStateRef.current.isWalking = speed > 0;
  };

  const stopWalking = () => {
    walkStateRef.current.isWalking = false;
    walkStateRef.current.speed = 0;
  };

  // Play animation clip if available
  const playAnimation = (animName: string, speed: number = 1.0) => {
    if (!mixerRef.current || !availableAnimations.current.has(animName)) {
      console.warn('Animation not found:', animName);
      return;
    }
    
    const clip = availableAnimations.current.get(animName);
    if (!clip) return;
    
    // Stop current animation
    if (actionRef.current) {
      actionRef.current.stop();
    }
    
    // Play new animation
    const action = mixerRef.current.clipAction(clip);
    action.speed = speed;
    action.clampWhenFinished = true;
    action.play();
    actionRef.current = action;
  };

  // Expose preview API via ref for BehaviorEditor
  useImperativeHandle(ref, () => ({
    previewGesture: (gestureName: string, duration: number = 1.5) => {
      playGesture(gestureName, duration);
    },
    previewExpression: (expressionName: string, value: number) => {
      setExpressionValue(expressionName, value);
    },
    previewReaction: (reactionName: string) => {
      triggerEmotion(reactionName);
    },
    resetExpressions: () => {
      // Clear all persistent expressions
      expressionPersist.current = {};
      // Reset all expression targets
      for (const name of Object.keys(expressionTargetsActual.current)) {
        expressionTargetsActual.current[name] = 0;
      }
    }
  }), [playGesture, triggerEmotion]);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Camera positioned for a portrait shot
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);
    camera.position.set(0, 1.4, 1.5); // Eye level-ish
    camera.lookAt(0, 1.3, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    // VRM color space handling
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    const ambientLight = new THREE.AmbientLight(0x222222, 2.0); // Ambient boost for anime style
    scene.add(ambientLight);

    const rimLight = new THREE.SpotLight(0x38bdf8, 5);
    rimLight.position.set(0, 2, -2);
    rimLight.lookAt(0, 1, 0);
    scene.add(rimLight);

    // 3. Environment / Aura (The "Brain" remnants)
    


    // Particles (Data stream)
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 150;
    const posArray = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 3;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xa855f7,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // 4. VRM Loader
    const loader = new GLTFLoader();

    // Intercept parser JSON to dedupe duplicate expression/blendShape group names
    loader.register((parser) => {
      try {
        const json = (parser as any).json;
        if (json && json.extensions) {
          const tryPaths = [
            ['extensions','VRM','blendShapeMaster','blendShapeGroups'],
            ['extensions','VRMC_vrm','blendShapeMaster','blendShapeGroups'],
            ['extensions','VRMC_vrm','blendShapeGroups']
          ];

          const getPath = (obj: any, path: string[]) => path.reduce((a, k) => (a && a[k] !== undefined) ? a[k] : undefined, obj);

          tryPaths.forEach(path => {
            const groups = getPath(json, path);
            if (Array.isArray(groups) && groups.length > 0) {
              const seen = new Set<string>();
              for (let i = 0; i < groups.length; i++) {
                const g = groups[i];
                const name = (g && (g.name || g.presetName || g.preset || g.name)) || (`expr_${i}`);
                if (seen.has(name)) {
                  // Rename duplicate to keep unique keys while preserving array indices
                  let suffix = 1;
                  let newName = `${name}_dup${suffix}`;
                  while (seen.has(newName)) { suffix++; newName = `${name}_dup${suffix}`; }
                  if (g) g.name = newName;
                  seen.add(newName);
                  console.warn('VRM loader: renamed duplicate expression preset', name, '->', newName);
                } else {
                  seen.add(name);
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn('Failed to dedupe VRM expressions:', e);
      }

      return new VRMLoaderPlugin(parser);
    });

    const vrmUrl = `/VRM-Models/${vrmModel || 'Arlecchino-Normal_look.vrm'}`;

    // If there is already a VRM loaded from a previous mount, remove it before loading new one
    if (vrmRef.current && sceneRef.current) {
      try {
        // Properly dispose of the old VRM to free memory
        VRMUtils.deepDispose(vrmRef.current.scene);
        sceneRef.current.remove(vrmRef.current.scene);
      } catch (e) {
        // ignore
      }
      vrmRef.current = null;
      setIsLoading(true);
      setLoadProgress(0);
      setLoadError(null);
    }
    
    // Load VRM config before loading the model
    const modelBaseName = vrmModel?.replace('.vrm', '') || 'AvatarSample_D';
    getVrmConfig(modelBaseName).then(config => {
      vrmConfigRef.current = config;
      console.log('[NeuralCore] Loaded config for', modelBaseName, config);
      onConfigLoaded?.(config);
    });
    
    // Load behaviors from BehaviorManager
    loadModelBehaviors(modelBaseName).then(behaviors => {
      behaviorsRef.current = behaviors;
      
      // Build gesture lookup map
      gesturesMapRef.current.clear();
      for (const gesture of behaviors.gestures.gestures) {
        gesturesMapRef.current.set(gesture.name, gesture);
      }
      
      // Build reactions lookup map
      reactionsMapRef.current.clear();
      for (const reaction of behaviors.reactions.reactions) {
        reactionsMapRef.current.set(reaction.name, reaction);
      }
      
      console.log('[NeuralCore] Loaded behaviors for', modelBaseName, {
        gestures: gesturesMapRef.current.size,
        reactions: reactionsMapRef.current.size
      });
    }).catch(err => {
      console.warn('[NeuralCore] Failed to load behaviors:', err);
    });
    
    // Listen for behavior changes from BehaviorEditor
    const unsubscribe = onBehaviorChanged((type, config) => {
      const behaviors = getCurrentBehaviors();
      if (!behaviors) return;
      
      behaviorsRef.current = behaviors;
      
      // Rebuild maps if gestures or reactions changed
      if (type === 'gestures') {
        gesturesMapRef.current.clear();
        for (const gesture of behaviors.gestures.gestures) {
          gesturesMapRef.current.set(gesture.name, gesture);
        }
      } else if (type === 'reactions') {
        reactionsMapRef.current.clear();
        for (const reaction of behaviors.reactions.reactions) {
          reactionsMapRef.current.set(reaction.name, reaction);
        }
      } else if (type === 'body' && behaviors.body) {
        // Apply body config changes in real-time
        const bodyConfig = behaviors.body;
        const degToRad = (deg: number) => (deg * Math.PI) / 180;
        
        boneTargets.current.leftUpperArm = {
          x: degToRad(bodyConfig.leftUpperArm.x),
          y: degToRad(bodyConfig.leftUpperArm.y),
          z: degToRad(bodyConfig.leftUpperArm.z),
        };
        boneTargets.current.rightUpperArm = {
          x: degToRad(bodyConfig.rightUpperArm.x),
          y: degToRad(bodyConfig.rightUpperArm.y),
          z: degToRad(bodyConfig.rightUpperArm.z),
        };
        boneTargets.current.leftLowerArm = {
          x: degToRad(bodyConfig.leftLowerArm.x),
          y: degToRad(bodyConfig.leftLowerArm.y),
          z: degToRad(bodyConfig.leftLowerArm.z),
        };
        boneTargets.current.rightLowerArm = {
          x: degToRad(bodyConfig.rightLowerArm.x),
          y: degToRad(bodyConfig.rightLowerArm.y),
          z: degToRad(bodyConfig.rightLowerArm.z),
        };
        boneTargets.current.spine = {
          x: degToRad(bodyConfig.spine.x),
          y: degToRad(bodyConfig.spine.y),
          z: degToRad(bodyConfig.spine.z),
        };
        boneTargets.current.chest = {
          x: degToRad(bodyConfig.chest.x),
          y: degToRad(bodyConfig.chest.y),
          z: degToRad(bodyConfig.chest.z),
        };
        
        // Update eye tracking
        cameraTrackingRef.current.enabled = bodyConfig.eyeTracking.enabled;
        cameraTrackingRef.current.intensity = bodyConfig.eyeTracking.intensity;
      }
      
      console.log('[NeuralCore] Behavior updated:', type);
    });
    
    loader.load(
      vrmUrl,
      async (gltf) => {
        setLoadError(null);
        const vrm = gltf.userData.vrm as VRM;
        
        // Get the loaded config (should be ready by now)
        const config = vrmConfigRef.current;
        
        // Log VRM version for debugging
        const isVRM0 = vrm.meta?.metaVersion === '0';
        console.log('[NeuralCore] VRM version:', isVRM0 ? '0.x' : '1.0', 'meta:', vrm.meta?.metaVersion);
        
        // Use config for rotation, with pose settings as override
        const rotationDeg = poseSettings?.rotation ?? config.transform.rotation;
        const rotationRad = (rotationDeg * Math.PI) / 180;
        baseRotationY.current = rotationRad;
        bodyRotationRef.current = { x: 0, y: rotationRad, z: 0 };
        
        scene.add(vrm.scene);
        vrmRef.current = vrm;
        
        // Clear state from previous model
        gestureQueue.current = [];
        gestureStateRef.current = { active: false, elapsed: 0, duration: 0, currentGesture: null };
        expressionPersist.current = {};
        expressionTargets.current = {};
        expressionTargetsActual.current = {};
        
        // Set default arm positions from behaviors (if loaded) or config, with pose settings as override
        const bodyConfig = behaviorsRef.current?.body;
        const leftArmDeg = poseSettings?.leftArmZ ?? (bodyConfig?.leftUpperArm?.z ?? (config.defaultPose.leftUpperArm.z * 180 / Math.PI));
        const rightArmDeg = poseSettings?.rightArmZ ?? (bodyConfig?.rightUpperArm?.z ?? (config.defaultPose.rightUpperArm.z * 180 / Math.PI));
        
        // Convert degrees to radians for bone rotations
        const degToRad = (deg: number) => (deg * Math.PI) / 180;
        
        boneTargets.current = {
          leftUpperArm: { 
            x: degToRad(bodyConfig?.leftUpperArm?.x ?? 0), 
            y: degToRad(bodyConfig?.leftUpperArm?.y ?? 0), 
            z: degToRad(leftArmDeg)
          },
          rightUpperArm: { 
            x: degToRad(bodyConfig?.rightUpperArm?.x ?? 0), 
            y: degToRad(bodyConfig?.rightUpperArm?.y ?? 0), 
            z: degToRad(rightArmDeg)
          },
        };
        
        // Add other default pose bones from body config
        if (bodyConfig?.leftLowerArm) {
          boneTargets.current.leftLowerArm = {
            x: degToRad(bodyConfig.leftLowerArm.x),
            y: degToRad(bodyConfig.leftLowerArm.y),
            z: degToRad(bodyConfig.leftLowerArm.z),
          };
        } else if (config.defaultPose.leftLowerArm) {
          boneTargets.current.leftLowerArm = config.defaultPose.leftLowerArm;
        }
        if (bodyConfig?.rightLowerArm) {
          boneTargets.current.rightLowerArm = {
            x: degToRad(bodyConfig.rightLowerArm.x),
            y: degToRad(bodyConfig.rightLowerArm.y),
            z: degToRad(bodyConfig.rightLowerArm.z),
          };
        } else if (config.defaultPose.rightLowerArm) {
          boneTargets.current.rightLowerArm = config.defaultPose.rightLowerArm;
        }
        if (bodyConfig?.spine) {
          boneTargets.current.spine = {
            x: degToRad(bodyConfig.spine.x),
            y: degToRad(bodyConfig.spine.y),
            z: degToRad(bodyConfig.spine.z),
          };
        } else if (config.defaultPose.spine) {
          boneTargets.current.spine = config.defaultPose.spine;
        }
        if (bodyConfig?.chest) {
          boneTargets.current.chest = {
            x: degToRad(bodyConfig.chest.x),
            y: degToRad(bodyConfig.chest.y),
            z: degToRad(bodyConfig.chest.z),
          };
        }
        
        // Update eye tracking settings from body config
        if (bodyConfig?.eyeTracking) {
          cameraTrackingRef.current.enabled = bodyConfig.eyeTracking.enabled;
          cameraTrackingRef.current.intensity = bodyConfig.eyeTracking.intensity;
        }
        
        // === Dynamic Height Adjustment ===
        // Compute model bounds and adjust position/camera for proper framing
        // We DON'T scale - just adjust Y position so walking still works
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const modelHeight = box.max.y - box.min.y;
        
        // Frame the model so we see head + upper body nicely
        // Target: position model so chest is at world Y ~1.0, giving headroom above
        const chestRatio = 0.65; // Chest is roughly at 65% of model height
        const currentChestY = box.min.y + (modelHeight * chestRatio);
        const targetChestY = 1.0; // Where we want the chest to be in world space
        const yOffset = targetChestY - currentChestY;
        
        // Apply offset to model position (this becomes the base Y for walking)
        vrm.scene.position.y = yOffset;
        walkStateRef.current.position.y = yOffset;
        bodyPositionRef.current.y = yOffset;
        
        // Camera setup: pull back more for taller models, frame upper body
        const headY = box.min.y + yOffset + (modelHeight * 0.92); // Top of head
        const chestY = box.min.y + yOffset + (modelHeight * chestRatio);
        const camLookAtY = (headY + chestY) / 2; // Look at midpoint between head and chest
        
        // Camera distance: further back for taller models to show more
        const baseDistance = 2.0;
        const distanceScale = Math.max(1.0, modelHeight / 1.6); // 1.6m is "standard" height
        const cameraZ = baseDistance * distanceScale;
        const cameraY = camLookAtY + 0.1; // Slightly above target
        
        // Set camera targets for smooth transition (animation loop will lerp to these)
        cameraTargetPosition.current = { x: 0, y: cameraY, z: cameraZ };
        cameraTargetLookAt.current = { x: 0, y: camLookAtY, z: 0 };
        
        console.log(`VRM Height: ${modelHeight.toFixed(2)}m, Y-offset: ${yOffset.toFixed(2)}, Camera: Y=${cameraY.toFixed(2)} Z=${cameraZ.toFixed(2)}`);
        
        // Setup animation mixer
        mixerRef.current = new THREE.AnimationMixer(vrm.scene);
        availableAnimations.current.clear();
        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach(clip => {
            availableAnimations.current.set(clip.name, clip);
            console.log('Available animation:', clip.name);
          });
        }

        // Initialize expressionValues keys to zero for smooth control
        try {
          const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
          if (em && typeof em.setValue === 'function') {
            const presets = (em as any)._presets || (em as any).presets || undefined;
            if (Array.isArray(presets)) {
              presets.forEach((p: any) => {
                const name = p.name || p.presetName || p.preset || String(p);
                expressionValues.current[name] = 0;
                expressionTargets.current[name] = 0;
                expressionValuesActual.current[name] = 0;
                expressionTargetsActual.current[name] = 0;
              });
            }
          }
        } catch (e) {
          // ignore
        }

        console.log("VRM Loaded");
        setLoadProgress(100);
        setIsLoading(false);
      },
      (progress) => {
        const pct = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
        setLoadProgress(Math.round(pct));
      },
      (error) => {
        console.error('VRM Load Error:', error);
        setLoadError(`Failed to load model: ${vrmModel}`);
        setIsLoading(false);
        // Notify parent that this model has no valid expressions
        onVrmExpressionsLoaded(['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o']);
      }
    );

    // 5. Animation Loop
    let animationId: number;
    const animate = () => {
        animationId = requestAnimationFrame(animate);

        const delta = clockRef.current.getDelta();
        const elapsedTime = clockRef.current.getElapsedTime();

        // --- Visualizer Updates ---
        // Smooth Volume
        // Use the ref 'smoothedVolume' which is updated by the Effect below this one?
        // Actually, better to read the prop 'volume' directly via a ref if possible to avoid closure staleness,
        // but 'volume' is a primitive. 
        // We will update 'smoothedVolume' here assuming we have access to fresh props via a Ref or just let the effect handle the smoothing target.
        // To fix closure staleness in animate(), we usually use a ref for the incoming volume.
        
        // --- VRM Updates ---
        if (vrmRef.current) {
            const vrm = vrmRef.current;
            
            // 0. Update camera tracking for eye contact
            updateCameraTracking();
            
            // 0.5. Handle walking/movement in space
            if (walkStateRef.current.isWalking) {
              walkStateRef.current.position.z += Math.cos(walkStateRef.current.direction * Math.PI) * walkStateRef.current.speed * 0.5 * delta;
              walkStateRef.current.position.x += Math.sin(walkStateRef.current.direction * Math.PI) * walkStateRef.current.speed * 0.5 * delta;
              
              // Clamp to screen bounds (-2 to 2)
              walkStateRef.current.position.x = Math.max(-2, Math.min(2, walkStateRef.current.position.x));
              walkStateRef.current.position.z = Math.max(-1.5, Math.min(1.5, walkStateRef.current.position.z));
              
              // Apply to VRM scene (preserve base Y offset from height adjustment)
              vrm.scene.position.x = walkStateRef.current.position.x;
              vrm.scene.position.y = walkStateRef.current.position.y;
              vrm.scene.position.z = walkStateRef.current.position.z;
              
              // Animate legs procedurally
              legAngleRef.current += delta * walkStateRef.current.speed * 8; // Leg animation speed
              const leftLeg = vrm.humanoid.getNormalizedBoneNode('leftLowerLeg');
              const rightLeg = vrm.humanoid.getNormalizedBoneNode('rightLowerLeg');
              if (leftLeg) leftLeg.rotation.x = Math.sin(legAngleRef.current) * 0.6;
              if (rightLeg) rightLeg.rotation.x = Math.sin(legAngleRef.current + Math.PI) * 0.6;
            }
            
            // 0.75. Apply postural shifts (body position/rotation)
            const bodyLerpSpeed = 5 * delta;
            vrm.scene.position.x += (bodyPositionRef.current.x - vrm.scene.position.x) * bodyLerpSpeed;
            vrm.scene.position.z += (bodyPositionRef.current.z - vrm.scene.position.z) * bodyLerpSpeed;
            vrm.scene.rotation.y += (bodyRotationRef.current.y - vrm.scene.rotation.y) * bodyLerpSpeed;
            
            // Reset frame but keep persistent expressions
            for (const name of Object.keys(expressionTargets.current)) {
              expressionTargets.current[name] = 0;
            }
            
            const sVol = smoothedVolume.current;
            
            // 1. Enhanced Audio-Driven Lip Sync + Phonemes
            // Use behavior config settings for sensitivity and viseme weights
            const behaviors = behaviorsRef.current;
            const lipsyncConfig = behaviors?.lipsync;
            const lipSyncSensitivity = lipsyncConfig?.sensitivity ?? 4.0;
            const visemeWeights = lipsyncConfig?.visemeWeights ?? { a: 0.8, i: 0.3, u: 0.25, e: 0.3, o: 0.6 };
            
            const mouthOpen = Math.min(1.0, sVol * lipSyncSensitivity);
            addExpressionTarget('a', mouthOpen * visemeWeights.a);
            addExpressionTarget('i', mouthOpen * visemeWeights.i);
            addExpressionTarget('u', mouthOpen * visemeWeights.u);
            addExpressionTarget('e', mouthOpen * visemeWeights.e);
            addExpressionTarget('o', mouthOpen * visemeWeights.o);

            // 2. Breathing Animation (subtle chest movement via spine bones, not expressions)
            // Use behavior idle config
            const idleConfig = behaviors?.idle;
            const breathingSpeed = idleConfig?.breathing?.enabled !== false ? (idleConfig?.breathing?.speed ?? 0.8) : 0;
            const breathingIntensity = idleConfig?.breathing?.intensity ?? 0.02;
            breathingTime.current += delta;
            breathingPhase.current = Math.sin(breathingTime.current * breathingSpeed) * 0.5 + 0.5; // 0 to 1
            // Breathing is handled via spine bone rotation in the bone update section below

            // 3. Blinking (with interruption support)
            const blinkEnabled = idleConfig?.blinking?.enabled !== false;
            const blinkInterval = idleConfig?.blinking?.interval ?? 4.0;
            const blinkDuration = idleConfig?.blinking?.duration ?? 0.15;
            if (blinkAllowedRef.current && blinkEnabled) {
              blinkTimer.current += delta;
              if (blinkTimer.current >= nextBlinkTime.current) {
                blinkTimer.current = 0;
                nextBlinkTime.current = Math.random() * blinkInterval + 2;
              }
              const blinkPhase = blinkTimer.current;
              let blinkValue = 0;
              const blinkDur = blinkDuration;
              if (blinkPhase < blinkDur) blinkValue = blinkPhase / blinkDur;
              else if (blinkPhase < blinkDur * 2) blinkValue = 1 - (blinkPhase - blinkDur) / blinkDur;
              addExpressionTarget('blink', Math.max(0, blinkValue));
            }

            // 4. Update Animation Mixer (for full body animations)
            if (mixerRef.current) {
              mixerRef.current.update(delta);
            }

            // 5. Handle Gesture Queue
            if (gestureStateRef.current.active) {
              gestureStateRef.current.elapsed += delta;
              if (gestureStateRef.current.elapsed >= gestureStateRef.current.duration) {
                // Gesture finished, play next one from queue
                playNextGesture();
              }
            }

            // 6. Handle Idle Gestures (continuous subtle movements)
            // Use behavior idle config for sway
            const swayEnabled = idleConfig?.sway?.enabled !== false;
            const swayAmount = idleConfig?.sway?.amount ?? 0.1;
            const swaySpeed = idleConfig?.sway?.speed ?? 0.6;
            const headMovementEnabled = idleConfig?.headMovement?.enabled !== false;
            const headMovementAmount = idleConfig?.headMovement?.amount ?? 0.1;
            
            const currentIdleGesture = idleGesturesRef.current[Math.floor(elapsedTime * 0.5) % idleGesturesRef.current.length];
            if (currentIdleGesture && isActive && sVol < 0.3) {
              if (currentIdleGesture === 'head_tilt' && headMovementEnabled) {
                const tilt = Math.sin(elapsedTime * 0.8) * headMovementAmount * 1.5;
                boneTargets.current['head'] = { x: 0, y: tilt, z: 0 };
              } else if (currentIdleGesture === 'shoulder_shrug') {
                const shrug = Math.sin(elapsedTime * 1.2) * 0.08;
                boneTargets.current['rightUpperArm'] = { x: 0, y: 0, z: -0.5 + shrug };
                boneTargets.current['leftUpperArm'] = { x: 0, y: 0, z: 0.5 - shrug };
              } else if (currentIdleGesture === 'hand_wave') {
                const wave = Math.sin(elapsedTime * 3) * 0.3;
                boneTargets.current['rightHand'] = { x: 0, y: wave, z: 0 };
              } else if (currentIdleGesture === 'sway' && swayEnabled) {
                const sway = Math.sin(elapsedTime * swaySpeed) * swayAmount;
                boneTargets.current['spine'] = { x: 0, y: sway, z: 0 };
              }
            }

            // 7. Head Movement + Eye Gaze + Camera Tracking
            const head = vrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
                // natural sway (base idle movement) - use config values
                const headSwayY = headMovementEnabled ? Math.sin(elapsedTime * 0.5) * headMovementAmount : 0;
                const headSwayZ = headMovementEnabled ? Math.cos(elapsedTime * 0.3) * (headMovementAmount * 0.5) : 0;
                // reactive nod
                const nod = (isActive && sVol > 0.1) ? Math.sin(elapsedTime * 10) * 0.02 * sVol : 0;

                // apply base pose
                head.rotation.y = headSwayY;
                head.rotation.z = headSwayZ;
                head.rotation.x = nod;

                // Blend in camera tracking for eye contact
                const trackingLerp = 3 * delta; // Smooth blending speed
                head.rotation.x += (targetHeadRotation.current.x - head.rotation.x) * trackingLerp;
                head.rotation.y += (targetHeadRotation.current.y - head.rotation.y) * trackingLerp;
                head.rotation.z += (targetHeadRotation.current.z - head.rotation.z) * trackingLerp;

                // apply any bone-specific smoothing targets (commands take priority)
                const btarget = boneTargets.current['head'];
                if (btarget) {
                  // lerp toward target rotations
                  head.rotation.x += (btarget.x - head.rotation.x) * Math.min(1, 5 * delta);
                  head.rotation.y += (btarget.y - head.rotation.y) * Math.min(1, 5 * delta);
                  head.rotation.z += (btarget.z - head.rotation.z) * Math.min(1, 5 * delta);
                }
            }

            // 4. Apply all bone rotation targets smoothly
            const boneSmoothingSpeed = 5.0; // rad/s
            const boneNames: VRMHumanBoneName[] = ['spine', 'chest', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'rightUpperLeg'];
            for (const boneName of boneNames) {
              const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
              const btarget = boneTargets.current[boneName];
              if (bone && btarget) {
                // Smoothly lerp toward target rotations
                bone.rotation.x += (btarget.x - bone.rotation.x) * Math.min(1, boneSmoothingSpeed * delta);
                bone.rotation.y += (btarget.y - bone.rotation.y) * Math.min(1, boneSmoothingSpeed * delta);
                bone.rotation.z += (btarget.z - bone.rotation.z) * Math.min(1, boneSmoothingSpeed * delta);
              }
            }

            // Apply smoothed expression values to the VRM
            const em = (vrm as any).expressionManager || (vrm as any).blendShapeProxy;
            if (em && typeof em.setValue === 'function') {
              const smoothing = Math.max(4.0, 8.0); // responsiveness
              
              // Merge: frame targets + persistent expressions
              for (const alias of Object.keys(expressionTargets.current)) {
                const t = expressionTargets.current[alias] ?? 0;
                const resolved = resolveExpressionAlias(alias);
                for (const rn of resolved) {
                  expressionTargetsActual.current[rn] = Math.max(expressionTargetsActual.current[rn] ?? 0, t);
                }
              }
              
              // Add persistent expressions (sticky ones from commands)
              for (const name of Object.keys(expressionPersist.current)) {
                const persistVal = expressionPersist.current[name] ?? 0;
                expressionTargetsActual.current[name] = Math.max(expressionTargetsActual.current[name] ?? 0, persistVal);
              }

              // Apply with smart blending
              for (const name of Object.keys(expressionTargetsActual.current)) {
                const target = expressionTargetsActual.current[name] ?? 0;
                const cur = expressionValuesActual.current[name] ?? 0;
                const next = cur + (target - cur) * Math.min(1, smoothing * delta);
                if (Math.abs(next - cur) > 1e-4) {
                  try { em.setValue(name, next); } catch (e) { /* ignore unknown names */ }
                  expressionValuesActual.current[name] = next;
                }
              }
            }

            vrm.update(delta);
        }

        // Smooth camera transitions when switching models
        if (cameraRef.current) {
          const camLerpSpeed = 3 * delta; // Smooth but responsive
          const cam = cameraRef.current;
          const target = cameraTargetPosition.current;
          const lookAt = cameraTargetLookAt.current;
          
          // Lerp position
          cam.position.x += (target.x - cam.position.x) * camLerpSpeed;
          cam.position.y += (target.y - cam.position.y) * camLerpSpeed;
          cam.position.z += (target.z - cam.position.z) * camLerpSpeed;
          
          // Update lookAt target
          cam.lookAt(lookAt.x, lookAt.y, lookAt.z);
        }
        
        if (particlesRef.current) {
            particlesRef.current.rotation.y += 0.005;
        }

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    };
    animate();

    // Resize handler
    const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Fetch sidecar if available for this vrmModel
    (async () => {
      sidecarRef.current = null;
      if (!vrmModel) return;
      const sidecarPath = `/VRM-Models/sidecars/${vrmModel}.expressions.json`;
      try {
        const resp = await fetch(sidecarPath);
        if (!resp.ok) return;
        const data = await resp.json();
        sidecarRef.current = data;
        console.log('Loaded expression sidecar for', vrmModel, data);
        
        // Extract standardized expression names using presetName for consistency across models
        // This ensures Gemini always uses the same names (joy, angry, sorrow, etc.) regardless of model
        if (data && data.groups && typeof data.groups === 'object') {
          const presetNames = new Set<string>();
          const groups = data.groups;
          
          // Build a mapping from presetName -> actual expression name
          // and collect unique presetNames for Gemini
          for (const [groupName, groupData] of Object.entries(groups)) {
            const preset = (groupData as any).presetName;
            if (preset && preset !== 'unknown' && preset !== 'neutral') {
              presetNames.add(preset);
            }
          }
          
          // Standard VRM expression presets that Gemini should know about
          const standardPresets = ['joy', 'angry', 'sorrow', 'fun', 'surprised', 'a', 'i', 'u', 'e', 'o', 'blink'];
          const availablePresets = standardPresets.filter(p => presetNames.has(p));
          
          console.log('Available expression presets:', availablePresets);
          onVrmExpressionsLoaded(availablePresets);
        }
      } catch (e) {
        // No sidecar - use defaults
        onVrmExpressionsLoaded(['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o']);
      }
    })();

    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        
        // Clean up behavior change listener
        unsubscribe();
        
        // Clean up mixer
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
        }
        
        if (mountRef.current && rendererRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
        }
        renderer.dispose();
    };
  }, [vrmModel]); // Re-run when selected model changes

  // Update pose settings when they change (live update without reload)
  useEffect(() => {
    if (!poseSettings) return;
    
    // Update rotation
    const rotationRad = (poseSettings.rotation * Math.PI) / 180;
    baseRotationY.current = rotationRad;
    bodyRotationRef.current.y = rotationRad;
    
    // Update arm positions (ensure boneTargets exists)
    if (!boneTargets.current.leftUpperArm) {
      boneTargets.current.leftUpperArm = { x: 0, y: 0, z: 0 };
    }
    if (!boneTargets.current.rightUpperArm) {
      boneTargets.current.rightUpperArm = { x: 0, y: 0, z: 0 };
    }
    boneTargets.current.leftUpperArm.z = (poseSettings.leftArmZ * Math.PI) / 180;
    boneTargets.current.rightUpperArm.z = (poseSettings.rightArmZ * Math.PI) / 180;
  }, [poseSettings]);

  // Handle incoming VRM commands by routing to expressionTargets / boneTargets
  useEffect(() => {
    if (!vrmCommand) return;

    switch (vrmCommand.type) {
      case 'EXPRESSION':
        // Store as persistent expression (will blend and continue)
        if (vrmCommand.value > 0) {
          expressionPersist.current[vrmCommand.name] = vrmCommand.value;
        } else {
          delete expressionPersist.current[vrmCommand.name];
        }
        addExpressionTarget(vrmCommand.name, vrmCommand.value);
        // Handle eye gaze expressions
        if (vrmCommand.name === 'LookUp' || vrmCommand.name === 'lookup') {
          blinkAllowedRef.current = false; // Prevent blink while looking up
        } else if (vrmCommand.name === 'LookDown' || vrmCommand.name === 'lookdown') {
          blinkAllowedRef.current = true; // Can blink while looking down
        } else if (vrmCommand.name === 'LookLeft' || vrmCommand.name === 'lookleft' || 
                   vrmCommand.name === 'LookRight' || vrmCommand.name === 'lookright') {
          // Side gaze, allow blink
          blinkAllowedRef.current = true;
        }
        break;
      case 'BONE_ROT':
        if (vrmCommand.bone) {
          boneTargets.current[vrmCommand.bone] = { x: vrmCommand.x, y: vrmCommand.y, z: vrmCommand.z };
        }
        break;
      case 'LOOKAT':
        // map lookat vector to a gentle head rotation target
        boneTargets.current['head'] = { x: (vrmCommand.x || 0) * 0.08, y: (vrmCommand.y || 0) * 0.08, z: (vrmCommand.z || 0) * 0.02 };
        break;
      case 'POSE':
        // expose as a persistent expression target
        expressionPersist.current[vrmCommand.name] = vrmCommand.value;
        addExpressionTarget(vrmCommand.name, vrmCommand.value);
        break;
      case 'GESTURE':
        playGesture(vrmCommand.name, vrmCommand.duration || 1.5);
        break;
      case 'ANIMATION':
        playAnimation(vrmCommand.name, vrmCommand.speed || 1.0);
        break;
      case 'IDLE_GESTURE':
        playIdleGesture(vrmCommand.name);
        setIdleState('talking'); // Switch to talking state for gestures
        break;
      case 'POSTURE':
        updatePosture(vrmCommand.emotion);
        break;
      case 'WALK':
        if (vrmCommand.speed > 0) {
          walk(vrmCommand.direction, Math.min(vrmCommand.speed, 2.0));
        } else {
          stopWalking();
        }
        break;
      case 'MODE':
        setAiMode(vrmCommand.mode);
        break;
      case 'EMOTION':
        triggerEmotion(vrmCommand.state);
        break;
    }
  }, [vrmCommand]);

  // Sync prop 'volume' to ref for the animation loop with smoothing
  useEffect(() => {
     // The volume already has smoothing from liveManager, but we add a bit more
     // for even smoother mouth movements
     const target = volume;
     const current = smoothedVolume.current;
     // Lerp toward target - fast attack, medium decay
     if (target > current) {
       smoothedVolume.current = current + (target - current) * 0.6; // Fast attack for responsiveness
     } else {
       smoothedVolume.current = current + (target - current) * 0.3; // Medium decay for smoothness
     }
  }, [volume]);

  // NOTE: Camera feed code removed - was unused and causing errors
  // Can be re-enabled later for face tracking features

  return (
    <div className="relative w-full h-full">
        <div ref={mountRef} className="w-full h-full" />
        {isLoading && (
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                <div className="text-cyan-400 font-mono text-sm">
                    LOADING AVATAR... {loadProgress}%
                </div>
                <div className="w-48 h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-cyan-400 transition-all duration-150"
                        style={{ width: `${loadProgress}%` }}
                    />
                </div>
            </div>
        )}
        {loadError && !isLoading && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center pointer-events-none">
                <div className="text-red-400 font-mono text-sm">
                    ⚠ {loadError}
                </div>
            </div>
        )}
    </div>
  );
});

// Display name for debugging
NeuralCore.displayName = 'NeuralCore';
