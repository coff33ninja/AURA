// WalkingEditor - Visual editor for walking behavior configuration
// Provides controls for walking speed, style, leg animation, and arm swing

import React, { useCallback } from 'react';
import type {
  WalkingBehaviorConfig,
  WalkingStyle,
  WalkingDirection,
} from '../types/walkingBehaviorTypes';
import { WALKING_PRESETS } from '../types/walkingBehaviorTypes';
import { applyWalkingStyle } from '../utils/walkingController';

interface WalkingEditorProps {
  config: WalkingBehaviorConfig;
  onChange: (config: Partial<WalkingBehaviorConfig>) => void;
  isWalking: boolean;
  onStartWalking: () => void;
  onStopWalking: () => void;
}

// Slider component for consistent styling
function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-[10px] text-gray-300 w-20 truncate" htmlFor={`slider-${label}`}>{label}</label>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        aria-label={label}
      />
      <span className="text-[10px] text-cyan-400 w-10 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

// Toggle component
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = `toggle-walking-${label.replace(/\s+/g, '-').toLowerCase() || 'default'}`;
  return (
    <div className="flex items-center gap-2 mb-2">
      {label && <label htmlFor={id} className="text-[10px] text-gray-300 w-20 truncate">{label}</label>}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          aria-label={label || 'Toggle'}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${
          checked ? 'bg-cyan-600' : 'bg-gray-600'
        }`}>
          <div
            className={`w-3 h-3 bg-white rounded-full transition-transform mt-0.5 ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </label>
    </div>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-semibold text-cyan-400 mb-2 pb-1 border-b border-cyan-500/20">
      {title}
    </h3>
  );
}

export function WalkingEditor({
  config,
  onChange,
  isWalking,
  onStartWalking,
  onStopWalking,
}: WalkingEditorProps) {
  // Handlers with useCallback
  const handleSpeedChange = useCallback((speed: number) => {
    onChange({ speed });
  }, [onChange]);

  const handleDirectionChange = useCallback((direction: WalkingDirection) => {
    onChange({ direction });
  }, [onChange]);

  const handleStyleChange = useCallback((style: WalkingStyle) => {
    const newConfig = applyWalkingStyle(config, style);
    onChange(newConfig);
  }, [config, onChange]);

  const handleBobIntensityChange = useCallback((bobIntensity: number) => {
    onChange({ bobIntensity });
  }, [onChange]);

  const handleBobFrequencyChange = useCallback((bobFrequency: number) => {
    onChange({ bobFrequency });
  }, [onChange]);

  const handleStrideLengthChange = useCallback((strideLength: number) => {
    onChange({ legs: { ...config.legs, strideLength } });
  }, [config.legs, onChange]);

  const handleLiftHeightChange = useCallback((liftHeight: number) => {
    onChange({ legs: { ...config.legs, liftHeight } });
  }, [config.legs, onChange]);

  const handleBendAmountChange = useCallback((bendAmount: number) => {
    onChange({ legs: { ...config.legs, bendAmount } });
  }, [config.legs, onChange]);

  const handleArmSwingEnabledChange = useCallback((enabled: boolean) => {
    onChange({ armSwing: { ...config.armSwing, enabled } });
  }, [config.armSwing, onChange]);

  const handleArmSwingIntensityChange = useCallback((intensity: number) => {
    onChange({ armSwing: { ...config.armSwing, intensity } });
  }, [config.armSwing, onChange]);

  const handleToggleWalking = useCallback(() => {
    if (isWalking) {
      onStopWalking();
    } else {
      onStartWalking();
    }
  }, [isWalking, onStartWalking, onStopWalking]);

  const directions: WalkingDirection[] = ['forward', 'backward', 'strafeLeft', 'strafeRight'];
  const styles: WalkingStyle[] = ['casual', 'march', 'sneak', 'run'];

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {/* Walking Controls */}
      <div>
        <SectionHeader title="Walking Controls" />
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleToggleWalking}
            className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-colors ${
              isWalking
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isWalking ? '■ Stop' : '▶ Start'}
          </button>
        </div>
        <Slider
          label="Speed"
          value={config.speed}
          min={0}
          max={2}
          step={0.1}
          onChange={handleSpeedChange}
        />
      </div>

      {/* Style Presets */}
      <div>
        <SectionHeader title="Style Presets" />
        <div className="flex gap-1 flex-wrap">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => handleStyleChange(style)}
              className={`px-2 py-0.5 text-[9px] rounded transition-colors ${
                config.style === style
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Direction */}
      <div>
        <SectionHeader title="Direction" />
        <div className="flex gap-1 flex-wrap">
          {directions.map((dir) => (
            <button
              key={dir}
              onClick={() => handleDirectionChange(dir)}
              className={`px-2 py-0.5 text-[9px] rounded transition-colors ${
                config.direction === dir
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {dir === 'strafeLeft' ? '← Strafe' : dir === 'strafeRight' ? 'Strafe →' : dir.charAt(0).toUpperCase() + dir.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Bob */}
      <div>
        <SectionHeader title="Vertical Bob" />
        <Slider
          label="Intensity"
          value={config.bobIntensity}
          min={0}
          max={0.1}
          step={0.005}
          onChange={handleBobIntensityChange}
        />
        <Slider
          label="Frequency"
          value={config.bobFrequency}
          min={0.5}
          max={4}
          step={0.1}
          onChange={handleBobFrequencyChange}
        />
      </div>

      {/* Leg Animation */}
      <div>
        <SectionHeader title="Leg Animation" />
        <Slider
          label="Stride"
          value={config.legs.strideLength}
          min={0}
          max={1}
          step={0.05}
          onChange={handleStrideLengthChange}
        />
        <Slider
          label="Lift Height"
          value={config.legs.liftHeight}
          min={0}
          max={1}
          step={0.05}
          onChange={handleLiftHeightChange}
        />
        <Slider
          label="Knee Bend"
          value={config.legs.bendAmount}
          min={0}
          max={1}
          step={0.05}
          onChange={handleBendAmountChange}
        />
      </div>

      {/* Arm Swing */}
      <div>
        <SectionHeader title="Arm Swing" />
        <Toggle
          label="Enabled"
          checked={config.armSwing.enabled}
          onChange={handleArmSwingEnabledChange}
        />
        {config.armSwing.enabled && (
          <Slider
            label="Intensity"
            value={config.armSwing.intensity}
            min={0}
            max={1}
            step={0.05}
            onChange={handleArmSwingIntensityChange}
          />
        )}
      </div>
    </div>
  );
}
