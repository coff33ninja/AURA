# Codebase Architecture Analysis

Generated: 2025-12-29T17:43:14.420Z

## Summary

| Metric | Count |
|--------|-------|
| Total Files Analyzed | 34 |
| Total Imports | 217 |
| Unused Imports | 12 |
| Circular Dependencies | 0 |
| Potentially Orphaned Files | 2 |

---

## Module Dependency Graph

```

📁 components/
   📄 BehaviorEditor.tsx
      Imports: 5 modules
      Exports: 2 symbols
      Used by: 1 files
   📄 FpsCounter.tsx
      Imports: 1 modules
      Exports: 3 symbols
      Used by: 1 files
   📄 NeuralCore.tsx
      Imports: 19 modules
      Exports: 3 symbols
      Used by: 1 files
   📄 WalkingEditor.tsx
      Imports: 3 modules
      Exports: 1 symbols
      Used by: 1 files

📁 services/
   📄 aiInstructionGenerator.ts
      Imports: 1 modules
      Exports: 6 symbols
      Used by: 1 files
   📄 behaviorManager.ts
      Imports: 2 modules
      Exports: 11 symbols
      Used by: 2 files
   📄 configLoader.ts
      Imports: 1 modules
      Exports: 6 symbols
      Used by: 1 files
   📄 conversationStore.ts
      Imports: 0 modules
      Exports: 3 symbols
      Used by: 2 files
   📄 liveManager.ts
      Imports: 5 modules
      Exports: 2 symbols
      Used by: 2 files
   📄 vrmModelManager.ts
      Imports: 3 modules
      Exports: 7 symbols
      Used by: 1 files

📁 utils/
   📄 animationBlender.ts
      Imports: 1 modules
      Exports: 13 symbols
      Used by: 1 files
   📄 audioUtils.ts
      Imports: 0 modules
      Exports: 7 symbols
      Used by: 1 files
   📄 backgroundRenderer.ts
      Imports: 1 modules
      Exports: 10 symbols
      Used by: 1 files
   📄 breathingAnimator.ts
      Imports: 1 modules
      Exports: 6 symbols
      Used by: 1 files
   📄 deviceDetector.ts
      Imports: 0 modules
      Exports: 6 symbols
      Used by: 1 files
   📄 fpsCounter.ts
      Imports: 0 modules
      Exports: 8 symbols
      Used by: 2 files
   📄 lipSyncController.ts
      Imports: 4 modules
      Exports: 2 symbols
      Used by: 1 files
   📄 lodManager.ts
      Imports: 1 modules
      Exports: 11 symbols
      Used by: 1 files
   📄 mediaCapture.ts
      Imports: 1 modules
      Exports: 7 symbols
      Used by: 1 files
   📄 phonemeDetector.ts
      Imports: 1 modules
      Exports: 1 symbols
      Used by: 1 files
   📄 saccadeGenerator.ts
      Imports: 1 modules
      Exports: 9 symbols
      Used by: 1 files
   📄 visemeMapper.ts
      Imports: 1 modules
      Exports: 1 symbols
      Used by: 1 files
   📄 vrmValidator.ts
      Imports: 1 modules
      Exports: 3 symbols
      Used by: 1 files
   📄 walkingAnimator.ts
      Imports: 1 modules
      Exports: 8 symbols
      Used by: 1 files
   📄 walkingController.ts
      Imports: 2 modules
      Exports: 10 symbols
      Used by: 2 files

📁 types/
   📄 behaviorTypes.ts
      Imports: 0 modules
      Exports: 40 symbols
      Used by: 8 files
   📄 enhancementTypes.ts
      Imports: 0 modules
      Exports: 32 symbols
      Used by: 10 files
   📄 phonemeLipSync.ts
      Imports: 0 modules
      Exports: 15 symbols
      Used by: 4 files
   📄 vrmConfig.ts
      Imports: 0 modules
      Exports: 5 symbols
      Used by: 2 files
   📄 walkingBehaviorTypes.ts
      Imports: 0 modules
      Exports: 14 symbols
      Used by: 9 files

📁 ./
   📄 App.tsx
      Imports: 15 modules
      Exports: 1 symbols
      Used by: 1 files
   📄 index.tsx
      Imports: 3 modules
      Exports: 0 symbols
      Used by: 0 files
   📄 types.ts
      Imports: 0 modules
      Exports: 4 symbols
      Used by: 0 files
   📄 vite.config.ts
      Imports: 1 modules
      Exports: 1 symbols
      Used by: 0 files
```

