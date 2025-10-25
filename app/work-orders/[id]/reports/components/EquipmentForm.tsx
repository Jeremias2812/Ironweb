'use client';
import React from 'react';

type Props = {
  description: string;
  setDescription: (v: string) => void;
  pn: string;
  setPn: (v: string) => void;
  serial: string;
  setSerial: (v: string) => void;
  partCode: string;
  setPartCode: (v: string | null) => void;
  equipment?: string;
  partId?: string;
  setEquipment?: (v: string) => void;
  setPartId?: (v: string) => void;
  onNext?: () => void;
};

export default function EquipmentForm({
  description,
  setDescription,
  pn,
  setPn,
  serial,
  setSerial,
  partCode,
  setPartCode,
  onNext,
}: Props) {
  return (
    <section className="card text-base-content overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-4 pt-4">
        <h3 className="text-lg font-semibold">Equipo / pieza</h3>
      </div>

      <div className="p-3 grid grid-cols-12 gap-3 text-[12px]">
        {/* Descripción */}
        <div className="col-span-12 md:col-span-6 space-y-1">
          <label className="text-xs text-base-content/70">Descripción</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content 
                       border-2 border-base-300 placeholder:text-base-content/60 
                       focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* PN */}
        <div className="col-span-12 md:col-span-6 space-y-1">
          <label className="text-xs text-base-content/70">PN</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content 
                       border-2 border-base-300 placeholder:text-base-content/60 
                       focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={pn}
            onChange={e => setPn(e.target.value)}
          />
        </div>

        {/* Serial */}
        <div className="col-span-12 md:col-span-6 space-y-1">
          <label className="text-xs text-base-content/70">Serial</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content 
                       border-2 border-base-300 placeholder:text-base-content/60 
                       focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={serial}
            onChange={e => setSerial(e.target.value)}
          />
        </div>

        {/* Identificador interno */}
        <div className="col-span-12 md:col-span-6 space-y-1">
          <label className="text-xs text-base-content/70">Identificador interno</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content 
                       border-2 border-base-300 placeholder:text-base-content/60 
                       focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={partCode || ''}
            onChange={e => setPartCode(e.target.value || null)}
          />
        </div>
      </div>

      {/* Botón Siguiente */}
      <div className="flex justify-end mt-4 px-4 pb-4">
        <button
          type="button"
          className="btn btn-primary rounded-full"
          onClick={onNext}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}