'use client';
import UTSection, { UtPoint as BaseUtPoint } from '@/components/reports/UTSection';

// Forma interna (estado local en page): strings para los mm
export type UtPoint = { point: string; min_mm: string; actual_mm: string };

type Props = {
  /* instruments / expirations (opcionales en Smart) */
  utInstrumentId?: string | null;
  utInstrumentExp?: string | null;
  utStepWedgeId?: string | null;
  utStepWedgeExp?: string | null;

  /* points (forma interna string-string) */
  utPoints: UtPoint[];
  setUtPoints: (next: UtPoint[]) => void;

  /* sketch */
  utSketchUrl?: string | null;
  // compat con UTSection base
  onSketchChange?: (files: FileList | null) => void;
  onSketchUpload?: () => void | Promise<void>;
  utSketchUploading?: boolean;

  /* setters for instruments (opcionales) */
  setUtInstrumentId?: (id: string | null) => void;
  setUtInstrumentExp?: (v: string | null) => void;
  setUtStepWedgeId?: (id: string | null) => void;
  setUtStepWedgeExp?: (v: string | null) => void;

  /* passthrough */
  [key: string]: any;
};

export default function UTSectionSmart(props: Props) {
  const {
    utPoints,
    setUtPoints,
    utInstrumentId,
    utInstrumentExp,
    utStepWedgeId,
    utStepWedgeExp,
    utSketchUrl,
    onSketchChange,
    onSketchUpload,
    utSketchUploading,
    setUtInstrumentId,
    setUtInstrumentExp,
    setUtStepWedgeId,
    setUtStepWedgeExp,
    ...rest
  } = props;

  // Adapta los puntos a la forma esperada por UTSection (number | '' | undefined)
  const utPointsOut: BaseUtPoint[] = (utPoints || []).map((p) => ({
    point: p.point,
    min_mm: p.min_mm === '' ? '' : Number(p.min_mm),
    actual_mm: p.actual_mm === '' ? '' : Number(p.actual_mm),
  }));

  // Adapter para setUtPoints que UTSection espera: (fn: (prev)=>next) => void
  const setPointsAdapter = (fn: (prev: BaseUtPoint[]) => BaseUtPoint[]) => {
    const nextOut = fn(utPointsOut);
    const nextIn: UtPoint[] = (nextOut || []).map((p) => ({
      point: String(p.point ?? ''),
      min_mm: p.min_mm === '' || p.min_mm == null ? '' : String(p.min_mm),
      actual_mm: p.actual_mm === '' || p.actual_mm == null ? '' : String(p.actual_mm),
    }));
    setUtPoints(nextIn);
  };

  // Handlers locales que trabajan con la forma interna (sin updater function)
  const onAddPoint = () => {
    const last = utPoints[utPoints.length - 1]?.point || 'A';
    const nextLabel = String.fromCharCode((last.charCodeAt(0) || 64) + 1);
    setUtPoints([...utPoints, { point: nextLabel, min_mm: '', actual_mm: '' }]);
  };

  const onChangePoint = (idx: number, field: 'min_mm' | 'actual_mm', val: string) => {
    const next = utPoints.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
    setUtPoints(next);
  };

  const onChangeLabel = (idx: number, label: string) => {
    const next = utPoints.map((p, i) => (i === idx ? { ...p, point: label } : p));
    setUtPoints(next);
  };

  const onRemovePoint = (idx: number) => {
    if (utPoints.length <= 1) return;
    const next = utPoints.filter((_, i) => i !== idx);
    setUtPoints(next);
  };

  return (
    <UTSection
      /* --- instruments / expirations --- */
      utInstrumentId={utInstrumentId ?? ''}
      utInstrumentExp={utInstrumentExp ?? ''}
      utStepWedgeId={utStepWedgeId ?? ''}
      utStepWedgeExp={utStepWedgeExp ?? ''}

      /* --- points (adaptados) --- */
      utPoints={utPointsOut}
      onChangePoint={onChangePoint}
      onChangeLabel={onChangeLabel}
      onAddPoint={onAddPoint}
      onRemovePoint={onRemovePoint}

      /* --- sketch --- */
      utSketchUrl={utSketchUrl ?? null}
      onSketchChange={onSketchChange ?? (() => {})}
      onSketchUpload={onSketchUpload ?? (() => {})}
      utSketchUploading={!!utSketchUploading}

      /* --- setters for instruments (adaptados a string) --- */
      setUtInstrumentId={(v: string) => setUtInstrumentId?.(v ?? null)}
      setUtInstrumentExp={(v: string) => setUtInstrumentExp?.(v ?? null)}
      setUtStepWedgeId={(v: string) => setUtStepWedgeId?.(v ?? null)}
      setUtStepWedgeExp={(v: string) => setUtStepWedgeExp?.(v ?? null)}

      /* --- setter de puntos que espera UTSection --- */
      setUtPoints={setPointsAdapter}

      /* --- passthrough --- */
      {...rest}
    />
  );
}