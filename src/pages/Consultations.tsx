import { useEffect, useRef, useState } from 'react';
import { useClinicalReasoning, type ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Vitals, PhysicalExamination } from '../types/medical';
import PhysicalExaminationEditor from '../components/PhysicalExaminationEditor';
import { detectClinicalSuggestions } from '../clinical/clinicalTriggers';


const specialtyGroups = [
  {
    label: 'Soins primaires et médecine polyvalente',
    options: [
      'Médecine de famille',
      'Médecine générale',
      'Médecine interne',
      'Gériatrie',
      'Médecine d’urgence',
      'Médecine intensive-réanimation',
      'Médecine polyvalente',
    ],
  },
  {
    label: 'Spécialités médicales',
    options: [
      'Allergologie',
      'Anatomie et cytologie pathologiques',
      'Cardiologie',
      'Dermatologie et vénéréologie',
      'Endocrinologie-diabétologie',
      'Gastro-entérologie et hépatologie',
      'Hématologie',
      'Hépato-gastro-entérologie',
      'Maladies infectieuses et tropicales',
      'Médecine cardiovasculaire',
      'Médecine du sport',
      'Médecine du travail',
      'Médecine légale',
      'Médecine physique et de réadaptation',
      'Médecine vasculaire',
      'Néphrologie',
      'Neurologie',
      'Oncologie médicale',
      'Pneumologie',
      'Psychiatrie',
      'Rhumatologie',
      'Nutrition',
      'Médecine de la douleur',
      'Médecine palliative',
      'Immunologie clinique',
      'Génétique médicale',
      'Pharmacologie clinique',
      'Toxicologie médicale',
      'Médecine du sommeil',
    ],
  },
  {
    label: 'Pédiatrie et surspécialités pédiatriques',
    options: [
      'Pédiatrie',
      'Néonatologie',
      'Cardiologie pédiatrique',
      'Neurologie pédiatrique',
      'Endocrinologie pédiatrique',
      'Pneumologie pédiatrique',
      'Néphrologie pédiatrique',
      'Gastro-entérologie pédiatrique',
      'Hémato-oncologie pédiatrique',
      'Pédopsychiatrie',
      'Chirurgie pédiatrique',
    ],
  },
  {
    label: 'Spécialités chirurgicales',
    options: [
      'Chirurgie générale',
      'Chirurgie digestive',
      'Chirurgie viscérale',
      'Chirurgie thoracique',
      'Chirurgie cardiovasculaire',
      'Chirurgie vasculaire',
      'Neurochirurgie',
      'Chirurgie orthopédique et traumatologie',
      'Urologie',
      'Gynécologie-obstétrique',
      'Oto-rhino-laryngologie (ORL)',
      'Ophtalmologie',
      'Chirurgie plastique, reconstructrice et esthétique',
      'Chirurgie maxillo-faciale',
      'Chirurgie orale',
      'Chirurgie endocrinienne',
      'Chirurgie mammaire',
      'Chirurgie de transplantation',
    ],
  },
  {
    label: 'Spécialités médico-techniques et diagnostiques',
    options: [
      'Anesthésie-réanimation',
      'Radiologie et imagerie médicale',
      'Radiologie interventionnelle',
      'Médecine nucléaire',
      'Radiothérapie-oncologie',
      'Biologie médicale',
      'Biochimie médicale',
      'Microbiologie médicale',
      'Hémobiologie et transfusion',
      'Génétique et biologie moléculaire',
      'Neurophysiologie clinique',
      'Explorations fonctionnelles',
    ],
  },
  {
    label: 'Psychiatrie et santé publique',
    options: [
      'Psychiatrie de l’adulte',
      'Psychiatrie de l’enfant et de l’adolescent',
      'Addictologie',
      'Santé publique',
      'Épidémiologie',
      'Hygiène hospitalière',
    ],
  },
];

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

type ClinicalInsightPayload = {
  enabled: boolean;
  status: 'idle' | 'analyzing' | 'ready' | 'error';
  analysis: ClinicalReasoningAnalysis | null;
  error: string;
  updatedAt: string;
};

