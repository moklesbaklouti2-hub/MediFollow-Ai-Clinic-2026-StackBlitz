import { useEffect, useState } from 'react';

type Vitals = {
  systolic: string;
  diastolic: string;
  heartRate: string;
  spo2: string;
  temperature: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  glycemia: string;
};

type ConsultationRecord = {
  id: string;
  date: string;
  patient: string;
  motif: string;
  symptoms: string;
  history: string;
  vitals: Vitals;
  examination: string;
  diagnosis: string;
  plan: string;
};

const STORAGE_KEY = 'medifollow-consultations';
const PATIENTS_KEY = 'medifollow-patients';
const MANUAL_OPTION = '__manual__';

const emptyVitals: Vitals = {
  systolic: '',
  diastolic: '',
  heartRate: '',
  spo2: '',
  temperature: '',
  respiratoryRate: '',
  weight: '',
  height: '',
  glycemia: '',
};

function loadConsultations(): ConsultationRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error('Erreur de lecture des consultations :', error);
  }
  return [];
}

function loadRegisteredPatients(): string[] {
  try {
    const saved = localStorage.getItem(PATIENTS_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed
          .map((item: any) => {
            if (typeof item === 'string') return item.trim();
            return typeof item?.name === 'string' ? item.name.trim() : '';
          })
          .filter((name: string) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr'));
  } catch (error) {
    console.error('Erreur de lecture des patients :', error);
    return [];
  }
}

export default function Consultations() {
  const [patient, setPatient] = useState('');
  const [patientMode, setPatientMode] = useState<'select' | 'manual'>('select');
  const [registeredPatients, setRegisteredPatients] = useState<string[]>(
    loadRegisteredPatients
  );

  const [motif, setMotif] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState('');
  const [vitals, setVitals] = useState<Vitals>(emptyVitals);
  const [examination, setExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [saved, setSaved] = useState(false);

  const [consultations, setConsultations] =
    useState<ConsultationRecord[]>(loadConsultations);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consultations));
    } catch (error) {
      console.error('Erreur de sauvegarde des consultations :', error);
    }
  }, [consultations]);

  useEffect(() => {
    function refreshPatients() {
      setRegisteredPatients(loadRegisteredPatients());
    }

    window.addEventListener('focus', refreshPatients);
    window.addEventListener('storage', refreshPatients);

    return () => {
      window.removeEventListener('focus', refreshPatients);
      window.removeEventListener('storage', refreshPatients);
    };
  }, []);

  function updateVital(key: keyof Vitals, value: string) {
    setVitals((previous) => ({ ...previous, [key]: value }));
  }

  function handlePatientSelection(value: string) {
    if (value === MANUAL_OPTION) {
      setPatientMode('manual');
      setPatient('');
    } else {
      setPatientMode('select');
      setPatient(value);
    }
    setSaved(false);
  }

  function saveConsultation() {
    if (!patient.trim() || !motif.trim()) {
      alert('Veuillez renseigner le nom du patient et le motif.');
      return;
    }

    const newConsultation: ConsultationRecord = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`,
      date: new Date().toISOString(),
      patient: patient.trim(),
      motif: motif.trim(),
      symptoms,
      history,
      vitals: { ...vitals },
      examination,
      diagnosis,
      plan,
    };

    setConsultations((previous) => [newConsultation, ...previous]);
    setSaved(true);

    setPatient('');
    setPatientMode('select');
    setMotif('');
    setSymptoms('');
    setHistory('');
    setVitals({ ...emptyVitals });
    setExamination('');
    setDiagnosis('');
    setPlan('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const vitalFields: {
    key: keyof Vitals;
    label: string;
    unit: string;
    placeholder: string;
  }[] = [
    { key: 'systolic', label: 'Pression systolique', unit: 'mmHg', placeholder: '120' },
    { key: 'diastolic', label: 'Pression diastolique', unit: 'mmHg', placeholder: '80' },
    { key: 'heartRate', label: 'Fréquence cardiaque', unit: 'bpm', placeholder: '75' },
    { key: 'spo2', label: 'Saturation SpO₂', unit: '%', placeholder: '98' },
    { key: 'temperature', label: 'Température', unit: '°C', placeholder: '37' },
    { key: 'respiratoryRate', label: 'Fréquence respiratoire', unit: 'cycles/min', placeholder: '16' },
    { key: 'weight', label: 'Poids', unit: 'kg', placeholder: '70' },
    { key: 'height', label: 'Taille', unit: 'cm', placeholder: '175' },
    { key: 'glycemia', label: 'Glycémie', unit: 'g/L', placeholder: '1.00' },
  ];

  return (
    <section className="consultation-page">
      <style>{`
        .consultation-page {
          display:grid;
          gap:22px;
          color:var(--text-primary,#20334b);
        }

        .consultation-header {
          display:flex;
          justify-content:space-between;
          flex-wrap:wrap;
          gap:12px;
        }

        .consultation-header h2 {
          margin:0 0 6px;
          font-size:25px;
        }

        .consultation-header p {
          margin:0;
          color:#81909c;
        }

        .consultation-badge {
          background:#e2f8f1;
          color:#21866e;
          padding:8px 12px;
          border-radius:20px;
          font-size:12px;
          height:fit-content;
        }

        .consultation-section {
          background:var(--surface,#fff);
          border:1px solid var(--border,#e5ebef);
          border-radius:16px;
          padding:20px;
          display:grid;
          gap:16px;
        }

        .consultation-section h3 {
          margin:0;
          font-size:17px;
        }

        .consultation-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }

        .consultation-field {
          display:grid;
          gap:7px;
          min-width:0;
        }

        .consultation-field label {
          font-size:13px;
          font-weight:600;
          color:#718096;
        }

        .consultation-field input,
        .consultation-field select,
        .consultation-field textarea {
          width:100%;
          box-sizing:border-box;
          border:1px solid var(--border,#dce4e8);
          border-radius:10px;
          padding:12px;
          background:var(--surface,#fff);
          color:inherit;
          font:inherit;
        }

        .consultation-field select {
          min-height:46px;
          cursor:pointer;
        }

        .consultation-field textarea {
          min-height:95px;
          resize:vertical;
        }

        .patient-hint {
          font-size:12px;
          color:#81909c;
          margin:0;
        }

        .vitals-grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:14px;
        }

        .vital-card {
          padding:13px;
          border:1px solid var(--border,#e5ebef);
          border-radius:12px;
          background:var(--surface,#fff);
          display:grid;
          gap:8px;
          min-width:0;
        }

        .vital-card label {
          font-size:12px;
          font-weight:700;
          color:#718096;
        }

        .vital-input-row {
          display:flex;
          align-items:center;
          gap:6px;
        }

        .vital-input-row input {
          min-width:0;
          width:100%;
          border:0;
          outline:none;
          background:transparent;
          color:var(--text-primary,#20334b);
          font-size:21px;
          font-weight:700;
        }

        .vital-input-row span {
          font-size:11px;
          color:#81909c;
          white-space:nowrap;
        }

        .consultation-save {
          border:0;
          background:#42d5b4;
          color:#12332f;
          padding:14px 20px;
          border-radius:11px;
          font-weight:700;
          cursor:pointer;
        }

        .consultation-success {
          background:#e2f8f1;
          color:#21866e;
          padding:13px;
          border-radius:10px;
        }

        .saved-consultation {
          border:1px solid var(--border,#e5ebef);
          background:var(--surface,#fff);
          border-radius:12px;
          padding:15px;
          display:grid;
          gap:6px;
        }

        .saved-consultation strong {
          font-size:15px;
        }

        .saved-consultation span {
          font-size:12px;
          color:#81909c;
        }

        .saved-consultation p {
          margin:0;
          font-size:13px;
        }

        @media(max-width:700px) {
          .vitals-grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media(max-width:420px) {
          .consultation-grid {
            grid-template-columns:1fr;
          }

          .vitals-grid {
            gap:9px;
          }

          .vital-card {
            padding:10px;
          }
        }
      `}</style>

      <header className="consultation-header">
        <div>
          <h2>Nouvelle consultation</h2>
          <p>Évaluation clinique structurée du patient.</p>
        </div>
        <span className="consultation-badge">Consultation médicale</span>
      </header>

      <div className="consultation-section">
        <h3>01 · Identification</h3>

        <div className="consultation-grid">
          <div className="consultation-field">
            <label>Patient *</label>

            {patientMode === 'select' && registeredPatients.length > 0 ? (
              <select
                value={patient}
                onChange={(e) => handlePatientSelection(e.target.value)}
              >
                <option value="">Choisir un patient enregistré</option>

                {registeredPatients.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}

                <option value={MANUAL_OPTION}>
                  + Saisir un autre patient
                </option>
              </select>
            ) : (
              <input
                value={patient}
                onChange={(e) => {
                  setPatient(e.target.value);
                  setSaved(false);
                }}
                placeholder="Nom et prénom du patient"
              />
            )}

            {patientMode === 'manual' && (
              <button
                type="button"
                onClick={() => {
                  setPatient('');
                  setPatientMode('select');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#21866e',
                  textAlign: 'left',
                  padding: '4px 0',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ← Retour à la liste des patients
              </button>
            )}

            {registeredPatients.length === 0 && patientMode === 'select' && (
              <p className="patient-hint">
                Aucun patient enregistré. Tu peux saisir son nom manuellement.
              </p>
            )}
          </div>

          <div className="consultation-field">
            <label>Motif de consultation *</label>
            <input
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value);
                setSaved(false);
              }}
              placeholder="Motif principal"
            />
          </div>
        </div>
      </div>

      <div className="consultation-section">
        <h3>02 · Histoire de la maladie</h3>

        <div className="consultation-field">
          <label>Symptômes et histoire clinique</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Début, durée, évolution, symptômes associés..."
          />
        </div>

        <div className="consultation-field">
          <label>Antécédents et traitements</label>
          <textarea
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Antécédents, allergies, traitements en cours..."
          />
        </div>
      </div>

      <div className="consultation-section">
        <h3>03 · Constantes vitales</h3>

        <div className="vitals-grid">
          {vitalFields.map((field) => (
            <div className="vital-card" key={field.key}>
              <label>{field.label}</label>

              <div className="vital-input-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={vitals[field.key]}
                  onChange={(e) => updateVital(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                />
                <span>{field.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="consultation-section">
        <h3>04 · Examen physique</h3>

        <div className="consultation-field">
          <label>Examen clinique détaillé</label>
          <textarea
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
            placeholder="Examen cardiovasculaire, respiratoire, abdominal, neurologique..."
          />
        </div>
      </div>

      <div className="consultation-section">
        <h3>05 · Évaluation et prise en charge</h3>

        <div className="consultation-field">
          <label>Hypothèses diagnostiques</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Diagnostic principal et diagnostics différentiels..."
          />
        </div>

        <div className="consultation-field">
          <label>Conduite à tenir</label>
          <textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Examens complémentaires, traitement, conseils, suivi..."
          />
        </div>
      </div>

      <button className="consultation-save" onClick={saveConsultation}>
        Enregistrer la consultation
      </button>

      {saved && (
        <div className="consultation-success">
          Consultation enregistrée avec succès sur cet appareil.
        </div>
      )}

      <div className="consultation-section">
        <h3>Historique des consultations ({consultations.length})</h3>

        {consultations.length === 0 ? (
          <p>Aucune consultation enregistrée pour le moment.</p>
        ) : (
          consultations.map((item) => (
            <div className="saved-consultation" key={item.id}>
              <strong>{item.patient}</strong>

              <span>
                {new Date(item.date).toLocaleString('fr-FR')}
              </span>

              <p>
                <b>Motif :</b> {item.motif}
              </p>

              {item.diagnosis && (
                <p>
                  <b>Diagnostic :</b> {item.diagnosis}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}