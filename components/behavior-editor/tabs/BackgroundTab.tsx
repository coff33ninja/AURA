// Extracted from components/BehaviorEditor.tsx

import React, { useState, useCallback, useEffect } from 'react';
import type { BackgroundConfig, SolidBackground, GradientBackground } from '../../../types/enhancementTypes';
import { BACKGROUND_PRESETS, isValidHexColor, saveBackgroundPreference, loadBackgroundPreference } from '../../../utils/backgroundRenderer';
import { Slider, Toggle, SectionHeader } from '../shared';

export function BackgroundTab({
  config,
  onChange,
}: {
  config?: BackgroundConfig;
  onChange?: (config: BackgroundConfig) => void;
}) {
  // State for loaded config
  const [loadedConfig, setLoadedConfig] = useState<BackgroundConfig | null>(null);
  const [isLoading, setIsLoading] = useState(!config);
  
  // Load saved preference on mount if no config provided
  useEffect(() => {
    if (!config) {
      setIsLoading(true);
      loadBackgroundPreference()
        .then((saved) => {
          setLoadedConfig(saved || { type: 'solid' as const, color: '#000000' });
        })
        .catch(() => {
          setLoadedConfig({ type: 'solid' as const, color: '#000000' });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [config]);
  
  const currentConfig = config || loadedConfig || { type: 'solid' as const, color: '#000000' };
  
  const handleChange = useCallback((newConfig: BackgroundConfig) => {
    setLoadedConfig(newConfig);
    saveBackgroundPreference(newConfig); // Fire and forget
    onChange?.(newConfig);
  }, [onChange]);

  const handleSolidColorChange = useCallback((color: string) => {
    if (isValidHexColor(color)) {
      handleChange({ type: 'solid', color });
    }
  }, [handleChange]);

  const handleGradientChange = useCallback((colors: [string, string], angle: number) => {
    if (isValidHexColor(colors[0]) && isValidHexColor(colors[1])) {
      handleChange({ type: 'gradient', colors, angle });
    }
  }, [handleChange]);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {/* Background Type */}
      <div>
        <SectionHeader title="Type" />
        <div className="flex gap-1 flex-wrap">
          {(['solid', 'gradient'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                if (type === 'solid') {
                  handleChange({ type: 'solid', color: '#000000' });
                } else {
                  handleChange({ type: 'gradient', colors: ['#0f0c29', '#302b63'], angle: 180 });
                }
              }}
              className={`px-2 py-0.5 text-[9px] rounded transition-colors ${
                currentConfig.type === type
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Solid Color Controls */}
      {currentConfig.type === 'solid' && (
        <div>
          <SectionHeader title="Color" />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(currentConfig as SolidBackground).color}
              onChange={(e) => handleSolidColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-600"
              aria-label="Background color"
            />
            <input
              type="text"
              value={(currentConfig as SolidBackground).color}
              onChange={(e) => handleSolidColorChange(e.target.value)}
              className="flex-1 px-2 py-1 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
              placeholder="#000000"
              aria-label="Background color hex"
            />
          </div>
        </div>
      )}

      {/* Gradient Controls */}
      {currentConfig.type === 'gradient' && (
        <>
          <div>
            <SectionHeader title="Top Color" />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(currentConfig as GradientBackground).colors[0]}
                onChange={(e) => handleGradientChange(
                  [e.target.value, (currentConfig as GradientBackground).colors[1]],
                  (currentConfig as GradientBackground).angle
                )}
                className="w-8 h-8 rounded cursor-pointer border border-gray-600"
                aria-label="Gradient top color"
              />
              <input
                type="text"
                value={(currentConfig as GradientBackground).colors[0]}
                onChange={(e) => handleGradientChange(
                  [e.target.value, (currentConfig as GradientBackground).colors[1]],
                  (currentConfig as GradientBackground).angle
                )}
                className="flex-1 px-2 py-1 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
                aria-label="Gradient top color hex"
              />
            </div>
          </div>
          <div>
            <SectionHeader title="Bottom Color" />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(currentConfig as GradientBackground).colors[1]}
                onChange={(e) => handleGradientChange(
                  [(currentConfig as GradientBackground).colors[0], e.target.value],
                  (currentConfig as GradientBackground).angle
                )}
                className="w-8 h-8 rounded cursor-pointer border border-gray-600"
                aria-label="Gradient bottom color"
              />
              <input
                type="text"
                value={(currentConfig as GradientBackground).colors[1]}
                onChange={(e) => handleGradientChange(
                  [(currentConfig as GradientBackground).colors[0], e.target.value],
                  (currentConfig as GradientBackground).angle
                )}
                className="flex-1 px-2 py-1 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
                aria-label="Gradient bottom color hex"
              />
            </div>
          </div>
          <div>
            <SectionHeader title="Angle" />
            <Slider
              label="Degrees"
              value={(currentConfig as GradientBackground).angle}
              min={0}
              max={360}
              step={15}
              onChange={(angle) => handleGradientChange(
                (currentConfig as GradientBackground).colors,
                angle
              )}
            />
          </div>
        </>
      )}

      {/* Presets */}
      <div>
        <SectionHeader title="Presets" />
        <div className="flex gap-1 flex-wrap">
          {Object.entries(BACKGROUND_PRESETS).map(([name, preset]) => {
            const indicatorColor = preset.type === 'solid' 
              ? (preset as SolidBackground).color 
              : (preset as GradientBackground).colors[0];
            return (
              <button
                key={name}
                onClick={() => handleChange(preset)}
                className="bg-preset-btn px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                style={{ borderLeftColor: indicatorColor }}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
