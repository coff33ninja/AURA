// BehaviorEditor - Visual editor for VRM behavior configurations
// Provides tabbed interface for editing transform, expressions, gestures, idle, lipsync, reactions

import React, { useState, useCallback } from 'react';
import {
  BehaviorType,
  ModelBehaviors,
  TransformConfig,
  BodyConfig,
  GesturesConfig,
  IdleConfig,
  LipSyncConfig,
  ReactionsConfig,
  ExpressionsConfig,
  GestureDefinition,
  ReactionDefinition,
} from '../types/behaviorTypes';

interface BehaviorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  behaviors: ModelBehaviors | null;
  onBehaviorChange: (type: BehaviorType, config: Partial<any>) => void;
  onPreviewGesture: (gestureName: string) => void;
  onPreviewExpression: (expressionName: string, value: number) => void;
  onPreviewReaction: (reactionName: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
}

type TabType = 'transform' | 'body' | 'expressions' | 'gestures' | 'idle' | 'lipsync' | 'reactions' | 'import-export';

const TABS: { id: TabType; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'body', label: 'Body' },
  { id: 'expressions', label: 'Expressions' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'idle', label: 'Idle' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'import-export', label: 'Import/Export' },
];

export function BehaviorEditor({
  isOpen,
  onClose,
  modelName,
  behaviors,
  onBehaviorChange,
  onPreviewGesture,
  onPreviewExpression,
  onPreviewReaction,
  onExport,
  onImport,
  onSave,
}: BehaviorEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transform');

  // Memoized handlers to prevent unnecessary re-renders
  const handleTransformChange = useCallback(
    (config: Partial<TransformConfig>) => onBehaviorChange('transform', config),
    [onBehaviorChange]
  );

  const handleBodyChange = useCallback(
    (config: Partial<BodyConfig>) => onBehaviorChange('body', config),
    [onBehaviorChange]
  );

  const handleExpressionsChange = useCallback(
    (config: Partial<ExpressionsConfig>) => onBehaviorChange('expressions', config),
    [onBehaviorChange]
  );

  const handleGesturesChange = useCallback(
    (config: Partial<GesturesConfig>) => onBehaviorChange('gestures', config),
    [onBehaviorChange]
  );

  const handleIdleChange = useCallback(
    (config: Partial<IdleConfig>) => onBehaviorChange('idle', config),
    [onBehaviorChange]
  );

  const handleLipSyncChange = useCallback(
    (config: Partial<LipSyncConfig>) => onBehaviorChange('lipsync', config),
    [onBehaviorChange]
  );

  const handleReactionsChange = useCallback(
    (config: Partial<ReactionsConfig>) => onBehaviorChange('reactions', config),
    [onBehaviorChange]
  );

  if (!isOpen) return null;

  return (
    <div className="hud-panel h-full flex flex-col bg-gray-900/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20">
        <h2 className="text-xs font-semibold text-cyan-400 tracking-wide">
          {modelName}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* Tabs - compact horizontal scroll */}
      <div className="flex border-b border-cyan-500/20 px-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 text-xs">
          {!behaviors ? (
            <div className="text-gray-400 text-center py-4">
              No behaviors loaded.
            </div>
          ) : (
            <>
              {activeTab === 'transform' && (
                <TransformTab
                  config={behaviors.transform}
                  onChange={handleTransformChange}
                />
              )}
              {activeTab === 'body' && (
                <BodyTab
                  config={behaviors.body}
                  onChange={handleBodyChange}
                />
              )}
              {activeTab === 'expressions' && (
                <ExpressionsTab
                  config={behaviors.expressions}
                  onChange={handleExpressionsChange}
                  onPreview={onPreviewExpression}
                />
              )}
              {activeTab === 'gestures' && (
                <GesturesTab
                  config={behaviors.gestures}
                  onChange={handleGesturesChange}
                  onPreview={onPreviewGesture}
                />
              )}
              {activeTab === 'idle' && (
                <IdleTab
                  config={behaviors.idle}
                  onChange={handleIdleChange}
                />
              )}
              {activeTab === 'lipsync' && (
                <LipSyncTab
                  config={behaviors.lipsync}
                  onChange={handleLipSyncChange}
                />
              )}
              {activeTab === 'reactions' && (
                <ReactionsTab
                  config={behaviors.reactions}
                  onChange={handleReactionsChange}
                  onPreview={onPreviewReaction}
                />
              )}
              {activeTab === 'import-export' && (
                <ImportExportTab onExport={onExport} onImport={onImport} />
              )}
            </>
          )}
        </div>

        {/* Footer - compact */}
        <div className="flex justify-end gap-2 px-2 py-1.5 border-t border-cyan-500/20">
          <button
            onClick={onSave}
            className="px-3 py-1 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
  );
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
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase() || 'default'}`;
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

// Transform Tab
function TransformTab({
  config,
  onChange,
}: {
  config: TransformConfig;
  onChange: (config: Partial<TransformConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Position" />
        <Slider
          label="X"
          value={config.position.x}
          min={-5}
          max={5}
          onChange={(x) => onChange({ position: { ...config.position, x } })}
        />
        <Slider
          label="Y"
          value={config.position.y}
          min={-5}
          max={5}
          onChange={(y) => onChange({ position: { ...config.position, y } })}
        />
        <Slider
          label="Z"
          value={config.position.z}
          min={-5}
          max={5}
          onChange={(z) => onChange({ position: { ...config.position, z } })}
        />
      </div>

      <div>
        <SectionHeader title="Rotation & Scale" />
        <Slider
          label="Rotation"
          value={config.rotation}
          min={0}
          max={360}
          step={1}
          onChange={(rotation) => onChange({ rotation })}
        />
        <Slider
          label="Scale"
          value={config.scale}
          min={0.5}
          max={2.0}
          onChange={(scale) => onChange({ scale })}
        />
      </div>

      <div>
        <SectionHeader title="Camera" />
        <Slider
          label="Distance"
          value={config.cameraDistance}
          min={0.5}
          max={10}
          onChange={(cameraDistance) => onChange({ cameraDistance })}
        />
        <Slider
          label="Height"
          value={config.cameraHeight}
          min={0}
          max={3}
          onChange={(cameraHeight) => onChange({ cameraHeight })}
        />
        <Slider
          label="Look At"
          value={config.cameraLookAtHeight}
          min={0}
          max={3}
          onChange={(cameraLookAtHeight) => onChange({ cameraLookAtHeight })}
        />
      </div>

      <div>
        <SectionHeader title="Presets" />
        <div className="flex gap-1 flex-wrap">
          {[
            { label: 'Center', pos: { x: 0, y: 0, z: 0 } },
            { label: 'Left', pos: { x: -1, y: 0, z: 0 } },
            { label: 'Right', pos: { x: 1, y: 0, z: 0 } },
            { label: 'Close', pos: { x: 0, y: 0, z: 0.5 } },
            { label: 'Far', pos: { x: 0, y: 0, z: -1 } },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onChange({ position: preset.pos })}
              className="px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Body Tab - Default pose and arm/body positions
function BodyTab({
  config,
  onChange,
}: {
  config: BodyConfig;
  onChange: (config: Partial<BodyConfig>) => void;
}) {
  // Use callbacks that capture the full current config to avoid stale closures
  const updateLeftUpperArm = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ leftUpperArm: { x: config.leftUpperArm.x, y: config.leftUpperArm.y, z: config.leftUpperArm.z, [field]: value } });
  }, [onChange, config.leftUpperArm.x, config.leftUpperArm.y, config.leftUpperArm.z]);

  const updateLeftLowerArm = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ leftLowerArm: { x: config.leftLowerArm.x, y: config.leftLowerArm.y, z: config.leftLowerArm.z, [field]: value } });
  }, [onChange, config.leftLowerArm.x, config.leftLowerArm.y, config.leftLowerArm.z]);

  const updateRightUpperArm = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ rightUpperArm: { x: config.rightUpperArm.x, y: config.rightUpperArm.y, z: config.rightUpperArm.z, [field]: value } });
  }, [onChange, config.rightUpperArm.x, config.rightUpperArm.y, config.rightUpperArm.z]);

  const updateRightLowerArm = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ rightLowerArm: { x: config.rightLowerArm.x, y: config.rightLowerArm.y, z: config.rightLowerArm.z, [field]: value } });
  }, [onChange, config.rightLowerArm.x, config.rightLowerArm.y, config.rightLowerArm.z]);

  const updateSpine = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ spine: { x: config.spine.x, y: config.spine.y, z: config.spine.z, [field]: value } });
  }, [onChange, config.spine.x, config.spine.y, config.spine.z]);

  const updateChest = useCallback((field: 'x' | 'y' | 'z', value: number) => {
    onChange({ chest: { x: config.chest.x, y: config.chest.y, z: config.chest.z, [field]: value } });
  }, [onChange, config.chest.x, config.chest.y, config.chest.z]);

  const updateEyeTracking = useCallback((field: 'enabled' | 'intensity', value: boolean | number) => {
    onChange({ eyeTracking: { enabled: config.eyeTracking.enabled, intensity: config.eyeTracking.intensity, [field]: value } });
  }, [onChange, config.eyeTracking.enabled, config.eyeTracking.intensity]);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      <div>
        <SectionHeader title="Left Arm" />
        <Slider
          label="Upper X"
          value={config.leftUpperArm.x}
          min={-90}
          max={90}
          step={1}
          onChange={(x) => updateLeftUpperArm('x', x)}
        />
        <Slider
          label="Upper Y"
          value={config.leftUpperArm.y}
          min={-90}
          max={90}
          step={1}
          onChange={(y) => updateLeftUpperArm('y', y)}
        />
        <Slider
          label="Upper Z"
          value={config.leftUpperArm.z}
          min={-90}
          max={90}
          step={1}
          onChange={(z) => updateLeftUpperArm('z', z)}
        />
        <Slider
          label="Lower X"
          value={config.leftLowerArm.x}
          min={-90}
          max={90}
          step={1}
          onChange={(x) => updateLeftLowerArm('x', x)}
        />
      </div>

      <div>
        <SectionHeader title="Right Arm" />
        <Slider
          label="Upper X"
          value={config.rightUpperArm.x}
          min={-90}
          max={90}
          step={1}
          onChange={(x) => updateRightUpperArm('x', x)}
        />
        <Slider
          label="Upper Y"
          value={config.rightUpperArm.y}
          min={-90}
          max={90}
          step={1}
          onChange={(y) => updateRightUpperArm('y', y)}
        />
        <Slider
          label="Upper Z"
          value={config.rightUpperArm.z}
          min={-90}
          max={90}
          step={1}
          onChange={(z) => updateRightUpperArm('z', z)}
        />
        <Slider
          label="Lower X"
          value={config.rightLowerArm.x}
          min={-90}
          max={90}
          step={1}
          onChange={(x) => updateRightLowerArm('x', x)}
        />
      </div>

      <div>
        <SectionHeader title="Spine & Chest" />
        <Slider
          label="Spine X"
          value={config.spine.x}
          min={-45}
          max={45}
          step={1}
          onChange={(x) => updateSpine('x', x)}
        />
        <Slider
          label="Spine Y"
          value={config.spine.y}
          min={-45}
          max={45}
          step={1}
          onChange={(y) => updateSpine('y', y)}
        />
        <Slider
          label="Chest X"
          value={config.chest.x}
          min={-30}
          max={30}
          step={1}
          onChange={(x) => updateChest('x', x)}
        />
      </div>

      <div>
        <SectionHeader title="Eye Tracking" />
        <Toggle
          label="Enabled"
          checked={config.eyeTracking.enabled}
          onChange={(enabled) => updateEyeTracking('enabled', enabled)}
        />
        <Slider
          label="Intensity"
          value={config.eyeTracking.intensity}
          min={0}
          max={1}
          onChange={(intensity) => updateEyeTracking('intensity', intensity)}
        />
      </div>

      <div>
        <SectionHeader title="Presets" />
        <div className="flex gap-1 flex-wrap">
          {[
            { label: 'Relaxed', arms: { lz: 30, rz: -30 } },
            { label: 'T-Pose', arms: { lz: 0, rz: 0 } },
            { label: 'Arms Down', arms: { lz: 60, rz: -60 } },
            { label: 'Crossed', arms: { lz: 45, rz: -45, lx: 30, rx: 30 } },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onChange({
                leftUpperArm: { 
                  x: (preset.arms as any).lx ?? 0, 
                  y: 0, 
                  z: preset.arms.lz 
                },
                rightUpperArm: { 
                  x: (preset.arms as any).rx ?? 0, 
                  y: 0, 
                  z: preset.arms.rz 
                },
              })}
              className="px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Expressions Tab
function ExpressionsTab({
  config,
  onChange,
  onPreview,
}: {
  config: ExpressionsConfig;
  onChange: (config: Partial<ExpressionsConfig>) => void;
  onPreview: (name: string, value: number) => void;
}) {
  const [previewValue, setPreviewValue] = useState(0.8);

  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Expression Mappings" />
        <p className="text-[9px] text-gray-400 mb-2">
          Map standard names to model names
        </p>
        {Object.entries(config.mappings).map(([standard, model]) => (
          <div key={standard} className="flex items-center gap-2 mb-1">
            <label htmlFor={`mapping-${standard}`} className="text-[10px] text-gray-300 w-16 truncate">{standard}</label>
            <span className="text-gray-500 text-[10px]">→</span>
            <input
              id={`mapping-${standard}`}
              type="text"
              value={model}
              onChange={(e) =>
                onChange({
                  mappings: { ...config.mappings, [standard]: e.target.value },
                })
              }
              aria-label={`Model expression for ${standard}`}
              className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
            />
            <button
              onClick={() => onPreview(model, previewValue)}
              className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 text-white rounded"
            >
              ▶
            </button>
          </div>
        ))}
      </div>

      <div>
        <SectionHeader title="Preview Intensity" />
        <Slider
          label="Intensity"
          value={previewValue}
          min={0}
          max={1}
          onChange={setPreviewValue}
        />
      </div>

      <div>
        <SectionHeader title="Add Mapping" />
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Standard"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
            id="new-standard"
          />
          <input
            type="text"
            placeholder="Model"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
            id="new-model"
          />
          <button
            onClick={() => {
              const standard = (document.getElementById('new-standard') as HTMLInputElement).value;
              const model = (document.getElementById('new-model') as HTMLInputElement).value;
              if (standard && model) {
                onChange({ mappings: { ...config.mappings, [standard]: model } });
              }
            }}
            className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 text-white rounded"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Gestures Tab
function GesturesTab({
  config,
  onChange,
  onPreview,
}: {
  config: GesturesConfig;
  onChange: (config: Partial<GesturesConfig>) => void;
  onPreview: (name: string) => void;
}) {
  const toggleGesture = (index: number, enabled: boolean) => {
    const gestures = [...config.gestures];
    gestures[index] = { ...gestures[index], enabled };
    onChange({ gestures });
  };

  const updateGesture = (index: number, updates: Partial<GestureDefinition>) => {
    const gestures = [...config.gestures];
    gestures[index] = { ...gestures[index], ...updates };
    onChange({ gestures });
  };

  return (
    <div className="space-y-2">
      <SectionHeader title="Gestures" />
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {config.gestures.map((gesture, index) => (
          <div
            key={gesture.name}
            className={`p-1.5 rounded border ${
              gesture.enabled
                ? 'border-cyan-500/30 bg-gray-800/50'
                : 'border-gray-600/30 bg-gray-800/20 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  label=""
                  checked={gesture.enabled}
                  onChange={(enabled) => toggleGesture(index, enabled)}
                />
                <span className="text-[10px] font-medium text-gray-200">{gesture.name}</span>
              </div>
              <button
                onClick={() => onPreview(gesture.name)}
                disabled={!gesture.enabled}
                className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Idle Tab
function IdleTab({
  config,
  onChange,
}: {
  config: IdleConfig;
  onChange: (config: Partial<IdleConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Breathing" />
        <Toggle
          label="Enabled"
          checked={config.breathing.enabled}
          onChange={(enabled) =>
            onChange({ breathing: { ...config.breathing, enabled } })
          }
        />
        <Slider
          label="Speed"
          value={config.breathing.speed}
          min={0.1}
          max={2}
          onChange={(speed) =>
            onChange({ breathing: { ...config.breathing, speed } })
          }
        />
        <Slider
          label="Intensity"
          value={config.breathing.intensity}
          min={0}
          max={0.1}
          onChange={(intensity) =>
            onChange({ breathing: { ...config.breathing, intensity } })
          }
        />
      </div>

      <div>
        <SectionHeader title="Blinking" />
        <Toggle
          label="Enabled"
          checked={config.blinking.enabled}
          onChange={(enabled) =>
            onChange({ blinking: { ...config.blinking, enabled } })
          }
        />
        <Slider
          label="Interval (s)"
          value={config.blinking.interval}
          min={1}
          max={10}
          onChange={(interval) =>
            onChange({ blinking: { ...config.blinking, interval } })
          }
        />
        <Slider
          label="Duration (s)"
          value={config.blinking.duration}
          min={0.05}
          max={0.5}
          onChange={(duration) =>
            onChange({ blinking: { ...config.blinking, duration } })
          }
        />
      </div>

      <div>
        <SectionHeader title="Sway" />
        <Toggle
          label="Enabled"
          checked={config.sway.enabled}
          onChange={(enabled) =>
            onChange({ sway: { ...config.sway, enabled } })
          }
        />
        <Slider
          label="Amount"
          value={config.sway.amount}
          min={0}
          max={0.5}
          onChange={(amount) =>
            onChange({ sway: { ...config.sway, amount } })
          }
        />
        <Slider
          label="Speed"
          value={config.sway.speed}
          min={0.1}
          max={2}
          onChange={(speed) =>
            onChange({ sway: { ...config.sway, speed } })
          }
        />
      </div>

      <div>
        <SectionHeader title="Head Movement" />
        <Toggle
          label="Enabled"
          checked={config.headMovement.enabled}
          onChange={(enabled) =>
            onChange({ headMovement: { ...config.headMovement, enabled } })
          }
        />
        <Slider
          label="Amount"
          value={config.headMovement.amount}
          min={0}
          max={0.5}
          onChange={(amount) =>
            onChange({ headMovement: { ...config.headMovement, amount } })
          }
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

// Lip Sync Tab
function LipSyncTab({
  config,
  onChange,
}: {
  config: LipSyncConfig;
  onChange: (config: Partial<LipSyncConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Settings" />
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

// Reactions Tab
function ReactionsTab({
  config,
  onChange,
  onPreview,
}: {
  config: ReactionsConfig;
  onChange: (config: Partial<ReactionsConfig>) => void;
  onPreview: (name: string) => void;
}) {
  const toggleReaction = useCallback((index: number, enabled: boolean) => {
    const reactions: ReactionDefinition[] = [...config.reactions];
    reactions[index] = { ...reactions[index], enabled };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  const handlePreview = useCallback((reaction: ReactionDefinition) => {
    if (reaction.enabled) {
      onPreview(reaction.name);
    }
  }, [onPreview]);

  return (
    <div className="space-y-2">
      <SectionHeader title="Reactions" />
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {config.reactions.map((reaction: ReactionDefinition, index: number) => (
          <div
            key={reaction.name}
            className={`p-1.5 rounded border ${
              reaction.enabled
                ? 'border-cyan-500/30 bg-gray-800/50'
                : 'border-gray-600/30 bg-gray-800/20 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  label=""
                  checked={reaction.enabled}
                  onChange={(enabled) => toggleReaction(index, enabled)}
                />
                <div>
                  <span className="text-[10px] font-medium text-gray-200">{reaction.name}</span>
                  <span className={`ml-1 text-[8px] px-1 py-0.5 rounded ${
                    reaction.mode === 'ACTIVE' 
                      ? 'bg-green-700/50 text-green-300' 
                      : 'bg-blue-700/50 text-blue-300'
                  }`}>
                    {reaction.mode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handlePreview(reaction)}
                disabled={!reaction.enabled}
                className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Import/Export Tab
function ImportExportTab({
  onExport,
  onImport,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Export" />
        <button
          onClick={onExport}
          className="px-3 py-1.5 text-[10px] bg-cyan-700 hover:bg-cyan-600 text-white rounded transition-colors"
        >
          Export to JSON
        </button>
      </div>

      <div>
        <SectionHeader title="Import" />
        <label className="inline-block px-3 py-1.5 text-[10px] bg-gray-700 hover:bg-gray-600 text-white rounded cursor-pointer transition-colors">
          Import from JSON
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Import configuration file"
          />
        </label>
      </div>
    </div>
  );
}

export default BehaviorEditor;
