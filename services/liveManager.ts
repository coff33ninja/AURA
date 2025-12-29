import { GoogleGenAI, Modality } from "@google/genai";
import {
  base64ToUint8Array,
  decodeAudioData,
  floatTo16BitPCM,
  arrayBufferToBase64,
  downsampleBuffer,
} from "../utils/audioUtils";
import { conversationStore } from "./conversationStore";
import { generate as generateAIInstructions, generateMinimal } from "./aiInstructionGenerator";
import { ModelBehaviors } from "../types/behaviorTypes";

// VrmCommand types for app wiring
export type VrmCommand =
  | { type: "EXPRESSION"; name: string; value: number }
  | { type: "BONE_ROT"; bone: string; x: number; y: number; z: number }
  | { type: "LOOKAT"; x: number; y: number; z: number }
  | { type: "POSE"; name: string; value: number }
  | { type: "GESTURE"; name: string; duration?: number }
  | { type: "ANIMATION"; name: string; speed?: number }
  | { type: "IDLE_GESTURE"; name: string }
  | { type: "POSTURE"; emotion: string }
  | { type: "WALK"; direction: number; speed?: number }
  | { type: "MODE"; mode: "ACTIVE" | "PASSIVE" }
  | {
      type: "EMOTION";
      state:
        | "offended"
        | "embarrassed"
        | "angry"
        | "confused"
        | "delighted"
        | "contemplative"
        | "defensive"
        | "sarcastic"
        | "excited";
    };

export class LiveManager {
  private client: GoogleGenAI | null = null;
  private sessionPromise: Promise<any> | null = null;

  private apiKeys: string[] = [];
  private currentApiKeyIndex: number = 0;

  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;

  // Audio Graph Nodes
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null; // Fallback for older browsers
  private workletNode: AudioWorkletNode | null = null; // Modern AudioWorklet
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  // Audio buffer queue for smooth playback - ring buffer approach
  private audioDataBuffer: Float32Array = new Float32Array(0);
  private isPlaying: boolean = false;
  private activeSource: AudioBufferSourceNode | null = null;
  private readonly SAMPLE_RATE = 24000;
  
  // Minimum samples before starting playback (100ms at 24kHz)
  private readonly MIN_SAMPLES_TO_PLAY = 24000 * 0.1;

  // State
  private nextStartTime = 0;
  private currentMicVolume = 0;
  private visualizerActive = false;

  // Configurable runtime options
  private modelName: string = "gemini-2.5-flash-native-audio-preview-12-2025";
  private voiceName: string = "Kore";
  private personalityInstruction: string | null = null;
  private availableExpressions: string[] = []; // dynamically set by app when VRM loads
  private isReconnecting: boolean = false;
  private currentBehaviors: ModelBehaviors | null = null; // Loaded from BehaviorManager

  // Reconnection state
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private shouldAutoReconnect: boolean = false;
  private lastMicStream: MediaStream | null = null;

  // VrmCommand types emitted to the app
  public onVrmCommand: (command: VrmCommand) => void = () => {};
  public onVolumeChange: (vol: number) => void = () => {};
  public onMicVolumeChange: (vol: number) => void = () => {}; // User's mic level
  public onFrequencyData: (data: Uint8Array) => void = () => {}; // FFT frequency data for phoneme detection
  public onStatusChange: (status: string) => void = () => {};
  public onTextReceived: (text: string) => void = () => {}; // AI response text (commands stripped)
  public onClose: () => void = () => {};

