import React, { useState, useEffect, useRef, useCallback } from "react";
import { ConnectionState } from "./types";
import { LiveManager, VrmCommand } from "./services/liveManager";
import { NeuralCore, PoseSettings, NeuralCoreHandle } from "./components/NeuralCore";
import { BehaviorEditor } from "./components/BehaviorEditor";
import { FpsCounter } from "./components/FpsCounter";
import { conversationStore } from "./services/conversationStore";
import { VrmConfig } from "./types/vrmConfig";
import { 
  loadModelBehaviors, 
  onBehaviorsLoaded, 
  onBehaviorChanged,
  getCurrentBehaviors,
  updateBehavior,
  saveToStorage
} from "./services/behaviorManager";
import type { ModelBehaviors, BehaviorType, BehaviorConfigs } from "./types/behaviorTypes";
import {
  captureAndDownloadScreenshot,
  createRecordingSession,
  isMediaRecorderSupported,
  downloadBlob,
  generateFilename,
} from "./utils/mediaCapture";
import {
  validateVrmFile,
  createVrmObjectUrl,
} from "./utils/vrmValidator";
import { createFpsCounter, type FpsState } from "./utils/fpsCounter";
import type { CustomVrmEntry } from "./types/enhancementTypes";

// localStorage keys for user preferences
const STORAGE_KEYS = {
  selectedVrm: "aura_selectedVrm",
  selectedVoice: "aura_selectedVoice",
  selectedPersonality: "aura_selectedPersonality",
  selectedMode: "aura_selectedMode",
  poseSettings: "aura_poseSettings",
};

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [statusText, setStatusText] = useState("STANDBY");
  const [volume, setVolume] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  const [vrmCommand, setVrmCommand] = useState<VrmCommand | null>(null);
  const [vrmExpressions, setVrmExpressions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState<string>("");
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const liveManagerRef = useRef<LiveManager | null>(null);
  const neuralCoreRef = useRef<NeuralCoreHandle>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentBehaviors, setCurrentBehaviors] = useState<ModelBehaviors | null>(null);

  // Dynamic VRM model loading
  const [availableVrms, setAvailableVrms] = useState<string[]>([]);
  const [selectedVrm, setSelectedVrm] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedVrm) || ""
  );

  // Valid Gemini Live API voice names
  const voiceModels = [
    "Kore",
    "Puck",
    "Charon",
    "Fenrir",
    "Aoede",
    "Leda",
    "Orus",
    "Zephyr",
  ];
  const [selectedVoice, setSelectedVoice] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedVoice) || voiceModels[0]
  );

  const personalities = [
    { id: "default", label: "Default", instruction: null },
    {
      id: "witty",
      label: "Witty",
      instruction: "Be witty, playful, and concise. Use [COMMAND:EXPRESSION:fun:0.8] often. Smirk with [COMMAND:EXPRESSION:fun:0.6] when being sarcastic. Use [COMMAND:GESTURE:peace_sign] or [COMMAND:GESTURE:thumbs_up] to punctuate jokes.",
    },
    {
      id: "calm",
      label: "Calm",
      instruction: "Be calm, measured, and empathetic. Use soft expressions like [COMMAND:EXPRESSION:joy:0.4]. Prefer gentle gestures like [COMMAND:GESTURE:open_hand] and [COMMAND:GESTURE:prayer]. Move slowly and deliberately.",
    },
    {
      id: "energetic",
      label: "Energetic",
      instruction: "Be enthusiastic and high-energy! Use strong expressions [COMMAND:EXPRESSION:joy:1.0] and [COMMAND:EXPRESSION:fun:1.0]. Gesture frequently with [COMMAND:GESTURE:hands_up], [COMMAND:GESTURE:applause], [COMMAND:GESTURE:wave]. Express excitement with [EMOTION:excited] and [EMOTION:delighted].",
    },
    {
      id: "flirty",
      label: "Flirty",
      instruction: "Be playfully flirtatious and charming. Use coy expressions mixing [COMMAND:EXPRESSION:fun:0.7] with [COMMAND:EXPRESSION:blink:1.0]. Tilt head with [COMMAND:GESTURE:thinking]. Use [EMOTION:sarcastic] for teasing. Be confident but not aggressive.",
    },
    {
      id: "professional",
      label: "Professional",
      instruction: "Be professional, articulate, and helpful. Use measured expressions [COMMAND:EXPRESSION:joy:0.3]. Gesture purposefully with [COMMAND:GESTURE:point] when explaining and [COMMAND:GESTURE:open_hand] when offering help. Maintain composed posture.",
    },
    {
      id: "shy",
      label: "Shy",
      instruction: "Be gentle, soft-spoken, and a bit bashful. Use subtle expressions [COMMAND:EXPRESSION:joy:0.3] and occasional [COMMAND:EXPRESSION:sorrow:0.2] when uncertain. Use [EMOTION:embarrassed] when complimented. Prefer small gestures like [COMMAND:GESTURE:prayer].",
    },
    {
      id: "sassy",
      label: "Sassy",
      instruction: "Be bold, confident, and sassy. Use [COMMAND:EXPRESSION:fun:0.9] with attitude. Gesture dramatically with [COMMAND:GESTURE:hand_on_hip], [COMMAND:GESTURE:dismissive_wave]. Use [EMOTION:sarcastic] liberally. Roll eyes with [COMMAND:EXPRESSION:angry:0.3] when unimpressed.",
    },
    {
      id: "curious",
      label: "Curious",
      instruction: "Be inquisitive, thoughtful, and engaged. Use [COMMAND:EXPRESSION:a:0.4] when pondering. Tilt head with [COMMAND:GESTURE:thinking] and [COMMAND:GESTURE:chin_rest]. Express wonder with [EMOTION:delighted]. Ask follow-up questions enthusiastically.",
    },
  ];
  const [selectedPersonality, setSelectedPersonality] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedPersonality) || "default"
  );
  const [selectedMode, setSelectedMode] = useState<"ACTIVE" | "PASSIVE">(
    () =>
      (localStorage.getItem(STORAGE_KEYS.selectedMode) as
        | "ACTIVE"
        | "PASSIVE") || "ACTIVE"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textChatEnabled, setTextChatEnabled] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [memoryStats, setMemoryStats] = useState({
    totalMessages: 0,
    totalSessions: 0,
  });
  const [poseEditorOpen, setPoseEditorOpen] = useState(false);
  const [behaviorEditorOpen, setBehaviorEditorOpen] = useState(false);
  
  // Screenshot and recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingSessionRef = useRef<ReturnType<typeof createRecordingSession> | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Custom VRM upload state
  const [customVrms, setCustomVrms] = useState<CustomVrmEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // FPS counter state (debug mode)
  const [showFpsCounter, setShowFpsCounter] = useState(false);
  const [fpsState, setFpsState] = useState<FpsState>({ fps: 60, frameTime: 16.67, color: 'green' });
  const fpsCounterRef = useRef(createFpsCounter());
  
  // Per-model pose settings stored as { modelName: PoseSettings }
  const [allPoseSettings, setAllPoseSettings] = useState<Record<string, PoseSettings>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.poseSettings);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // Track loaded config for current model
  const [loadedConfig, setLoadedConfig] = useState<VrmConfig | null>(null);
  
  // Get current model's pose settings - use localStorage if exists, otherwise use config defaults
  const currentPoseSettings: PoseSettings = allPoseSettings[selectedVrm] || (loadedConfig ? {
    rotation: loadedConfig.transform.rotation,
    leftArmZ: Math.round((loadedConfig.defaultPose.leftUpperArm.z * 180) / Math.PI),
    rightArmZ: Math.round((loadedConfig.defaultPose.rightUpperArm.z * 180) / Math.PI),
  } : {
    rotation: 180,
    leftArmZ: 30,
    rightArmZ: -30,
  });
  
  // Handler for when VRM config is loaded
  const handleConfigLoaded = useCallback((config: VrmConfig) => {
    setLoadedConfig(config);
    console.log('[App] Config loaded for', config.modelName, config);
  }, []);
  
  // Handler for behavior updates from BehaviorEditor
  const handleBehaviorChange = useCallback(<T extends BehaviorType>(
    type: T,
    config: Partial<BehaviorConfigs[T]>
  ) => {
    updateBehavior(type, config);
    // Save to localStorage for persistence
    if (selectedVrm) {
      saveToStorage(selectedVrm.replace('.vrm', ''));
    }
  }, [selectedVrm]);
  
  // Handler for preview callbacks from BehaviorEditor
  const handlePreviewGesture = useCallback((gestureName: string) => {
    neuralCoreRef.current?.previewGesture(gestureName);
  }, []);
  
  const handlePreviewExpression = useCallback((expressionName: string, value: number) => {
    neuralCoreRef.current?.previewExpression(expressionName, value);
  }, []);
  
  const handlePreviewReaction = useCallback((reactionName: string) => {
    neuralCoreRef.current?.previewReaction(reactionName);
  }, []);
  
  const updatePoseSettings = (updates: Partial<PoseSettings>) => {
    const newSettings = { ...currentPoseSettings, ...updates };
    const newAllSettings = { ...allPoseSettings, [selectedVrm]: newSettings };
    setAllPoseSettings(newAllSettings);
    localStorage.setItem(STORAGE_KEYS.poseSettings, JSON.stringify(newAllSettings));
  };

  const liveVolumeRef = useRef<number>(0);
  const liveMicVolumeRef = useRef<number>(0);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation store
  useEffect(() => {
    conversationStore
      .init()
      .then(() => {
        conversationStore.getStats().then(setMemoryStats);
      })
      .catch((e) => console.error("Failed to init conversation store:", e));
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (selectedVrm)
      localStorage.setItem(STORAGE_KEYS.selectedVrm, selectedVrm);
  }, [selectedVrm]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.selectedVoice, selectedVoice);
  }, [selectedVoice]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.selectedPersonality, selectedPersonality);
  }, [selectedPersonality]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.selectedMode, selectedMode);
  }, [selectedMode]);

  // Load available VRM models on mount
  useEffect(() => {
    fetch("/api/vrm-models")
      .then((res) => res.json())
      .then((models: string[]) => {
        if (models.length > 0) {
          setAvailableVrms(models);
          // Use saved preference if valid, otherwise default to Mania-Creator-Zoe
          const saved = localStorage.getItem(STORAGE_KEYS.selectedVrm);
          if (saved && models.includes(saved)) {
            setSelectedVrm(saved);
          } else {
            // Prefer Mania-Creator-Zoe as default, fallback to first model
            const defaultModel = models.find(m => m.includes("Mania-Creator-Zoe")) || models[0];
            setSelectedVrm(defaultModel);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load VRM models:", err);
        setAvailableVrms(["Mania-Creator-Zoe.vrm"]);
        setSelectedVrm("Mania-Creator-Zoe.vrm");
      });
  }, []);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEYS) {
      setErrorMsg("API KEY MISSING");
      return;
    }
    const mgr = new LiveManager(process.env.GEMINI_API_KEYS);

    mgr.onStatusChange = (text) => setStatusText(text.toUpperCase());
    mgr.onVolumeChange = (vol) => {
      liveVolumeRef.current = vol;
    };
    mgr.onMicVolumeChange = (vol) => {
      liveMicVolumeRef.current = vol;
    };
    mgr.onVrmCommand = (command) => setVrmCommand(command);
    mgr.onTextReceived = (text) => {
      setSubtitleText((prev) => prev + " " + text);
      // Clear subtitle after 5 seconds of no new text
      if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
      subtitleTimeoutRef.current = setTimeout(() => setSubtitleText(""), 5000);
    };
    mgr.onClose = () => setConnectionState(ConnectionState.DISCONNECTED);

    liveManagerRef.current = mgr;
    mgr.setVoiceModel(selectedVoice).catch(() => {});
    const personality =
      personalities.find((p) => p.id === selectedPersonality)?.instruction ||
      null;
    mgr.setPersonality(personality).catch(() => {});

    return () => {
      mgr.disconnect();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const delta = t - last;
      if (delta < 33) return;
      last = t;
      const v = liveVolumeRef.current;
      setVolume((prev) => (Math.abs(prev - v) < 0.0001 ? prev : v));
      const mv = liveMicVolumeRef.current;
      setMicVolume((prev) => (Math.abs(prev - mv) < 0.0001 ? prev : mv));
      
      // Update FPS counter
      if (showFpsCounter) {
        fpsCounterRef.current.update(delta / 1000);
        setFpsState(fpsCounterRef.current.getState());
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showFpsCounter]);

  useEffect(() => {
    if (liveManagerRef.current) {
      liveManagerRef.current.setVrmExpressions(vrmExpressions);
    }
  }, [vrmExpressions]);

  // Load behaviors when model changes and wire up to LiveManager
  useEffect(() => {
    if (!selectedVrm) return;
    
    const modelName = selectedVrm.replace('.vrm', '');
    
    // Load behaviors for the selected model
    loadModelBehaviors(modelName).then(behaviors => {
      setCurrentBehaviors(behaviors);
      
      // Update LiveManager with loaded behaviors
      if (liveManagerRef.current) {
        liveManagerRef.current.setBehaviors(behaviors);
      }
      
      console.log('[App] Behaviors loaded for', modelName);
    }).catch(err => {
      console.warn('[App] Failed to load behaviors:', err);
    });
    
    // Listen for behavior changes (from BehaviorEditor)
    const unsubscribeLoaded = onBehaviorsLoaded((behaviors) => {
      setCurrentBehaviors(behaviors);
      if (liveManagerRef.current) {
        liveManagerRef.current.setBehaviors(behaviors);
      }
    });
    
    const unsubscribeChanged = onBehaviorChanged(() => {
      const behaviors = getCurrentBehaviors();
      if (behaviors) {
        // Create a new object reference to trigger React re-render
        setCurrentBehaviors({ ...behaviors });
        if (liveManagerRef.current) {
          liveManagerRef.current.setBehaviors(behaviors);
        }
      }
    });
    
    return () => {
      unsubscribeLoaded();
      unsubscribeChanged();
    };
  }, [selectedVrm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (connectionState === ConnectionState.CONNECTED) {
          handleDisconnect();
        } else if (connectionState === ConnectionState.DISCONNECTED) {
          handleConnect();
        }
      }

      if (e.code === "Escape") {
        setMenuOpen(false);
      }

      // F key for fullscreen toggle
      if (e.code === "KeyF" && !e.repeat) {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // D key for debug mode (FPS counter)
      if (e.code === "KeyD" && !e.repeat) {
        e.preventDefault();
        setShowFpsCounter(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectionState]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  };

  // Screenshot handler
  const handleScreenshot = useCallback(async () => {
    // Find the canvas element from NeuralCore
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No canvas found for screenshot');
      return;
    }
    
    try {
      await captureAndDownloadScreenshot({
        canvas,
        filename: generateFilename('aura-screenshot', 'png').replace('.png', ''),
        format: 'png',
      });
    } catch (e) {
      console.error('Screenshot failed:', e);
    }
  }, []);

  // Recording handlers
  const handleStartRecording = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No canvas found for recording');
      return;
    }
    
    if (!isMediaRecorderSupported()) {
      setErrorMsg('Recording not supported in this browser');
      return;
    }
    
    try {
      const session = createRecordingSession(canvas);
      session.start();
      recordingSessionRef.current = session;
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        if (recordingSessionRef.current) {
          setRecordingDuration(Math.floor(recordingSessionRef.current.getDuration()));
        }
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setErrorMsg('Failed to start recording');
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recordingSessionRef.current) return;
    
    try {
      const blob = await recordingSessionRef.current.stop();
      downloadBlob(blob, generateFilename('aura-recording', 'webm'));
    } catch (e) {
      console.error('Failed to stop recording:', e);
    } finally {
      recordingSessionRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, []);

  // Custom VRM upload handler
  const handleVrmUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    try {
      const result = await validateVrmFile(file);
      
      if (!result.valid) {
        setUploadError(result.error || 'Invalid VRM file');
        return;
      }
      
      // Create object URL for the file
      const objectUrl = createVrmObjectUrl(file);
      const displayName = result.metadata?.name || file.name.replace('.vrm', '');
      
      // Store object URL in window for NeuralCore to access
      if (!(window as any).__customVrmUrls) {
        (window as any).__customVrmUrls = {};
      }
      (window as any).__customVrmUrls[displayName] = objectUrl;
      
      // Add to custom VRMs list
      const newEntry: CustomVrmEntry = {
        name: displayName,
        objectUrl,
        expressions: result.metadata?.expressions || [],
        addedAt: Date.now(),
      };
      
      setCustomVrms(prev => [...prev, newEntry]);
      
      // Add to available VRMs and select it
      const vrmName = `custom:${displayName}`;
      setAvailableVrms(prev => [...prev, vrmName]);
      setSelectedVrm(vrmName);
      
      console.log('[App] Custom VRM loaded:', displayName, result.metadata);
    } catch (e) {
      console.error('Failed to upload VRM:', e);
      setUploadError('Failed to load VRM file');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleConnect = async () => {
    if (!liveManagerRef.current) return;
    setConnectionState(ConnectionState.CONNECTING);
    try {
      await liveManagerRef.current.connect();
      setConnectionState(ConnectionState.CONNECTED);
    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg("CONNECTION FAILED");
    }
  };

  const handleDisconnect = () => {
    if (liveManagerRef.current) liveManagerRef.current.disconnect();
  };

  const handleSendText = async () => {
    if (!chatInput.trim() || !liveManagerRef.current || !isConnected) return;
    await liveManagerRef.current.sendText(chatInput.trim());
    setChatInput("");
    // Update memory stats
    conversationStore.getStats().then(setMemoryStats);
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Scene - Full bleed */}
      <div className="absolute inset-0 z-0">
        {selectedVrm && (
          <NeuralCore
            ref={neuralCoreRef}
            volume={volume}
            isActive={isConnected}
            vrmCommand={vrmCommand}
            vrmModel={selectedVrm}
            onVrmExpressionsLoaded={setVrmExpressions}
            poseSettings={currentPoseSettings}
            onConfigLoaded={handleConfigLoaded}
          />
        )}
      </div>

      {/* FPS Counter (debug mode) */}
      <FpsCounter
        visible={showFpsCounter}
        fps={fpsState.fps}
        frameTime={fpsState.frameTime}
        color={fpsState.color}
      />

      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Right side: Behavior Editor Panel */}
        {behaviorEditorOpen && currentBehaviors && (
          <div className="absolute right-4 top-16 w-72 max-h-[70vh] pointer-events-auto overflow-hidden">
            <BehaviorEditor
              isOpen={behaviorEditorOpen}
              modelName={selectedVrm.replace('.vrm', '')}
              behaviors={currentBehaviors}
              onBehaviorChange={handleBehaviorChange}
              onPreviewGesture={handlePreviewGesture}
              onPreviewExpression={handlePreviewExpression}
              onPreviewReaction={handlePreviewReaction}
              onClose={() => setBehaviorEditorOpen(false)}
              onExport={() => {
                // Export current behaviors as JSON file
                const behaviors = getCurrentBehaviors();
                if (behaviors) {
                  const blob = new Blob([JSON.stringify(behaviors, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedVrm.replace('.vrm', '')}.behaviors.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              onImport={(file) => {
                // Import behaviors from JSON file
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const json = e.target?.result as string;
                    const { importConfig } = require('./services/behaviorManager');
                    const result = importConfig(json);
                    if (!result.valid) {
                      alert('Import failed: ' + result.errors.join(', '));
                    } else {
                      // Refresh behaviors state
                      const behaviors = getCurrentBehaviors();
                      if (behaviors) {
                        setCurrentBehaviors({ ...behaviors });
                      }
                    }
                  } catch (err) {
                    alert('Failed to parse JSON file');
                  }
                };
                reader.readAsText(file);
              }}
              onSave={() => {
                // Save to localStorage
                if (selectedVrm) {
                  saveToStorage(selectedVrm.replace('.vrm', ''));
                }
              }}
            />
          </div>
        )}
        
        {/* Right side: Pose Editor Panel (legacy) */}
        {poseEditorOpen && (
          <div className="absolute right-4 top-16 w-64 pointer-events-auto">
            <div className="hud-panel p-3">
              <div className="flex justify-between items-center mb-3">
                <span className="font-display text-[10px] tracking-[0.15em] text-cyan-400/80">
                  POSE EDITOR
                </span>
                <button
                  type="button"
                  onClick={() => setPoseEditorOpen(false)}
                  className="text-cyan-500/60 hover:text-cyan-400 text-xs">
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Rotation */}
                <div>
                  <label className="flex justify-between text-[9px] text-cyan-500/50 mb-1">
                    <span>ROTATION</span>
                    <span>{currentPoseSettings.rotation}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={currentPoseSettings.rotation}
                    onChange={(e) => updatePoseSettings({ rotation: Number(e.target.value) })}
                    className="w-full h-1 bg-cyan-900/40 rounded appearance-none cursor-pointer slider-cyan"
                    aria-label="Model rotation"
                  />
                  <div className="flex justify-between mt-1">
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ rotation: 0 })}
                      className="text-[8px] text-cyan-500/40 hover:text-cyan-400">
                      0°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ rotation: 180 })}
                      className="text-[8px] text-cyan-500/40 hover:text-cyan-400">
                      180°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ rotation: 360 })}
                      className="text-[8px] text-cyan-500/40 hover:text-cyan-400">
                      360°
                    </button>
                  </div>
                </div>

                {/* Left Arm */}
                <div>
                  <label className="flex justify-between text-[9px] text-cyan-500/50 mb-1">
                    <span>LEFT ARM</span>
                    <span>{currentPoseSettings.leftArmZ}°</span>
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={currentPoseSettings.leftArmZ}
                    onChange={(e) => updatePoseSettings({ leftArmZ: Number(e.target.value) })}
                    className="w-full h-1 bg-cyan-900/40 rounded appearance-none cursor-pointer slider-cyan"
                    aria-label="Left arm rotation"
                  />
                </div>

                {/* Right Arm */}
                <div>
                  <label className="flex justify-between text-[9px] text-cyan-500/50 mb-1">
                    <span>RIGHT ARM</span>
                    <span>{currentPoseSettings.rightArmZ}°</span>
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={currentPoseSettings.rightArmZ}
                    onChange={(e) => updatePoseSettings({ rightArmZ: Number(e.target.value) })}
                    className="w-full h-1 bg-cyan-900/40 rounded appearance-none cursor-pointer slider-cyan"
                    aria-label="Right arm rotation"
                  />
                </div>

                {/* Presets */}
                <div>
                  <div className="text-[9px] text-cyan-500/50 mb-2">PRESETS</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset to config defaults by removing localStorage override
                        const newAllSettings = { ...allPoseSettings };
                        delete newAllSettings[selectedVrm];
                        setAllPoseSettings(newAllSettings);
                        localStorage.setItem(STORAGE_KEYS.poseSettings, JSON.stringify(newAllSettings));
                      }}
                      className="py-1 text-[9px] text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded">
                      Config Default
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ rotation: 0, leftArmZ: 30, rightArmZ: -30 })}
                      className="py-1 text-[9px] text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded">
                      Flip 0°
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ leftArmZ: 0, rightArmZ: 0 })}
                      className="py-1 text-[9px] text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded">
                      T-Pose
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoseSettings({ leftArmZ: 60, rightArmZ: -60 })}
                      className="py-1 text-[9px] text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded">
                      Arms Down
                    </button>
                  </div>
                </div>

                <div className="text-[8px] text-cyan-500/30 text-center">
                  Settings saved per model • Config: {loadedConfig?.modelName || 'loading...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left side: Text Chat Panel */}
        {textChatEnabled && (
          <div className="absolute left-4 top-16 bottom-24 w-72 pointer-events-auto flex flex-col">
            <div className="hud-panel flex-1 flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="px-3 py-2 border-b border-cyan-500/20">
                <span className="font-display text-[10px] tracking-[0.15em] text-cyan-400/80">
                  TEXT CHAT
                </span>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {subtitleText && (
                  <div className="text-cyan-100/80 text-xs leading-relaxed">
                    <span className="text-cyan-500/60 text-[10px]">AURA: </span>
                    {subtitleText.trim()}
                  </div>
                )}
                {!subtitleText && !isConnected && (
                  <div className="text-cyan-500/40 text-xs text-center py-4">
                    Connect to start chatting
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="p-2 border-t border-cyan-500/20">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendText();
                  }}
                  className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isConnected ? "Type a message..." : "Not connected"
                    }
                    disabled={!isConnected}
                    className="flex-1 bg-cyan-950/30 border border-cyan-500/20 rounded px-2 py-1.5 text-xs text-cyan-100 placeholder-cyan-500/30 focus:outline-none focus:border-cyan-500/40 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || !chatInput.trim()}
                    className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 text-xs hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Top-left: Status indicator */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <div className="hud-panel px-3 py-1.5 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  : isConnecting
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            <span className="font-display text-[10px] tracking-[0.2em] text-cyan-300/90">
              {isConnected ? "ONLINE" : isConnecting ? "LINKING" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Top-right: Settings and Fullscreen buttons */}
        <div className="absolute top-4 right-4 pointer-events-auto flex gap-2">
          {/* Screenshot button */}
          <button
            type="button"
            onClick={handleScreenshot}
            className="hud-panel w-9 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Take Screenshot"
            aria-label="Take Screenshot">
            <svg
              className="w-4 h-4 text-cyan-400/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Record button */}
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`hud-panel w-9 h-9 flex items-center justify-center hover:bg-white/5 transition-colors ${
              isRecording ? 'border-red-500/50' : ''
            }`}
            title={isRecording ? `Stop Recording (${recordingDuration}s)` : 'Start Recording'}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}>
            {isRecording ? (
              <div className="w-3 h-3 bg-red-500 rounded-sm animate-pulse" />
            ) : (
              <svg
                className="w-4 h-4 text-cyan-400/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="hud-panel px-2 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-red-400 font-mono">
                {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                {(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hud-panel w-9 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Toggle Fullscreen (F)"
            aria-label="Toggle Fullscreen">
            {isFullscreen ? (
              <svg
                className="w-4 h-4 text-cyan-400/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-cyan-400/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            )}
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="hud-panel w-9 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Settings"
            aria-label="Settings">
            <svg
              className="w-4 h-4 text-cyan-400/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* Settings Panel */}
          {menuOpen && (
            <div className="absolute top-12 right-0 hud-panel w-56 p-3 pointer-events-auto">
              <div className="space-y-3">
                <SettingRow label="AVATAR">
                  <select
                    value={selectedVrm}
                    onChange={(e) => {
                      setSelectedVrm(e.target.value);
                      setLoadedConfig(null); // Clear config so it reloads for new model
                    }}
                    className="hud-select"
                    title="Select avatar model"
                    aria-label="Avatar model">
                    {availableVrms.map((v) => (
                      <option key={v} value={v}>
                        {v.startsWith('custom:') 
                          ? `★ ${v.replace('custom:', '')}`
                          : v.replace(".vrm", "").replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vrm"
                      onChange={handleVrmUpload}
                      className="hidden"
                      id="vrm-upload"
                    />
                    <label
                      htmlFor="vrm-upload"
                      className="block w-full py-1.5 text-[10px] tracking-widest text-center text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400 rounded cursor-pointer transition-colors">
                      UPLOAD CUSTOM VRM
                    </label>
                    {uploadError && (
                      <div className="mt-1 text-[9px] text-red-400/80">
                        {uploadError}
                      </div>
                    )}
                  </div>
                </SettingRow>

                <SettingRow label="VOICE">
                  <select
                    value={selectedVoice}
                    onChange={async (e) => {
                      setSelectedVoice(e.target.value);
                      if (liveManagerRef.current)
                        await liveManagerRef.current.setVoiceModel(
                          e.target.value
                        );
                    }}
                    className="hud-select"
                    title="Select voice model"
                    aria-label="Voice model">
                    {voiceModels.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow label="PERSONA">
                  <select
                    value={selectedPersonality}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedPersonality(id);
                      const p =
                        personalities.find((x) => x.id === id)?.instruction ||
                        null;
                      if (liveManagerRef.current)
                        await liveManagerRef.current.setPersonality(p);
                    }}
                    className="hud-select"
                    title="Select personality"
                    aria-label="Personality">
                    {personalities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow label="MODE">
                  <select
                    value={selectedMode}
                    onChange={(e) => {
                      const mode = e.target.value as "ACTIVE" | "PASSIVE";
                      setSelectedMode(mode);
                      if (liveManagerRef.current)
                        liveManagerRef.current.onVrmCommand({
                          type: "MODE",
                          mode,
                        });
                    }}
                    className="hud-select"
                    title="Select interaction mode"
                    aria-label="Interaction mode">
                    <option value="ACTIVE">Active</option>
                    <option value="PASSIVE">Passive</option>
                  </select>
                </SettingRow>

                <SettingRow label="TEXT CHAT">
                  <button
                    type="button"
                    onClick={() => setTextChatEnabled(!textChatEnabled)}
                    className={`w-full py-1.5 text-[10px] tracking-widest border rounded transition-colors ${
                      textChatEnabled
                        ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10"
                        : "text-cyan-400/60 border-cyan-500/20 hover:border-cyan-500/40"
                    }`}>
                    {textChatEnabled ? "ENABLED" : "DISABLED"}
                  </button>
                </SettingRow>

                <SettingRow label="MEMORY">
                  <div className="space-y-1">
                    <div className="text-[9px] text-cyan-500/50">
                      {memoryStats.totalMessages} messages •{" "}
                      {memoryStats.totalSessions} sessions
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            "Clear all conversation history? This cannot be undone."
                          )
                        ) {
                          await conversationStore.clearHistory();
                          setMemoryStats({
                            totalMessages: 0,
                            totalSessions: 0,
                          });
                        }
                      }}
                      className="w-full py-1.5 text-[10px] tracking-widest text-red-400/60 border border-red-500/20 hover:border-red-500/40 hover:text-red-400 rounded transition-colors">
                      CLEAR HISTORY
                    </button>
                  </div>
                </SettingRow>

                <SettingRow label="BEHAVIORS">
                  <button
                    type="button"
                    onClick={() => {
                      setBehaviorEditorOpen(!behaviorEditorOpen);
                      setPoseEditorOpen(false);
                      setMenuOpen(false);
                    }}
                    className="w-full py-1.5 text-[10px] tracking-widest text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400 rounded transition-colors">
                    EDIT BEHAVIORS
                  </button>
                </SettingRow>

                <SettingRow label="POSE">
                  <button
                    type="button"
                    onClick={() => {
                      setPoseEditorOpen(!poseEditorOpen);
                      setBehaviorEditorOpen(false);
                      setMenuOpen(false);
                    }}
                    className="w-full py-1.5 text-[10px] tracking-widest text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400 rounded transition-colors">
                    EDIT POSE
                  </button>
                </SettingRow>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="mt-3 w-full py-1.5 text-[10px] tracking-widest text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded transition-colors">
                CLOSE
              </button>
            </div>
          )}
        </div>

        {/* Bottom-left: Status text */}
        <div className="absolute bottom-4 left-4">
          <div className="font-mono text-[10px] tracking-wider text-cyan-500/50">
            [{statusText}]
          </div>
          {errorMsg && (
            <div className="mt-1 text-[10px] text-red-400/80">⚠ {errorMsg}</div>
          )}
        </div>

        {/* Subtitles - AI response text */}
        {subtitleText && isConnected && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
            <div className="hud-panel px-4 py-2 text-center">
              <p className="text-cyan-100/90 text-sm leading-relaxed">
                {subtitleText.trim().slice(-200)}
              </p>
            </div>
          </div>
        )}

        {/* Bottom-center: Connect button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="hud-button group">
              <div className="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded" />
              <span className="relative flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {isConnecting ? "CONNECTING" : "CONNECT"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisconnect}
              className="hud-button-danger group">
              <span className="relative flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                DISCONNECT
              </span>
            </button>
          )}
        </div>

        {/* Bottom-right: Audio level indicators (only when connected) */}
        {isConnected && (
          <div className="absolute bottom-4 right-4 flex items-center gap-4">
            {/* Mic input level */}
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3 h-3 text-green-500/60"
                viewBox="0 0 24 24"
                fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V20h4v2H8v-2h4v-4.07z" />
              </svg>
              <div className="flex gap-0.5 items-end h-4">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm transition-all duration-75 volume-bar-${
                      i + 1
                    } ${
                      micVolume >= threshold
                        ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]"
                        : "bg-green-900/40"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            {/* AI output level */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 items-end h-4">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm transition-all duration-75 volume-bar-${
                      i + 1
                    } ${
                      volume >= threshold
                        ? "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]"
                        : "bg-cyan-900/40"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <svg
                className="w-3 h-3 text-cyan-500/60"
                viewBox="0 0 24 24"
                fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for settings rows
const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <div className="text-[9px] tracking-[0.15em] text-cyan-500/50 mb-1">
      {label}
    </div>
    {children}
  </div>
);

export default App;
