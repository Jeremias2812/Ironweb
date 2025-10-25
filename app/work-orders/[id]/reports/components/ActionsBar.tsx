'use client';
import Link from 'next/link';

type Props = {
  isHydrating: boolean;
  isDirty: boolean;
  saving: boolean;
  onReload: () => void;
  onSave: () => void;
  printHref: string;          // ?print=1
  target?: string;
  rel?: string;
  mode: 'edit'|'view';
  setMode: (m:'edit'|'view') => void;
};

export default function ActionsBar({
  isHydrating, isDirty, saving, onReload, onSave,
  printHref,
  target, rel,
  mode, setMode
}: Props) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button className="btn" onClick={onReload} disabled={isHydrating || saving}>Recargar</button>
      <button className="btn" onClick={onSave} disabled={!isDirty || saving}>Guardar</button>

      <div className="divider divider-horizontal" />

      <span className="opacity-80 text-sm">Modo:</span>
      <button className={`btn ${mode==='edit' ? '' : 'btn-ghost opacity-70'}`} onClick={()=>setMode('edit')}>Editar</button>
      <button className={`btn ${mode==='view' ? '' : 'btn-ghost opacity-70'}`} onClick={()=>setMode('view')}>Vista previa</button>

      <div className="divider divider-horizontal" />

      <Link className="btn btn-ghost text-sm" href={printHref} target={target} rel={rel}>Ir a imprimir</Link>
    </div>
  );
}