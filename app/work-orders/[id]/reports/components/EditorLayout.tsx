'use client';

import HeaderForm from './HeaderForm';
import UTSectionSmart from './UTSectionSmart';

// Tipado de props que recibe el layout del editor
export type EditorLayoutProps = {
  // Navegación por pasos
  step: number;
  setStep: (n: number) => void;
  error?: string | null;

  // Cabecera
  client: string; sector: string; location: string;
  scope: string; serviceLevel: string; frequency: string;
  reportDate: string; reportNumber: string;
  setClient: (v:string)=>void; setSector:(v:string)=>void; setLocation:(v:string)=>void;
  setScope: (v:string)=>void; setServiceLevel: (v:string)=>void; setFrequency: (v:string)=>void;
  setReportDate: (v:string)=>void; setReportNumber: (v:string)=>void;

  // Métodos
  methods: any; setMethods: (m:any)=>void;

  // UT
  utPoints: any[]; setUtPoints: (p:any[])=>void;
  utInstrumentId?: string|null; setUtInstrumentId?: (id:string|null)=>void;
};

export default function EditorLayout(props: EditorLayoutProps) {
  const { step, setStep, error } = props;

  return (
    <div className="space-y-6">
      <StepNav step={step} setStep={setStep} />
      {error && <div className="card text-red-600 no-print">{error}</div>}

      {/* Step 1: Cabecera */}
      {step === 1 && (
        <HeaderForm
          client={props.client}
          sector={props.sector}
          location={props.location}
          scope={props.scope}
          serviceLevel={props.serviceLevel}
          frequency={props.frequency}
          reportDate={props.reportDate}
          reportNumber={props.reportNumber}
          setClient={props.setClient}
          setSector={props.setSector}
          setLocation={props.setLocation}
          setScope={props.setScope}
          setServiceLevel={props.setServiceLevel}
          setFrequency={props.setFrequency}
          setReportDate={props.setReportDate}
          setReportNumber={props.setReportNumber}
        />
      )}

      {/* Step 2: Métodos */}
      {step === 2 && (
        <div className="certificate-box text-sm text-white/70">
          Sección de métodos deshabilitada temporalmente.
        </div>
      )}

      {/* Step 3: UT */}
      {step === 3 && (
        <div className="certificate-box">
          <UTSectionSmart
            utInstrumentId={props.utInstrumentId}
            utPoints={props.utPoints}
            setUtPoints={props.setUtPoints}
            setUtInstrumentId={props.setUtInstrumentId}
          />
        </div>
      )}
    </div>
  );
}