import { useState, useEffect, useCallback } from 'react';
import type { PoseSettings } from '../components/NeuralCore';

const STORAGE_KEYS = {
  selectedVrm: 'aura_selectedVrm',
  selectedVoice: 'aura_selectedVoice',
  selectedPersonality: 'aura_selectedPersonality',
  selectedMode: 'aura_selectedMode',
  poseSettings: 'aura_poseSettings',
};

export interface UsePreferencesReturn {
  selectedVrm: string;
  setSelectedVrm: (vrm: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  selectedPersonality: string;
  setSelectedPersonality: (personality: string) => void;
  selectedMode: 'ACTIVE' | 'PASSIVE';
  setSelectedMode: (mode: 'ACTIVE' | 'PASSIVE') => void;
  allPoseSettings: Record<string, PoseSettings>;
  setAllPoseSettings: React.Dispatch<React.SetStateAction<Record<string, PoseSettings>>>;
  getCurrentPoseSettings: (defaultSettings?: PoseSettings) => PoseSettings;
  updatePoseSettings: (settings: Partial<PoseSettings>) => void;
}

const DEFAULT_POSE: PoseSettings = { rotation: 0, leftArmZ: 30, rightArmZ: -30 };

export function usePreferences(defaultVoice: string = 'Kore'): UsePreferencesReturn {
  const [selectedVrm, setSelectedVrmState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedVrm) || ''
  );
  const [selectedVoice, setSelectedVoiceState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedVoice) || defaultVoice
  );
  const [selectedPersonality, setSelectedPersonalityState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.selectedPersonality) || 'default'
  );
  const [selectedMode, setSelectedModeState] = useState<'ACTIVE' | 'PASSIVE'>(
    () => (localStorage.getItem(STORAGE_KEYS.selectedMode) as 'ACTIVE' | 'PASSIVE') || 'ACTIVE'
  );
  const [allPoseSettings, setAllPoseSettings] = useState<Record<string, PoseSettings>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.poseSettings);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist VRM selection
  const setSelectedVrm = useCallback((vrm: string) => {
    setSelectedVrmState(vrm);
    localStorage.setItem(STORAGE_KEYS.selectedVrm, vrm);
  }, []);

  // Persist voice selection
  const setSelectedVoice = useCallback((voice: string) => {
    setSelectedVoiceState(voice);
    localStorage.setItem(STORAGE_KEYS.selectedVoice, voice);
  }, []);

  // Persist personality selection
  const setSelectedPersonality = useCallback((personality: string) => {
    setSelectedPersonalityState(personality);
    localStorage.setItem(STORAGE_KEYS.selectedPersonality, personality);
  }, []);

  // Persist mode selection
  const setSelectedMode = useCallback((mode: 'ACTIVE' | 'PASSIVE') => {
    setSelectedModeState(mode);
    localStorage.setItem(STORAGE_KEYS.selectedMode, mode);
  }, []);

  // Persist pose settings when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.poseSettings, JSON.stringify(allPoseSettings));
  }, [allPoseSettings]);

  // Get current model's pose settings
  const getCurrentPoseSettings = useCallback(
    (defaultSettings?: PoseSettings): PoseSettings => {
      return allPoseSettings[selectedVrm] || defaultSettings || DEFAULT_POSE;
    },
    [allPoseSettings, selectedVrm]
  );

  // Update pose settings for current model
  const updatePoseSettings = useCallback(
    (settings: Partial<PoseSettings>) => {
      setAllPoseSettings((prev) => ({
        ...prev,
        [selectedVrm]: { ...getCurrentPoseSettings(), ...settings },
      }));
    },
    [selectedVrm, getCurrentPoseSettings]
  );

  return {
    selectedVrm,
    setSelectedVrm,
    selectedVoice,
    setSelectedVoice,
    selectedPersonality,
    setSelectedPersonality,
    selectedMode,
    setSelectedMode,
    allPoseSettings,
    setAllPoseSettings,
    getCurrentPoseSettings,
    updatePoseSettings,
  };
}
