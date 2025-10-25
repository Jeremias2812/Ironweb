'use client';

import React from 'react';

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function CertificateBox({ title, children, className }: Props) {
  return (
    <section className={`border border-black/30 bg-white text-black p-3 rounded-sm ${className ?? ''}`}>
      <h3 className="text-xs font-bold tracking-wide mb-2 px-3 py-1.5 bg-gray-300 text-black border-b border-black/40 -mx-3 -mt-3 rounded-t-sm">
        {title}
      </h3>
      <div className="text-[12px] leading-5">{children}</div>
    </section>
  );
}