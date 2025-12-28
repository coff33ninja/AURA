// BehaviorEditor - Visual editor for VRM behavior configurations
// Provides tabbed interface for editing transform, expressions, gestures, idle, lipsync, reactions

import React, { useState, useCallback } from 'react';
import {
  BehaviorType,
  ModelBehaviors,
  TransformConfig,
  BodyConfig,
  HandsConfig,
  FacialConfig,
  GesturesConfig,
  IdleConfig,
  LipSyncConfig,
  ReactionsConfig,
  ExpressionsConfig,
  GestureDefinition,
  ReactionDefinition,
  ReactionStep,
  BoneRotation,
  FacialPreset,
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

type TabType = 'transform' | 'body' | 'hands' | 'facial' | 'expressions' | 'gestures' | 'idle' | 'lipsync' | 'reactions' | 'import-export';

const TABS: { id: TabType; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'body', label: 'Body' },
  { id: 'hands', label: 'Hands' },
  { id: 'facial', label: 'Facial' },
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

  const handleHandsChange = useCallback(
    (config: Partial<HandsConfig>) => onBehaviorChange('hands', config),
    [onBehaviorChange]
  );

  const handleFacialChange = useCallback(
    (config: Partial<FacialConfig>) => onBehaviorChange('facial', config),
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
              {activeTab === 'hands' && (
                <HandsTab
                  config={behaviors.hands}
                  onChange={handleHandsChange}
                  onSaveAsGesture={(name: string, bones: Record<string, { x: number; y: number; z: number }>) => {
                    const newGesture: GestureDefinition = {
                      name,
                      enabled: true,
                      duration: 1.5,
                      intensity: 1.0,
                      transitionSpeed: 0.3,
                      bones,
                    };
                    handleGesturesChange({ gestures: [...behaviors.gestures.gestures, newGesture] });
                  }}
                />
              )}
              {activeTab === 'facial' && (
                <FacialTab
                  config={behaviors.facial}
                  onChange={handleFacialChange}
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
                  currentBody={behaviors.body}
                  currentHands={behaviors.hands}
                  currentFacial={behaviors.facial}
                  availableGestures={behaviors.gestures.gestures}
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newGestureName, setNewGestureName] = useState('');

  const toggleGesture = useCallback((index: number, enabled: boolean) => {
    const gestures = [...config.gestures];
    gestures[index] = { ...gestures[index], enabled };
    onChange({ gestures });
  }, [config.gestures, onChange]);

  const updateGesture = useCallback((index: number, updates: Partial<GestureDefinition>) => {
    const gestures = [...config.gestures];
    gestures[index] = { ...gestures[index], ...updates };
    onChange({ gestures });
  }, [config.gestures, onChange]);

  const deleteGesture = useCallback((index: number) => {
    const gestures = [...config.gestures];
    gestures.splice(index, 1);
    onChange({ gestures });
    setEditingIndex(null);
  }, [config.gestures, onChange]);

  const addNewGesture = useCallback(() => {
    if (!newGestureName.trim()) return;
    const newGesture: GestureDefinition = {
      name: newGestureName.trim(),
      enabled: true,
      duration: 1.5,
      intensity: 1.0,
      transitionSpeed: 0.3,
      bones: {},
    };
    onChange({ gestures: [...config.gestures, newGesture] });
    setNewGestureName('');
    setEditingIndex(config.gestures.length); // Open edit mode for new gesture
  }, [newGestureName, config.gestures, onChange]);

  const updateGestureBone = useCallback((index: number, boneName: string, axis: 'x' | 'y' | 'z', value: number) => {
    const gestures = [...config.gestures];
    const gesture = gestures[index];
    const currentBone = gesture.bones[boneName] || { x: 0, y: 0, z: 0 };
    gestures[index] = {
      ...gesture,
      bones: {
        ...gesture.bones,
        [boneName]: { ...currentBone, [axis]: value },
      },
    };
    onChange({ gestures });
  }, [config.gestures, onChange]);

  const editingGesture = editingIndex !== null ? config.gestures[editingIndex] : null;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {/* New Gesture */}
      <div>
        <SectionHeader title="Add Gesture" />
        <div className="flex gap-1">
          <input
            type="text"
            value={newGestureName}
            onChange={(e) => setNewGestureName(e.target.value)}
            placeholder="Gesture name"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
          />
          <button
            onClick={addNewGesture}
            disabled={!newGestureName.trim()}
            className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            + New
          </button>
        </div>
      </div>

      {/* Gesture List */}
      <div>
        <SectionHeader title="Gestures" />
        <div className="space-y-1">
          {config.gestures.map((gesture, index) => (
            <div
              key={gesture.name}
              className={`rounded border ${
                gesture.enabled
                  ? 'border-cyan-500/30 bg-gray-800/50'
                  : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}
            >
              {/* Gesture Header */}
              <div className="p-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Toggle
                    label=""
                    checked={gesture.enabled}
                    onChange={(enabled) => toggleGesture(index, enabled)}
                  />
                  <span className="text-[10px] font-medium text-gray-200">{gesture.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="px-1.5 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                  >
                    {editingIndex === index ? '▼' : '✎'}
                  </button>
                  <button
                    onClick={() => onPreview(gesture.name)}
                    disabled={!gesture.enabled}
                    className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Edit Mode */}
              {editingIndex === index && (
                <div className="px-2 pb-2 border-t border-gray-700/50 pt-2 space-y-2">
                  {/* Duration & Intensity */}
                  <Slider
                    label="Duration"
                    value={gesture.duration}
                    min={0.1}
                    max={5}
                    step={0.1}
                    onChange={(duration) => updateGesture(index, { duration })}
                  />
                  <Slider
                    label="Intensity"
                    value={gesture.intensity}
                    min={0}
                    max={1}
                    onChange={(intensity) => updateGesture(index, { intensity })}
                  />
                  <Slider
                    label="Transition"
                    value={gesture.transitionSpeed}
                    min={0.1}
                    max={1}
                    step={0.1}
                    onChange={(transitionSpeed) => updateGesture(index, { transitionSpeed })}
                  />

                  {/* Bone Controls */}
                  <div className="text-[9px] text-gray-400 mt-2">Arm Bones</div>
                  {['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm'].map((boneName) => {
                    const bone = gesture.bones[boneName] || { x: 0, y: 0, z: 0 };
                    return (
                      <div key={boneName} className="pl-1">
                        <span className="text-[8px] text-gray-500">{boneName}</span>
                        <div className="flex gap-1">
                          <Slider
                            label="X"
                            value={bone.x}
                            min={-1.5}
                            max={1.5}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'x', v)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Slider
                            label="Z"
                            value={bone.z}
                            min={-1.5}
                            max={1.5}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'z', v)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteGesture(index)}
                    className="w-full mt-2 px-2 py-1 text-[9px] bg-red-700/50 hover:bg-red-600 text-white rounded"
                  >
                    Delete Gesture
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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

// Reactions Tab - Create chained reactions from body, hands, facial configs
function ReactionsTab({
  config,
  onChange,
  onPreview,
  currentBody,
  currentHands,
  currentFacial,
  availableGestures,
}: {
  config: ReactionsConfig;
  onChange: (config: Partial<ReactionsConfig>) => void;
  onPreview: (name: string) => void;
  currentBody: BodyConfig;
  currentHands: HandsConfig;
  currentFacial: FacialConfig;
  availableGestures: GestureDefinition[];
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newReactionName, setNewReactionName] = useState('');

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

  const addNewReaction = useCallback(() => {
    if (!newReactionName.trim()) return;
    const newReaction: ReactionDefinition = {
      name: newReactionName.trim(),
      enabled: true,
      expressions: [],
      gestures: [],
      posture: 'neutral',
      duration: 2.0,
      mode: 'ACTIVE',
      steps: [],
    };
    onChange({ reactions: [...config.reactions, newReaction] });
    setNewReactionName('');
    setEditingIndex(config.reactions.length);
  }, [newReactionName, config.reactions, onChange]);

  const deleteReaction = useCallback((index: number) => {
    const reactions = [...config.reactions];
    reactions.splice(index, 1);
    onChange({ reactions });
    setEditingIndex(null);
  }, [config.reactions, onChange]);

  const updateReaction = useCallback((index: number, updates: Partial<ReactionDefinition>) => {
    const reactions = [...config.reactions];
    reactions[index] = { ...reactions[index], ...updates };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Add a step to the reaction chain
  const addStep = useCallback((index: number, stepType: ReactionStep['type']) => {
    const reactions = [...config.reactions];
    const reaction = reactions[index];
    const steps = reaction.steps || [];
    
    let newStep: ReactionStep;
    switch (stepType) {
      case 'body':
        newStep = {
          type: 'body',
          name: `Body Pose ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          bodyConfig: { ...currentBody },
        };
        break;
      case 'hands':
        newStep = {
          type: 'hands',
          name: `Hand Pose ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          handsConfig: { ...currentHands },
        };
        break;
      case 'facial':
        newStep = {
          type: 'facial',
          name: `Facial ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          facialConfig: {
            expressions: { ...currentFacial.expressions },
            mouth: { ...currentFacial.mouth },
            eyes: { ...currentFacial.eyes },
            customPresets: [],
          },
        };
        break;
      case 'gesture':
        newStep = {
          type: 'gesture',
          name: `Gesture ${steps.length + 1}`,
          delay: 0,
          duration: 1.5,
          gestureName: availableGestures[0]?.name || '',
        };
        break;
      case 'expression':
        newStep = {
          type: 'expression',
          name: `Expression ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          expressionName: 'joy',
          expressionValue: 0.8,
        };
        break;
      default:
        return;
    }
    
    reactions[index] = { ...reaction, steps: [...steps, newStep] };
    onChange({ reactions });
  }, [config.reactions, onChange, currentBody, currentHands, currentFacial, availableGestures]);

  // Remove a step from the chain
  const removeStep = useCallback((reactionIndex: number, stepIndex: number) => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    steps.splice(stepIndex, 1);
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Update a step
  const updateStep = useCallback((reactionIndex: number, stepIndex: number, updates: Partial<ReactionStep>) => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    steps[stepIndex] = { ...steps[stepIndex], ...updates };
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Move step up/down in chain
  const moveStep = useCallback((reactionIndex: number, stepIndex: number, direction: 'up' | 'down') => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    [steps[stepIndex], steps[newIndex]] = [steps[newIndex], steps[stepIndex]];
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {/* New Reaction */}
      <div>
        <SectionHeader title="Create Reaction" />
        <div className="flex gap-1">
          <input
            type="text"
            value={newReactionName}
            onChange={(e) => setNewReactionName(e.target.value)}
            placeholder="Reaction name"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
          />
          <button
            onClick={addNewReaction}
            disabled={!newReactionName.trim()}
            className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            + New
          </button>
        </div>
      </div>

      {/* Reactions List */}
      <div>
        <SectionHeader title="Reactions" />
        <div className="space-y-1">
          {config.reactions.map((reaction: ReactionDefinition, index: number) => (
            <div
              key={reaction.name}
              className={`rounded border ${
                reaction.enabled
                  ? 'border-cyan-500/30 bg-gray-800/50'
                  : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}
            >
              {/* Reaction Header */}
              <div className="p-1.5 flex items-center justify-between">
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
                    {reaction.steps && reaction.steps.length > 0 && (
                      <span className="ml-1 text-[8px] text-gray-400">
                        ({reaction.steps.length} steps)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="px-1.5 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                  >
                    {editingIndex === index ? '▼' : '✎'}
                  </button>
                  <button
                    onClick={() => handlePreview(reaction)}
                    disabled={!reaction.enabled}
                    className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Edit Mode */}
              {editingIndex === index && (
                <div className="px-2 pb-2 border-t border-gray-700/50 pt-2 space-y-2">
                  {/* Mode Toggle */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateReaction(index, { mode: 'ACTIVE' })}
                      className={`flex-1 px-2 py-0.5 text-[9px] rounded ${
                        reaction.mode === 'ACTIVE' ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      ACTIVE
                    </button>
                    <button
                      onClick={() => updateReaction(index, { mode: 'PASSIVE' })}
                      className={`flex-1 px-2 py-0.5 text-[9px] rounded ${
                        reaction.mode === 'PASSIVE' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      PASSIVE
                    </button>
                  </div>

                  {/* Duration */}
                  <Slider
                    label="Duration"
                    value={reaction.duration}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onChange={(duration) => updateReaction(index, { duration })}
                  />

                  {/* Chain Steps */}
                  <div>
                    <div className="text-[9px] text-cyan-400 mb-1">Chain Steps</div>
                    <div className="text-[8px] text-gray-400 mb-2">
                      Add steps from current Body/Hands/Facial configs
                    </div>
                    
                    {/* Add Step Buttons */}
                    <div className="flex gap-1 flex-wrap mb-2">
                      <button
                        onClick={() => addStep(index, 'body')}
                        className="px-2 py-0.5 text-[8px] bg-purple-700/50 hover:bg-purple-600 text-white rounded"
                      >
                        + Body
                      </button>
                      <button
                        onClick={() => addStep(index, 'hands')}
                        className="px-2 py-0.5 text-[8px] bg-orange-700/50 hover:bg-orange-600 text-white rounded"
                      >
                        + Hands
                      </button>
                      <button
                        onClick={() => addStep(index, 'facial')}
                        className="px-2 py-0.5 text-[8px] bg-pink-700/50 hover:bg-pink-600 text-white rounded"
                      >
                        + Facial
                      </button>
                      <button
                        onClick={() => addStep(index, 'gesture')}
                        className="px-2 py-0.5 text-[8px] bg-green-700/50 hover:bg-green-600 text-white rounded"
                      >
                        + Gesture
                      </button>
                      <button
                        onClick={() => addStep(index, 'expression')}
                        className="px-2 py-0.5 text-[8px] bg-yellow-700/50 hover:bg-yellow-600 text-white rounded"
                      >
                        + Expression
                      </button>
                    </div>

                    {/* Steps List */}
                    {reaction.steps && reaction.steps.length > 0 && (
                      <div className="space-y-1">
                        {reaction.steps.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            className={`p-1.5 rounded border text-[9px] ${
                              step.type === 'body' ? 'border-purple-500/30 bg-purple-900/20' :
                              step.type === 'hands' ? 'border-orange-500/30 bg-orange-900/20' :
                              step.type === 'facial' ? 'border-pink-500/30 bg-pink-900/20' :
                              step.type === 'gesture' ? 'border-green-500/30 bg-green-900/20' :
                              'border-yellow-500/30 bg-yellow-900/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-200">
                                {stepIndex + 1}. {step.type.toUpperCase()}: {step.name}
                              </span>
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => moveStep(index, stepIndex, 'up')}
                                  disabled={stepIndex === 0}
                                  className="px-1 text-[8px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveStep(index, stepIndex, 'down')}
                                  disabled={stepIndex === reaction.steps!.length - 1}
                                  className="px-1 text-[8px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => removeStep(index, stepIndex)}
                                  className="px-1 text-[8px] bg-red-700/50 hover:bg-red-600 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <span className="text-gray-400">Delay:</span>
                                <input
                                  type="number"
                                  value={step.delay}
                                  onChange={(e) => updateStep(index, stepIndex, { delay: parseFloat(e.target.value) || 0 })}
                                  className="w-12 ml-1 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0"
                                  aria-label="Step delay in seconds"
                                />
                                <span className="text-gray-500">s</span>
                              </div>
                              <div className="flex-1">
                                <span className="text-gray-400">Duration:</span>
                                <input
                                  type="number"
                                  value={step.duration}
                                  onChange={(e) => updateStep(index, stepIndex, { duration: parseFloat(e.target.value) || 1 })}
                                  className="w-12 ml-1 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0.1"
                                  aria-label="Step duration in seconds"
                                />
                                <span className="text-gray-500">s</span>
                              </div>
                            </div>
                            {/* Gesture selector */}
                            {step.type === 'gesture' && (
                              <div className="mt-1">
                                <select
                                  value={step.gestureName || ''}
                                  onChange={(e) => updateStep(index, stepIndex, { gestureName: e.target.value })}
                                  className="w-full px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-[9px]"
                                  aria-label="Select gesture"
                                >
                                  {availableGestures.map((g) => (
                                    <option key={g.name} value={g.name}>{g.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {/* Expression selector */}
                            {step.type === 'expression' && (
                              <div className="mt-1 flex gap-1">
                                <select
                                  value={step.expressionName || 'joy'}
                                  onChange={(e) => updateStep(index, stepIndex, { expressionName: e.target.value })}
                                  className="flex-1 px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-[9px]"
                                  aria-label="Select expression"
                                >
                                  {['joy', 'angry', 'sorrow', 'fun', 'surprised', 'blink'].map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  value={step.expressionValue || 0.8}
                                  onChange={(e) => updateStep(index, stepIndex, { expressionValue: parseFloat(e.target.value) || 0 })}
                                  className="w-14 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  aria-label="Expression intensity"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(!reaction.steps || reaction.steps.length === 0) && (
                      <div className="text-[8px] text-gray-500 text-center py-2">
                        No steps yet. Configure Body/Hands/Facial tabs, then click + to capture.
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteReaction(index)}
                    className="w-full mt-2 px-2 py-1 text-[9px] bg-red-700/50 hover:bg-red-600 text-white rounded"
                  >
                    Delete Reaction
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hands Tab - Finger bone controls
function HandsTab({
  config,
  onChange,
  onSaveAsGesture,
}: {
  config: HandsConfig;
  onChange: (config: Partial<HandsConfig>) => void;
  onSaveAsGesture?: (name: string, bones: Record<string, { x: number; y: number; z: number }>) => void;
}) {
  const [expandedHand, setExpandedHand] = useState<'left' | 'right' | null>('left');
  const [expandedFinger, setExpandedFinger] = useState<string | null>(null);
  const [gestureName, setGestureName] = useState('');

  // Finger bone update callbacks
  const updateBone = useCallback((boneName: keyof HandsConfig, axis: 'x' | 'y' | 'z', value: number) => {
    const currentBone = config[boneName] as BoneRotation;
    onChange({
      [boneName]: {
        x: currentBone.x,
        y: currentBone.y,
        z: currentBone.z,
        [axis]: value,
      },
    });
  }, [config, onChange]);

  // Save current hand config as a gesture
  const saveAsGesture = useCallback(() => {
    if (!gestureName.trim() || !onSaveAsGesture) return;
    
    // Convert degrees to radians for gesture bones
    const degToRad = (deg: number) => (deg * Math.PI) / 180;
    const bones: Record<string, { x: number; y: number; z: number }> = {};
    
    // Collect all non-zero finger bones
    const fingerBones = [
      'leftThumbProximal', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      'rightThumbProximal', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
    ] as const;
    
    for (const boneName of fingerBones) {
      const boneConfig = config[boneName as keyof HandsConfig] as BoneRotation;
      if (boneConfig.x !== 0 || boneConfig.y !== 0 || boneConfig.z !== 0) {
        bones[boneName] = {
          x: degToRad(boneConfig.x),
          y: degToRad(boneConfig.y),
          z: degToRad(boneConfig.z),
        };
      }
    }
    
    onSaveAsGesture(gestureName.trim(), bones);
    setGestureName('');
  }, [gestureName, config, onSaveAsGesture]);

  // Hand presets
  const applyPreset = useCallback((preset: 'open' | 'fist' | 'point' | 'peace' | 'grip' | 'thumbsUp', hand: 'left' | 'right') => {
    const prefix = hand === 'left' ? 'left' : 'right';
    const presets: Record<string, Partial<HandsConfig>> = {
      open: {
        [`${prefix}ThumbProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 0, y: 0, z: 0 },
      },
      fist: {
        [`${prefix}ThumbProximal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}IndexIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 45, y: 0, z: 0 },
      },
      point: {
        [`${prefix}ThumbProximal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 45, y: 0, z: 0 },
      },
      peace: {
        [`${prefix}ThumbProximal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 0, y: 0, z: -10 },
        [`${prefix}IndexIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 0, y: 0, z: 10 },
        [`${prefix}MiddleIntermediate`]: { x: 0, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 45, y: 0, z: 0 },
      },
      grip: {
        [`${prefix}ThumbProximal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 20, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 60, y: 0, z: 0 },
        [`${prefix}IndexIntermediate`]: { x: 60, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 60, y: 0, z: 0 },
        [`${prefix}MiddleIntermediate`]: { x: 60, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 60, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 60, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 30, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 60, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 60, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 30, y: 0, z: 0 },
      },
      thumbsUp: {
        [`${prefix}ThumbProximal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}ThumbDistal`]: { x: 0, y: 0, z: 0 },
        [`${prefix}IndexProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}IndexIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}IndexDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}MiddleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}MiddleDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}RingProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}RingDistal`]: { x: 45, y: 0, z: 0 },
        [`${prefix}LittleProximal`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleIntermediate`]: { x: 90, y: 0, z: 0 },
        [`${prefix}LittleDistal`]: { x: 45, y: 0, z: 0 },
      },
    };
    onChange(presets[preset] as Partial<HandsConfig>);
  }, [onChange]);

  const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const;
  const bones = ['Proximal', 'Intermediate', 'Distal'] as const;

  const renderFingerSliders = (hand: 'left' | 'right', finger: typeof fingers[number]) => {
    const prefix = hand === 'left' ? 'left' : 'right';
    const fingerKey = `${prefix}${finger}`;
    const isExpanded = expandedFinger === fingerKey;

    return (
      <div key={fingerKey} className="mb-1">
        <button
          onClick={() => setExpandedFinger(isExpanded ? null : fingerKey)}
          className="w-full flex items-center justify-between px-2 py-1 text-[9px] bg-gray-700/50 hover:bg-gray-700 rounded"
        >
          <span className="text-gray-200">{finger}</span>
          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
        </button>
        {isExpanded && (
          <div className="pl-2 pt-1">
            {bones.map((bone) => {
              // Thumb only has Proximal and Distal
              if (finger === 'Thumb' && bone === 'Intermediate') return null;
              const boneName = `${prefix}${finger}${bone}` as keyof HandsConfig;
              const boneConfig = config[boneName] as BoneRotation;
              return (
                <div key={bone} className="mb-1">
                  <span className="text-[8px] text-gray-400">{bone}</span>
                  <Slider
                    label="Curl"
                    value={boneConfig.x}
                    min={-30}
                    max={90}
                    step={1}
                    onChange={(v) => updateBone(boneName, 'x', v)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {/* Hand selector */}
      <div className="flex gap-1">
        <button
          onClick={() => setExpandedHand('left')}
          className={`flex-1 px-2 py-1 text-[10px] rounded ${
            expandedHand === 'left' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'
          }`}
        >
          Left Hand
        </button>
        <button
          onClick={() => setExpandedHand('right')}
          className={`flex-1 px-2 py-1 text-[10px] rounded ${
            expandedHand === 'right' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'
          }`}
        >
          Right Hand
        </button>
      </div>

      {/* Presets */}
      <div>
        <SectionHeader title="Presets" />
        <div className="flex gap-1 flex-wrap">
          {(['open', 'fist', 'point', 'peace', 'grip', 'thumbsUp'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => expandedHand && applyPreset(preset, expandedHand)}
              className="px-2 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Finger controls */}
      {expandedHand && (
        <div>
          <SectionHeader title={`${expandedHand === 'left' ? 'Left' : 'Right'} Fingers`} />
          {fingers.map((finger) => renderFingerSliders(expandedHand, finger))}
        </div>
      )}

      {/* Save as Gesture */}
      {onSaveAsGesture && (
        <div>
          <SectionHeader title="Save as Gesture" />
          <div className="flex gap-1">
            <input
              type="text"
              value={gestureName}
              onChange={(e) => setGestureName(e.target.value)}
              placeholder="Gesture name"
              className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
            />
            <button
              onClick={saveAsGesture}
              disabled={!gestureName.trim()}
              className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Facial Tab - Expression and mouth controls
function FacialTab({
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
