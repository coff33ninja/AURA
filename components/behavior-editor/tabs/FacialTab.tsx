// Extracted from components/BehaviorEditor.tsx

import React, { useState, useCallback } from 'react';
import {
  FacialConfig,
  FacialPreset,
} from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

export function FacialTab({
  config,
  onChange,
}: {
  config: FacialConfig;
  onChange: (config: Partial<FacialConfig>) => void;
}) {
  const [presetName, setPresetName] = useState('');

  // Expression update callbacks
  const updateExpression = useCallback((expr: keyof FacialConfig['expressions'], value: number) => {
    onChange({
      expressions: {
        ...config.expressions,
        [expr]: value,
      },
    });
  }, [config.expressions, onChange]);

  const updateMouth = useCallback((viseme: keyof FacialConfig['mouth'], value: number) => {
    onChange({
      mouth: {
        ...config.mouth,
        [viseme]: value,
      },
    });
  }, [config.mouth, onChange]);

  const updateEyes = useCallback((eye: keyof FacialConfig['eyes'], value: number) => {
    onChange({
      eyes: {
        ...config.eyes,
        [eye]: value,
      },
    });
  }, [config.eyes, onChange]);

  // Facial presets
  const applyPreset = useCallback((preset: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral') => {
    const presets: Record<string, Partial<FacialConfig>> = {
      happy: {
        expressions: { joy: 0.8, angry: 0, sorrow: 0, fun: 0.5, surprised: 0 },
        mouth: { a: 0.3, i: 0, u: 0, e: 0, o: 0 },
        eyes: { blink: 0, lookUp: 0, lookDown: 0, lookLeft: 0, lookRight: 0 },
      },
      sad: {
        expressions: { joy: 0, angry: 0, sorrow: 0.8, fun: 0, surprised: 0 },
        mouth: { a: 0, i: 0, u: 0.2, e: 0, o: 0 },
        eyes: { blink: 0.2, lookUp: 0, lookDown: 0.3, lookLeft: 0, lookRight: 0 },
      },
      angry: {
        expressions: { joy: 0, angry: 0.8, sorrow: 0, fun: 0, surprised: 0 },
        mouth: { a: 0.2, i: 0.3, u: 0, e: 0, o: 0 },
        eyes: { blink: 0, lookUp: 0, lookDown: 0.2, lookLeft: 0, lookRight: 0 },
      },
      surprised: {
        expressions: { joy: 0, angry: 0, sorrow: 0, fun: 0, surprised: 0.9 },
        mouth: { a: 0, i: 0, u: 0, e: 0, o: 0.6 },
        eyes: { blink: 0, lookUp: 0.2, lookDown: 0, lookLeft: 0, lookRight: 0 },
      },
      neutral: {
        expressions: { joy: 0, angry: 0, sorrow: 0, fun: 0, surprised: 0 },
        mouth: { a: 0, i: 0, u: 0, e: 0, o: 0 },
        eyes: { blink: 0, lookUp: 0, lookDown: 0, lookLeft: 0, lookRight: 0 },
      },
    };
    onChange(presets[preset]);
  }, [onChange]);

  // Save current as custom preset
  const saveAsPreset = useCallback(() => {
    if (!presetName.trim()) return;
    const values: Record<string, number> = {};
    // Collect non-zero values
    Object.entries(config.expressions).forEach(([k, v]) => {
      if (v > 0) values[`expr_${k}`] = v;
    });
    Object.entries(config.mouth).forEach(([k, v]) => {
      if (v > 0) values[`mouth_${k}`] = v;
    });
    Object.entries(config.eyes).forEach(([k, v]) => {
      if (v > 0) values[`eyes_${k}`] = v;
    });
    const newPreset: FacialPreset = { name: presetName.trim(), values };
    onChange({
      customPresets: [...config.customPresets, newPreset],
    });
    setPresetName('');
  }, [presetName, config, onChange]);

  // Apply custom preset
  const applyCustomPreset = useCallback((preset: FacialPreset) => {
    const expressions = { ...config.expressions };
    const mouth = { ...config.mouth };
    const eyes = { ...config.eyes };
    Object.entries(preset.values).forEach(([k, v]) => {
      if (k.startsWith('expr_')) {
        const key = k.replace('expr_', '') as keyof FacialConfig['expressions'];
        expressions[key] = v;
      } else if (k.startsWith('mouth_')) {
        const key = k.replace('mouth_', '') as keyof FacialConfig['mouth'];
        mouth[key] = v;
      } else if (k.startsWith('eyes_')) {
        const key = k.replace('eyes_', '') as keyof FacialConfig['eyes'];
        eyes[key] = v;
      }
    });
    onChange({ expressions, mouth, eyes });
  }, [config, onChange]);

  // Delete custom preset
  const deleteCustomPreset = useCallback((index: number) => {
    const customPresets = [...config.customPresets];
    customPresets.splice(index, 1);
    onChange({ customPresets });
  }, [config.customPresets, onChange]);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {/* Quick presets */}
      <div>
        <SectionHeader title="Presets" />
        <div className="flex gap-1 flex-wrap">
          {(['happy', 'sad', 'angry', 'surprised', 'neutral'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Expressions */}
      <div>
        <SectionHeader title="Expressions" />
        {(Object.keys(config.expressions) as Array<keyof FacialConfig['expressions']>).map((expr) => (
          <Slider
            key={expr}
            label={expr.charAt(0).toUpperCase() + expr.slice(1)}
            value={config.expressions[expr]}
            min={0}
            max={1}
            onChange={(v) => updateExpression(expr, v)}
          />
        ))}
      </div>

      {/* Mouth */}
      <div>
        <SectionHeader title="Mouth (Visemes)" />
        {(Object.keys(config.mouth) as Array<keyof FacialConfig['mouth']>).map((viseme) => (
          <Slider
            key={viseme}
            label={viseme.toUpperCase()}
            value={config.mouth[viseme]}
            min={0}
            max={1}
            onChange={(v) => updateMouth(viseme, v)}
          />
        ))}
      </div>

      {/* Eyes */}
      <div>
        <SectionHeader title="Eyes" />
        {(Object.keys(config.eyes) as Array<keyof FacialConfig['eyes']>).map((eye) => (
          <Slider
            key={eye}
            label={eye.replace(/([A-Z])/g, ' $1').trim()}
            value={config.eyes[eye]}
            min={0}
            max={1}
            onChange={(v) => updateEyes(eye, v)}
          />
        ))}
      </div>

      {/* Custom presets */}
      <div>
        <SectionHeader title="Custom Presets" />
        {config.customPresets.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {config.customPresets.map((preset, index) => (
              <div key={preset.name} className="flex items-center gap-0.5">
                <button
                  onClick={() => applyCustomPreset(preset)}
                  className="px-2 py-0.5 text-[9px] bg-cyan-700/50 hover:bg-cyan-600 text-gray-200 rounded-l transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deleteCustomPreset(index)}
                  className="px-1 py-0.5 text-[9px] bg-red-700/50 hover:bg-red-600 text-gray-200 rounded-r transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
          />
          <button
            onClick={saveAsPreset}
            disabled={!presetName.trim()}
            className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
