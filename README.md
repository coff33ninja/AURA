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
   VITE_GEMINI_API_KEYS=your_api_key_here
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

4. **Build for production:**
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
- `components/NeuralCore.tsx` - VRM rendering, animation system, embodiment
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
