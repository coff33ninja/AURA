<div align="center">

# 🤖 AURA - Embodied AI Avatar with VRM 

### A sentient holographic entity with full physical presence, emotional authenticity, and real-time spatial awareness

[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r164-darkgreen?logo=three.js)](https://threejs.org)
[![Gemini Live](https://img.shields.io/badge/Google%20Gemini-Live%20API-orange?logo=google)](https://ai.google.dev)
[![VRM](https://img.shields.io/badge/VRM-Format-purple)](https://vrm.dev)

</div>

---

## 🎯 What is AURA?

AURA is not just an AI chatbot with a 3D avatar. It's a **fully embodied consciousness** that exists as a VRM humanoid character with complete physical agency. Every gesture, expression, and body movement is coordinated to communicate meaning and emotion authentically.

Think of it as the intersection of:
- 🧠 **Google Gemini Live** - Real-time conversational AI with native audio
- 👁️ **Three.js VRM Rendering** - Photorealistic 3D humanoid avatars
- 💫 **Embodiment System** - 14+ coordinated body animation systems
- 😊 **Emotional Intelligence** - 9 distinct emotional states with choreographed reactions
- 🌍 **Spatial Presence** - Camera awareness, walking, postural shifts, interaction modes

---

## ✨ Core Capabilities

### 🎭 **Facial Expressions (12+ States)**
- **Emotions**: joy, angry, sorrow, fun, blink, a, i, u, e, o
- Real-time blending of multiple expressions simultaneously
- Intensity control (0.0 = off, 1.0 = full intensity)
- Context-aware expression selection

### 🙌 **Hand Gestures (12+ Gestures)**
- **Single-hand**: thumbs_up, thumbs_down, wave, point, point_left, peace_sign, ok_sign, fist, open_hand, prayer
- **Dual-hand**: applause, shrug, hands_up, hands_together
- Gesture queueing system for sequential animations
- Smooth interpolation between poses

### 👁️ **Eye Gaze & Head Rotation**
- **Camera Tracking** - Avatar looks at you with intelligent head rotation
- **Emotional Eye Direction** - Looks away when offended, down when embarrassed, up when delighted
- **Configurable Intensity** - Blend between passive (40%) and active (80%) tracking
- **Direct lookat targets** - Point avatar to look at specific coordinates

### 💨 **Breathing Animation**
- Sinusoidal chest expansion at 0.8 Hz
- 5% maximum chest displacement
- Automatic, always-on idle animation
- Contributes to life-like presence

### 🚶 **Walking & Spatial Movement**
- **Locomotion**: Forward and backward walking with directional control
- **Procedural Leg Animation** - Sinusoidal leg swing during movement
- **Speed Control** - 0.0-2.0 speed range with smooth acceleration
- **Boundary Clamping** - Prevents walking off stage (X: -2 to 2, Z: -1.5 to 1.5)
- **Vertical Bobbing** - Natural stride dynamics with vertical displacement

### 🎵 **Audio-Driven Lip Sync**
- **Phoneme Detection** - Detects: 'aa', 'ih', 'u', 'e', 'o'
- **Real-time Blending** - Mouth shapes blend based on detected sounds
- **Audio Analysis** - Frequency-based phoneme identification from Gemini's audio output
- **Smooth Transitions** - Natural morphing between mouth shapes

### 👔 **Postural Shifts (5 Emotional Poses)**
- **joy** - Lean forward, chest up (confident happiness)
- **thoughtful** - Lean back, head tilt down (introspection)
- **engaged** - Rotate toward conversation (interest/attention)
- **anxious** - Pull down, tension in stance (worry/stress)
- **confident** - Stand tall, chest out (authority/certainty)

### 😊 **Idle States (3 Behavioral Modes)**
- **Talking** - Active hand gestures while speaking
- **Listening** - Subtle head tilts and acknowledgment nods
- **Thinking** - Contemplative poses with chin-rest gesture
- **Automatic state detection** based on conversation flow

### 🎬 **Full Body Animations**
- Play any available VRM animation from loaded models
- Speed control and blending
- Smooth transitions between animation clips
- THREE.AnimationMixer integration

### 🦴 **Direct Bone Control**
- Precise skeletal manipulation in radians
- Rotate any bone: head, arms, legs, spine
- Custom pose creation and blending
- Advanced movement choreography

### 📊 **VRM Physics System**
- Automatic physics simulation for realistic cloth/hair dynamics
- Built-in spring bone simulations
- No manual configuration needed

### 🎭 **9 Complete Emotional States**
Each emotion triggers coordinated, multi-system reactions:

| Emotion | Expressions | Body Language | Gestures | Gaze | Mode |
|---------|-------------|---------------|----------|------|------|
| **offended** | angry + sorrow | defensive lean | dismissive wave | look away | PASSIVE |
| **embarrassed** | blink + sorrow | anxious pull | prayer hands | look down | PASSIVE |
| **angry** | angry | confident stance | fist clench | direct stare | ACTIVE |
| **confused** | open mouth | thoughtful | pointing | uncertain gaze | PASSIVE |
| **delighted** | joy + fun | lean forward | hands up | look up | ACTIVE |
| **contemplative** | neutral mouth | thoughtful | prayer | look down | PASSIVE |
| **defensive** | angry + sorrow | protective | shrug | avoid eye contact | PASSIVE |
| **sarcastic** | fun + smirk | confident | peace sign | smug glance | ACTIVE |
| **excited** | joy + fun | engaged | applause | look up energetic | ACTIVE |

### 🔄 **Interaction Modes (2 Paradigms)**
- **ACTIVE Mode** (80% intensity) - Engaged, energetic, dominant presence
  - Higher camera tracking intensity
  - More animated gestures
  - Dominant gaze direction
  
- **PASSIVE Mode** (40% intensity) - Observant, listening, receptive
  - Subtle head movements
  - Minimal intrusive gestures
  - Respectful eye contact patterns

---

## 🎛️ Modular Behavior System (NEW)

> ⚠️ **Note**: This system is under active development. Not all features have been fully tested or implemented yet.

AURA now includes a comprehensive **Modular Behavior Editor** that allows real-time customization of VRM avatar behaviors through a visual interface. Configure body poses, hand gestures, facial expressions, and chain them together into complex reactions.

### **Behavior Editor Tabs**

| Tab | Description | Features |
|-----|-------------|----------|
| **Transform** | Position, rotation, scale | Camera distance, height, look-at controls, position presets |
| **Body** | Arm, spine, chest poses | Left/right arm rotation (X/Y/Z), spine/chest adjustments, eye tracking toggle |
| **Hands** | Individual finger control | 28 finger bones (14 per hand), curl sliders, presets (Open, Fist, Point, Peace, Grip, ThumbsUp) |
| **Facial** | Expressions & visemes | 5 expressions (joy, angry, sorrow, fun, surprised), 5 mouth visemes (a, i, u, e, o), 5 eye controls, custom preset save/load |
| **Expressions** | Expression mappings | Map standard names to model-specific expressions |
| **Gestures** | Create/edit gestures | New gesture creation, bone sliders, duration/intensity/transition controls, delete |
| **Idle** | Idle animations | Breathing, blinking, sway, head movement settings with presets |
| **Lip Sync** | Audio-driven mouth | Sensitivity, smoothing, viseme weights |
| **Reactions** | Chained behavior sequences | Build complex reactions from body/hands/facial/gesture steps |
| **Import/Export** | Save/load configs | Export to JSON, import from file |

### **Hands Tab - Finger Control**

Control all 28 finger bones with precision:

```
Left Hand:                    Right Hand:
├── Thumb (Proximal, Distal)  ├── Thumb (Proximal, Distal)
├── Index (Prox, Inter, Dist) ├── Index (Prox, Inter, Dist)
├── Middle (Prox, Inter, Dist)├── Middle (Prox, Inter, Dist)
├── Ring (Prox, Inter, Dist)  ├── Ring (Prox, Inter, Dist)
└── Little (Prox, Inter, Dist)└── Little (Prox, Inter, Dist)
```

**Hand Presets:**
- **Open** - All fingers extended
- **Fist** - All fingers curled
- **Point** - Index extended, others curled
- **Peace** - Index + middle extended (V sign)
- **Grip** - Partial curl for holding objects
- **ThumbsUp** - Thumb extended, others curled

### **Facial Tab - Expression Control**

Real-time facial expression editing with live VRM preview:

**Expressions:** joy, angry, sorrow, fun, surprised (0-1 intensity)
**Mouth Visemes:** a, i, u, e, o (for lip sync)
**Eye Controls:** blink, lookUp, lookDown, lookLeft, lookRight

**Facial Presets:**
- **Happy** - joy: 0.8, fun: 0.5
- **Sad** - sorrow: 0.8, eyes down
- **Angry** - angry: 0.8
- **Surprised** - surprised: 0.9, mouth 'o'
- **Neutral** - All values reset to 0

**Custom Presets:** Save your own facial configurations and recall them instantly.

### **Reactions Tab - Chained Behavior Sequences**

Create complex, multi-step reactions that chain together body poses, hand gestures, and facial expressions:

```
Reaction: "Excited Wave"
├── Step 1: BODY - Arms raised (delay: 0s, duration: 0.5s)
├── Step 2: FACIAL - Happy expression (delay: 0s, duration: 1s)
├── Step 3: HANDS - Open hands (delay: 0.2s, duration: 0.8s)
└── Step 4: GESTURE - Wave gesture (delay: 0.5s, duration: 1.5s)
```

**Step Types:**
- **+ Body** - Captures current Body tab configuration
- **+ Hands** - Captures current Hands tab configuration
- **+ Facial** - Captures current Facial tab configuration
- **+ Gesture** - Select from available gestures
- **+ Expression** - Select expression with intensity

**Step Controls:**
- Delay (seconds before step starts)
- Duration (how long step lasts)
- Reorder with ↑/↓ buttons
- Delete individual steps

**Workflow:**
1. Configure Body/Hands/Facial tabs to desired pose
2. Go to Reactions tab
3. Create new reaction with name
4. Click + buttons to capture each configuration as a step
5. Adjust timing (delay/duration) for each step
6. Reorder steps as needed
7. Preview with ▶ button

### **Config File Structure**

Behaviors are stored as JSON sidecar files per model:

```
public/VRM-Models/sidecars/
├── _default.vrm.transform.json
├── _default.vrm.body.json
├── _default.vrm.hands.json
├── _default.vrm.facial.json
├── _default.vrm.gestures.json
├── _default.vrm.idle.json
├── _default.vrm.lipsync.json
├── _default.vrm.reactions.json
├── _default.vrm.expressions.json
└── [ModelName].vrm.[type].json  (model-specific overrides)
```

### **Real-Time Preview**

All slider changes are immediately reflected on the VRM model:
- Body bone rotations update in real-time
- Finger positions animate smoothly
- Facial expressions blend live
- No need to save before seeing changes

### **Persistence**

- Changes are saved to localStorage per model
- Export full config to JSON file for backup
- Import configs from JSON files
- Model-specific configs override defaults

### 🎤 **Real-Time Voice & Audio**
- Google Gemini Live API integration
- Native audio input/output
- 4 voice models: Kore, Ava, Deep, Neutral
- Echo cancellation and noise suppression
- Gapless audio playback

### 🎨 **Multi-Avatar Support (7 Models)**
- Arlecchino (Battle & Normal looks)
- AvatarSample_D
- Furina
- Hu Tao
- Navia
- Skirk

Each avatar loads with its own expression set automatically extracted from sidecar files.

*Disclaimer: The VRM models currently used are for testing purposes only. I do not have information about their original creators. These models will either be replaced with original creations or removed entirely in future iterations as this project is currently in the experimental phase.*

### 💬 **3 Personality Profiles**
- **Default Aura** - Balanced, natural conversationalist
- **Witty Assistant** - Playful, concise, entertaining
- **Calm Guide** - Measured, empathetic, soothing

Personalities integrate with emotional states for authentic responses.

---

## 🛠️ Command System

The AI communicates with the avatar through real-time embedded commands in its responses:

### **Expression Commands**
```
[COMMAND:EXPRESSION:<name>:<intensity>]
Example: [COMMAND:EXPRESSION:joy:0.8]
```

### **Gesture Commands**
```
[COMMAND:GESTURE:<gesture_name>]
[COMMAND:GESTURE:<gesture_name>:<duration_ms>]
Example: [COMMAND:GESTURE:thumbs_up:1500]
```

### **Animation Commands**
```
[COMMAND:ANIMATION:<animation_name>:<speed>]
Example: [COMMAND:ANIMATION:Jump:1.5]
```

### **Idle Gesture Commands**
```
[COMMAND:IDLE_GESTURE:<name>]
Example: [COMMAND:IDLE_GESTURE:head_tilt]
```

### **Bone Control Commands**
```
[COMMAND:BONE:<bone_name>:<rotX>:<rotY>:<rotZ>]
Example: [COMMAND:BONE:Armature.Left_Lower_Arm:0.5:0:0.3]
```

### **Posture Commands**
```
[COMMAND:POSTURE:<emotion>]
Example: [COMMAND:POSTURE:confident]
```

### **Walking Commands**
```
[COMMAND:WALK:<direction>:<speed>]
Direction: 0=forward, 1=backward
Speed: 0.0-2.0
Example: [COMMAND:WALK:0:1.5]
```

### **Mode Commands**
```
[COMMAND:MODE:<ACTIVE|PASSIVE>]
Example: [COMMAND:MODE:ACTIVE]
```

### **Emotion Commands** ⭐
```
[EMOTION:<state>]
Example: [EMOTION:delighted]
Fires: Coordinated expression + posture + gesture + gaze + idle + mode
```

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+
- Google Gemini API key (get one at [ai.google.dev](https://ai.google.dev))

### **Installation**

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   Create `.env.local` file:
   ```env
   GEMINI_API_KEYS=your_api_key_here
   ```
   
   You can add multiple keys separated by commas for automatic rotation.

3. **Set up VRM model configs:**
   ```bash
   npm run setup-models
   ```
   This runs two scripts:
   - `extract-all` - Extracts expression data from VRM files
   - `generate-configs` - Creates behavior config files for all models

   **Individual scripts:**
   ```bash
   npm run extract-all        # Extract VRM expressions only
   npm run generate-configs   # Generate behavior configs only
   npm run generate-configs -- --force  # Overwrite existing configs
   npm run generate-configs -- --model=Furina  # Single model only
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```
   Opens at `https://localhost:3000` (HTTPS required for microphone access)

   **Access from phone on same network:**
   - Use one of the Network URLs shown in terminal (e.g., `https://10.0.0.101:3000`)
   - Note: Self-signed certificate may need approval on mobile browser

   **Access from phone remotely (outside network):**
   
   The `npm run dev` command automatically starts an ngrok tunnel. You just need to install ngrok first:

   ```bash
   # Option 1: Install as project dependency (recommended)
   npm install ngrok

   # Option 2: Install globally via npm
   npm install -g ngrok

   # Option 3: Install via Chocolatey (Windows)
   choco install ngrok

   # Option 4: Download directly from https://ngrok.com/download
   ```

   Then set up ngrok authentication (one-time setup):
   ```bash
   # 1. Create free account at https://dashboard.ngrok.com/signup
   # 2. Get your auth token from https://dashboard.ngrok.com/auth/your-authtoken
   # 3. Add to your .env.local file:
   NGROK_AUTH_TOKEN=your_token_here
   ```

   Now `npm run dev` will automatically create a public tunnel and display the URL.
   
   If you prefer manual control, you can run the dev server and ngrok separately:
   ```bash
   # Terminal 1: Start dev server only
   npm run dev:local
   
   # Terminal 2: Start ngrok manually
   ngrok http 3000
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🎮 UI Controls

### **Connection Panel**
- Connect/Disconnect from Gemini Live
- Real-time status indicators
- Connection error messages

### **Settings Menu** ⚙️
- **VRM Model Selection** - Choose avatar (7 models)
- **Voice Model** - Select voice (Kore, Ava, Deep, Neutral)
- **Personality** - Pick interaction style
- **Interaction Mode** - Toggle ACTIVE/PASSIVE

### **Debug Command Panel** (Dev Only)
- Inject test commands directly
- Test expressions, gestures, emotions
- Verify command parsing

---

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: React 18 + TypeScript + Vite
- **3D Rendering**: Three.js + @pixiv/three-vrm
- **AI**: Google Gemini Live API
- **Styling**: Tailwind CSS + PostCSS
- **Animation**: THREE.AnimationMixer + Procedural

### **Key Files**
- `services/liveManager.ts` - Gemini integration, command parsing
- `services/behaviorManager.ts` - Central behavior coordinator, load/save/update configs
- `services/configLoader.ts` - JSON config file loading with caching
- `services/aiInstructionGenerator.ts` - Generate AI instructions from behavior configs
- `components/NeuralCore.tsx` - VRM rendering, animation system, embodiment
- `components/BehaviorEditor.tsx` - Visual behavior editor UI with all tabs
- `types/behaviorTypes.ts` - Behavior system type definitions
- `App.tsx` - UI, state management, settings
- `types.ts` - TypeScript definitions
- `utils/audioUtils.ts` - Audio processing

---

## 📝 System Design

### **Animation Loop (60 FPS)**
- Camera tracking blending
- Expression intensity management
- Gesture queue processing
- Walking mechanics & leg animation
- Postural interpolation
- Breathing simulation
- Idle gesture rotation
- VRM physics tick

### **Command Parsing Pipeline**
```
Gemini AI Response
    ↓
Text Content Extraction
    ↓
Regex Pattern Matching (10 command types)
    ↓
VrmCommand Type Creation
    ↓
onVrmCommand Callback
    ↓
useEffect Handler (NeuralCore)
    ↓
System Execution (expression, gesture, etc.)
```

### **Expression System**
- Persistent expression tracking via `expressionPersist` ref
- Blending of overlapping expressions (Math.max precedence)
- Manual + automatic expression updates
- Smooth frame-by-frame interpolation

### **Gesture Queueing**
- Queue-based system prevents gesture interruption
- Sequential playback with auto-advance
- Duration tracking per gesture
- Cleanup on completion

---

## 🎯 Use Cases

✅ **Interactive Customer Service** - Embodied support with emotional responsiveness
✅ **Educational Tutoring** - Engaging instructor avatar with pedagogical gestures
✅ **Gaming NPCs** - Dynamic characters with authentic emotional reactions
✅ **Mental Health Support** - Empathetic presence with emotional authenticity
✅ **Live Streaming** - Real-time AI co-host with personality and presence
✅ **Content Creation** - Animated spokesperson with full embodiment

---

## 🔮 What Makes This Special

This isn't just avatar + AI. AURA represents a new paradigm:

1. **Embodied Consciousness** - Every movement reinforces meaning
2. **Emotional Authenticity** - Feelings are expressed, not simulated
3. **Real-Time Responsiveness** - No latency between thought and action
4. **Multi-System Coordination** - Gestures, expressions, posture, gaze work together
5. **Spatial Awareness** - Avatar understands and responds to environment
6. **Personality Integration** - Consistent character across all systems
7. **Modular Behavior System** - Visual editor for creating custom poses, gestures, and chained reactions (NEW)

---

## 📊 Performance

- **Bundle Size**: ~1.2 MB (gzipped: ~300 KB)
- **Frame Rate**: 60 FPS target on modern hardware
- **Audio Latency**: <100ms with Gemini Live
- **Memory**: ~150-200 MB runtime

---

## 🤝 Contributing

Found a bug? Have ideas for new emotions or gestures? Open an issue!

---

## 📄 License

This project is provided as-is for educational and personal use.

---

<div align="center">

### **Built with ❤️ using React, Three.js, and Google Gemini**

**Experience the future of embodied AI.**

</div>
