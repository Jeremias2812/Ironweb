'use client';

import React, { ChangeEvent, useCallback } from 'react';

// Normaliza inputs de fecha (iOS/iPadOS) para evitar zoom y desbordes en Safari
const DATE_INPUT_CLS = 'input w-full text-[16px] h-11 md:h-10 min-w-0';
function DateInput({ value, onChange, placeholder, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; }) {
  return (
    <input
      type="date"
      className={`${DATE_INPUT_CLS} ${className || ''}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      // Evita estilos nativos que cambian altura/ancho en Safari
      style={{ WebkitAppearance: 'none' as any }}
    />
  );
}

export type UtPoint = { point: string; min_mm?: number | ''; actual_mm?: number | '' };

type Props = {
  utInstrumentId: string;
  setUtInstrumentId: (v: string) => void;
  utInstrumentExp: string;
  setUtInstrumentExp: (v: string) => void;
  utStepWedgeId: string;
  setUtStepWedgeId: (v: string) => void;
  utStepWedgeExp: string;
  setUtStepWedgeExp: (v: string) => void;

  utPoints: UtPoint[];
  /** currently unused by this component; kept for backward-compat with parent */
  setUtPoints: (fn: (prev: UtPoint[]) => UtPoint[]) => void;
  onChangePoint: (idx: number, field: 'min_mm' | 'actual_mm', value: string) => void;
  onChangeLabel: (idx: number, value: string) => void;
  onAddPoint: () => void;
  onRemovePoint: (idx: number) => void;

  utSketchUrl: string | null;
  onSketchChange: (files: FileList | null) => void;
  onSketchUpload: () => Promise<void> | void;
  utSketchUploading: boolean;

  /** Optional: render in read-only mode (disables inputs) */
  readOnly?: boolean;
};

export default function UTSection(props: Props) {
  const {
    utInstrumentId,
    setUtInstrumentId,
    utInstrumentExp,
    setUtInstrumentExp,
    utStepWedgeId,
    setUtStepWedgeId,
    utStepWedgeExp,
    setUtStepWedgeExp,
    utPoints,
    setUtPoints: _setUtPoints, // intentionally unused here, preserved for compatibility
    onChangePoint,
    onChangeLabel,
    onAddPoint,
    onRemovePoint,
    utSketchUrl,
    onSketchChange,
    onSketchUpload,
    utSketchUploading,
    readOnly = false,
  } = props;

  const numberHandler = useCallback(
    (idx: number, field: 'min_mm' | 'actual_mm') =>
      (e: ChangeEvent<HTMLInputElement>) => {
        // allow empty string; otherwise enforce non-negative number with up to 3 decimals
        const v = e.target.value;
        if (v === '') {
          onChangePoint(idx, field, '');
          return;
        }
        // Basic normalization (let the parent decide final parsing)
        const cleaned = v.replace(/,/g, '.').replace(/[^\d.]/g, '');
        onChangePoint(idx, field, cleaned);
      },
    [onChangePoint]
  );

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-2">Ultrasonido (espesores)</h2>

      {/* Equipamiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-3 min-w-0">
        <label className="sr-only" htmlFor="ut-equipo">Equipo UT (ID)</label>
        <input
          id="ut-equipo"
          className="input w-full text-[16px] min-w-0"
          placeholder="Equipo UT (ID)"
          value={utInstrumentId}
          onChange={(e) => setUtInstrumentId(e.target.value)}
          disabled={readOnly}
        />

        <label className="sr-only" htmlFor="ut-equipo-exp">Vence equipo</label>
        <DateInput
          value={utInstrumentExp}
          onChange={(e) => setUtInstrumentExp(e.target.value)}
          placeholder="Vence equipo"
        />

        <label className="sr-only" htmlFor="ut-patron">Patrón escalonado (ID)</label>
        <input
          id="ut-patron"
          className="input w-full text-[16px] min-w-0"
          placeholder="Patrón escalonado (ID)"
          value={utStepWedgeId}
          onChange={(e) => setUtStepWedgeId(e.target.value)}
          disabled={readOnly}
        />

        <label className="sr-only" htmlFor="ut-patron-exp">Vence patrón</label>
        <DateInput
          value={utStepWedgeExp}
          onChange={(e) => setUtStepWedgeExp(e.target.value)}
          placeholder="Vence patrón"
        />
      </div>

      {/* Puntos */}
      <div className="mt-3 flex items-start justify-between">
        <h3 className="font-medium">Puntos</h3>
        <button type="button" className="btn btn-ghost" onClick={onAddPoint} disabled={readOnly}>
          + Añadir punto
        </button>
      </div>

      <table className="table mt-2">
        <thead>
          <tr className="text-left">
            <th>Etiqueta</th>
            <th>Mín (mm)</th>
            <th>Actual (mm)</th>
            <th aria-label="acciones" />
          </tr>
        </thead>
        <tbody>
          {utPoints.map((p, i) => (
            <tr key={`${p.point}-${i}`} className="border-t border-white/10">
              <td className="w-[120px]">
                <label className="sr-only" htmlFor={`ut-point-${i}`}>Etiqueta del punto</label>
                <input
                  id={`ut-point-${i}`}
                  className="input w-full text-[16px] h-10 min-w-0"
                  value={p.point}
                  onChange={(e) => onChangeLabel(i, e.target.value)}
                  disabled={readOnly}
                />
              </td>
              <td>
                <label className="sr-only" htmlFor={`ut-min-${i}`}>Espesor mínimo (mm)</label>
                <input
                  id={`ut-min-${i}`}
                  className="input w-full text-[16px] h-10 text-right min-w-0"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min={0}
                  value={p.min_mm === '' ? '' : String(p.min_mm)}
                  onChange={numberHandler(i, 'min_mm')}
                  disabled={readOnly}
                />
              </td>
              <td>
                <label className="sr-only" htmlFor={`ut-actual-${i}`}>Espesor actual (mm)</label>
                <input
                  id={`ut-actual-${i}`}
                  className="input w-full text-[16px] h-10 text-right min-w-0"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min={0}
                  value={p.actual_mm === '' ? '' : String(p.actual_mm)}
                  onChange={numberHandler(i, 'actual_mm')}
                  disabled={readOnly}
                />
              </td>
              <td className="text-right">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onRemovePoint(i)}
                  disabled={readOnly}
                  title="Eliminar punto"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Croquis automático por tipo de pieza */}
      {utSketchUrl && (
        <div className="mt-4">
          <div className="text-[12px] font-semibold bg-gray-300 text-black px-3 py-1.5 rounded-t">
            Croquis automático (según tipo de pieza)
          </div>
          <div className="p-3 border border-gray-300 rounded-b bg-white">
            <img
              src={utSketchUrl}
              alt="Croquis UT"
              className="max-w-full h-auto mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}