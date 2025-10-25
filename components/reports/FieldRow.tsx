'use client';

import React from 'react';

type Props = {
  label: string;
  value?: string | number | null;
  className?: string;
};

export default function FieldRow({ label, value, className }: Props) {
  return (
    <div className={`grid grid-cols-3 gap-2 items-center mb-1 ${className ?? ''}`}>
      <div className="text-[11px] font-medium">{label}</div>
      <div className="col-span-2 border-b border-black/50 min-h-[18px]">
        {value ? String(value) : '\u00A0'}
      </div>
    </div>
  );
}