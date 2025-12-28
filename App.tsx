
import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState } from './types';
import { LiveManager, VrmCommand } from './services/liveManager';
import { NeuralCore } from './components/NeuralCore';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [statusText, setStatusText] = useState("System Standby");
  const [volume, setVolume] = useState(0);
  const [vrmCommand, setVrmCommand] = useState<VrmCommand | null>(null);
  const [vrmExpressions, setVrmExpressions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const liveManagerRef = useRef<LiveManager | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const availableVrms = [
    'Arlecchino-Battle_look.vrm',
    'Arlecchino-Normal_look.vrm',
    'AvatarSample_D.vrm',
    'Furina.vrm',
    'Hu_Tao.vrm',
    'Navia.vrm',
    'Skirk.vrm'
  ];
  const [selectedVrm, setSelectedVrm] = useState<string>(availableVrms[1]);

  const voiceModels = ['Kore', 'Ava', 'Deep', 'Neutral'];
  const [selectedVoice, setSelectedVoice] = useState<string>(voiceModels[0]);

  const personalities = [
    { id: 'default', label: 'Default Aura', instruction: null },
    { id: 'witty', label: 'Witty Assistant', instruction: "You are Aura: witty, playful, concise." },
    { id: 'calm', label: 'Calm Guide', instruction: "You are Aura: calm, measured, empathetic." }
  ];
  const [selectedPersonality, setSelectedPersonality] = useState<string>('default');
  const [selectedMode, setSelectedMode] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');
  // Debug command panel (dev-only)
  const [debugCmdText, setDebugCmdText] = useState<string>('');

  // Local ref used by the LiveManager hook above (attached at runtime) to reduce setState frequency
  const liveVolumeRef = useRef<number>(0);

  // Initialize LiveManager on mount (but don't connect yet)
  useEffect(() => {
    if (!process.env.GEMINI_API_KEYS) {
      setErrorMsg("GEMINI_API_KEYS environment variable missing.");
      return;
    }
    const mgr = new LiveManager(process.env.GEMINI_API_KEYS);
    
    mgr.onStatusChange = (text) => setStatusText(text);
    // Throttle volume updates: assign into a ref to avoid per-frame React state churn
    mgr.onVolumeChange = (vol) => {
      liveVolumeRef.current = vol;
    };
    mgr.onVrmCommand = (command) => setVrmCommand(command);
    mgr.onClose = () => setConnectionState(ConnectionState.DISCONNECTED);

    liveManagerRef.current = mgr;

    // apply initial selected voice/personality if set
    mgr.setVoiceModel(selectedVoice).catch(() => {});
    const personality = personalities.find(p => p.id === selectedPersonality)?.instruction || null;
    mgr.setPersonality(personality).catch(() => {});

    return () => {
      mgr.disconnect();
    };
  }, []);

  // Throttled updater: copy liveVolumeRef to state at ~30Hz to keep React updates reasonable
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return; // ~30 FPS
      last = t;
      const v = liveVolumeRef.current;
      setVolume(prev => {
        // small check to avoid unnecessary updates
        if (Math.abs(prev - v) < 0.0001) return prev;
        return v;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // When VRM expressions are loaded, update LiveManager
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
      setErrorMsg("Failed to establish neural link.");
    }
  };

  const handleDisconnect = () => {
    if (liveManagerRef.current) {
      liveManagerRef.current.disconnect();
    }
  };

  // UI Helper for status color
  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED: return "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]";
      case ConnectionState.CONNECTING: return "text-yellow-400 animate-pulse";
      case ConnectionState.ERROR: return "text-red-500";
      default: return "text-slate-500";
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-black overflow-hidden items-center justify-between">
      
      {/* Background Grid Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      {/* Main 3D Container */}
      <div className="relative z-10 w-full flex-grow flex items-center justify-center">
        <NeuralCore 
          volume={volume} 
          isActive={connectionState === ConnectionState.CONNECTED}
          vrmCommand={vrmCommand}
          vrmModel={selectedVrm}
          onVrmExpressionsLoaded={setVrmExpressions}
        />
      </div>

      {/* Top-right burger menu */}
      <div className="absolute top-4 right-4 z-30">
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 bg-black/60 border border-cyan-600 rounded-lg text-cyan-300">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {menuOpen && (
            <div className="mt-2 w-72 bg-black/80 border border-cyan-800 rounded-lg p-4 text-sm text-cyan-100">
              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-1">Avatar Model</div>
                <select value={selectedVrm} onChange={(e) => setSelectedVrm(e.target.value)} className="w-full bg-transparent border border-slate-800 rounded px-2 py-1">
                  {availableVrms.map(v => <option key={v} value={v}>{v.replace('.vrm','')}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <div className="text-xs text-slate-400 mb-1">Voice Model</div>
                <select value={selectedVoice} onChange={async (e) => { setSelectedVoice(e.target.value); if (liveManagerRef.current) await liveManagerRef.current.setVoiceModel(e.target.value); }} className="w-full bg-transparent border border-slate-800 rounded px-2 py-1">
                  {voiceModels.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="mb-2">
                <div className="text-xs text-slate-400 mb-1">Personality</div>
                <select value={selectedPersonality} onChange={async (e) => { const id = e.target.value; setSelectedPersonality(id); const p = personalities.find(x=>x.id===id)?.instruction || null; if (liveManagerRef.current) await liveManagerRef.current.setPersonality(p); }} className="w-full bg-transparent border border-slate-800 rounded px-2 py-1">
                  {personalities.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              <div className="mb-2">
                <div className="text-xs text-slate-400 mb-1">Interaction Mode</div>
                <select value={selectedMode} onChange={(e) => { const mode = e.target.value as 'ACTIVE' | 'PASSIVE'; setSelectedMode(mode); if (liveManagerRef.current) liveManagerRef.current.onVrmCommand({ type: 'MODE', mode }); }} className="w-full bg-transparent border border-slate-800 rounded px-2 py-1">
                  <option value="ACTIVE">ACTIVE (Engaged)</option>
                  <option value="PASSIVE">PASSIVE (Observant)</option>
                </select>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => { setMenuOpen(false); }} className="flex-1 px-3 py-2 bg-cyan-700/20 border border-cyan-600 rounded">Close</button>
                <button onClick={() => { setMenuOpen(false); }} className="flex-1 px-3 py-2 bg-cyan-500 text-black rounded">Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UI Overlay */}
      <div className="relative w-full z-20 p-4 flex flex-col items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent justify-end">
        
        {/* Status Display */}
        <div className="flex flex-col items-center gap-2">
            <h1 className={`font-display text-2xl md:text-4xl tracking-widest uppercase font-bold transition-all duration-300 ${getStatusColor()}`}>
                {connectionState === ConnectionState.CONNECTED ? "AURA ONLINE" : "NEURAL LINK OFFLINE"}
            </h1>
            <p className="font-mono text-sm text-cyan-200/70 tracking-wider">
                [{statusText}]
            </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded font-mono text-xs">
                ERROR: {errorMsg}
            </div>
        )}

        {/* Controls */}
        <div className="flex gap-6 mb-8">
            {connectionState !== ConnectionState.CONNECTED ? (
                <button 
                    onClick={handleConnect}
                    disabled={connectionState === ConnectionState.CONNECTING}
                    className="group relative px-8 py-4 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 rounded-full transition-all duration-300 backdrop-blur-md overflow-hidden"
                >
                    <div className="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative font-display font-bold text-cyan-400 tracking-wider flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        INITIALIZE LINK
                    </span>
                </button>
            ) : (
                <button 
                    onClick={handleDisconnect}
                    className="group px-8 py-4 bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 rounded-full transition-all duration-300 backdrop-blur-md"
                >
                    <span className="font-display font-bold text-red-400 tracking-wider flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        TERMINATE
                    </span>
                </button>
            )}
        </div>

        {/* Instructions */}
        <div className="text-center text-slate-500 text-xs font-mono max-w-md">
            <p>Allow microphone access to interface with the system.</p>
            <p>Voice data is processed in real-time by Gemini 2.5 Flash.</p>
        </div>

        </div>
    </div>
  );
};

export default App;
