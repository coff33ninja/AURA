import React from 'react';
import { TransformConfig } from '../../../types/behaviorTypes';
import { Slider, SectionHeader } from '../shared';

interface TransformTabProps {
  config: TransformConfig;
  onChange: (config: Partial<TransformConfig>) => void;
}

export function TransformTab({ config, onChange }: TransformTabProps) {
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
