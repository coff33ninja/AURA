// Extracted from components/BehaviorEditor.tsx

import React, { useState, useCallback } from 'react';
import {
  GesturesConfig,
  GestureDefinition,
} from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

export function GesturesTab({
  config,
  onChange,
  onPreview,
  onSetBoneRotation,
}: {
  config: GesturesConfig;
  onChange: (config: Partial<GesturesConfig>) => void;
  onPreview: (name: string) => void;
  onSetBoneRotation?: (boneName: string, rotation: { x: number; y: number; z: number }) => void;
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
    const newBone = { ...currentBone, [axis]: value };
    gestures[index] = {
      ...gesture,
      bones: {
        ...gesture.bones,
        [boneName]: newBone,
      },
    };
    console.log(`[GesturesTab] Updating ${gesture.name}.${boneName}.${axis} = ${value}`, newBone);
    onChange({ gestures });
    
    // Live preview - apply bone rotation immediately
    if (onSetBoneRotation) {
      onSetBoneRotation(boneName, newBone);
    }
  }, [config.gestures, onChange, onSetBoneRotation]);

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
                    const isLowerArm = boneName.includes('Lower');
                    return (
                      <div key={boneName} className="pl-1">
                        <span className="text-[8px] text-gray-500">{boneName}</span>
                        <div className="flex gap-1">
                          <Slider
                            label="X"
                            value={bone.x}
                            min={-3}
                            max={3}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'x', v)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Slider
                            label="Y"
                            value={bone.y}
                            min={-3}
                            max={3}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'y', v)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Slider
                            label="Z"
                            value={bone.z}
                            min={-3}
                            max={3}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'z', v)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Hand Bones */}
                  <div className="text-[9px] text-gray-400 mt-2">Hand Bones</div>
                  {['leftHand', 'rightHand'].map((boneName) => {
                    const bone = gesture.bones[boneName] || { x: 0, y: 0, z: 0 };
                    return (
                      <div key={boneName} className="pl-1">
                        <span className="text-[8px] text-gray-500">{boneName}</span>
                        <div className="flex gap-1">
                          <Slider
                            label="X"
                            value={bone.x}
                            min={-3.14}
                            max={3.14}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'x', v)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Slider
                            label="Y"
                            value={bone.y}
                            min={-3.14}
                            max={3.14}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'y', v)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Slider
                            label="Z"
                            value={bone.z}
                            min={-3.14}
                            max={3.14}
                            step={0.1}
                            onChange={(v) => updateGestureBone(index, boneName, 'z', v)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Finger Bones - show if any are defined */}
                  {(() => {
                    const fingerBoneNames = [
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
                    ];
                    const definedFingers = fingerBoneNames.filter(name => gesture.bones[name]);
                    if (definedFingers.length === 0) return null;
                    
                    return (
                      <>
                        <div className="text-[9px] text-gray-400 mt-2">Finger Bones ({definedFingers.length})</div>
                        <div className="max-h-32 overflow-y-auto">
                          {definedFingers.map((boneName) => {
                            const bone = gesture.bones[boneName];
                            return (
                              <div key={boneName} className="pl-1 mb-1">
                                <span className="text-[8px] text-gray-500">{boneName.replace(/^(left|right)/, '$1 ').replace(/([A-Z])/g, ' $1').trim()}</span>
                                <div className="flex gap-1 text-[8px] text-cyan-400">
                                  X:{bone.x.toFixed(2)} Y:{bone.y.toFixed(2)} Z:{bone.z.toFixed(2)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}

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
