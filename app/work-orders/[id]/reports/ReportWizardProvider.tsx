'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';

// Context shape (puedes expandir con más estado cuando migremos la lógica)
export type ReportWizardState = {
  wid: string;
  reportIdFromURL: string | null;
  serviceIdFromURL: string | null;
  // Ejemplo de estado compartido mínimo (extiende libremente)
  step: 1 | 2 | 3 | 4;
  setStep: (n: 1 | 2 | 3 | 4) => void;
};

const ReportWizardContext = createContext<ReportWizardState | null>(null);

export function useWizard() {
  const ctx = useContext(ReportWizardContext);
  if (!ctx) throw new Error('useWizard must be used within ReportWizardProvider');
  return ctx;
}

export function ReportWizardProvider({
  wid,
  reportIdFromURL,
  serviceIdFromURL,
  children,
}: {
  wid: string;
  reportIdFromURL: string | null;
  serviceIdFromURL: string | null;
  children: React.ReactNode;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const value = useMemo<ReportWizardState>(() => ({
    wid,
    reportIdFromURL,
    serviceIdFromURL,
    step,
    setStep,
  }), [wid, reportIdFromURL, serviceIdFromURL, step]);

  return (
    <ReportWizardContext.Provider value={value}>
      {children}
    </ReportWizardContext.Provider>
  );
}

export default ReportWizardProvider;