---

## Unused Imports

### components\FpsCounter.tsx

| Import | Source |
|--------|--------|
| `FpsState` | ../utils/fpsCounter |

### components\NeuralCore.tsx

| Import | Source |
|--------|--------|
| `saveVrmConfigToStorage` | ../types/vrmConfig |
| `IdleConfig` | ../types/behaviorTypes |
| `LipSyncConfig` | ../types/behaviorTypes |
| `TransformConfig` | ../types/behaviorTypes |
| `DEFAULT_WALKING_CONFIG` | ../utils/walkingAnimator |

### components\WalkingEditor.tsx

| Import | Source |
|--------|--------|
| `WALKING_PRESETS` | ../types/walkingBehaviorTypes |

### services\behaviorManager.ts

| Import | Source |
|--------|--------|
| `createDefaultModelBehaviors` | ../types/behaviorTypes |
| `clearModelCache` | ./configLoader |

### services\liveManager.ts

| Import | Source |
|--------|--------|
| `generateMinimal` | ./aiInstructionGenerator |

### utils\walkingController.ts

| Import | Source |
|--------|--------|
| `LegConfig` | ../types/walkingBehaviorTypes |
| `ArmSwingConfig` | ../types/walkingBehaviorTypes |

---

## Circular Dependencies

✅ No circular dependencies detected!

---

## Potentially Orphaned Files

These files are not imported by any other file (excluding entry points and tests):

- types.ts
- vite.config.ts

---

## Module Structure

### components/

#### BehaviorEditor.tsx

**Exports:**
- `BehaviorEditor` (named)
- `default` (default)

**Dependencies:**
- Internal: ../types/behaviorTypes, ../types/enhancementTypes, ../types/walkingBehaviorTypes, ../utils/backgroundRenderer, ./WalkingEditor

#### FpsCounter.tsx

**Exports:**
- `FpsCounterProps` (named)
- `FpsCounter` (named)
- `default` (default)

**Dependencies:**
- Internal: ../utils/fpsCounter

#### NeuralCore.tsx

**Exports:**
- `PoseSettings` (named)
- `NeuralCoreHandle` (named)
- `NeuralCore` (named)

**Dependencies:**
- Internal: ../services/liveManager, ../types/vrmConfig, ../services/behaviorManager, ../services/vrmModelManager, ../utils/lodManager, ../utils/deviceDetector, ../types/behaviorTypes, ../utils/animationBlender, ../utils/saccadeGenerator, ../utils/breathingAnimator, ../utils/walkingAnimator, ../utils/walkingController, ../types/walkingBehaviorTypes, ../types/walkingBehaviorTypes, ../types/enhancementTypes, ../utils/lipSyncController, ../types/phonemeLipSync
- External: @pixiv/three-vrm, three

#### WalkingEditor.tsx

**Exports:**
- `WalkingEditor` (named)

**Dependencies:**
- Internal: ../types/walkingBehaviorTypes, ../types/walkingBehaviorTypes, ../utils/walkingController

### services/

#### aiInstructionGenerator.ts

**Exports:**
- `getEnabledExpressions` (named)
- `getEnabledGestures` (named)
- `getEnabledReactions` (named)
- `generateCommandList` (named)
- `generate` (named)
- `generateMinimal` (named)

**Dependencies:**
- Internal: ../types/behaviorTypes

#### behaviorManager.ts

