import React, { useRef } from 'react';
import { SectionHeader } from '../shared';

interface ImportExportTabProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export function ImportExportTab({ onExport, onImport }: ImportExportTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div>
        <SectionHeader title="Export" />
        <button
          onClick={onExport}
          className="w-full px-3 py-2 text-[10px] bg-cyan-700 hover:bg-cyan-600 text-white rounded transition-colors"
        >
          Export Behaviors as JSON
        </button>
      </div>

      <div>
        <SectionHeader title="Import" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImport(file);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }
          }}
          className="hidden"
          id="behavior-import"
        />
        <label
          htmlFor="behavior-import"
          className="block w-full px-3 py-2 text-[10px] text-center bg-gray-700 hover:bg-gray-600 text-gray-200 rounded cursor-pointer transition-colors"
        >
          Import Behaviors from JSON
        </label>
      </div>
    </div>
  );
}
