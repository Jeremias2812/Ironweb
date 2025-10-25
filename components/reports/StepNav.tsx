'use client';

type Props = {
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
};

export default function StepNav({ step, setStep }: Props) {
  const labels = ['Cabecera', 'Métodos', 'Adjuntos y Firma'] as const;

  return (
    <div className="card flex gap-3">
      {(labels as readonly string[]).map((label, idx) => {
        const n = (idx + 1) as 1 | 2 | 3;
        return (
          <button
            key={label}
            className={`btn ${step === n ? '' : 'opacity-60'}`}
            onClick={() => setStep(n)}
            type="button"
          >
            {n}. {label}
          </button>
        );
      })}
    </div>
  );
}