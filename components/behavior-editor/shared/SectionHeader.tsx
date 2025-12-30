import React from 'react';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="text-[10px] font-semibold text-cyan-400 mb-2 pb-1 border-b border-cyan-500/20">
      {title}
    </h3>
  );
}
