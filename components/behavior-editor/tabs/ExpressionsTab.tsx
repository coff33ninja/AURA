import React, { useState } from 'react';
import { ExpressionsConfig } from '../../../types/behaviorTypes';
import { Slider, SectionHeader } from '../shared';

interface ExpressionsTabProps {
  config: ExpressionsConfig;
  onChange: (config: Partial<ExpressionsConfig>) => void;
  onPreview: (name: string, value: number) => void;
}

export function ExpressionsTab({ config, onChange, onPreview }: ExpressionsTabProps) {
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
