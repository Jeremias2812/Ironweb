'use client';
import React from 'react';

type Props = {
  client: string;
  sector: string;
  location: string;
  scope: string;
  serviceLevel: string;
  frequency: string;
  reportDate: string;
  reportNumber: string;
  setClient: (v: string) => void;
  setSector: (v: string) => void;
  setLocation: (v: string) => void;
  setScope: (v: string) => void;
  setServiceLevel: (v: string) => void;
  setFrequency: (v: string) => void;
  setReportDate: (v: string) => void;
  setReportNumber: (v: string) => void;
};

export default function HeaderForm(props: Props) {
  const {
    client, sector, location, scope, serviceLevel, frequency, reportDate, reportNumber,
    setClient, setSector, setLocation, setScope, setServiceLevel, setFrequency, setReportDate, setReportNumber
  } = props;

  return (
    <section className="card text-base-content overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-4 pt-4">
        <h3 className="text-lg font-semibold">Cabecera</h3>
      </div>
      <div className="p-3 grid grid-cols-12 gap-3 text-[12px]">
        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Cliente</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={client}
            onChange={e => setClient(e.target.value)}
          />
        </div>
        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Sector</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={sector}
            onChange={e => setSector(e.target.value)}
          />
        </div>
        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Lugar</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        <div className="col-span-12 md:col-span-9 space-y-1">
          <label className="text-xs text-base-content/70">Alcance del servicio</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={scope}
            onChange={e => setScope(e.target.value)}
          />
        </div>
        <div className="col-span-12 md:col-span-3 space-y-1">
          <label className="text-xs text-base-content/70">Nivel</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={serviceLevel}
            onChange={e => setServiceLevel(e.target.value)}
          />
        </div>

        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Frecuencia</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={frequency}
            onChange={e => setFrequency(e.target.value)}
          />
        </div>
        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Fecha</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
          />
        </div>
        <div className="col-span-12 md:col-span-4 space-y-1">
          <label className="text-xs text-base-content/70">Informe Nº</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
            value={reportNumber}
            onChange={e => setReportNumber(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}