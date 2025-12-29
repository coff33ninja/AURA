# AURA - TODO & Improvements

## ✅ Recently Completed (Tasks 19-20)

### Walking Controls Editor
- [x] Created `types/walkingBehaviorTypes.ts` with WalkingStyle, WalkingDirection, LegConfig, ArmSwingConfig, WalkingBehaviorConfig
- [x] Created `utils/walkingController.ts` with calculateLegPose(), calculateArmSwingPose(), getWalkingPreset(), applyWalkingStyle()
- [x] Property tests for walking controller (Properties 18, 19, 20) - 35 tests passing
- [x] Created `components/WalkingEditor.tsx` with full UI for walking controls
- [x] Added Walking tab to BehaviorEditor
- [x] Integrated walking controls into NeuralCore with real-time preview
- [x] Omnidirectional walking with custom angle (0-360°)
- [x] Depth movement (toward/away from camera)
- [x] "Face Direction" mode - walk in the direction the model is facing
- [x] Walking style presets (casual, march, sneak, run)
- [x] Leg animation with stride, lift height, knee bend controls
- [x] Arm swing with enable toggle and intensity

## 🔴 High Priority

### Gesture Editor Finger Controls (IN PROGRESS)
- [ ] Refactor finger bone section in GesturesTab to match HandsTab design pattern:
  - Use Left/Right hand selector buttons (like HandsTab)
  - Add expandable finger sections (Thumb, Index, Middle, Ring, Little)
  - Each finger expands to show bone sliders (Proximal, Intermediate, Distal)
  - Use the standard `Slider` component (NOT raw HTML range inputs)
  - Add finger presets (open, fist, point, peace, grip, thumbsUp) for quick setup
  - Keep "+ Add Right/Left Hand Fingers" buttons to initialize finger bones
- [ ] Ensure live preview works for finger bones (already wired via `updateGestureBone` → `onSetBoneRotation`)
- Reference: HandsTab implementation at line ~1840-2100 in BehaviorEditor.tsx
- Current broken implementation uses raw HTML inputs with color-coded accents - needs full rewrite

## 🔴 High Priority (continued)

### Dynamic Model Height/Camera Setup
- [x] Compute bounding box on VRM load via `THREE.Box3().setFromObject(vrm.scene)`
- [x] Lower model Y position if height exceeds threshold (keep scale for walking)
- [x] Auto-adjust camera Y and lookAt target based on model bounds
- [ ] Optional: Create `vrm-metadata.json` for manual overrides per model
- [x] Smooth camera transitions when switching models

### Expression System Fixes
- [x] Lip sync uses `aa`, `ih`, `u`, `e`, `o` but sidecars use `a`, `i`, `u`, `e`, `o` - normalize naming
- [x] Some emotions reference gestures that don't exist (`dismissive_wave`, `frustrated_hand`, etc.) - added missing gestures
- [x] `chest_expand` expression doesn't exist on most models - removed, breathing handled via spine bones

## 🟡 Medium Priority

### Code Quality / Deprecations
- [x] Replace deprecated `ScriptProcessorNode` with `AudioWorkletNode` in liveManager.ts (with fallback)
- [x] Remove unused `currentMicVolume` variable - NOW USED for mic level indicator in UI
- [x] Remove unused `initialKeyIndex` variable in liveManager.ts - removed (was debug only)
- [x] `outerRingRef` is declared but never used in NeuralCore.tsx - removed
- [x] `videoRef` and `mediaStreamRef` removed - camera feed wasn't being used
- [x] Add `type="button"` to all buttons in App.tsx for accessibility

### Audio System
- [x] `decodeAudioData` creates a new AudioContext every call - now uses shared singleton context
- [ ] Consider implementing proper phoneme detection instead of volume-based lip sync
- [x] Add mic volume indicator - now shows both mic input and AI output levels

### VRM Loading
- [x] Handle VRM load errors gracefully with user feedback
- [x] Add loading progress indicator (percentage)
- [x] Lazy load VRM models with LRU caching (services/vrmModelManager.ts)
- [x] Clean up previous VRM properly on model switch (dispose geometries/materials)

### UI/UX
- [x] Move inline styles to CSS classes (volume bar heights)
- [x] Add keyboard shortcuts (Space to connect/disconnect, Esc to close menu, D for debug/FPS)
- [x] Remember user preferences in localStorage (selected model, voice, personality, mode)
- [x] Add fullscreen toggle
- [x] Mobile responsive adjustments

## 🟢 Low Priority / Nice to Have

### Features
- [x] Add text chat fallback when mic unavailable
- [x] Display AI response text (with commands stripped) as subtitles
- [x] Conversation memory with IndexedDB storage
- [x] Add screenshot/recording functionality (utils/mediaCapture.ts)
- [x] Support custom VRM upload with validation (utils/vrmValidator.ts)
- [x] Add background scene options - solid color, gradient, HDRI (utils/backgroundRenderer.ts, Background tab)
- [x] Implement actual finger bone control for gestures - BehaviorEditor Hands tab with 28 finger bones

### Animation System
- [x] Add more idle animations variety with timing variation (utils/idleAnimation.ts)
- [x] Implement animation blending/crossfade (utils/animationBlender.ts)
- [x] Add procedural eye movement/saccades (utils/saccadeGenerator.ts)
- [x] Breathing affects spine bones (utils/breathingAnimator.ts)
- [x] Walking animation with vertical bobbing (utils/walkingAnimator.ts)
- [x] Full walking controls with leg/arm animation (utils/walkingController.ts)