export default function Consultations({
  onAskCopilot,
  onClinicalReasoningChange,
}: {
  onAskCopilot?: (prompt: string) => void;
  onClinicalReasoningChange?: (insight: ClinicalInsightPayload) => void;
}) {
  const { patients, consultations, addConsultation, updateConsultation } = useMedicalData();

  const [patientId, setPatientId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [motif, setMotif] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState('');
  const [vitals, setVitals] = useState<Vitals>({ ...emptyVitals });
  const [examination, setExamination] = useState('');
  const [physicalExamination, setPhysicalExamination] = useState<PhysicalExamination>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [snoozedSuggestions, setSnoozedSuggestions] = useState<string[]>([]);
  const [smartCopilotEnabled, setSmartCopilotEnabled] = useState(true);
  const [differentialPopupOpen, setDifferentialPopupOpen] = useState(false);
  const differentialPopupTriggered = useRef(false);

  useEffect(() => {
    if (motif.trim().length < 3) {
      differentialPopupTriggered.current = false;
      return;
    }
    if (!differentialPopupTriggered.current) {
      differentialPopupTriggered.current = true;
      setDifferentialPopupOpen(true);
    }
  }, [motif]);

  function updateVital(key: keyof Vitals, value: string) {
    setVitals((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  function startEditing(item: (typeof consultations)[number]) {
    setEditingId(item.id);
    setPatientId(item.patientId);
    setSpecialty(item.specialty ?? '');
    setMotif(item.motif);
    setSymptoms(item.symptoms);
    setHistory(item.history);
    setVitals({ ...emptyVitals, ...item.vitals });
    setExamination(item.examination);
    setPhysicalExamination(item.physicalExamination ?? {});
    setDiagnosis(item.diagnosis);
    setPlan(item.plan);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setEditingId(null);
    setPatientId('');
    setSpecialty('');
    setMotif('');
    setSymptoms('');
    setHistory('');
    setVitals({ ...emptyVitals });
    setExamination('');
    setPhysicalExamination({});
    setDiagnosis('');
    setPlan('');
    setSaved(false);
  }

  function saveConsultation() {
    if (!patientId || !motif.trim() || (!editingId && !specialty)) {
      alert('Veuillez sélectionner un patient, choisir une spécialité et renseigner le motif.');
      return;
    }

    const changes = {
      patientId,
      specialty: specialty || undefined,
      motif: motif.trim(),
      symptoms: symptoms.trim(),
      history: history.trim(),
      vitals: { ...vitals },
      examination: examination.trim(),
      physicalExamination: { ...physicalExamination },
      diagnosis: diagnosis.trim(),
      plan: plan.trim(),
    };

    const saved = editingId
      ? updateConsultation(editingId, changes)
      : addConsultation({ ...changes, date: new Date().toISOString() });

    if (!saved) {
      window.alert("Enregistrement impossible : le navigateur n'a pas confirmé la sauvegarde. La consultation n'a pas été déclarée comme enregistrée.");
      setSaved(false);
      return;
    }

    setSaved(true);
    setEditingId(null);
    setPatientId('');
    setSpecialty('');
    setMotif('');
    setSymptoms('');
    setHistory('');
    setVitals({ ...emptyVitals });
    setExamination('');
    setPhysicalExamination({});
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

  const sortedConsultations = [...consultations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedPatient = patients.find((patient) => patient.id === patientId);
  const clinicalSuggestions = detectClinicalSuggestions({
    patient: selectedPatient,
    specialty,
    motif,
    symptoms,
    history,
    vitals,
  })
    .filter((suggestion) => !dismissedSuggestions.includes(`${patientId}:${suggestion.id}`) && !snoozedSuggestions.includes(`${patientId}:${suggestion.id}`))
    .sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0));

  const clinicalReasoning = useClinicalReasoning({
    enabled: smartCopilotEnabled,
    patient: selectedPatient,
    specialty,
    motif,
    symptoms,
    history,
    vitals,
    physicalExamination,
    examination,
    diagnosis,
    plan,
  });

  useEffect(() => {
    onClinicalReasoningChange?.({
      enabled: smartCopilotEnabled,
      status: clinicalReasoning.status,
      analysis: clinicalReasoning.analysis,
      error: clinicalReasoning.error,
      updatedAt: clinicalReasoning.updatedAt,
    });
  }, [smartCopilotEnabled, clinicalReasoning.status, clinicalReasoning.analysis, clinicalReasoning.error, clinicalReasoning.updatedAt, onClinicalReasoningChange]);


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

        .smart-copilot-card {
          display:grid; gap:9px; padding:12px 14px;
          border:1px solid var(--border,#dce4e8); border-radius:13px;
          background:var(--surface,#fff);
        }
        .smart-copilot-label {
          display:flex; align-items:center; gap:11px; cursor:pointer; min-height:28px;
        }
        .smart-copilot-checkbox {
          appearance:none; -webkit-appearance:none; flex:0 0 21px;
          width:21px; height:21px; margin:0; border:2px solid #91a2ad;
          border-radius:6px; background:var(--surface,#fff); display:grid;
          place-content:center; cursor:pointer; transition:background .15s ease,border-color .15s ease;
        }
        .smart-copilot-checkbox:checked { background:#38c9aa; border-color:#38c9aa; }
        .smart-copilot-checkbox:checked::after {
          content:''; width:5px; height:10px; border:solid #103b35;
          border-width:0 2px 2px 0; transform:rotate(45deg); margin-top:-2px;
        }
        .smart-copilot-checkbox:focus-visible { outline:3px solid rgba(56,201,170,.25); outline-offset:3px; }

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
          <h2>{editingId ? 'Modifier la consultation' : 'Nouvelle consultation'}</h2>
          <p>Évaluation clinique structurée du patient.</p>
        </div>
        <span className="consultation-badge">Consultation médicale</span>
      </header>

      <section aria-label="Copilote clinique intelligent" className="smart-copilot-card">
        <label className="smart-copilot-label">
          <input
            className="smart-copilot-checkbox"
            type="checkbox"
            checked={smartCopilotEnabled}
            onChange={(event) => setSmartCopilotEnabled(event.target.checked)}
            aria-label="Activer ou désactiver le copilote clinique intelligent"
          />
          <span>
            <strong style={{ display: 'block', fontSize: 13 }}>Copilote clinique intelligent</strong>
            <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--text-secondary,#81909c)' }}>
              {clinicalReasoning.status === 'analyzing' ? 'Analyse en cours…' : clinicalReasoning.status === 'ready' ? 'Analyse disponible dans l’Orb' : 'Analyse évolutive pendant la consultation'}
            </span>
          </span>
        </label>
        {smartCopilotEnabled && (
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.4, color: 'var(--text-secondary,#81909c)' }}>
            Analyse transmise à l’Orb · Contexte clinique sans nom ni téléphone.
          </p>
        )}
        {!selectedPatient && smartCopilotEnabled && (
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-secondary,#81909c)' }}>En attente de la sélection du patient.</p>
        )}
        {clinicalReasoning.error && smartCopilotEnabled && (
          <p role="status" style={{ margin: 0, color: '#c07836', fontSize: 11 }}>{clinicalReasoning.error}</p>
        )}
      </section>

      {clinicalSuggestions.length > 0 && (
        <section
          aria-live="polite"
          aria-label="Suggestions du copilote clinique"
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            border: '1px solid var(--border,#dce4e8)',
            borderLeft: clinicalSuggestions.some((item) => item.priority === 'high')
              ? '4px solid #d97706'
              : '4px solid #38bfa6',
            borderRadius: 13,
            background: 'var(--surface,#fff)',
          }}
        >
          <div>
            <strong style={{ fontSize: 15 }}>Rappels cliniques locaux</strong>
            <p style={{ margin: '5px 0 0', color: 'var(--text-secondary,#81909c)', fontSize: 12 }}>
              Rappels déterministes limités, distincts du raisonnement intelligent évolutif ci-dessus. Ils ne constituent ni un diagnostic ni une validation médicale.
            </p>
          </div>
          {clinicalSuggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              style={{
                padding: 13,
                border: '1px solid var(--border,#e5ebef)',
                borderRadius: 10,
                background: 'var(--background,rgba(127,127,127,.04))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13 }}>
                  {suggestion.priority === 'high' ? 'Priorité clinique · ' : ''}{suggestion.title}
                </strong>

                <button
                  type="button"
                  onClick={() => {
                    const key = `${patientId}:${suggestion.id}`;
                    setSnoozedSuggestions((previous) => [...previous, key]);
                    window.setTimeout(() => {
                      setSnoozedSuggestions((previous) => previous.filter((item) => item !== key));
                    }, 10 * 60 * 1000);
                  }}
                  style={{ border: '1px solid var(--border,#dce4e8)', borderRadius: 7, padding: '5px 9px', background: 'transparent', color: 'inherit', fontSize: 11 }}
                >
                  Reporter 10 min
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedSuggestions((previous) => [...previous, `${patientId}:${suggestion.id}`])}
                  style={{ border: '1px solid var(--border,#dce4e8)', borderRadius: 7, padding: '5px 9px', background: 'transparent', color: 'inherit', fontSize: 11 }}
                >
                  Ignorer
                </button>
              </div>
              <p style={{ margin: '7px 0', fontSize: 12, lineHeight: 1.5 }}>{suggestion.reason}</p>
              <ul style={{ margin: '6px 0 0', paddingLeft: 19, fontSize: 12, lineHeight: 1.65 }}>
                {suggestion.checks.map((check) => <li key={check}>{check}</li>)}
              </ul>

              <button
                type="button"
                onClick={() => onAskCopilot?.(
                  `Aide-moi à approfondir cette situation clinique : ${suggestion.title}. Contexte détecté : ${suggestion.reason} Points à vérifier : ${suggestion.checks.join(' ; ')}. Pose-moi une seule question ciblée à la fois. N'invente aucune donnée et indique les sources fiables si tu formules une recommandation.`
                )}
                style={{
                  justifySelf: 'start',
                  marginTop: 10,
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 12px',
                  background: '#42d5b4',
                  color: '#12332f',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Approfondir avec l’Orb
              </button>
            </article>
          ))}
        </section>
      )}

      <div className="consultation-section">
        <h3>01 · Identification</h3>
        <div className="consultation-grid">
          <div className="consultation-field">
            <label>Patient *</label>
            <select
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">Choisir un patient enregistré</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · {patient.age} ans
                </option>
              ))}
            </select>
            {patients.length === 0 && (
              <p className="patient-hint">
                Aucun patient enregistré. Créez d'abord un dossier dans la rubrique Patients.
              </p>
            )}
          </div>

          <div className="consultation-field">
            <label>Spécialité de consultation *</label>
            <select
              value={specialty}
              onChange={(e) => {
                setSpecialty(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">Choisir la spécialité</option>
              {specialtyGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </optgroup>
              ))}
              <option value="Autre spécialité">Autre spécialité</option>
            </select>
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
            {motif.trim().length >= 3 && (
              <>
                <button
                  type="button"
                  aria-expanded={differentialPopupOpen}
                  onClick={() => setDifferentialPopupOpen((open) => !open)}
                  style={{ justifySelf: 'start', border: '1px solid var(--border,#dce4e8)', borderRadius: 8, padding: '8px 11px', background: 'var(--color-surface-secondary,#263b49)', color: 'var(--color-text,#f2f7fa)', borderColor: 'var(--color-border,#526675)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {differentialPopupOpen ? 'Masquer les diagnostics différentiels' : 'Voir les diagnostics différentiels'}
                </button>
                {differentialPopupOpen && (
                  <section
                    aria-label="Diagnostics différentiels"
                    style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1px solid var(--color-border,#526675)', background: 'var(--color-surface,#172b3a)', color: 'var(--color-text,#f2f7fa)', display: 'grid', gap: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>Diagnostics différentiels</strong>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-secondary,#bdcbd5)' }}>Motif : {motif}</p>
                      </div>
                      <button type="button" onClick={() => setDifferentialPopupOpen(false)} aria-label="Fermer les diagnostics différentiels" style={{ flex: '0 0 auto', border: '1px solid var(--color-border,#526675)', borderRadius: 8, padding: '5px 9px', background: 'transparent', color: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>×</button>
                    </div>
                    {!selectedPatient ? (
                      <p style={{ margin: 0, fontSize: 12 }}>Sélectionnez un patient pour lancer l’analyse clinique.</p>
                    ) : clinicalReasoning.status === 'analyzing' || clinicalReasoning.status === 'idle' ? (
                      <p style={{ margin: 0, fontSize: 12 }}>Analyse du contexte clinique en cours…</p>
                    ) : clinicalReasoning.status === 'error' ? (
                      <p role="status" style={{ margin: 0, color: '#f4b66b', fontSize: 12 }}>{clinicalReasoning.error || 'Analyse momentanément indisponible.'}</p>
                    ) : clinicalReasoning.analysis?.hypotheses?.length ? (
                      <div style={{ display: 'grid', gap: 13 }}>
                        {clinicalReasoning.analysis.hypotheses.map((item, index) => (
                          <article key={item.label} style={{ display: 'grid', gap: 5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                              <strong style={{ fontSize: 13, color: 'var(--color-text,#f2f7fa)' }}>{index + 1}. {item.label}</strong>
                              <strong style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{item.percentage}%</strong>
                            </div>
                            <div style={{ height: 7, borderRadius: 10, background: 'var(--color-border,#526675)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.percentage}%`, borderRadius: 10, background: '#38bfa6', transition: 'width .25s ease' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-secondary,#bdcbd5)' }}>{item.reason}</p>
                          </article>
                        ))}
                        {clinicalReasoning.analysis.recommendedActions.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--color-border,#526675)', paddingTop: 10 }}>
                            <strong style={{ fontSize: 12 }}>Actions utiles maintenant</strong>
                            <ul style={{ margin: '6px 0 0', paddingLeft: 19, fontSize: 12, lineHeight: 1.55 }}>
                              {clinicalReasoning.analysis.recommendedActions.map((action, index) => <li key={index}>{action}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12 }}>Complétez les premières données cliniques pour afficher les hypothèses pertinentes.</p>
                    )}
                    <p style={{ margin: 0, paddingTop: 8, borderTop: '1px solid var(--color-border,#526675)', fontSize: 10, lineHeight: 1.45, color: 'var(--color-text-secondary,#bdcbd5)' }}>
                      Pourcentages indicatifs générés par l’IA : ils ne constituent ni des probabilités validées ni un score clinique.
                    </p>
                    {clinicalReasoning.analysis?.evolutionNote && <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-secondary,#bdcbd5)' }}>Évolution : {clinicalReasoning.analysis.evolutionNote}</p>}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="consultation-section">
        <h3>02 · Histoire de la maladie</h3>
        <div className="consultation-field">
          <label>Symptômes et histoire clinique</label>
          <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Début, durée, évolution, symptômes associés..." />
        </div>
        <div className="consultation-field">
          <label>Antécédents et traitements</label>
          <textarea value={history} onChange={(e) => setHistory(e.target.value)} placeholder="Antécédents, allergies, traitements en cours..." />
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

        <div
          style={{
            marginBottom: 18,
            padding: 14,
            border: '1px solid var(--border, #dce4e8)',
            borderRadius: 12,
            background: 'var(--surface, #fff)',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8 }}>Examen clinique structuré par appareil</strong>
          <p style={{ margin: '0 0 14px', color: 'var(--color-text-secondary, #73838a)', fontSize: 13, lineHeight: 1.5 }}>
            Chaque appareil possède ses propres éléments cliniques. Ouvrez une rubrique pour saisir les constatations réellement examinées.
          </p>
          <PhysicalExaminationEditor
            value={physicalExamination}
            onChange={(next) => setPhysicalExamination(next)}
          />
        </div>

        <details style={{ padding: 12, border: '1px solid var(--border, #dce4e8)', borderRadius: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Ancien examen libre (facultatif) — conserver les notes historiques
          </summary>
          <div className="consultation-field" style={{ marginTop: 12 }}>
            <label>Notes libres de l’examen clinique</label>
            <textarea
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              placeholder="Notes complémentaires libres..."
            />
          </div>
        </details>
      </div>

      <div className="consultation-section">
        <h3>05 · Évaluation et prise en charge</h3>
        <div className="consultation-field">
          <label>Hypothèses diagnostiques</label>
          <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnostic principal et diagnostics différentiels..." />
        </div>
        <div className="consultation-field">
          <label>Conduite à tenir</label>
          <textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Examens complémentaires, traitement, conseils, suivi..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="consultation-save" onClick={saveConsultation} disabled={patients.length === 0}>
          {editingId ? 'Enregistrer les modifications' : 'Enregistrer la consultation'}
        </button>
        {editingId && (
          <button className="consultation-save" type="button" onClick={cancelEditing} style={{ background: 'transparent', border: '1px solid var(--border,#dce4e8)', color: 'inherit' }}>
            Annuler la modification
          </button>
        )}
      </div>

      {saved && (
        <div className="consultation-success">
          Consultation enregistrée et reliée au dossier du patient.
        </div>
      )}

      <div className="consultation-section">
        <h3>Historique des consultations ({consultations.length})</h3>
        {sortedConsultations.length === 0 ? (
          <p>Aucune consultation enregistrée pour le moment.</p>
        ) : (
          sortedConsultations.map((item) => {
            const linkedPatient = patients.find((patient) => patient.id === item.patientId);
            const legacyPatientName = (item as typeof item & { patient?: string }).patient;
            return (
              <div className="saved-consultation" key={item.id}>
                <strong>{linkedPatient?.name || legacyPatientName || 'Patient non identifié'}</strong>
                <span>{new Date(item.date).toLocaleString('fr-FR')}</span>
                <p><b>Spécialité :</b> {item.specialty || 'Non précisée'}</p>
                <p><b>Motif :</b> {item.motif}</p>
                {item.diagnosis && <p><b>Diagnostic :</b> {item.diagnosis}</p>}
                <button
                  type="button"
                  className="consultation-save"
                  onClick={() => startEditing(item)}
                  style={{ justifySelf: 'start', padding: '9px 13px' }}
                >
                  Modifier cette consultation
                </button>
                {!linkedPatient && (
                  <p className="patient-hint">Ancienne consultation : dossier patient non relié.</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
