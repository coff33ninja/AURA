# AURA - TODO & Improvements

## 🔴 High Priority

### Dynamic Model Height/Camera Setup
- [x] Compute bounding box on VRM load via `THREE.Box3().setFromObject(vrm.scene)`
- [x] Lower model Y position if height exceeds threshold (keep scale for walking)
- [x] Auto-adjust camera Y and lookAt target based on model bounds
- [ ] Optional: Create `vrm-metadata.json` for manual overrides per model
- [ ] Smooth camera transitions when switching models

### Expression System Fixes
- [ ] Lip sync uses `aa`, `ih`, `u`, `e`, `o` but sidecars use `a`, `i`, `u`, `e`, `o` - normalize naming
- [ ] Some emotions reference gestures that don't exist (`dismissive_wave`, `frustrated_hand`, etc.)
- [ ] `chest_expand` expression doesn't exist on most models - remove or make conditional

## 🟡 Medium Priority

### Code Quality / Deprecations
- [ ] Replace deprecated `ScriptProcessorNode` with `AudioWorkletNode` in liveManager.ts
- [ ] Remove unused `currentMicVolume` variable in liveManager.ts
- [ ] Remove unused `initialKeyIndex` variable in liveManager.ts
- [ ] Add proper TypeScript types for regex match variable `m`
- [ ] `outerRingRef` is declared but never used in NeuralCore.tsx
- [ ] `videoRef` and `mediaStreamRef` are set up but camera feed isn't displayed anywhere
- [ ] Add `type="button"` to all buttons in App.tsx for accessibility

### Audio System
- [ ] `decodeAudioData` creates a new AudioContext every call - should reuse existing context
- [ ] Consider implementing proper phoneme detection instead of volume-based lip sync
- [ ] Add mic volume indicator (currently tracked but not displayed)

### VRM Loading
- [ ] Handle VRM load errors gracefully with user feedback
- [ ] Add loading progress indicator (percentage)
- [ ] Preload next/previous models for faster switching
- [ ] Clean up previous VRM properly on model switch (dispose geometries/materials)

### UI/UX
- [ ] Move inline styles to CSS classes (volume bar heights)
- [ ] Add keyboard shortcuts (Space to connect, Esc to close menu)
- [ ] Remember user preferences in localStorage (selected model, voice, personality)
- [ ] Add fullscreen toggle
- [ ] Mobile responsive adjustments

## 🟢 Low Priority / Nice to Have

### Features
- [ ] Add text chat fallback when mic unavailable
- [ ] Display AI response text (with commands stripped) as subtitles
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
- [ ] Implement reconnection logic with exponential backoff
- [ ] Add analytics/telemetry hooks
- [ ] Create production build optimizations
- [ ] Add service worker for offline capability
- [ ] Environment-specific configs (dev/staging/prod)

## 🐛 Known Bugs

- [ ] Model switching while connected may cause expression sync issues
- [ ] Some VRM models have inverted normals on certain meshes
- [ ] Gesture queue doesn't clear on model switch
- [ ] `bodyRotationRef` initializes with `y: Math.PI` but neutral posture resets to `y: 0`

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
