'use client';
import React from 'react';

type MethodRow = {
  method: string;
  result: 'approved' | 'rejected' | 'na';
  acceptance: string;
  notes: string;
};

type Props = {
  methods: MethodRow[];
  setMethods: (next: MethodRow[]) => void;
};

const LABELS: Record<string, string> = {
  visual: 'Inspección visual',
  pm: 'Partículas magnéticas',
  ut: 'Ultrasonido (espesores)',
  hydro: 'Prueba hidrostática',
  functional: 'Prueba funcional',
  lp: 'Líquidos penetrantes',
  gauges: 'Calibres / Galgas',
};

export default function MethodsTable({ methods, setMethods }: Props) {
  const update = (key: string, patch: Partial<MethodRow>) => {
    const next = methods.map(m => (m.method === key ? { ...m, ...patch } : m));
    setMethods(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-base-300/40 text-left">
            <th className="px-4 py-2 rounded-tl-md">Método</th>
            <th className="px-2 py-2">Resultado</th>
            <th className="px-2 py-2">Criterio</th>
            <th className="px-4 py-2 rounded-tr-md">Obs.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-300">
          {methods.map((m) => (
            <tr key={m.method} className="">
              {/* Método */}
              <td className="px-4 py-2 whitespace-nowrap align-middle text-base-content/90">
                {LABELS[m.method] || m.method}
              </td>

              {/* Resultado (select) */}
              <td className="px-2 py-2 align-middle">
                <select
                  className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
                  value={m.result}
                  onChange={(e) => update(m.method, { result: e.target.value as MethodRow['result'] })}
                >
                  <option value="na">N/A</option>
                  <option value="approved">Aprobado</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </td>

              {/* Criterio */}
              <td className="px-2 py-2 align-middle">
                <input
                  className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
                  placeholder="Ej: ASTM E-709, OP-001…"
                  value={m.acceptance}
                  onChange={(e) => update(m.method, { acceptance: e.target.value })}
                />
              </td>

              {/* Observaciones */}
              <td className="px-4 py-2 align-middle">
                <input
                  className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 placeholder:text-base-content/60 focus:outline-none focus:ring-1 focus:ring-base-300 rounded-full"
                  placeholder="Observaciones…"
                  value={m.notes}
                  onChange={(e) => update(m.method, { notes: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Nota contextual para UT debajo de la tabla (si quieres mantenerla por compatibilidad) */}
      {methods.some(m => m.method === 'ut') && (
        <div className="mt-2 text-[11px] text-base-content/70">
          * Los parámetros de UT (equipo, patrón, puntos y croquis) se editan debajo, en la sección "Ultrasonido (UT)".
        </div>
      )}
    </div>
  );
}