**Exports:**
- `getCurrentBehaviors` (named)
- `updateBehavior` (named)
- `saveToStorage` (named)
- `loadFromStorage` (named)
- `clearStorage` (named)
- `exportConfig` (named)
- `importConfig` (named)
- `onBehaviorsLoaded` (named)
- `onBehaviorChanged` (named)
- `resetManager` (named)
- `setBehaviors` (named)

**Dependencies:**
- Internal: ../types/behaviorTypes, ./configLoader

#### configLoader.ts

**Exports:**
- `validateConfig` (named)
- `clearCache` (named)
- `clearModelCache` (named)
- `getFetchCount` (named)
- `resetFetchCount` (named)
- `isCached` (named)

**Dependencies:**
- Internal: ../types/behaviorTypes

#### conversationStore.ts

**Exports:**
- `ConversationMessage` (named)
- `ConversationSession` (named)
- `conversationStore` (named)

#### liveManager.ts

**Exports:**
- `VrmCommand` (named)
- `LiveManager` (named)

**Dependencies:**
- Internal: ../utils/audioUtils, ./conversationStore, ./aiInstructionGenerator, ../types/behaviorTypes
- External: @google/genai

#### vrmModelManager.ts

**Exports:**
- `ModelCacheEntry` (named)
- `LoadingState` (named)
- `VrmModelManagerOptions` (named)
- `VrmModelManager` (named)
- `createVrmModelManager` (named)
- `getGlobalVrmModelManager` (named)
- `resetGlobalVrmModelManager` (named)

**Dependencies:**
- External: three/addons/loaders/GLTFLoader.js, @pixiv/three-vrm, three

### utils/

#### animationBlender.ts

**Exports:**
- `easingFunctions` (named)
- `EasingType` (named)
- `getEasingFunction` (named)
- `clamp` (named)
- `lerp` (named)
- `lerpRotation` (named)
- `blendBoneState` (named)
- `blendBoneRotations` (named)
- `createBlendController` (named)
- `degToRad` (named)
- `radToDeg` (named)
- `createBoneState` (named)
- `createEmptyPose` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### audioUtils.ts

**Exports:**
- `base64ToUint8Array` (named)
- `arrayBufferToBase64` (named)
- `floatTo16BitPCM` (named)
- `downsampleBuffer` (named)
- `decodeAudioData` (named)
- `closeDecodeContext` (named)
- `calculateRMS` (named)

#### backgroundRenderer.ts

**Exports:**
- `hexToRgb` (named)
- `isValidHexColor` (named)
- `createGradientTexture` (named)
- `applySolidBackground` (named)
- `applyGradientBackground` (named)
- `clearBackground` (named)
- `saveBackgroundPreference` (named)
- `loadBackgroundPreference` (named)
- `getDefaultBackground` (named)
- `BACKGROUND_PRESETS` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### breathingAnimator.ts

**Exports:**
- `DEFAULT_BREATHING_CONFIG` (named)
- `createBreathingState` (named)
- `calculateBreathingState` (named)
- `getStateMultiplier` (named)
- `blendWithExisting` (named)
- `isValidBreathingState` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### deviceDetector.ts

**Exports:**
- `DeviceCapabilities` (named)
- `detectDeviceCapabilities` (named)
- `getOptimalParticleCount` (named)
- `getOptimalRenderScale` (named)
- `shouldReduceAnimations` (named)
- `getCapabilitiesSummary` (named)

#### fpsCounter.ts

**Exports:**
- `FpsColor` (named)
- `FpsState` (named)
- `FpsCounterConfig` (named)
- `FpsCounter` (named)
- `getFpsColor` (named)
- `createFpsCounter` (named)
- `formatFpsState` (named)
- `getFpsColorCss` (named)

#### lipSyncController.ts

**Exports:**
- `LipSyncControllerConfig` (named)
- `LipSyncController` (named)

**Dependencies:**
- Internal: ../types/behaviorTypes, ./phonemeDetector, ./visemeMapper, ../types/phonemeLipSync

#### lodManager.ts