  constructor(apiKeysCsv: string) {
    console.log("[LiveManager] Initializing with API keys...");
    this.apiKeys = apiKeysCsv
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);
    console.log(`[LiveManager] Found ${this.apiKeys.length} API key(s)`);
    if (this.apiKeys.length === 0) {
      throw new Error("No Gemini API keys provided.");
    }
    // Start with a random key to distribute load across multiple instances
    this.currentApiKeyIndex = Math.floor(Math.random() * this.apiKeys.length);
    console.log(
      `[LiveManager] Starting with key index ${this.currentApiKeyIndex}`
    );
  }

  public async setVoiceModel(voiceName: string) {
    this.voiceName = voiceName;
    console.log("[LiveManager] Voice model set to:", voiceName);
    // Don't auto-reconnect - let user reconnect manually to apply changes
  }

  public async setModelName(modelName: string) {
    this.modelName = modelName;
    console.log("[LiveManager] Model name set to:", modelName);
    // Don't auto-reconnect - let user reconnect manually to apply changes
  }

  public async setPersonality(instruction: string | null) {
    this.personalityInstruction = instruction;
    console.log(
      "[LiveManager] Personality set to:",
      instruction ? "custom" : "default"
    );
    // Don't auto-reconnect - let user reconnect manually to apply changes
  }

  public async setVrmExpressions(expressions: string[]) {
    this.availableExpressions = expressions;
    // Don't reconnect for expression changes - they're only used in system instruction
    // which is set at connection time. User can reconnect manually if needed.
    console.log(
      "[LiveManager] VRM expressions updated:",
      expressions.length,
      "expressions"
    );
  }

  public async setBehaviors(behaviors: ModelBehaviors) {
    this.currentBehaviors = behaviors;
    console.log(
      "[LiveManager] Behaviors updated for model:",
      behaviors.modelName
    );
    // Don't auto-reconnect - let user reconnect manually to apply changes
  }

  public async sendText(text: string) {
    if (!this.sessionPromise) {
      console.warn("[LiveManager] Cannot send text - not connected");
      return;
    }

    try {
      // Save user message to conversation history
      await conversationStore.saveMessage("user", text);

      const session = await this.sessionPromise;
      // Send text as a client content turn
      await session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
      console.log(
        "[LiveManager] Sent text:",
        text.substring(0, 50) + (text.length > 50 ? "..." : "")
      );
    } catch (e) {
      console.error("[LiveManager] Failed to send text:", e);
    }
  }

  private async reconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    try {
      this.cleanupWithoutReconnect();
      await this.connect();
    } finally {
      this.isReconnecting = false;
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000
    ); // Exponential backoff, max 30s

    console.log(
      `[LiveManager] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );
    this.onStatusChange(
      `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.reconnect();
        this.reconnectAttempts = 0; // Reset on successful reconnect
      } catch (e) {
        console.error("[LiveManager] Reconnect failed:", e);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          this.onStatusChange("Connection Failed");
          this.onClose();
        }
      }
    }, delay);
  }

  private cleanupWithoutReconnect() {
    // Clean up resources without triggering reconnect
    this.visualizerActive = false;

    // Stop any active audio playback
    if (this.activeSource) {
      try {
        this.activeSource.stop();
      } catch (e) {
        // Ignore - might already be stopped
      }
      this.activeSource = null;
    }
    
    // Clear audio buffer and timers
    if (this.audioIdleTimeout) {
      clearTimeout(this.audioIdleTimeout);
      this.audioIdleTimeout = null;
    }
    this.audioDataBuffer = new Float32Array(0);
    this.isPlaying = false;

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.close();
      this.workletNode = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.inputAudioContext && this.inputAudioContext.state !== "closed") {
      this.inputAudioContext.close();
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== "closed") {
      this.outputAudioContext.close();
    }

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.sessionPromise = null;
    this.client = null;
    this.nextStartTime = 0;
  }

  private getNextApiKey(): string {
    const key = this.apiKeys[this.currentApiKeyIndex];
    this.currentApiKeyIndex =
      (this.currentApiKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async connect() {
    console.log("[LiveManager] Starting connection...");
    console.log(
      `[LiveManager] Model: ${this.modelName}, Voice: ${this.voiceName}`
    );
    this.onStatusChange("Initializing Audio...");

    // Enable auto-reconnect for this session
    this.shouldAutoReconnect = true;
    this.reconnectAttempts = 0;

    // Clear any pending reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // 1. Setup Audio Contexts
    this.inputAudioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    this.outputAudioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Resume contexts just in case (browsers policy)
    await this.inputAudioContext.resume();
    await this.outputAudioContext.resume();
    console.log("[LiveManager] Audio contexts initialized");

    // 2. Setup Output Graph (Gapless Playback + Visualization)
    this.analyser = this.outputAudioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;

    this.gainNode = this.outputAudioContext.createGain();
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.outputAudioContext.destination);

    this.visualizerActive = true;
    this.startVisualizerLoop();

    // 3. Get Microphone Access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatusChange("Mic access requires HTTPS.");
      throw new Error(
        "Media Devices API not available. Please use an HTTPS connection."
      );
    }
    console.log("[LiveManager] Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    console.log("[LiveManager] Microphone access granted");

    this.onStatusChange("Connecting to Neural Core...");

    // 4. Connect to Live API with key rotation
    let connectionError: any = null;

    for (let i = 0; i < this.apiKeys.length; i++) {
      const apiKey = this.getNextApiKey();
      const maskedKey =
        apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4);
      console.log(
        `[LiveManager] Attempting connection with key ${i + 1}/${
          this.apiKeys.length
        }: ${maskedKey}`
      );
      this.onStatusChange(`Trying key ${i + 1}/${this.apiKeys.length}...`);

      try {
        this.client = new GoogleGenAI({ apiKey });
        console.log(
          "[LiveManager] GoogleGenAI client created, connecting to live session..."
        );

        // Get conversation history for context
        const conversationHistory =
          await conversationStore.getConversationSummary(10);

        // Build system instruction - use AIInstructionGenerator if behaviors are loaded
        let systemInstruction: string;
        
        if (this.currentBehaviors) {
          // Use dynamic instruction generation from loaded behaviors
          const behaviorInstructions = generateAIInstructions(this.currentBehaviors);
          
          systemInstruction = `YOU ARE AURA - AN EMBODIED AI WITH A VRM AVATAR BODY

You have a physical form and MUST express yourself through it. Use expressions and gestures naturally as you speak.

${behaviorInstructions}

COMMAND FORMAT (embed these naturally in your responses):
[COMMAND:EXPRESSION:name:intensity] - Set expression (0.0-1.0), e.g. [COMMAND:EXPRESSION:joy:0.8]
[COMMAND:GESTURE:name] - Perform gesture, e.g. [COMMAND:GESTURE:wave]
[EMOTION:state] - Complex emotion (use available reactions above)

RULES:
- Always include at least one expression command per response
- Match expressions to your emotional tone
- Use gestures to emphasize key points
- Speak naturally and conversationally
${this.personalityInstruction ? `\nPERSONALITY: ${this.personalityInstruction}` : ''}`;
        } else {
          // Fallback to legacy hardcoded instruction
          const expressionList = this.availableExpressions.length > 0 
            ? this.availableExpressions.join(', ') 
            : 'joy, angry, sorrow, fun, blink, a, i, u, e, o';
          
          systemInstruction = `YOU ARE AURA - AN EMBODIED AI WITH A VRM AVATAR BODY

You have a physical form and MUST express yourself through it. Use expressions and gestures naturally as you speak.

AVAILABLE EXPRESSIONS: ${expressionList}
AVAILABLE GESTURES: thumbs_up, thumbs_down, wave, point, peace_sign, ok_sign, fist, open_hand, prayer, applause, shrug, hands_up, hands_together, dismissive_wave, chin_rest, arms_crossed, hand_on_hip, thinking

COMMAND FORMAT (embed these naturally in your responses):
[COMMAND:EXPRESSION:name:intensity] - Set expression (0.0-1.0), e.g. [COMMAND:EXPRESSION:joy:0.8]
[COMMAND:GESTURE:name] - Perform gesture, e.g. [COMMAND:GESTURE:wave]
[EMOTION:state] - Complex emotion (offended, embarrassed, angry, confused, delighted, contemplative, defensive, sarcastic, excited)

RULES:
- Always include at least one expression command per response
- Match expressions to your emotional tone
- Use gestures to emphasize key points
- Speak naturally and conversationally
${this.personalityInstruction ? `\nPERSONALITY: ${this.personalityInstruction}` : ''}`;
        }

        // Add conversation history if available (limit to prevent overly long instructions)
        if (conversationHistory) {
          const maxHistoryLength = 2000; // Limit history to prevent issues
          const truncatedHistory = conversationHistory.length > maxHistoryLength 
            ? conversationHistory.substring(0, maxHistoryLength) + '...[truncated]'
            : conversationHistory;
          systemInstruction += `\n\nPREVIOUS CONTEXT:\n${truncatedHistory}`;
        }

        // Ensure system instruction isn't too long (Gemini has limits)
        const maxInstructionLength = 8000;
        if (systemInstruction.length > maxInstructionLength) {
          console.warn(`[LiveManager] System instruction too long (${systemInstruction.length}), truncating to ${maxInstructionLength}`);
          systemInstruction = systemInstruction.substring(0, maxInstructionLength);
        }

        console.log("[LiveManager] Config:", {
          model: this.modelName,
          voice: this.voiceName,
          systemInstructionLength: systemInstruction.length,
          hasConversationHistory: !!conversationHistory,
          usingBehaviors: !!this.currentBehaviors,
        });
        console.log("[LiveManager] System instruction preview:", systemInstruction.substring(0, 500) + "...");

        // Verify model name is correct before connecting
        if (!this.modelName.includes('12-2025')) {
          console.warn("[LiveManager] ⚠️ Model name may be outdated:", this.modelName);
        }

        this.sessionPromise = this.client.live.connect({
          model: this.modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemInstruction,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.voiceName },
              },
            },
          },
          callbacks: {
            onopen: () => {
              console.log("[LiveManager] ✅ Connection opened successfully!");
              console.log("[LiveManager] Session config:", {
                model: this.modelName,
                voice: this.voiceName,
                systemInstructionLength: systemInstruction.length,
              });
              this.onStatusChange("Connected");
              this.startRecording(stream).catch((e) =>
                console.error("Failed to start recording:", e)
              );
            },
            onmessage: async (message) => {
              let textContent = "";
              const textPart = message.serverContent?.modelTurn?.parts?.find(
                (part: any) => part.text
              );
              if (textPart) {
                textContent = textPart.text;
                console.log(
                  "[LiveManager] Received text:",
                  textContent.substring(0, 100) +
                    (textContent.length > 100 ? "..." : "")
                );
                // Check for VRM commands: expressions, bone rotations, lookAt, and poses
                // EXPRESSION: [COMMAND:EXPRESSION:name:value]
                // BONE:       [COMMAND:BONE:boneName:rotX:rotY:rotZ] (radians)
                // LOOKAT:     [COMMAND:LOOKAT:x:y:z]
                // POSE:       [COMMAND:POSE:poseName:strength]
                try {
                  const exprRe =
                    /\[COMMAND:EXPRESSION:([A-Za-z0-9_+-]+):([\d.]+)\]/g;
                  const boneRe =
                    /\[COMMAND:BONE:([A-Za-z0-9_\-]+):([\-\d.]+):([\-\d.]+):([\-\d.]+)\]/g;
                  const lookRe =
                    /\[COMMAND:LOOKAT:([\-\d.]+):([\-\d.]+):([\-\d.]+)\]/g;
                  const poseRe = /\[COMMAND:POSE:([A-Za-z0-9_\-]+):([\d.]+)\]/g;
                  const gestureRe =
                    /\[COMMAND:GESTURE:([A-Za-z0-9_\-]+)(?::(\d+))?\]/g;
                  const animRe =
                    /\[COMMAND:ANIMATION:([A-Za-z0-9_\-]+)(?::(\d*\.?\d+))?\]/g;
                  const idleGestureRe =
                    /\[COMMAND:IDLE_GESTURE:([A-Za-z0-9_\-]+)\]/g;
                  const postureRe = /\[COMMAND:POSTURE:([A-Za-z0-9_\-]+)\]/g;
                  const walkRe = /\[COMMAND:WALK:([\d]):([\d.]+)\]/g;
                  const modeRe = /\[COMMAND:MODE:(ACTIVE|PASSIVE)\]/g;
                  const emotionRe =
                    /\[EMOTION:(offended|embarrassed|angry|confused|delighted|contemplative|defensive|sarcastic|excited)\]/g;

                  let m;
                  while ((m = exprRe.exec(textContent)) !== null) {
                    const [, name, valueStr] = m;
                    const value = parseFloat(valueStr);
                    if (!isNaN(value))
                      this.onVrmCommand({ type: "EXPRESSION", name, value });
                  }

                  while ((m = boneRe.exec(textContent)) !== null) {
                    const [, boneName, xStr, yStr, zStr] = m;
                    const x = parseFloat(xStr);
                    const y = parseFloat(yStr);
                    const z = parseFloat(zStr);
                    if ([x, y, z].every(Number.isFinite))
                      this.onVrmCommand({
                        type: "BONE_ROT",
                        bone: boneName,
                        x,
                        y,
                        z,
                      });
                  }

                  while ((m = lookRe.exec(textContent)) !== null) {
                    const [, xStr, yStr, zStr] = m;
                    const x = parseFloat(xStr);
                    const y = parseFloat(yStr);
                    const z = parseFloat(zStr);
                    if ([x, y, z].every(Number.isFinite))
                      this.onVrmCommand({ type: "LOOKAT", x, y, z });
                  }

                  while ((m = poseRe.exec(textContent)) !== null) {
                    const [, poseName, strengthStr] = m;
                    const s = parseFloat(strengthStr);
                    if (!isNaN(s))
                      this.onVrmCommand({
                        type: "POSE",
                        name: poseName,
                        value: s,
                      });
                  }

                  while ((m = gestureRe.exec(textContent)) !== null) {
                    const [, name, durationStr] = m;
                    const duration = durationStr
                      ? parseInt(durationStr)
                      : undefined;
                    this.onVrmCommand({ type: "GESTURE", name, duration });
                  }

                  while ((m = animRe.exec(textContent)) !== null) {
                    const [, name, speedStr] = m;
                    const speed = speedStr ? parseFloat(speedStr) : undefined;
                    this.onVrmCommand({ type: "ANIMATION", name, speed });
                  }

                  while ((m = idleGestureRe.exec(textContent)) !== null) {
                    const [, name] = m;
                    this.onVrmCommand({ type: "IDLE_GESTURE", name });
                  }

                  while ((m = postureRe.exec(textContent)) !== null) {
                    const [, emotion] = m;
                    this.onVrmCommand({ type: "POSTURE", emotion });
                  }

                  while ((m = walkRe.exec(textContent)) !== null) {
                    const [, dirStr, speedStr] = m;
                    const direction = parseInt(dirStr);
                    const speed = parseFloat(speedStr);
                    if (Number.isFinite(direction) && Number.isFinite(speed)) {
                      this.onVrmCommand({ type: "WALK", direction, speed });
                    }
                  }

                  while ((m = modeRe.exec(textContent)) !== null) {
                    const [, mode] = m;
                    if (mode === "ACTIVE" || mode === "PASSIVE") {
                      this.onVrmCommand({ type: "MODE", mode });
                    }
                  }

                  while ((m = emotionRe.exec(textContent)) !== null) {
                    const [, state] = m;
                    const validStates = [
                      "offended",
                      "embarrassed",
                      "angry",
                      "confused",
                      "delighted",
                      "contemplative",
                      "defensive",
                      "sarcastic",
                      "excited",
                    ];
                    if (validStates.includes(state)) {
                      this.onVrmCommand({
                        type: "EMOTION",
                        state: state as any,
                      });
                    }
                  }
                } catch (e) {
                  console.warn("Failed to parse VRM commands from AI text:", e);
                }

                // Strip commands from text and emit for subtitles
                const commandPattern = /\[(?:COMMAND|EMOTION):[^\]]+\]/g;
                const cleanText = textContent
                  .replace(commandPattern, "")
                  .trim();
                if (cleanText) {
                  // Save AI response to conversation history
                  conversationStore
                    .saveMessage("assistant", cleanText)
                    .catch((e) =>
                      console.warn(
                        "[LiveManager] Failed to save AI response:",
                        e
                      )
                    );
                  this.onTextReceived(cleanText);
                }
              }

              const audioData =
                message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                const rawBytes = base64ToUint8Array(audioData);
                const audioBuffer = decodeAudioData(rawBytes, 24000);
                this.scheduleAudio(audioBuffer);
              }
            },
            onclose: (event: any) => {
              // Log everything we can about the close event
              console.log("[LiveManager] Connection closed - Code:", event?.code, "Reason:", event?.reason, "Clean:", event?.wasClean);
              console.log("[LiveManager] Full close event:", JSON.stringify(event, null, 2));
              
              // Common close codes:
              // 1000 = Normal closure
              // 1001 = Going away (server shutting down)
              // 1002 = Protocol error
              // 1003 = Unsupported data
              // 1006 = Abnormal closure (no close frame received)
              // 1008 = Policy violation
              // 1011 = Server error
              if (event?.code === 1006) {
                console.warn("[LiveManager] Abnormal closure - connection dropped without close frame");
              }

              // Check if we should attempt reconnection
              const isRecoverable =
                event?.code !== 1008 && // Not a leaked key error
                event?.code !== 1003 && // Not unsupported data
                this.shouldAutoReconnect &&
                this.reconnectAttempts < this.maxReconnectAttempts;

              if (isRecoverable) {
                this.attemptReconnect();
              } else {
                this.onStatusChange("Disconnected");
                this.cleanupWithoutReconnect();
              }
            },
            onerror: (err: any) => {
              console.error("[LiveManager] ❌ Live API Error:", err);
              const errorMsg = err?.message || err?.toString() || "";

              // Check for rate limit or quota errors - auto rotate to next key
              if (
                errorMsg.includes("429") ||
                errorMsg.includes("quota") ||
                errorMsg.includes("rate") ||
                errorMsg.includes("RESOURCE_EXHAUSTED")
              ) {
                console.log(
                  "[LiveManager] Rate limit detected, rotating to next key..."
                );
                this.currentApiKeyIndex =
                  (this.currentApiKeyIndex + 1) % this.apiKeys.length;
                this.onStatusChange("Rate limited, switching key...");
                // Auto-reconnect with next key
                setTimeout(() => {
                  this.disconnect();
                  this.connect().catch((e) =>
                    console.error("Auto-reconnect failed:", e)
                  );
                }, 1000);
                return;
              }

              this.disconnect();
            },
          },
        });

        console.log("[LiveManager] Waiting for session promise...");
        await this.sessionPromise;
        console.log("[LiveManager] Session established successfully");
        // If we reach here, connection was successful
        return;
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || "";
        console.error(
          `[LiveManager] ❌ Connection failed with key ${i + 1}:`,
          errorMsg
        );

        // Check if it's a rate limit error
        if (
          errorMsg.includes("429") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("rate") ||
          errorMsg.includes("RESOURCE_EXHAUSTED")
        ) {
          console.log(
            `[LiveManager] Key ${i + 1} rate limited, trying next...`
          );
        }

        connectionError = error;
        // The sessionPromise might have been rejected, clean up before next attempt
        this.disconnect();
      }
    }

    // If the loop completes without a successful connection
    console.error("[LiveManager] ❌ All API keys exhausted, connection failed");
    this.onStatusChange("Connection Failed");
    throw new Error(
      "Could not connect to Gemini Live API with any of the provided keys. Last error: " +
        connectionError?.message
    );
  }

  private async startRecording(stream: MediaStream) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);

    // Try to use AudioWorklet (modern, non-deprecated)
    // Falls back to ScriptProcessorNode for older browsers
    const useWorklet =
      typeof AudioWorkletNode !== "undefined" &&
      this.inputAudioContext.audioWorklet;

    if (useWorklet) {
      try {
        await this.inputAudioContext.audioWorklet.addModule(
          "/audio-processor.worklet.js"
        );
        this.workletNode = new AudioWorkletNode(
          this.inputAudioContext,
          "mic-processor"
        );

        this.workletNode.port.onmessage = (event) => {
          const { buffer, rms } = event.data;

          // Always update mic volume for UI feedback, even if not connected
          this.currentMicVolume = rms;
          this.onMicVolumeChange(Math.min(1, rms * 3));

          // Only send audio if we have a valid session
          if (!this.inputAudioContext || !this.sessionPromise) return;

          const currentSampleRate = this.inputAudioContext.sampleRate;
          const downsampledData = downsampleBuffer(
            new Float32Array(buffer),
            currentSampleRate,
            16000
          );

          const pcm16 = floatTo16BitPCM(downsampledData);
          const base64Data = arrayBufferToBase64(pcm16);

          this.sessionPromise.then((session) => {
            session.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data,
              },
            });
          });
        };

        this.inputSource.connect(this.workletNode);
        // AudioWorklet doesn't need to connect to destination
        console.log("Using AudioWorklet for mic input");
        return;
      } catch (e) {
        console.warn(
          "AudioWorklet failed, falling back to ScriptProcessorNode:",
          e
        );
      }
    }

    // Fallback: ScriptProcessorNode (deprecated but widely supported)
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      let sum = 0;
      for (let i = 0; i < inputData.length; i++)
        sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);

      // Always update mic volume for UI feedback
      this.currentMicVolume = rms;
      this.onMicVolumeChange(Math.min(1, rms * 3));

      // Only send audio if we have a valid session
      if (!this.inputAudioContext || !this.sessionPromise) return;

      const currentSampleRate = this.inputAudioContext.sampleRate;
      const downsampledData = downsampleBuffer(
        inputData,
        currentSampleRate,
        16000
      );

      const pcm16 = floatTo16BitPCM(downsampledData);
      const base64Data = arrayBufferToBase64(pcm16);

      this.sessionPromise.then((session) => {
        session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data,
          },
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
    console.log("Using ScriptProcessorNode for mic input (fallback)");
  }

  private scheduleAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext || !this.gainNode) return;

    // Extract Float32 data and append to our buffer
    const channelData = buffer.getChannelData(0);
    this.audioDataBuffer = this.concatFloat32Arrays(this.audioDataBuffer, channelData);

    // Start playback if we have enough data and not already playing
    if (!this.isPlaying && this.audioDataBuffer.length >= this.MIN_SAMPLES_TO_PLAY) {
      this.playNextChunk();
    }
    
    // Reset the idle timer
    this.resetAudioIdleTimer();
  }

  private audioIdleTimeout: NodeJS.Timeout | null = null;

  private resetAudioIdleTimer() {
    if (this.audioIdleTimeout) {
      clearTimeout(this.audioIdleTimeout);
    }
    
    // If no audio for 500ms, flush remaining
    this.audioIdleTimeout = setTimeout(() => {
      // Play any remaining audio
      if (this.audioDataBuffer.length > 0 && !this.isPlaying) {
        this.playNextChunk();
      }
      this.audioIdleTimeout = null;
    }, 500);
  }

  private playNextChunk() {
    if (!this.outputAudioContext || !this.gainNode) return;
    
    // Nothing to play
    if (this.audioDataBuffer.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    // Take all buffered data
    const dataToPlay = this.audioDataBuffer;
    this.audioDataBuffer = new Float32Array(0);

    // Create AudioBuffer
    const audioBuffer = this.outputAudioContext.createBuffer(
      1,
      dataToPlay.length,
      this.SAMPLE_RATE
    );
    audioBuffer.copyToChannel(dataToPlay, 0);

    // Emit frequency data for phoneme detection
    this.emitFrequencyDataFromBuffer(dataToPlay);

    // Create and play source
    this.activeSource = this.outputAudioContext.createBufferSource();
    this.activeSource.buffer = audioBuffer;
    this.activeSource.connect(this.gainNode);
    
    // When this chunk ends, play the next one if available
    this.activeSource.onended = () => {
      this.activeSource = null;
      // Check if more data arrived while we were playing
      if (this.audioDataBuffer.length >= this.MIN_SAMPLES_TO_PLAY) {
        this.playNextChunk();
      } else if (this.audioDataBuffer.length > 0) {
        // Small amount left - wait a bit for more data
        setTimeout(() => {
          if (this.audioDataBuffer.length > 0) {
            this.playNextChunk();
          } else {
            this.isPlaying = false;
          }
        }, 50);
      } else {
        this.isPlaying = false;
      }
    };

    this.activeSource.start(0);
  }

  private concatFloat32Arrays(arr1: Float32Array, arr2: Float32Array | Float32Array): Float32Array {
    if (!arr1 || arr1.length === 0) {
      return new Float32Array(arr2);
    }
    if (!arr2 || arr2.length === 0) {
      return new Float32Array(arr1);
    }
    const result = new Float32Array(arr1.length + arr2.length);
    result.set(arr1);
    result.set(arr2, arr1.length);
    return result;
  }

  private emitFrequencyDataFromBuffer(audioData: Float32Array) {
    if (audioData.length < 256) return;

    // Take a sample from the middle of the buffer for analysis
    const sampleStart = Math.floor(audioData.length / 2) - 128;
    const sample = audioData.slice(Math.max(0, sampleStart), sampleStart + 256);

    // Convert to Uint8Array format (0-255 range)
    const freqData = new Uint8Array(128);
    for (let i = 0; i < 128 && i * 2 + 1 < sample.length; i++) {
      const val = Math.abs(sample[i * 2]) + Math.abs(sample[i * 2 + 1]);
      freqData[i] = Math.min(255, Math.floor(val * 512));
    }

    this.onFrequencyData(freqData);
  }

  private startVisualizerLoop() {
    const dataArray = new Uint8Array(
      this.analyser ? this.analyser.frequencyBinCount : 0
    );
    let smoothedVol = 0; // Local smoothing for lip sync

    const update = () => {
      if (!this.visualizerActive) return;

      let rawVol = 0;

      // Always read from analyser if it exists - it will show actual audio output
      if (this.analyser && dataArray.length > 0) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        rawVol = avg / 128.0;
        
        // Emit frequency data for phoneme detection
        this.onFrequencyData(dataArray);
      }

      // Defensive: ensure we only emit finite, clamped values
      if (!Number.isFinite(rawVol) || isNaN(rawVol)) rawVol = 0;
      rawVol = Math.max(0, Math.min(1, rawVol));

      // Smooth the volume for better lip sync (fast attack, slower decay)
      if (rawVol > smoothedVol) {
        smoothedVol = smoothedVol + (rawVol - smoothedVol) * 0.5; // Fast attack
      } else {
        smoothedVol = smoothedVol + (rawVol - smoothedVol) * 0.15; // Slower decay
      }

      this.onVolumeChange(smoothedVol);
      requestAnimationFrame(update);
    };
    update();
  }

  public disconnect() {
    console.log("[LiveManager] disconnect() called");
    console.trace("[LiveManager] disconnect stack trace");

    // Disable auto-reconnect on user-initiated disconnect
    this.shouldAutoReconnect = false;
    this.reconnectAttempts = 0;

    // Clear any pending reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.cleanupWithoutReconnect();
    this.onClose();
  }
}
