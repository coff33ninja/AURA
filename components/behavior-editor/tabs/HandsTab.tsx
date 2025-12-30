// Extracted from components/BehaviorEditor.tsx

import React, { useState, useCallback } from 'react';
import {
  HandsConfig,
  BoneRotation,
} from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

export function HandsTab({
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
