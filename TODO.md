# AURA - TODO & Improvements

## 🔴 High Priority

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
- [ ] Preload next/previous models for faster switching
- [x] Clean up previous VRM properly on model switch (dispose geometries/materials)

### UI/UX
- [x] Move inline styles to CSS classes (volume bar heights)
- [x] Add keyboard shortcuts (Space to connect/disconnect, Esc to close menu)
- [x] Remember user preferences in localStorage (selected model, voice, personality, mode)
- [x] Add fullscreen toggle
- [x] Mobile responsive adjustments

## 🟢 Low Priority / Nice to Have

### Features
- [x] Add text chat fallback when mic unavailable
- [x] Display AI response text (with commands stripped) as subtitles
- [x] Conversation memory with IndexedDB storage
- [ ] Add screenshot/recording functionality
- [ ] Support custom VRM upload
- [ ] Add background scene options (solid color, gradient, environment maps)
- [ ] Implement actual finger bone control for gestures (currently arm-only)

### Animation System
- [ ] Add more idle animations variety
- [ ] Implement animation blending/crossfade
- [ ] Add procedural eye movement (saccades)
- [ ] Breathing should affect spine bones, not just expressions
- [ ] Walking animation needs vertical bobbing

### Performance
- [ ] Lazy load VRM models
- [ ] Implement LOD (Level of Detail) for distant camera positions
- [ ] Optimize particle system (reduce count on mobile)
- [ ] Add FPS counter in debug mode

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
- [ ] Document VRM sidecar format
- [ ] Create contribution guidelines
- [ ] Add architecture diagram
- [ ] Document command format for custom integrations

## 🔧 Technical Debt

- [ ] NeuralCore.tsx is 1000+ lines - split into smaller modules:
  - `useVrmLoader.ts` - VRM loading logic
  - `useAnimationLoop.ts` - Animation frame handling
  - `useGestures.ts` - Gesture definitions and playback
  - `useExpressions.ts` - Expression management
- [ ] Move emotion choreography to separate config file
- [ ] Create proper TypeScript interfaces for sidecar JSON structure
- [ ] Centralize magic numbers (camera positions, animation speeds, etc.)
