import React from 'react';
import { LipSyncConfig } from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

interface LipSyncTabProps {
  config: LipSyncConfig;
  onChange: (config: Partial<LipSyncConfig>) => void;
}

export function LipSyncTab({ config, onChange }: LipSyncTabProps) {
  const phonemeConfig = config.phonemeDetection ?? {
    enabled: false,
    minConfidence: 0.3,
    transitionDuration: 50,
    intensityMultiplier: 1.0,
  };

  const updatePhonemeDetection = (updates: Partial<typeof phonemeConfig>) => {
    onChange({
      phonemeDetection: { ...phonemeConfig, ...updates },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Phoneme Detection" />
        <Toggle
          label="Enabled"
          checked={phonemeConfig.enabled}
          onChange={(enabled) => updatePhonemeDetection({ enabled })}
        />
        {phonemeConfig.enabled && (
          <>
            <Slider
              label="Confidence"
              value={phonemeConfig.minConfidence}
              min={0}
              max={1}
              step={0.05}
              onChange={(minConfidence) => updatePhonemeDetection({ minConfidence })}
            />
            <Slider
              label="Transition"
              value={phonemeConfig.transitionDuration}
              min={10}
              max={200}
              step={5}
              onChange={(transitionDuration) => updatePhonemeDetection({ transitionDuration })}
            />
            <Slider
              label="Intensity"
              value={phonemeConfig.intensityMultiplier}
              min={0.1}
              max={2}
              step={0.1}
              onChange={(intensityMultiplier) => updatePhonemeDetection({ intensityMultiplier })}
            />
          </>
        )}
        <p className="text-[9px] text-gray-400 mt-1">
          {phonemeConfig.enabled 
            ? 'Using FFT-based phoneme detection for lip sync'
            : 'Using volume-based lip sync (legacy mode)'}
        </p>
      </div>

      <div>
        <SectionHeader title="Volume Settings" />
        <Slider
          label="Sensitivity"
          value={config.sensitivity}
          min={0.5}
          max={10}
          onChange={(sensitivity) => onChange({ sensitivity })}
        />
        <Slider
          label="Smoothing"
          value={config.smoothing}
          min={0}
          max={1}
          onChange={(smoothing) => onChange({ smoothing })}
        />
      </div>

      <div>
        <SectionHeader title="Viseme Weights" />
        {(['a', 'i', 'u', 'e', 'o'] as const).map((viseme) => (
          <Slider
            key={viseme}
            label={viseme.toUpperCase()}
            value={config.visemeWeights[viseme]}
            min={0}
            max={1}
            onChange={(value) =>
              onChange({
                visemeWeights: { ...config.visemeWeights, [viseme]: value },
              })
            }
          />
        ))}
      </div>

      <div>
        <SectionHeader title="Preset" />
        <div className="flex gap-1 flex-wrap">
          {(['subtle', 'normal', 'exaggerated'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onChange({ preset })}
              className={`px-2 py-0.5 text-[9px] rounded transition-colors ${
                config.preset === preset
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
