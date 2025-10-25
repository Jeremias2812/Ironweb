'use client';
import React from 'react';

type TestRow = {
  test_type: 'hydro'|'functional'|'lp';
  applies: boolean;
  instrument_id?: string;
  instrument_exp?: string;
  notes?: string;
};

type Props = {
  tests: TestRow[];
  setTests: (next: TestRow[]) => void;
};

const TEST_LABELS: Record<TestRow['test_type'], string> = {
  hydro: 'Hidrostática',
  functional: 'Funcional',
  lp: 'Líquidos penetrantes',
};

export default function TestsPanel({ tests, setTests }: Props) {
  const update = (idx: number, patch: Partial<TestRow>) => {
    const next = tests.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    setTests(next);
  };

  return (
    <section className="mt-6 card">
      {/* Cabecera estilo UT */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Pruebas</h3>
      </div>

      {/* Filas compactas al estilo UT */}
      <div className="divide-y divide-base-300">
        {tests.map((t, i) => {
          const disabled = !t.applies;
          const rowOpacity = disabled ? 'opacity-50' : '';
          return (
            <div key={`${t.test_type}-${i}`} className="py-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
                {/* Col 1: Nombre de la prueba */}
                <div className="text-sm font-medium pt-2 md:pt-0">
                  {TEST_LABELS[t.test_type]}
                </div>

                {/* Col 2: Aplica */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm rounded-full border-2 border-base-300"
                    checked={!!t.applies}
                    onChange={(e) => update(i, { applies: e.target.checked })}
                  />
                  <span className="text-xs text-base-content/70">Aplica</span>
                </div>

                {/* Col 3: Instrumento */}
                <div className={rowOpacity}>
                  <input
                    className="input input-sm w-full bg-base-300 text-base-content border border-base-300 placeholder:text-base-content/60"
                    placeholder="ID del equipo / serie…"
                    value={t.instrument_id || ''}
                    onChange={(e) => update(i, { instrument_id: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                {/* Col 4: Vence */}
                <div className={rowOpacity}>
                  <input
                    type="date"
                    className="input input-sm w-full bg-base-300 text-base-content border border-base-300 placeholder:text-base-content/60"
                    value={t.instrument_exp || ''}
                    onChange={(e) => update(i, { instrument_exp: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                {/* Col 5: Notas */}
                <div className={rowOpacity}>
                  <input
                    className="input input-sm w-full bg-base-300 text-base-content border border-base-300 placeholder:text-base-content/60"
                    placeholder="Notas…"
                    value={t.notes || ''}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}