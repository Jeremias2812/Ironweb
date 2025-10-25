'use client';
import React from 'react';

type ViewMode = 'edit' | 'view';

type Props = {
  // Precinto
  sealType: string;
  sealDue: string;
  setSealType: (v: string) => void;
  setSealDue: (v: string) => void;

  // Fotos
  photos: File[];
  photoUrls: string[];
  photoUploading: boolean;
  onPhotosChange: (files: FileList | null) => void;
  uploadPhotos: () => Promise<void> | void;

  // Firma imagen
  signatureFile: File | null;
  signatureUrl: string | null;
  signatureUploading: boolean;
  onSignatureChange: (files: FileList | null) => void;
  uploadSignature: () => Promise<void> | void;

  // Resultado final
  finalResult: '' | 'approved' | 'rejected';
  setFinalResult: (v: '' | 'approved' | 'rejected') => void;

  // Acciones
  saving: boolean;
  saveAll: () => Promise<void> | void;
  setMode: (m: ViewMode) => void;
};

export default function AttachmentsAndSignature({
  sealType,
  sealDue,
  setSealType,
  setSealDue,
  photos,
  photoUrls,
  photoUploading,
  onPhotosChange,
  uploadPhotos,
  signatureFile,
  signatureUrl,
  signatureUploading,
  onSignatureChange,
  uploadSignature,
  finalResult,
  setFinalResult,
  saving,
  saveAll,
  setMode,
}: Props) {
  return (
    <div className="card p-4 bg-base-100 border border-base-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Adjuntos y firma</h2>
      </div>

      {/* Precinto / Vence primero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-sm text-base-content/80">Precinto</label>
          <input
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 rounded-full"
            value={sealType}
            onChange={(e) => setSealType(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-base-content/80">Vence</label>
          <input
            type="date"
            className="input input-sm w-full bg-base-300 text-base-content border-2 border-base-300 rounded-full"
            value={sealDue}
            onChange={(e) => setSealDue(e.target.value)}
          />
        </div>
      </div>

      {/* Adjuntos (fotos) */}
      <div className="space-y-3 mb-6 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-base-content/80">Fotos</label>
          <input
            className="file-input file-input-sm"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => onPhotosChange(e.target.files)}
          />
          <button
            className="btn btn-sm"
            disabled={photoUploading || photos.length === 0}
            onClick={uploadPhotos}
          >
            Subir
          </button>
        </div>
        {photoUrls.length > 0 && (
          <div className="photos-grid grid grid-cols-2 md:grid-cols-4 gap-2">
            {photoUrls.map((u, i) => (
              <img key={`${u}-${i}`} src={u} className="w-full h-auto rounded" />
            ))}
          </div>
        )}
      </div>

      {/* Firma (imagen) */}
      <div className="space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-base-content/80">Firma (imagen)</label>
          <input
            className="file-input file-input-sm"
            type="file"
            accept="image/*"
            onChange={(e) => onSignatureChange(e.target.files)}
          />
          <button
            className="btn btn-sm"
            disabled={signatureUploading || !signatureFile}
            onClick={uploadSignature}
          >
            Subir
          </button>
        </div>
        {signatureUrl && (
          <div>
            <img src={signatureUrl} alt="Firma" className="max-h-32 border rounded" />
          </div>
        )}
      </div>

      {/* Resultado final y acciones */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Resultado final</label>
          <select
            className={`select select-sm bg-base-300 text-base-content border-2 border-base-300 rounded-full ${
              finalResult === 'approved'
                ? 'text-green-600'
                : finalResult === 'rejected'
                ? 'text-red-600'
                : ''
            }`}
            value={finalResult}
            onChange={(e) => setFinalResult(e.target.value as '' | 'approved' | 'rejected')}
          >
            <option value="">—</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={saving} onClick={saveAll}>
            Guardar informe
          </button>
          <button className="btn" onClick={() => setMode('view')}>
            Vista previa
          </button>
        </div>
      </div>
    </div>
  );
}