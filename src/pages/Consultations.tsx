import { useEffect, useRef, useState } from 'react';
import { useClinicalReasoning, type ClinicalReasoningAnalysis } from '../hooks/useClinicalReasoning';
import { useMedicalData } from '../hooks/useMedicalData';
import type { Vitals, PhysicalExamination, VoiceCommandAction } from '../types/medical';
import PhysicalExaminationEditor from '../components/PhysicalExaminationEditor';
import { detectClinicalSuggestions } from '../clinical/clinicalTriggers';
import { prepareFollowUp, selectDueFollowUps, selectUndatedPlannedFollowUps, selectLaterPlannedFollowUps, filterFollowUpsByObjective, completedFollowUpPlan, matchesDisplayedFollowUpPlan } from '../clinical/followUp';
import { getConsultations } from '../services/storage';
import { hasConfirmedPatientSelection } from '../services/patientSelectionGuard';
import { consultationClinicalSnapshot, hasUniqueConsultationId } from '../services/consultationIdentity';
import { parseExpressDraft, expressWouldOverwrite, MAX_EXPRESS_DRAFT_CHARS } from '../clinical/consultationExpress';


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
  commandActions = [],
  onCommandActionsConsumed,
}: {
  onAskCopilot?: (prompt: string) => void;
  onClinicalReasoningChange?: (insight: ClinicalInsightPayload) => void;
  commandActions?: VoiceCommandAction[];
  onCommandActionsConsumed?: () => void;
}) {
  const { patients, consultations, addConsultation, updateConsultation } = useMedicalData();

  const [patientId, setPatientId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [motif, setMotif] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState('');
  const [targetedInterview, setTargetedInterview] = useState('');
  const [vitals, setVitals] = useState<Vitals>({ ...emptyVitals });
  const [examination, setExamination] = useState('');
  const [physicalExamination, setPhysicalExamination] = useState<PhysicalExamination>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpObjective, setFollowUpObjective] = useState('');
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [followUpCompleted, setFollowUpCompleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingClinicalSnapshot, setEditingClinicalSnapshot] = useState<string | null>(null);
  const [expressOpen, setExpressOpen] = useState(false);
  const [expressDraft, setExpressDraft] = useState('');
  const [expressFeedback, setExpressFeedback] = useState('');
  const [expressPatientId, setExpressPatientId] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [snoozedSuggestions, setSnoozedSuggestions] = useState<string[]>([]);
  const [smartCopilotEnabled, setSmartCopilotEnabled] = useState(true);
  const [differentialPopupOpen, setDifferentialPopupOpen] = useState(false);
  const differentialPopupTriggered = useRef(false);

  useEffect(() => {
    if (commandActions.length === 0) return;

    const normalize = (value: string) =>
      value.toLocaleLowerCase('fr')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const feedback: string[] = [];
    let applied = 0;

    for (const action of commandActions) {
      if (action.type === 'select_patient') {
        const requested = normalize(action.patientName);
        if (!requested) {
          feedback.push('Le nom du patient n’a pas été reconnu. Aucun patient n’a été sélectionné.');
          continue;
        }
        const exact = patients.filter((patient) => normalize(patient.name) === requested);
        const requestedWords = requested.split(' ').filter((word) => word.length > 1);
        const candidates = exact.length > 0
          ? exact
          : patients.filter((patient) => {
              const name = normalize(patient.name);
              return name.includes(requested) ||
                requested.includes(name) ||
                (requestedWords.length > 0 && requestedWords.every((word) => name.includes(word)));
            });

        if (candidates.length === 1) {
          setPatientId(candidates[0].id);
          setSaved(false);
          applied += 1;
        } else if (candidates.length > 1) {
          feedback.push(`Plusieurs patients correspondent à « ${action.patientName} ». Précisez le nom complet.`);
        } else {
          feedback.push(`Patient « ${action.patientName} » introuvable. Aucun patient n'a été sélectionné.`);
        }
        continue;
      }

      if (action.type === 'set_consultation_field') {
        const value = action.value;
        if (action.field === 'specialty') {
          const options = specialtyGroups.flatMap((group) => group.options).concat('Autre spécialité');
          const requested = normalize(value);
          const specialtyValue = requested === 'orl' || requested.includes('oto rhino')
            ? 'Oto-rhino-laryngologie (ORL)'
            : options.find((option) => normalize(option) === requested);
          if (!specialtyValue) {
            feedback.push(`Spécialité « ${value} » non reconnue. Le champ n'a pas été modifié.`);
          } else {
            setSpecialty(specialtyValue);
            setSaved(false);
            applied += 1;
          }
        } else {
          const setters: Record<string, (next: string) => void> = {
            motif: setMotif,
            symptoms: setSymptoms,
            history: setHistory,
            targetedInterview: setTargetedInterview,
            examination: setExamination,
            diagnosis: setDiagnosis,
            plan: setPlan,
          };
          const setter = setters[action.field];
          if (setter) {
            setter(value);
            setSaved(false);
            applied += 1;
          } else {
            feedback.push(`Champ « ${action.field} » non autorisé.`);
          }
        }
        continue;
      }

      if (action.type === 'set_vital') {
        const allowedVitals: (keyof Vitals)[] = [
          'systolic', 'diastolic', 'heartRate', 'spo2', 'temperature',
          'respiratoryRate', 'weight', 'height', 'glycemia',
        ];
        if (allowedVitals.includes(action.field)) {
          const numericValue = action.value.trim().replace(',', '.');
          if (!/^-?\d+(\.\d+)?$/.test(numericValue)) {
            feedback.push(`Valeur « ${action.value} » invalide pour ${action.field}. Une valeur numérique est attendue.`);
          } else {
            setVitals((previous) => ({ ...previous, [action.field]: numericValue }));
            setSaved(false);
            applied += 1;
          }
        } else {
          feedback.push(`Constante « ${action.field} » non reconnue.`);
        }
      }
    }

    if (applied > 0) feedback.unshift(`${applied} modification(s) appliquée(s) au formulaire de consultation. Vérifiez les champs avant l'enregistrement.`);
    setCommandFeedback(feedback.join(' '));
    onCommandActionsConsumed?.();
  }, [commandActions, patients, onCommandActionsConsumed]);

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

  function recordCopilotAnswer(question: string, answer: string) {
    const cleanQuestion = question.trim();
    const entry = `• ${cleanQuestion}\n  Réponse : ${answer.trim()}`;
    setTargetedInterview((previous) => {
      const remaining = previous.split(/\n\n/).filter((block) => !block.startsWith(`• ${cleanQuestion}`));
      return [...remaining, entry].filter(Boolean).join('\n\n');
    });
    setSaved(false);
  }

  function applyExpressDraft() {
    if (editingId) {
      setExpressFeedback('Terminez la modification en cours avant la saisie express.');
      return;
    }
    if (!hasConfirmedPatientSelection(patientId, patients) || !specialty) {
      setExpressFeedback('Choisissez d’abord un dossier patient unique et une spécialité dans le formulaire.');
      return;
    }
    if (expressPatientId && expressPatientId !== patientId) {
      setExpressFeedback('Dossier patient changé : revenez au patient initial ou annulez la saisie.');
      return;
    }
    const result = parseExpressDraft(expressDraft);
    if (result.valid === false) {
      setExpressFeedback(result.reason);
      return;
    }
    if (expressWouldOverwrite(result.fields, { motif, symptoms, history, diagnosis, plan })) {
      setExpressFeedback('Un champ cible contient déjà du texte : effacez-le ou utilisez le formulaire habituel.');
      return;
    }
    if (result.fields.motif !== undefined) setMotif(result.fields.motif);
    if (result.fields.symptoms !== undefined) setSymptoms(result.fields.symptoms);
    if (result.fields.history !== undefined) setHistory(result.fields.history);
    if (result.fields.diagnosis !== undefined) setDiagnosis(result.fields.diagnosis);
    if (result.fields.plan !== undefined) setPlan(result.fields.plan);
    setExpressPatientId(patientId);
    setExpressDraft('');
    setSaved(false);
    setExpressFeedback('Note transférée dans les champs existants. Relisez-la avant toute sauvegarde.');
  }

  function resetExpressConsultation() {
    if (!window.confirm('Effacer toute la consultation non enregistrée et recommencer avec un dossier vierge ?')) return;
    cancelEditing();
  }

  function startEditing(item: (typeof consultations)[number]) {
    const currentConsultations = getConsultations();
    if (!hasUniqueConsultationId(item.id, currentConsultations) ||
        currentConsultations.find(record => record.id === item.id)?.patientId !== item.patientId ||
        !hasConfirmedPatientSelection(item.patientId, patients)) {
      window.alert('Consultation introuvable, identifiant ambigu ou dossier patient non confirmé. Aucune modification ouverte.');
      return;
    }
    // QW-126: do not edit a stale row; capture exactly the clinical content
    // loaded from the persisted consultation, not just its patient ID.
    const current = currentConsultations.find(record => record.id === item.id);
    const snapshot = consultationClinicalSnapshot(current);
    if (!snapshot || snapshot !== consultationClinicalSnapshot(item)) {
      window.alert('Cette consultation a été modifiée depuis l’affichage. Actualisez la liste avant de l’ouvrir.');
      return;
    }
    setExpressDraft('');
    setExpressFeedback('');
    setExpressPatientId(null);
    setEditingClinicalSnapshot(snapshot);
    setEditingId(item.id);
    setPatientId(item.patientId);
    setSpecialty(item.specialty ?? '');
    setMotif(item.motif);
    setSymptoms(item.symptoms);
    setHistory(item.history);
    setTargetedInterview(item.targetedInterview ?? '');
    setVitals({ ...emptyVitals, ...item.vitals });
    setExamination(item.examination);
    setPhysicalExamination(item.physicalExamination ?? {});
    setDiagnosis(item.diagnosis);
    setPlan(item.plan);
    setFollowUpDate(item.followUp?.dueDate ?? '');
    setFollowUpObjective(item.followUp?.objective ?? '');
    setFollowUpCompleted(item.followUp?.status === 'completed');
    setSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setExpressDraft('');
    setExpressFeedback('');
    setExpressPatientId(null);
    setEditingClinicalSnapshot(null);
    setEditingId(null);
    setPatientId('');
    setSpecialty('');
    setMotif('');
    setSymptoms('');
    setHistory('');
    setTargetedInterview('');
    setVitals({ ...emptyVitals });
    setExamination('');
    setPhysicalExamination({});
    setDiagnosis('');
    setPlan('');
    setFollowUpDate('');
    setFollowUpObjective('');
    setFollowUpCompleted(false);
    setSaved(false);
  }

  function completeFollowUp(item: (typeof consultations)[number]) {
    if (!hasUniqueConsultationId(item.id, getConsultations())) {
      window.alert('Identifiant de consultation absent ou dupliqué : contrôle non modifié.');
      return;
    }
    if (editingId === item.id) {
      window.alert('Enregistrez ou annulez d’abord la modification de cette consultation.');
      return;
    }
    // Re-read the current record before proposing the change. Never trust a
    // stale list row or a patient name to establish clinical identity.
    const current = getConsultations().find(record => record.id === item.id);
    if (!current || current.patientId !== item.patientId ||
        !hasConfirmedPatientSelection(current.patientId, patients)) {
      window.alert('Impossible de confirmer le dossier patient. Vérifiez le lien avant tout changement.');
      return;
    }
    // QW-125: do not complete a follow-up that changed after the clinician
    // saw this worklist row. A same-patient match alone is not enough.
    if (!matchesDisplayedFollowUpPlan(item.followUp, current.followUp)) {
      window.alert('Le contrôle de suivi a été modifié depuis l’affichage. Actualisez la liste avant toute clôture.');
      return;
    }
    const completedPlan = completedFollowUpPlan(current.followUp);
    if (!completedPlan) {
      window.alert('Ce plan de suivi n’est plus ouvert ou sa date est invalide. Actualisez la liste.');
      return;
    }
    if (!window.confirm('Confirmer que ce contrôle de suivi a effectivement été réalisé ?')) return;
    // Recheck after the modal: another tab can update the plan while the
    // confirmation dialogue is open.
    const latest = getConsultations().filter(record => record.id === current.id);
    if (latest.length !== 1 || latest[0].patientId !== item.patientId ||
        !matchesDisplayedFollowUpPlan(item.followUp, latest[0].followUp)) {
      window.alert('Le suivi a changé pendant la confirmation. Actualisez la liste sans valider cette clôture.');
      return;
    }
    if (!updateConsultation(current.id, { followUp: completedPlan })) {
      window.alert('Enregistrement non confirmé : le contrôle reste à vérifier dans la liste.');
      return;
    }
    setSaved(false);
  }

  function saveConsultation() {
    if (expressPatientId && expressPatientId !== patientId) {
      window.alert('Saisie express liée à un autre patient. Revenez au dossier initial ou annulez avant de sauvegarder.');
      return;
    }
    if (!patientId || !motif.trim() || (!editingId && !specialty)) {
      alert('Veuillez sélectionner un patient, choisir une spécialité et renseigner le motif.');
      return;
    }
    if (!hasConfirmedPatientSelection(patientId, patients)) {
      window.alert('Dossier patient introuvable ou identifiant ambigu. Sélectionnez un patient enregistré avant la sauvegarde.');
      return;
    }

    // Editing must never silently move a consultation into another patient file
    // or overwrite a record changed/removed since the form was opened.
    if (editingId) {
      const currentRecords = getConsultations().filter(record => record.id === editingId);
      if (currentRecords.length !== 1 || currentRecords[0].patientId !== patientId) {
        window.alert('Consultation modifiée, introuvable ou associée à un autre patient. Annulez la modification et rouvrez le bon dossier.');
        return;
      }
      // QW-126: keep unsaved text and refuse an outdated edit, including if
      // another tab completed a follow-up or corrected a clinical note.
      if (!editingClinicalSnapshot ||
          consultationClinicalSnapshot(currentRecords[0]) !== editingClinicalSnapshot) {
        window.alert('La consultation a changé depuis son ouverture. Vos modifications restent dans le formulaire ; actualisez le dossier avant d’enregistrer.');
        setSaved(false);
        return;
      }
    }

    const followUpPlan = prepareFollowUp(followUpDate, followUpObjective, followUpCompleted);
    if (!followUpPlan.valid) {
      window.alert('Suivi HELIOS : date de contrôle invalide, ou objectif de plus de 500 caractères.');
      return;
    }

    const changes = {
      patientId,
      specialty: specialty || undefined,
      motif: motif.trim(),
      symptoms: symptoms.trim(),
      history: history.trim(),
      targetedInterview: targetedInterview.trim(),
      vitals: { ...vitals },
      examination: examination.trim(),
      physicalExamination: { ...physicalExamination },
      diagnosis: diagnosis.trim(),
      plan: plan.trim(),
      followUp: followUpPlan.followUp,
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
    setExpressDraft('');
    setExpressFeedback('');
    setExpressPatientId(null);
    setEditingClinicalSnapshot(null);
    setEditingId(null);
    setPatientId('');
    setSpecialty('');
    setMotif('');
    setSymptoms('');
    setHistory('');
    // Ne jamais réutiliser les réponses ciblées du patient précédent.
    setTargetedInterview('');
    setVitals({ ...emptyVitals });
    setExamination('');
    setPhysicalExamination({});
    setDiagnosis('');
    setPlan('');
    setFollowUpDate('');
    setFollowUpObjective('');
    setFollowUpCompleted(false);
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
  const followUpToday = new Date().toLocaleDateString('sv-SE');
  const dueFollowUps = filterFollowUpsByObjective(selectDueFollowUps(consultations, followUpToday), followUpSearch);
  const undatedFollowUps = filterFollowUpsByObjective(selectUndatedPlannedFollowUps(consultations), followUpSearch);
  const laterFollowUps = filterFollowUpsByObjective(selectLaterPlannedFollowUps(consultations, followUpToday), followUpSearch);

  const expressPatientMismatch = Boolean(expressPatientId && expressPatientId !== patientId);
  const selectedPatient = !expressPatientMismatch
    ? patients.find((patient) => patient.id === patientId) : undefined;
  const clinicalSuggestions = (expressPatientMismatch ? [] : detectClinicalSuggestions({
    patient: selectedPatient,
    specialty,
    motif,
    symptoms,
    history,
    targetedInterview,
    vitals,
  }))
    .filter((suggestion) => !dismissedSuggestions.includes(`${patientId}:${suggestion.id}`) && !snoozedSuggestions.includes(`${patientId}:${suggestion.id}`))
    .sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0));

  const clinicalReasoning = useClinicalReasoning({
    enabled: smartCopilotEnabled && !expressPatientMismatch,
    patient: selectedPatient,
    specialty,
    motif,
    symptoms,
    history,
    targetedInterview,
    vitals,
    physicalExamination,
    examination,
    diagnosis,
    plan,
  });

  useEffect(() => {
    onClinicalReasoningChange?.({
      enabled: smartCopilotEnabled && !expressPatientMismatch,
      status: expressPatientMismatch ? 'idle' : clinicalReasoning.status,
      analysis: expressPatientMismatch ? null : clinicalReasoning.analysis,
      error: expressPatientMismatch ? '' : clinicalReasoning.error,
      updatedAt: expressPatientMismatch ? '' : clinicalReasoning.updatedAt,
    });
  }, [smartCopilotEnabled, expressPatientMismatch, clinicalReasoning.status, clinicalReasoning.analysis, clinicalReasoning.error, clinicalReasoning.updatedAt, onClinicalReasoningChange]);


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
        .differential-floating-panel {
          position:fixed; top:112px; right:18px; z-index:1300;
          width:min(390px,calc(100vw - 28px)); max-height:calc(100dvh - 145px);
          overflow-y:auto; box-shadow:0 16px 45px rgba(0,0,0,.28);
        }
        @media(max-width:650px) {
          .differential-floating-panel {
            top:88px; right:10px; width:calc(100vw - 20px);
            max-height:calc(100dvh - 185px);
          }
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

      {commandFeedback && (
        <div role="status" style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border,#dce4e8)', background: 'var(--surface,#fff)', fontSize: 13, lineHeight: 1.5 }}>
          {commandFeedback}
        </div>
      )}

      <header className="consultation-header">
        <div>
          <h2>{editingId ? 'Modifier la consultation' : 'Nouvelle consultation'}</h2>
          <p>Évaluation clinique structurée du patient.</p>
        </div>
        <span className="consultation-badge">Consultation médicale</span>
      </header>

      <section className="consultation-section" aria-label="HELIOS Consultation Express — saisie rapide">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: '0 0 5px' }}>HELIOS Consultation Express · saisie rapide</h3>
            <p className="patient-hint" style={{ margin: 0 }}>
              Copiez une note fictive structurée. Aucun diagnostic n'est déduit et aucune consultation n'est enregistrée automatiquement.
            </p>
          </div>
          <button type="button" className="consultation-save"
            onClick={() => setExpressOpen(open => !open)}
            aria-expanded={expressOpen}>
            {expressOpen ? 'Fermer la saisie express' : 'Ouvrir la saisie express'}
          </button>
        </div>
        {expressPatientId && (
          <div style={{ display: 'grid', gap: 8 }}>
            {expressPatientMismatch && (
              <p role="alert" className="patient-hint">
                Patient changé après saisie express : sauvegarde et analyse IA suspendues.
                Reprenez le dossier initial ou réinitialisez entièrement la consultation non enregistrée.
              </p>
            )}
            <button type="button" className="consultation-save" onClick={resetExpressConsultation}
              style={{ justifySelf: 'start', background: 'transparent',
                border: '1px solid var(--border,#dce4e8)', color: 'inherit' }}>
              Réinitialiser la consultation non enregistrée
            </button>
          </div>
        )}
        {expressOpen && (
          <div className="consultation-field">
            <label htmlFor="helios-express-draft">Note fictive à répartir dans les champs existants</label>
            <textarea id="helios-express-draft" value={expressDraft}
              maxLength={MAX_EXPRESS_DRAFT_CHARS}
              placeholder={'Motif: Vertiges fictifs\\nSymptômes: Depuis 2 jours\\nHistoire: Traitement fictif\\nDiagnostic: À déterminer\\nPlan: À discuter'}
              onChange={event => { setExpressDraft(event.target.value); setExpressFeedback(''); }}
              rows={5} disabled={Boolean(editingId)} />
            <p className="patient-hint">
              Une ligne par champ : Motif, Symptômes, Histoire, Diagnostic, Plan.
              Sélectionnez d'abord un patient unique et une spécialité ci-dessous.
              Les valeurs existantes ne seront jamais écrasées. Validez et relisez les champs avant d'enregistrer.
            </p>
            <button type="button" className="consultation-save" onClick={applyExpressDraft}
              disabled={Boolean(editingId) || !expressDraft.trim()}>
              Préremplir les champs — sans enregistrer
            </button>
            {expressFeedback && <p role="status" className="patient-hint">{expressFeedback}</p>}
          </div>
        )}
      </section>

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
                  style={{ justifySelf: 'start', border: '1px solid var(--border,#dce4e8)', borderRadius: 8, padding: '8px 11px', background: 'var(--surface,#263b49)', color: 'var(--text-primary,#f2f7fa)', borderColor: 'var(--border,#526675)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {differentialPopupOpen ? 'Masquer les diagnostics différentiels' : 'Voir les diagnostics différentiels'}
                </button>
                {differentialPopupOpen && (
                  <section
                    aria-label="Diagnostics différentiels"
                    className="differential-floating-panel"
                    style={{ boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1px solid var(--border,#526675)', background: 'var(--surface,#172b3a)', color: 'var(--text-primary,#f2f7fa)', display: 'grid', gap: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>Diagnostics différentiels</strong>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary,#bdcbd5)' }}>Motif : {motif}</p>
                      </div>
                      <button type="button" onClick={() => setDifferentialPopupOpen(false)} aria-label="Fermer les diagnostics différentiels" style={{ flex: '0 0 auto', border: '1px solid var(--border,#526675)', borderRadius: 8, padding: '5px 9px', background: 'transparent', color: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>×</button>
                    </div>
                    {!selectedPatient ? (
                      <p style={{ margin: 0, fontSize: 12 }}>Sélectionnez un patient pour lancer l’analyse clinique.</p>
                    ) : clinicalReasoning.status === 'analyzing' || clinicalReasoning.status === 'idle' ? (
                      <p style={{ margin: 0, fontSize: 12 }}>Analyse du contexte clinique en cours…</p>
                    ) : clinicalReasoning.status === 'error' ? (
                      <div role="status" style={{ display: 'grid', gap: 7, color: '#f4b66b', fontSize: 12 }}>
                        <p style={{ margin: 0 }}>{clinicalReasoning.error || 'Analyse momentanément indisponible.'}</p>
                        {clinicalReasoning.quotaSecondsRemaining > 0 ? (
                          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                            Nouvelle tentative possible dans {Math.floor(clinicalReasoning.quotaSecondsRemaining / 60).toString().padStart(2, '0')}:{(clinicalReasoning.quotaSecondsRemaining % 60).toString().padStart(2, '0')}
                          </strong>
                        ) : clinicalReasoning.error.toLowerCase().includes('quota groq') ? (
                          <span>Délai écoulé ou non communiqué. Modifiez une donnée clinique pour relancer l’analyse.</span>
                        ) : null}
                      </div>
                    ) : clinicalReasoning.analysis ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 12 }}>Synthèse clinique</strong>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 20,
                            background: clinicalReasoning.analysis.priority === 'urgent' ? '#fde8e8' : clinicalReasoning.analysis.priority === 'attention' ? '#fff1d6' : '#dff7ee',
                            color: clinicalReasoning.analysis.priority === 'urgent' ? '#a32626' : clinicalReasoning.analysis.priority === 'attention' ? '#8a5a00' : '#176b50',
                          }}>
                            {clinicalReasoning.analysis.priority === 'urgent' ? 'URGENT' : clinicalReasoning.analysis.priority === 'attention' ? 'ATTENTION' : 'ROUTINE'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{clinicalReasoning.analysis.situationSummary}</p>
                        {clinicalReasoning.analysis.priorityReason && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary,#bdcbd5)' }}>{clinicalReasoning.analysis.priorityReason}</p>
                        )}
                        {clinicalReasoning.analysis.hypotheses.length > 0 && (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <strong style={{ fontSize: 12 }}>Hypothèses principales</strong>
                            {clinicalReasoning.analysis.hypotheses.slice(0, 3).map((item, index) => (
                              <div key={item.label} style={{ display: 'grid', gap: 2 }}>
                                <strong style={{ fontSize: 12 }}>{index + 1}. {item.label}</strong>
                                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: 'var(--text-secondary,#bdcbd5)' }}>{item.reason}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {clinicalReasoning.analysis.pointsToVerify.length > 0 && (
                          <div>
                            <strong style={{ fontSize: 12 }}>À vérifier</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 11, lineHeight: 1.45 }}>
                              {clinicalReasoning.analysis.pointsToVerify.slice(0, 3).map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                        {clinicalReasoning.analysis.recommendedActions.length > 0 && (
                          <div>
                            <strong style={{ fontSize: 12 }}>Actions prioritaires</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 11, lineHeight: 1.45 }}>
                              {clinicalReasoning.analysis.recommendedActions.slice(0, 3).map((action, index) => <li key={index}>{action}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12 }}>Complétez les premières données cliniques pour afficher l'analyse.</p>
                    )}
                    {clinicalReasoning.analysis?.nextQuestion && (
                      <div style={{ display: 'grid', gap: 9, border: '1px solid var(--border,#526675)', borderRadius: 10, padding: 11, background: 'var(--background,rgba(127,127,127,.06))' }}>
                        <strong style={{ fontSize: 12 }}>Question ciblée du copilote</strong>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{clinicalReasoning.analysis.nextQuestion}</p>
                        {clinicalReasoning.analysis.whyThisQuestion && <p style={{ margin: 0, fontSize: 10, color: 'var(--text-secondary,#bdcbd5)' }}>{clinicalReasoning.analysis.whyThisQuestion}</p>}
                        {clinicalReasoning.analysis.nextQuestionOptions?.length ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(125px,1fr))', gap: 7 }}>
                            {clinicalReasoning.analysis.nextQuestionOptions.map((option) => (
                              <button key={option} type="button" onClick={() => recordCopilotAnswer(clinicalReasoning.analysis!.nextQuestion, option)} style={{ border: '1px solid var(--border,#526675)', borderRadius: 9, padding: '9px 10px', background: 'var(--surface,#263b49)', color: 'var(--text-primary,#f2f7fa)', fontSize: 11, fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>{option}</button>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary,#bdcbd5)' }}>Réponse libre : saisissez-la dans la rubrique « Interrogatoire ciblé » ci-dessous.</p>
                        )}
                      </div>
                    )}
                    {clinicalReasoning.analysis?.evolutionNote && (
                      <p style={{ margin: 0, paddingTop: 7, borderTop: '1px solid var(--border,#526675)', fontSize: 10, color: 'var(--text-secondary,#bdcbd5)' }}>
                        Évolution : {clinicalReasoning.analysis.evolutionNote}
                      </p>
                    )}
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
        <div className="consultation-field">
          <label>Interrogatoire ciblé · réponses au copilote</label>
          <textarea value={targetedInterview} onChange={(e) => { setTargetedInterview(e.target.value); setSaved(false); }} placeholder="Les réponses sélectionnées dans le panneau du copilote s’ajouteront ici. Vous pouvez aussi compléter ou corriger librement." />
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary,#81909c)', fontSize: 11 }}>Chaque choix est ajouté ici, puis pris en compte dans la prochaine analyse clinique.</p>
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

      <div className="consultation-section">
        <h3>06 · HELIOS Follow-up — contrôle programmé</h3>
        <p className="patient-hint">Suivi décidé par le médecin. Aucun rappel envoyé automatiquement au patient.</p>
        <div className="consultation-grid">
          <div className="consultation-field">
            <label htmlFor="follow-up-date">Date de contrôle prévue (facultative)</label>
            <input id="follow-up-date" type="date" value={followUpDate}
              onChange={(e) => { setFollowUpDate(e.target.value); setSaved(false); }} />
          </div>
          <div className="consultation-field">
            <label htmlFor="follow-up-objective">Objectif du contrôle</label>
            <textarea id="follow-up-objective" maxLength={500} value={followUpObjective}
              onChange={(e) => { setFollowUpObjective(e.target.value); setSaved(false); }}
              placeholder="Exemple : réévaluer les constantes et les symptômes fictifs" />
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <input type="checkbox" checked={followUpCompleted}
            onChange={(e) => { setFollowUpCompleted(e.target.checked); setSaved(false); }} />
          Contrôle effectué (confirmation manuelle)
        </label>
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

      <div className="consultation-section" aria-label="HELIOS Follow-up : recherche locale">
        <label htmlFor="follow-up-search-objective">Rechercher dans les objectifs des suivis</label>
        <input id="follow-up-search-objective" type="search" value={followUpSearch} maxLength={100}
          onChange={(e) => setFollowUpSearch(e.target.value)}
          placeholder="Exemple : constantes, contrôle, bilan..."
          style={{ width: '100%', marginTop: 8 }} />
        {followUpSearch && (
          <button type="button" onClick={() => setFollowUpSearch('')} style={{ marginTop: 8 }}>
            Effacer la recherche
          </button>
        )}
        <p className="patient-hint" role="status" aria-live="polite">
          {dueFollowUps.length + undatedFollowUps.length + laterFollowUps.length} suivi(s) planifié(s)
          correspondant aux objectifs saisis. Recherche locale sans IA, sans modification des dossiers.
        </p>
      </div>

      <div className="consultation-section">
        <h3>HELIOS Follow-up · contrôles à revoir ({dueFollowUps.length})</h3>
        <p className="patient-hint">
          Consultations dont le contrôle est en retard, prévu aujourd’hui ou dans les sept jours.
          Aucun message n’est envoyé au patient et aucun contrôle n’est clôturé automatiquement.
        </p>
        {dueFollowUps.length === 0 ? (
          <p>Aucun contrôle de suivi à revoir dans cette période.</p>
        ) : (
          dueFollowUps.map((item) => {
            const linkedPatient = hasConfirmedPatientSelection(item.patientId, patients)
              ? patients.find(patient => patient.id === item.patientId)
              : undefined;
            const overdue = (item.followUp?.dueDate ?? '') < followUpToday;
            return (
              <div className="saved-consultation" key={'follow-up-' + item.id}>
                <strong>{linkedPatient?.name ?? 'Dossier patient non relié — identité à confirmer'}</strong>
                <span>{overdue ? 'En retard' : 'À revoir'} · {item.followUp?.dueDate}</span>
                <p><b>Objectif :</b> {item.followUp?.objective || 'Non précisé'}</p>
                {linkedPatient ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="consultation-save"
                      onClick={() => startEditing(item)}
                      style={{ justifySelf: 'start', padding: '9px 13px' }}>
                      Ouvrir ce plan de suivi
                    </button>
                    <button type="button" className="consultation-save"
                      onClick={() => completeFollowUp(item)}
                      style={{ justifySelf: 'start', padding: '9px 13px' }}>
                      Marquer le contrôle effectué
                    </button>
                  </div>
                ) : (
                  <p className="patient-hint">Vérifiez le lien au dossier patient avant toute action.</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {undatedFollowUps.length > 0 && (
        <div className="consultation-section" aria-label="HELIOS Follow-up : dates à corriger">
          <h3>HELIOS Follow-up · dates à corriger ({undatedFollowUps.length})</h3>
          <p className="patient-hint">
            Plans consignés sans date de suivi valide : aucune échéance ni urgence n’est déduite.
            Vérifier la date avant toute modification du dossier.
          </p>
          {undatedFollowUps.map((item) => {
            const linkedPatient = hasConfirmedPatientSelection(item.patientId, patients)
              ? patients.find(patient => patient.id === item.patientId)
              : undefined;
            return (
              <div className="saved-consultation" key={'undated-follow-up-' + item.id}>
                <strong>{linkedPatient?.name ?? 'Dossier patient non relié — identité à confirmer'}</strong>
                <span>Date de suivi absente ou invalide</span>
                <p><b>Objectif :</b> {item.followUp?.objective || 'Non précisé'}</p>
                {linkedPatient ? (
                  <button type="button" className="consultation-save"
                    onClick={() => startEditing(item)}
                    style={{ justifySelf: 'start', padding: '9px 13px' }}>
                    Ouvrir pour corriger la date
                  </button>
                ) : (
                  <p className="patient-hint">Vérifiez le lien au dossier patient avant toute action.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {laterFollowUps.length > 0 && (
        <details className="consultation-section" aria-label="HELIOS Follow-up : contrôles ultérieurs">
          <summary>HELIOS Follow-up · au-delà de 7 jours ({laterFollowUps.length})</summary>
          <p className="patient-hint">
            Contrôles futurs consignés, hors échéances à court terme. Aucune priorité clinique
            ni réalisation du contrôle n’est inférée.
          </p>
          {laterFollowUps.map((item) => {
            const linkedPatient = hasConfirmedPatientSelection(item.patientId, patients)
              ? patients.find(patient => patient.id === item.patientId)
              : undefined;
            return (
              <div className="saved-consultation" key={'later-follow-up-' + item.id}>
                <strong>{linkedPatient?.name ?? 'Dossier patient non relié — identité à confirmer'}</strong>
                <span>Suivi planifié : {item.followUp?.dueDate}</span>
                <p><b>Objectif :</b> {item.followUp?.objective || 'Non précisé'}</p>
                {linkedPatient ? (
                  <button type="button" className="consultation-save"
                    onClick={() => startEditing(item)}
                    style={{ justifySelf: 'start', padding: '9px 13px' }}>
                    Ouvrir ce plan de suivi
                  </button>
                ) : (
                  <p className="patient-hint">Vérifiez le lien au dossier patient avant toute action.</p>
                )}
              </div>
            );
          })}
        </details>
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
                {item.followUp && (
                  <p><b>HELIOS Follow-up :</b> {item.followUp.dueDate} · {item.followUp.status === 'completed' ? 'Contrôle effectué' : 'Contrôle prévu'}
                    {item.followUp.objective ? ` · ${item.followUp.objective}` : ''}</p>
                )}
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
