import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: SliderProps) {
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
