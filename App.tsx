import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState } from './types';
import { LiveManager, VrmCommand } from './services/liveManager';
import { NeuralCore } from './components/NeuralCore';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [statusText, setStatusText] = useState("STANDBY");
  const [volume, setVolume] = useState(0);
  const [vrmCommand, setVrmCommand] = useState<VrmCommand | null>(null);
  const [vrmExpressions, setVrmExpressions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const liveManagerRef = useRef<LiveManager | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Dynamic VRM model loading
  const [availableVrms, setAvailableVrms] = useState<string[]>([]);
  const [selectedVrm, setSelectedVrm] = useState<string>('');

  const voiceModels = ['Kore', 'Ava', 'Deep', 'Neutral'];
  const [selectedVoice, setSelectedVoice] = useState<string>(voiceModels[0]);

  const personalities = [
    { id: 'default', label: 'Default', instruction: null },
    { id: 'witty', label: 'Witty', instruction: "You are Aura: witty, playful, concise." },
    { id: 'calm', label: 'Calm', instruction: "You are Aura: calm, measured, empathetic." }
  ];
  const [selectedPersonality, setSelectedPersonality] = useState<string>('default');
  const [selectedMode, setSelectedMode] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');

  const liveVolumeRef = useRef<number>(0);

  // Load available VRM models on mount
  useEffect(() => {
    fetch('/api/vrm-models')
      .then(res => res.json())
      .then((models: string[]) => {
        if (models.length > 0) {
          setAvailableVrms(models);
          setSelectedVrm(models[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load VRM models:', err);
        // Fallback to a default if API fails
        setAvailableVrms(['AvatarSample_D.vrm']);
        setSelectedVrm('AvatarSample_D.vrm');
      });
  }, []);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEYS) {
      setErrorMsg("API KEY MISSING");
      return;
    }
    const mgr = new LiveManager(process.env.GEMINI_API_KEYS);
    
    mgr.onStatusChange = (text) => setStatusText(text.toUpperCase());
    mgr.onVolumeChange = (vol) => { liveVolumeRef.current = vol; };
    mgr.onVrmCommand = (command) => setVrmCommand(command);
    mgr.onClose = () => setConnectionState(ConnectionState.DISCONNECTED);

    liveManagerRef.current = mgr;
    mgr.setVoiceModel(selectedVoice).catch(() => {});
    const personality = personalities.find(p => p.id === selectedPersonality)?.instruction || null;
    mgr.setPersonality(personality).catch(() => {});

    return () => { mgr.disconnect(); };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      const v = liveVolumeRef.current;
      setVolume(prev => Math.abs(prev - v) < 0.0001 ? prev : v);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (liveManagerRef.current) {
      liveManagerRef.current.setVrmExpressions(vrmExpressions);
    }
  }, [vrmExpressions]);

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

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      
      {/* 3D Scene - Full bleed */}
      <div className="absolute inset-0 z-0">
        {selectedVrm && (
          <NeuralCore 
            volume={volume} 
            isActive={isConnected}
            vrmCommand={vrmCommand}
            vrmModel={selectedVrm}
            onVrmExpressionsLoaded={setVrmExpressions}
          />
        )}
      </div>

      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Top-left: Status indicator */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <div className="hud-panel px-3 py-1.5 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="font-display text-[10px] tracking-[0.2em] text-cyan-300/90">
              {isConnected ? 'ONLINE' : isConnecting ? 'LINKING' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Top-right: Settings button */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="hud-panel w-9 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <svg className="w-4 h-4 text-cyan-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                    onChange={(e) => setSelectedVrm(e.target.value)} 
                    className="hud-select"
                    title="Select avatar model"
                    aria-label="Avatar model"
                  >
                    {availableVrms.map(v => (
                      <option key={v} value={v}>{v.replace('.vrm','').replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow label="VOICE">
                  <select 
                    value={selectedVoice} 
                    onChange={async (e) => { 
                      setSelectedVoice(e.target.value); 
                      if (liveManagerRef.current) await liveManagerRef.current.setVoiceModel(e.target.value); 
                    }} 
                    className="hud-select"
                    title="Select voice model"
                    aria-label="Voice model"
                  >
                    {voiceModels.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </SettingRow>

                <SettingRow label="PERSONA">
                  <select 
                    value={selectedPersonality} 
                    onChange={async (e) => { 
                      const id = e.target.value; 
                      setSelectedPersonality(id); 
                      const p = personalities.find(x => x.id === id)?.instruction || null; 
                      if (liveManagerRef.current) await liveManagerRef.current.setPersonality(p); 
                    }} 
                    className="hud-select"
                    title="Select personality"
                    aria-label="Personality"
                  >
                    {personalities.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </SettingRow>

                <SettingRow label="MODE">
                  <select 
                    value={selectedMode} 
                    onChange={(e) => { 
                      const mode = e.target.value as 'ACTIVE' | 'PASSIVE'; 
                      setSelectedMode(mode); 
                      if (liveManagerRef.current) liveManagerRef.current.onVrmCommand({ type: 'MODE', mode }); 
                    }} 
                    className="hud-select"
                    title="Select interaction mode"
                    aria-label="Interaction mode"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PASSIVE">Passive</option>
                  </select>
                </SettingRow>
              </div>

              <button 
                onClick={() => setMenuOpen(false)} 
                className="mt-3 w-full py-1.5 text-[10px] tracking-widest text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded transition-colors"
              >
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
            <div className="mt-1 text-[10px] text-red-400/80">
              ⚠ {errorMsg}
            </div>
          )}
        </div>

        {/* Bottom-center: Connect button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          {!isConnected ? (
            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="hud-button group"
            >
              <div className="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded" />
              <span className="relative flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isConnecting ? 'CONNECTING' : 'CONNECT'}
              </span>
            </button>
          ) : (
            <button 
              onClick={handleDisconnect}
              className="hud-button-danger group"
            >
              <span className="relative flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                DISCONNECT
              </span>
            </button>
          )}
        </div>

        {/* Bottom-right: Audio level indicator (only when connected) */}
        {isConnected && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
            <div className="flex gap-0.5 items-end h-4">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                <div 
                  key={i}
                  className={`w-1 rounded-sm transition-all duration-75 ${
                    volume >= threshold 
                      ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]' 
                      : 'bg-cyan-900/40'
                  }`}
                  style={{ height: `${(i + 1) * 3 + 4}px` }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="font-mono text-[9px] text-cyan-500/40 tracking-wider">VOL</span>
          </div>
        )}

      </div>
    </div>
  );
};

// Helper component for settings rows
const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[9px] tracking-[0.15em] text-cyan-500/50 mb-1">{label}</div>
    {children}
  </div>
);

export default App;
