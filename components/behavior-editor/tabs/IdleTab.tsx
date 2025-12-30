import React from 'react';
import { IdleConfig } from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

interface IdleTabProps {
  config: IdleConfig;
  onChange: (config: Partial<IdleConfig>) => void;
}

export function IdleTab({ config, onChange }: IdleTabProps) {
  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Breathing" />
        <Toggle
          label="Enabled"
          checked={config.breathing.enabled}
          onChange={(enabled) => onChange({ breathing: { ...config.breathing, enabled } })}
        />
        <Slider
          label="Speed"
          value={config.breathing.speed}
          min={0.1}
          max={2}
          onChange={(speed) => onChange({ breathing: { ...config.breathing, speed } })}
        />
        <Slider
          label="Intensity"
          value={config.breathing.intensity}
          min={0}
          max={0.1}
          onChange={(intensity) => onChange({ breathing: { ...config.breathing, intensity } })}
        />
      </div>

      <div>
        <SectionHeader title="Blinking" />
        <Toggle
          label="Enabled"
          checked={config.blinking.enabled}
          onChange={(enabled) => onChange({ blinking: { ...config.blinking, enabled } })}
        />
        <Slider
          label="Interval (s)"
          value={config.blinking.interval}
          min={1}
          max={10}
          onChange={(interval) => onChange({ blinking: { ...config.blinking, interval } })}
        />
        <Slider
          label="Duration (s)"
          value={config.blinking.duration}
          min={0.05}
          max={0.5}
          onChange={(duration) => onChange({ blinking: { ...config.blinking, duration } })}
        />
      </div>

      <div>
        <SectionHeader title="Sway" />
        <Toggle
          label="Enabled"
          checked={config.sway.enabled}
          onChange={(enabled) => onChange({ sway: { ...config.sway, enabled } })}
        />
        <Slider
          label="Amount"
          value={config.sway.amount}
          min={0}
          max={0.5}
          onChange={(amount) => onChange({ sway: { ...config.sway, amount } })}
        />
        <Slider
          label="Speed"
          value={config.sway.speed}
          min={0.1}
          max={2}
          onChange={(speed) => onChange({ sway: { ...config.sway, speed } })}
        />
      </div>

      <div>
        <SectionHeader title="Head Movement" />
        <Toggle
          label="Enabled"
          checked={config.headMovement.enabled}
          onChange={(enabled) => onChange({ headMovement: { ...config.headMovement, enabled } })}
        />
        <Slider
          label="Amount"
          value={config.headMovement.amount}
          min={0}
          max={0.5}
          onChange={(amount) => onChange({ headMovement: { ...config.headMovement, amount } })}
        />
      </div>

      <div>
        <SectionHeader title="Preset" />
        <div className="flex gap-1 flex-wrap">
          {(['calm', 'energetic', 'sleepy', 'alert'] as const).map((preset) => (
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
