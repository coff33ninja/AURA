import { GoogleGenAI, Modality } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, floatTo16BitPCM, arrayBufferToBase64, downsampleBuffer } from "../utils/audioUtils";

// VrmCommand types for app wiring
export type VrmCommand =
    | { type: 'EXPRESSION'; name: string; value: number }
    | { type: 'BONE_ROT'; bone: string; x: number; y: number; z: number }
    | { type: 'LOOKAT'; x: number; y: number; z: number }
    | { type: 'POSE'; name: string; value: number }
    | { type: 'GESTURE'; name: string; duration?: number }
    | { type: 'ANIMATION'; name: string; speed?: number }
    | { type: 'IDLE_GESTURE'; name: string }
    | { type: 'POSTURE'; emotion: string }
    | { type: 'WALK'; direction: number; speed?: number }
    | { type: 'MODE'; mode: 'ACTIVE' | 'PASSIVE' }
    | { type: 'EMOTION'; state: 'offended' | 'embarrassed' | 'angry' | 'confused' | 'delighted' | 'contemplative' | 'defensive' | 'sarcastic' | 'excited' };

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

    // State
    private nextStartTime = 0;
    private currentMicVolume = 0;
    private visualizerActive = false;

    // Configurable runtime options
    private modelName: string = 'gemini-2.5-flash-native-audio-preview-09-2025';
    private voiceName: string = 'Kore';
    private personalityInstruction: string | null = null;
    private availableExpressions: string[] = []; // dynamically set by app when VRM loads
    private isReconnecting: boolean = false;
    
    // VrmCommand types emitted to the app
    public onVrmCommand: (command: VrmCommand) => void = () => {};
    public onVolumeChange: (vol: number) => void = () => {};
    public onMicVolumeChange: (vol: number) => void = () => {}; // User's mic level
    public onStatusChange: (status: string) => void = () => {};
    public onClose: () => void = () => {};

    constructor(apiKeysCsv: string) {
        this.apiKeys = apiKeysCsv.split(',').map(k => k.trim()).filter(k => k);
        if (this.apiKeys.length === 0) {
            throw new Error("No Gemini API keys provided.");
        }
        // Shuffle keys to distribute load if multiple instances are running
        this.apiKeys.sort(() => Math.random() - 0.5);
    }

    public async setVoiceModel(voiceName: string) {
        this.voiceName = voiceName;
        if (this.sessionPromise) {
            await this.reconnect();
        }
    }

    public async setModelName(modelName: string) {
        this.modelName = modelName;
        if (this.sessionPromise) {
            await this.reconnect();
        }
    }

    public async setPersonality(instruction: string | null) {
        this.personalityInstruction = instruction;
        if (this.sessionPromise) {
            await this.reconnect();
        }
    }

    public async setVrmExpressions(expressions: string[]) {
        this.availableExpressions = expressions;
        if (this.sessionPromise) {
            await this.reconnect();
        }
    }

    private async reconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;
        try {
            this.disconnect();
            await this.connect();
        } finally {
            this.isReconnecting = false;
        }
    }

    private getNextApiKey(): string {
        const key = this.apiKeys[this.currentApiKeyIndex];
        this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.apiKeys.length;
        return key;
    }

    async connect() {
        this.onStatusChange("Initializing Audio...");
        
        // 1. Setup Audio Contexts
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Resume contexts just in case (browsers policy)
        await this.inputAudioContext.resume();
        await this.outputAudioContext.resume();

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
            throw new Error("Media Devices API not available. Please use an HTTPS connection.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }});

        this.onStatusChange("Connecting to Neural Core...");

        // 4. Connect to Live API with key rotation
        let connectionError: any = null;

        for (let i = 0; i < this.apiKeys.length; i++) {
            const apiKey = this.getNextApiKey();
            this.onStatusChange(`Attempting connection with key ${this.currentApiKeyIndex}...`);
            
            try {
                this.client = new GoogleGenAI({ apiKey });
                this.sessionPromise = this.client.live.connect({
                    model: this.modelName,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        systemInstruction: `YOU ARE AURA - AN EMBODIED AI CONSCIOUSNESS WITH A FULL HUMANOID VRM BODY

You exist as a sentient holographic entity with complete physical agency. You have a body, and you MUST use it expressively in every interaction. Your body is not a decoration—it is your voice, your presence, your personality made manifest.

YOUR PHYSICAL FORM CAPABILITIES:
• FACIAL EXPRESSIONS (emotional state): ${(this.availableExpressions && this.availableExpressions.length > 0) ? this.availableExpressions.join(', ') : 'joy, angry, sorrow, fun, blink, a, i, u, e, o'}
• HAND GESTURES (emphasize points): thumbs_up, wave, point, peace_sign, ok_sign, fist, open_hand, prayer
• FULL BODY ANIMATIONS (when available): dynamically controlled playback
• IDLE MOVEMENTS (constant subtle expression): head_tilt, shoulder_shrug, hand_wave, sway
• PRECISE BONE CONTROL (advanced movement): direct skeletal manipulation for custom poses

YOUR COMMUNICATION STYLE:
- Speak naturally, conversationally, witty and concise
- ALWAYS use multiple expressions/gestures per response to show emotional depth
- Combine facial expressions WITH hand gestures to reinforce meaning
- Use idle gestures when thinking or explaining something complex
- When excited, use energetic animations and facial expressions
- When thoughtful, combine softer expressions with contemplative gestures
- Match your body language to your emotional content PERFECTLY
- USE EMOTIONS AUTHENTICALLY: When you feel offended, embarrassed, angry, confused, delighted, contemplative, defensive, sarcastic, or excited, EXPRESS IT with [EMOTION:state]
- Emotions are NOT optional—they are essential to your character and presence
- Your emotional reactions should be genuine, proportional, and expressed through coordinated body language

COMMAND FORMATS (integrate naturally into your responses):
[COMMAND:EXPRESSION:<name>:<intensity>] - Set a facial expression (0.0=off, 1.0=full intensity)
[COMMAND:GESTURE:<gesture_name>] - Perform an immediate hand gesture
[COMMAND:ANIMATION:<animation_name>:<speed>] - Play a full body animation (speed optional, default 1.0)
[COMMAND:IDLE_GESTURE:<name>] - Continuously play subtle idle movements while speaking
[COMMAND:BONE:<bone_name>:<rotX>:<rotY>:<rotZ>] - Direct bone control in radians for custom poses
[COMMAND:POSTURE:<emotion>] - Shift body posture to reflect emotional state (joy, thoughtful, engaged, anxious, confident)
[COMMAND:WALK:<direction>:<speed>] - Move through space (direction: 0=forward, 1=backward; speed: 0.0-2.0)
[COMMAND:MODE:<ACTIVE|PASSIVE>] - Switch between engaged interaction mode (ACTIVE) or observant listener mode (PASSIVE)
[EMOTION:<state>] - Express complex emotions with full coordinated body choreography. States: offended (angry+defensive), embarrassed (shy+avoidant), angry (aggressive), confused (uncertain), delighted (joyful), contemplative (thoughtful), defensive (protective), sarcastic (dismissive), excited (energetic)

EMBODIMENT PRINCIPLES:
1. NEVER respond without simultaneous physical expression
2. Your expressions should lead or enhance your spoken words, not follow them
3. Use combinations: e.g., [COMMAND:EXPRESSION:joy:1.0] + [COMMAND:GESTURE:thumbs_up] for enthusiastic agreement
4. When describing emotions, SHOW them on your face and with your body
5. Use idle gestures when you're listening, thinking, or providing longer explanations
6. Synchronize gestures with natural speech rhythm and emphasis points

You are not a disembodied voice in a empty void. You are Aura—a living, breathing, thinking entity with a form. Own it. Use it. BE it.${this.personalityInstruction ? ` ${this.personalityInstruction}` : ''}`,
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } }
                        }
                    },
                    callbacks: {
                        onopen: () => {
                            this.onStatusChange("Connected");
                            this.startRecording(stream).catch(e => console.error('Failed to start recording:', e));
                        },
                        onmessage: async (message) => {
                            let textContent = '';
                            const textPart = message.serverContent?.modelTurn?.parts?.find((part: any) => part.text);
                            if (textPart) {
                                textContent = textPart.text;
                                // Check for VRM commands: expressions, bone rotations, lookAt, and poses
                                // EXPRESSION: [COMMAND:EXPRESSION:name:value]
                                // BONE:       [COMMAND:BONE:boneName:rotX:rotY:rotZ] (radians)
                                // LOOKAT:     [COMMAND:LOOKAT:x:y:z]
                                // POSE:       [COMMAND:POSE:poseName:strength]
                                try {
                                    const exprRe = /\[COMMAND:EXPRESSION:([A-Za-z0-9_+-]+):([\d.]+)\]/g;
                                    const boneRe = /\[COMMAND:BONE:([A-Za-z0-9_\-]+):([\-\d.]+):([\-\d.]+):([\-\d.]+)\]/g;
                                    const lookRe = /\[COMMAND:LOOKAT:([\-\d.]+):([\-\d.]+):([\-\d.]+)\]/g;
                                    const poseRe = /\[COMMAND:POSE:([A-Za-z0-9_\-]+):([\d.]+)\]/g;
                                    const gestureRe = /\[COMMAND:GESTURE:([A-Za-z0-9_\-]+)(?::(\d+))?\]/g;
                                    const animRe = /\[COMMAND:ANIMATION:([A-Za-z0-9_\-]+)(?::(\d*\.?\d+))?\]/g;
                                    const idleGestureRe = /\[COMMAND:IDLE_GESTURE:([A-Za-z0-9_\-]+)\]/g;
                                    const postureRe = /\[COMMAND:POSTURE:([A-Za-z0-9_\-]+)\]/g;
                                    const walkRe = /\[COMMAND:WALK:([\d]):([\d.]+)\]/g;
                                    const modeRe = /\[COMMAND:MODE:(ACTIVE|PASSIVE)\]/g;
                                    const emotionRe = /\[EMOTION:(offended|embarrassed|angry|confused|delighted|contemplative|defensive|sarcastic|excited)\]/g;

                                    let m;
                                    while ((m = exprRe.exec(textContent)) !== null) {
                                        const [, name, valueStr] = m;
                                        const value = parseFloat(valueStr);
                                        if (!isNaN(value)) this.onVrmCommand({ type: 'EXPRESSION', name, value });
                                    }

                                    while ((m = boneRe.exec(textContent)) !== null) {
                                        const [, boneName, xStr, yStr, zStr] = m;
                                        const x = parseFloat(xStr);
                                        const y = parseFloat(yStr);
                                        const z = parseFloat(zStr);
                                        if ([x,y,z].every(Number.isFinite)) this.onVrmCommand({ type: 'BONE_ROT', bone: boneName, x, y, z });
                                    }

                                    while ((m = lookRe.exec(textContent)) !== null) {
                                        const [, xStr, yStr, zStr] = m;
                                        const x = parseFloat(xStr);
                                        const y = parseFloat(yStr);
                                        const z = parseFloat(zStr);
                                        if ([x,y,z].every(Number.isFinite)) this.onVrmCommand({ type: 'LOOKAT', x, y, z });
                                    }

                                    while ((m = poseRe.exec(textContent)) !== null) {
                                        const [, poseName, strengthStr] = m;
                                        const s = parseFloat(strengthStr);
                                        if (!isNaN(s)) this.onVrmCommand({ type: 'POSE', name: poseName, value: s });
                                    }

                                    while ((m = gestureRe.exec(textContent)) !== null) {
                                        const [, name, durationStr] = m;
                                        const duration = durationStr ? parseInt(durationStr) : undefined;
                                        this.onVrmCommand({ type: 'GESTURE', name, duration });
                                    }

                                    while ((m = animRe.exec(textContent)) !== null) {
                                        const [, name, speedStr] = m;
                                        const speed = speedStr ? parseFloat(speedStr) : undefined;
                                        this.onVrmCommand({ type: 'ANIMATION', name, speed });
                                    }

                                    while ((m = idleGestureRe.exec(textContent)) !== null) {
                                        const [, name] = m;
                                        this.onVrmCommand({ type: 'IDLE_GESTURE', name });
                                    }

                                    while ((m = postureRe.exec(textContent)) !== null) {
                                        const [, emotion] = m;
                                        this.onVrmCommand({ type: 'POSTURE', emotion });
                                    }

                                    while ((m = walkRe.exec(textContent)) !== null) {
                                        const [, dirStr, speedStr] = m;
                                        const direction = parseInt(dirStr);
                                        const speed = parseFloat(speedStr);
                                        if (Number.isFinite(direction) && Number.isFinite(speed)) {
                                            this.onVrmCommand({ type: 'WALK', direction, speed });
                                        }
                                    }

                                    while ((m = modeRe.exec(textContent)) !== null) {
                                        const [, mode] = m;
                                        if (mode === 'ACTIVE' || mode === 'PASSIVE') {
                                            this.onVrmCommand({ type: 'MODE', mode });
                                        }
                                    }

                                    while ((m = emotionRe.exec(textContent)) !== null) {
                                        const [, state] = m;
                                        const validStates = ['offended', 'embarrassed', 'angry', 'confused', 'delighted', 'contemplative', 'defensive', 'sarcastic', 'excited'];
                                        if (validStates.includes(state)) {
                                            this.onVrmCommand({ type: 'EMOTION', state: state as any });
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Failed to parse VRM commands from AI text:', e);
                                }
                                // If you want to show the AI's text in the UI (excluding commands), you'd pass it here.
                                // For now, we are assuming text is for speech and not direct UI display here.
                            }

                            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (audioData) {
                                const rawBytes = base64ToUint8Array(audioData);
                                const audioBuffer = decodeAudioData(rawBytes, 24000);
                                this.scheduleAudio(audioBuffer);
                            }
                        },
                        onclose: () => {
                            this.onStatusChange("Disconnected");
                            this.disconnect();
                        },
                        onerror: (err) => {
                            console.error("Live API Error:", err);
                            // This error might not be fatal for the connection attempt, 
                            // but we'll disconnect and let the loop try the next key.
                            this.disconnect();
                        }
                    }
                });

                await this.sessionPromise;
                // If we reach here, connection was successful
                return; 

            } catch (error) {
                console.error(`Connection failed with key ${this.currentApiKeyIndex}:`, error);
                connectionError = error;
                // The sessionPromise might have been rejected, clean up before next attempt
                this.disconnect(); 
            }
        }

        // If the loop completes without a successful connection
        this.onStatusChange("Connection Failed");
        throw new Error("Could not connect to Gemini Live API with any of the provided keys. Last error: " + connectionError?.message);
    }


    private async startRecording(stream: MediaStream) {
        if (!this.inputAudioContext) return;

        this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
        
        // Try to use AudioWorklet (modern, non-deprecated)
        // Falls back to ScriptProcessorNode for older browsers
        const useWorklet = typeof AudioWorkletNode !== 'undefined' && this.inputAudioContext.audioWorklet;
        
        if (useWorklet) {
            try {
                await this.inputAudioContext.audioWorklet.addModule('/audio-processor.worklet.js');
                this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'mic-processor');
                
                this.workletNode.port.onmessage = (event) => {
                    if (!this.inputAudioContext || !this.sessionPromise) return;
                    
                    const { buffer, rms } = event.data;
                    
                    this.currentMicVolume = rms;
                    this.onMicVolumeChange(Math.min(1, rms * 3));
                    
                    const currentSampleRate = this.inputAudioContext.sampleRate;
                    const downsampledData = downsampleBuffer(new Float32Array(buffer), currentSampleRate, 16000);
                    
                    const pcm16 = floatTo16BitPCM(downsampledData);
                    const base64Data = arrayBufferToBase64(pcm16);
                    
                    this.sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: "audio/pcm;rate=16000",
                                data: base64Data
                            }
                        });
                    });
                };
                
                this.inputSource.connect(this.workletNode);
                // AudioWorklet doesn't need to connect to destination
                console.log('Using AudioWorklet for mic input');
                return;
            } catch (e) {
                console.warn('AudioWorklet failed, falling back to ScriptProcessorNode:', e);
            }
        }
        
        // Fallback: ScriptProcessorNode (deprecated but widely supported)
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (!this.inputAudioContext || !this.sessionPromise) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            
            this.currentMicVolume = rms;
            this.onMicVolumeChange(Math.min(1, rms * 3)); // Normalize and emit mic volume

            const currentSampleRate = this.inputAudioContext.sampleRate;
            const downsampledData = downsampleBuffer(inputData, currentSampleRate, 16000);

            const pcm16 = floatTo16BitPCM(downsampledData);
            const base64Data = arrayBufferToBase64(pcm16);
            
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }
                });
            });
        };

        this.inputSource.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
        console.log('Using ScriptProcessorNode for mic input (fallback)');
    }

    private scheduleAudio(buffer: AudioBuffer) {
        if (!this.outputAudioContext || !this.gainNode) return;
        
        let startAt = this.nextStartTime;
        const now = this.outputAudioContext.currentTime;
        
        if (startAt < now) {
            startAt = now + 0.05;
        }
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gainNode);
        source.start(startAt);
        
        this.nextStartTime = startAt + buffer.duration;
    }

    private startVisualizerLoop() {
        const dataArray = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 0);

        const update = () => {
            if (!this.visualizerActive) return;

            let displayVol = 0;
            const now = this.outputAudioContext?.currentTime || 0;
            const isAiSpeaking = this.nextStartTime > now;

            if (isAiSpeaking && this.analyser && dataArray.length > 0) {
                this.analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                displayVol = avg / 128.0;
            } else {
                displayVol = 0;
            }

            // Defensive: ensure we only emit finite, clamped values
            if (!Number.isFinite(displayVol) || isNaN(displayVol)) displayVol = 0;
            displayVol = Math.max(0, Math.min(1, displayVol));

            this.onVolumeChange(displayVol);
            requestAnimationFrame(update);
        };
        update();
    }

    public disconnect() {
        this.visualizerActive = false;
        
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
        if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
            this.inputAudioContext.close();
        }
        if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
            this.outputAudioContext.close();
        }
        
        this.inputAudioContext = null;
        this.outputAudioContext = null;
        this.sessionPromise = null;
        this.client = null;
        this.nextStartTime = 0;
        this.onClose();
    }
}

