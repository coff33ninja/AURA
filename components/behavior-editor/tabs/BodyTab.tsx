import React, { useCallback } from 'react';
import { BodyConfig } from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

interface BodyTabProps {
  config: BodyConfig;
  onChange: (config: Partial<BodyConfig>) => void;
}

export function BodyTab({ config, onChange }: BodyTabProps) {
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
        <Slider label="Upper X" value={config.leftUpperArm.x} min={-90} max={90} step={1} onChange={(x) => updateLeftUpperArm('x', x)} />
        <Slider label="Upper Y" value={config.leftUpperArm.y} min={-90} max={90} step={1} onChange={(y) => updateLeftUpperArm('y', y)} />
        <Slider label="Upper Z" value={config.leftUpperArm.z} min={-90} max={90} step={1} onChange={(z) => updateLeftUpperArm('z', z)} />
        <Slider label="Lower X" value={config.leftLowerArm.x} min={-90} max={90} step={1} onChange={(x) => updateLeftLowerArm('x', x)} />
      </div>

      <div>
        <SectionHeader title="Right Arm" />
        <Slider label="Upper X" value={config.rightUpperArm.x} min={-90} max={90} step={1} onChange={(x) => updateRightUpperArm('x', x)} />
        <Slider label="Upper Y" value={config.rightUpperArm.y} min={-90} max={90} step={1} onChange={(y) => updateRightUpperArm('y', y)} />
        <Slider label="Upper Z" value={config.rightUpperArm.z} min={-90} max={90} step={1} onChange={(z) => updateRightUpperArm('z', z)} />
        <Slider label="Lower X" value={config.rightLowerArm.x} min={-90} max={90} step={1} onChange={(x) => updateRightLowerArm('x', x)} />
      </div>

      <div>
        <SectionHeader title="Spine & Chest" />
        <Slider label="Spine X" value={config.spine.x} min={-45} max={45} step={1} onChange={(x) => updateSpine('x', x)} />
        <Slider label="Spine Y" value={config.spine.y} min={-45} max={45} step={1} onChange={(y) => updateSpine('y', y)} />
        <Slider label="Chest X" value={config.chest.x} min={-30} max={30} step={1} onChange={(x) => updateChest('x', x)} />
      </div>

      <div>
        <SectionHeader title="Eye Tracking" />
        <Toggle label="Enabled" checked={config.eyeTracking.enabled} onChange={(enabled) => updateEyeTracking('enabled', enabled)} />
        <Slider label="Intensity" value={config.eyeTracking.intensity} min={0} max={1} onChange={(intensity) => updateEyeTracking('intensity', intensity)} />
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
                leftUpperArm: { x: (preset.arms as any).lx ?? 0, y: 0, z: preset.arms.lz },
                rightUpperArm: { x: (preset.arms as any).rx ?? 0, y: 0, z: preset.arms.rz },
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