**Exports:**
- `ShadowQuality` (named)
- `LodLevel` (named)
- `LodConfig` (named)
- `DEFAULT_LOD_CONFIG` (named)
- `calculateLodLevel` (named)
- `applyLodSettings` (named)
- `getShadowMapSize` (named)
- `createLodConfig` (named)
- `createDeviceOptimizedLodConfig` (named)
- `interpolateLodLevels` (named)
- `shouldUpdateLod` (named)

**Dependencies:**
- External: three

#### mediaCapture.ts

**Exports:**
- `isMediaRecorderSupported` (named)
- `getSupportedMimeType` (named)
- `downloadBlob` (named)
- `startRecording` (named)
- `stopRecording` (named)
- `createRecordingSession` (named)
- `generateFilename` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### phonemeDetector.ts

**Exports:**
- `PhonemeDetector` (named)

**Dependencies:**
- Internal: ../types/phonemeLipSync

#### saccadeGenerator.ts

**Exports:**
- `DEFAULT_SACCADE_CONFIG` (named)
- `createSaccadeState` (named)
- `generateSaccade` (named)
- `getNextSaccadeInterval` (named)
- `updateSaccadeState` (named)
- `blendWithGaze` (named)
- `degToRad` (named)
- `saccadeToRadians` (named)
- `isValidSaccadeOffset` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### visemeMapper.ts

**Exports:**
- `VisemeMapper` (named)

**Dependencies:**
- Internal: ../types/phonemeLipSync

#### vrmValidator.ts

**Exports:**
- `validateVrmBuffer` (named)
- `createVrmObjectUrl` (named)
- `isVrmFilename` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### walkingAnimator.ts

**Exports:**
- `DEFAULT_WALKING_CONFIG` (named)
- `createWalkingState` (named)
- `calculateWalkingBob` (named)
- `smoothTransitionBob` (named)
- `calculateLegPhase` (named)
- `getLegRotations` (named)
- `isValidWalkingState` (named)
- `getArmSwing` (named)

**Dependencies:**
- Internal: ../types/enhancementTypes

#### walkingController.ts

**Exports:**
- `LegPose` (named)
- `ArmSwingPose` (named)
- `calculateLegPose` (named)
- `calculateArmSwingPose` (named)
- `getWalkingPreset` (named)
- `applyWalkingStyle` (named)
- `createDefaultWalkingBehavior` (named)
- `calculateWalkPhase` (named)
- `isValidLegPose` (named)
- `isValidArmSwingPose` (named)

**Dependencies:**
- Internal: ../types/walkingBehaviorTypes, ../types/walkingBehaviorTypes

### types/

#### behaviorTypes.ts

**Exports:**
- `BehaviorType` (named)
- `TransformConfig` (named)
- `BodyConfig` (named)
- `BoneRotation` (named)
- `HandsConfig` (named)
- `FacialPreset` (named)
- `FacialConfig` (named)
- `GestureDefinition` (named)
- `GesturesConfig` (named)
- `IdleConfig` (named)
- `LipSyncConfig` (named)
- `ReactionStep` (named)
- `ReactionDefinition` (named)
- `ReactionsConfig` (named)
- `ExpressionCombo` (named)
- `ExpressionsConfig` (named)
- `ModelBehaviors` (named)
- `BehaviorConfigs` (named)
- `ValidationResult` (named)
- `DEFAULT_TRANSFORM` (named)
- `DEFAULT_BODY` (named)
- `DEFAULT_HANDS` (named)
- `DEFAULT_FACIAL` (named)
- `DEFAULT_GESTURES` (named)
- `DEFAULT_IDLE` (named)
- `DEFAULT_LIPSYNC` (named)
- `DEFAULT_REACTIONS` (named)
- `DEFAULT_EXPRESSIONS` (named)
- `getDefaultConfig` (named)
- `createDefaultModelBehaviors` (named)
- `deepMergeConfig` (named)
- `isValidTransformConfig` (named)
- `isValidGesturesConfig` (named)
- `isValidIdleConfig` (named)
- `isValidLipSyncConfig` (named)
- `isValidReactionsConfig` (named)
- `isValidExpressionsConfig` (named)
- `isValidBodyConfig` (named)
- `isValidHandsConfig` (named)
- `isValidFacialConfig` (named)

