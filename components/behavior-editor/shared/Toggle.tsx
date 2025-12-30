import React from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({
  label,
  checked,
  onChange,
}: ToggleProps) {
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