### Performance
- [x] Lazy load VRM models with caching (services/vrmModelManager.ts)
- [x] Implement LOD system for distance-based quality (utils/lodManager.ts)
- [x] Optimize particle system - reduce count on mobile (utils/deviceDetector.ts)
- [x] Add FPS counter in debug mode (utils/fpsCounter.ts, components/FpsCounter.tsx)

### Production Readiness
- [ ] Add proper error boundaries
- [x] Implement reconnection logic with exponential backoff
- [ ] Add analytics/telemetry hooks
- [ ] Create production build optimizations
- [ ] Add service worker for offline capability
- [ ] Environment-specific configs (dev/staging/prod)

## 🐛 Known Bugs

- [ ] Model switching while connected may cause expression sync issues
- [ ] Some VRM models have inverted normals on certain meshes
- [x] Gesture queue doesn't clear on model switch - now clears in VRM load callback
- [x] `bodyRotationRef` initializes with `y: Math.PI` - CORRECT (makes model face camera), neutral posture also uses Math.PI

## 📝 Documentation

- [ ] Add JSDoc comments to exported functions
- [x] Document VRM sidecar format - README updated with Modular Behavior System docs
- [ ] Create contribution guidelines
- [ ] Add architecture diagram
- [ ] Document command format for custom integrations

## 🔧 Technical Debt

### File Size Crisis (URGENT)
Current line counts are unsustainable:
- `BehaviorEditor.tsx` - **2512 lines** (15 functions, easiest to split)
- `NeuralCore.tsx` - **1938 lines** (1 monolithic component)
- `App.tsx` - **1369 lines** (1 monolithic component)

**Spec created:** `.kiro/specs/component-splitting/`
**Helper script:** `node scripts/split-component.mjs`

Quick start:
```bash
# Analyze a file to see functions and sizes
node scripts/split-component.mjs analyze components/BehaviorEditor.tsx

# Extract a function to new file (includes all imports)
node scripts/split-component.mjs extract-function components/BehaviorEditor.tsx Slider components/behavior-editor/shared/Slider.tsx

# Create barrel export for directory
node scripts/split-component.mjs create-barrel components/behavior-editor/shared
```

#### BehaviorEditor.tsx Split Plan:
- [ ] `components/behavior-editor/index.tsx` - Main container, tab navigation
- [ ] `components/behavior-editor/TransformTab.tsx` - Position, rotation, scale, camera
- [ ] `components/behavior-editor/BodyTab.tsx` - Arm/spine controls
- [ ] `components/behavior-editor/HandsTab.tsx` - Finger bone controls with presets
- [ ] `components/behavior-editor/FacialTab.tsx` - Expression/mouth/eyes controls
- [ ] `components/behavior-editor/ExpressionsTab.tsx` - Expression mappings
- [ ] `components/behavior-editor/GesturesTab.tsx` - Gesture editor with bone controls
- [ ] `components/behavior-editor/IdleTab.tsx` - Breathing, blinking, sway
- [ ] `components/behavior-editor/LipSyncTab.tsx` - Phoneme detection settings
- [ ] `components/behavior-editor/ReactionsTab.tsx` - Reaction step editor
- [ ] `components/behavior-editor/BackgroundTab.tsx` - Background presets
- [ ] `components/behavior-editor/shared.tsx` - Slider, Toggle, SectionHeader components

#### NeuralCore.tsx Split Plan:
- [ ] `hooks/useVrmLoader.ts` - VRM loading, disposal, model switching
- [ ] `hooks/useAnimationLoop.ts` - requestAnimationFrame, delta time, update cycle
- [ ] `hooks/useGesturePlayer.ts` - Gesture queue, playback, bone interpolation
- [ ] `hooks/useExpressionManager.ts` - Expression blending, lip sync integration
- [ ] `hooks/useIdleAnimations.ts` - Breathing, blinking, sway, head movement
- [ ] `hooks/useWalkingAnimation.ts` - Walking cycle, leg/arm movement

#### App.tsx Split Plan:
- [ ] `components/AppHeader.tsx` - Title, model selector, settings button
- [ ] `components/ConnectionPanel.tsx` - Connect/disconnect, status indicators
- [ ] `components/ChatInterface.tsx` - Text input, message display
- [ ] `components/SettingsPanel.tsx` - Voice, personality, mode selection
- [ ] `hooks/useAudioManager.ts` - Mic handling, audio playback
- [ ] `hooks/useLiveConnection.ts` - WebSocket/API connection logic

### Other Technical Debt
- [x] Move emotion choreography to separate config file - BehaviorManager + JSON configs
- [x] Create proper TypeScript interfaces for sidecar JSON structure - types/behaviorTypes.ts
- [ ] Centralize magic numbers (camera positions, animation speeds, etc.)

## 📊 Test Coverage

- **285 tests passing** across 19 test files
- Property-based tests using fast-check for:
  - Screenshot capture (Property 1)
  - VRM validation (Property 2)
  - Config generation (Property 3)
  - Gradient textures (Property 4)
  - Background persistence (Property 5)
  - Finger bone gestures (Properties 6, 7)
  - Idle presets (Properties 8, 9)
  - Animation blending (Property 10)
  - Saccade generation (Property 11)
  - Breathing animation (Property 12)
  - Walking bob (Property 13)
  - Model caching (Property 14)
  - LOD system (Property 15)
  - Mobile optimization (Property 16)
  - FPS color coding (Property 17)
  - Leg pose alternation (Property 18)
  - Arm swing opposition (Property 19)
  - Walking presets (Property 20)