#### enhancementTypes.ts

**Exports:**
- `MediaCaptureOptions` (named)
- `RecordingOptions` (named)
- `RecordingState` (named)
- `VrmValidationResult` (named)
- `CustomVrmEntry` (named)
- `BackgroundType` (named)
- `SolidBackground` (named)
- `GradientBackground` (named)
- `HdriBackground` (named)
- `BackgroundConfig` (named)
- `BackgroundPreferences` (named)
- `BoneState` (named)
- `EasingType` (named)
- `BlendOptions` (named)
- `SaccadeConfig` (named)
- `SaccadeState` (named)
- `DEFAULT_SACCADE_CONFIG` (named)
- `BreathingConfig` (named)
- `BreathingState` (named)
- `DEFAULT_BREATHING_CONFIG` (named)
- `WalkingConfig` (named)
- `WalkingState` (named)
- `DEFAULT_WALKING_CONFIG` (named)
- `ShadowQuality` (named)
- `LodLevel` (named)
- `LodConfig` (named)
- `DEFAULT_LOD_CONFIG` (named)
- `DeviceCapabilities` (named)
- `FpsColor` (named)
- `FpsState` (named)
- `ModelCacheEntry` (named)
- `VrmModelManagerOptions` (named)

#### phonemeLipSync.ts

**Exports:**
- `Phoneme` (named)
- `ALL_PHONEMES` (named)
- `PhonemeResult` (named)
- `VisemeKey` (named)
- `VisemeWeights` (named)
- `PhonemeDetectorConfig` (named)
- `DEFAULT_PHONEME_DETECTOR_CONFIG` (named)
- `VisemeMapperConfig` (named)
- `DEFAULT_VISEME_MAPPER_CONFIG` (named)
- `PhonemeDetectionSettings` (named)
- `DEFAULT_PHONEME_DETECTION_SETTINGS` (named)
- `LipSyncState` (named)
- `createNeutralWeights` (named)
- `isValidPhoneme` (named)
- `isValidVisemeWeights` (named)

#### vrmConfig.ts

**Exports:**
- `VrmConfig` (named)
- `DEFAULT_VRM_CONFIG` (named)
- `saveVrmConfigToStorage` (named)
- `loadVrmConfigFromStorage` (named)
- `clearConfigCache` (named)

#### walkingBehaviorTypes.ts

**Exports:**
- `WalkingStyle` (named)
- `WalkingDirection` (named)
- `LegConfig` (named)
- `ArmSwingConfig` (named)
- `WalkingBehaviorConfig` (named)
- `DEFAULT_WALKING_BEHAVIOR` (named)
- `WALKING_PRESETS` (named)
- `directionToAngle` (named)
- `angleToMovementVector` (named)
- `isValidWalkingBehaviorConfig` (named)
- `isValidLegConfig` (named)
- `isValidArmSwingConfig` (named)
- `isValidWalkingStyle` (named)
- `isValidWalkingDirection` (named)

### ./

#### App.tsx

**Exports:**
- `default` (default)

**Dependencies:**
- Internal: ./types, ./services/liveManager, ./components/NeuralCore, ./components/BehaviorEditor, ./components/FpsCounter, ./services/conversationStore, ./types/vrmConfig, ./services/behaviorManager, ./types/behaviorTypes, ./types/walkingBehaviorTypes, ./types/walkingBehaviorTypes, ./utils/mediaCapture, ./utils/vrmValidator, ./utils/fpsCounter, ./types/enhancementTypes

#### index.tsx

**Dependencies:**
- Internal: ./App
- External: react, react-dom/client

#### types.ts

**Exports:**
- `AudioQueueItem` (named)
- `VisualizerData` (named)
- `ConnectionState` (named)
- `PcmAudio` (named)

#### vite.config.ts

**Exports:**
- `default` (default)

**Dependencies:**
- External: vite

