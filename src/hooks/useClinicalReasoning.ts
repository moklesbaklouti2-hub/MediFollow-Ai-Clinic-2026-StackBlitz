import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patient, Vitals, PhysicalExamination } from '../types/medical';

export type ClinicalReasoningAnalysis = {
  situationSummary: string;
  evolutionNote: string;
  priority: 'routine' | 'attention' | 'urgent';
  priorityReason: string;
  nextQuestion: string;
  nextQuestionOptions: string[];
  whyThisQuestion: string;
  pointsToVerify: string[];
  hypotheses: { label: string; reason: string }[];
  recommendedActions: string[];
};

type ReasoningInput = {
  enabled: boolean;
  patient?: Patient;
  specialty: string;
  motif: string;
  symptoms: string;
  history: string;
  targetedInterview: string;
  vitals: Vitals;
  physicalExamination: PhysicalExamination;
  examination: string;
  diagnosis: string;
  plan: string;
};

export function useClinicalReasoning(input: ReasoningInput) {
  const [analysis, setAnalysis] = useState<ClinicalReasoningAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [quotaUntil, setQuotaUntil] = useState<number | null>(null);
  const [quotaSecondsRemaining, setQuotaSecondsRemaining] = useState(0);
  const lastSnapshot = useRef('');
  const lastRequestAt = useRef(0);
  const inFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const previousPatientId = useRef(input.patient?.id ?? '');

  useEffect(() => {
    if (!quotaUntil) { setQuotaSecondsRemaining(0); return; }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((quotaUntil - Date.now()) / 1000));
      setQuotaSecondsRemaining(remaining);
      if (remaining === 0) setQuotaUntil(null);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [quotaUntil]);

  useEffect(() => {
    const nextPatientId = input.patient?.id ?? '';
    if (previousPatientId.current !== nextPatientId) {
      previousPatientId.current = nextPatientId;
      activeRequest.current?.abort();
      activeRequest.current = null;
      inFlight.current = false;
      lastSnapshot.current = '';
      setAnalysis(null);
      setError('');
      setUpdatedAt('');
      setStatus('idle');
    }
  }, [input.patient?.id]);

  const safeContext = useMemo(() => ({
    patient: input.patient ? {
      age: input.patient.age,
      sex: input.patient.sex,
      clinicalHistory: input.patient.clinicalHistory ? {
        medical: input.patient.clinicalHistory.medical?.map(({ label, details, date, status }) => ({ label, details, date, status })),
        surgical: input.patient.clinicalHistory.surgical?.map(({ label, details, date, status }) => ({ label, details, date, status })),
        allergies: input.patient.clinicalHistory.allergies?.map(({ label, details, date, status }) => ({ label, details, date, status })),
        family: input.patient.clinicalHistory.family?.map(({ label, details, date, status }) => ({ label, details, date, status })),
        gynecoObstetric: input.patient.clinicalHistory.gynecoObstetric,
        other: input.patient.clinicalHistory.other,
      } : undefined,
      currentMedications: input.patient.currentMedications?.map(({ name, dosage, route, frequency, startDate, endDate, indication, instructions }) => ({
        name, dosage, route, frequency, startDate, endDate, indication, instructions,
      })),
    } : undefined,
    consultation: {
      specialty: input.specialty,
      motif: input.motif,
      symptoms: input.symptoms,
      history: input.history,
      targetedInterview: input.targetedInterview,
      vitals: input.vitals,
      physicalExamination: input.physicalExamination,
      additionalExaminationNotes: input.examination,
      physicianHypotheses: input.diagnosis,
      managementAlreadyConsidered: input.plan,
    },
  }), [input.patient, input.specialty, input.motif, input.symptoms, input.history, input.targetedInterview, input.vitals, input.physicalExamination, input.examination, input.diagnosis, input.plan]);

  const snapshot = useMemo(() => JSON.stringify(safeContext), [safeContext]);
  const hasUsefulContent = Boolean(
    input.patient &&
    (input.motif.trim().length >= 3 ||
      input.symptoms.trim().length >= 20 ||
      input.history.trim().length >= 20 ||
      input.diagnosis.trim().length >= 10 ||
      input.plan.trim().length >= 10)
  );

  useEffect(() => {
    if (!input.enabled || !hasUsefulContent || snapshot === lastSnapshot.current || status === 'analyzing') return;

    // Limite les appels répétés pendant la saisie : au moins 10 secondes entre deux analyses.
    // La première analyse démarre après 2,5 secondes de stabilité des données.
    const wait = Math.max(2500, 10000 - (Date.now() - lastRequestAt.current));
    const timer = window.setTimeout(async () => {
      if (inFlight.current || snapshot === lastSnapshot.current) return;
      inFlight.current = true;
      const controller = new AbortController();
      activeRequest.current = controller;
      lastSnapshot.current = snapshot;
      lastRequestAt.current = Date.now();
      setStatus('analyzing');
      setError('');

      try {
        const response = await fetch('/api/clinical/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            context: {
              ...safeContext,
              // Historique compact : conserve les éléments nécessaires à l'évolution du raisonnement.
              previousAnalysis: analysis ? {
                situationSummary: analysis.situationSummary.slice(0, 500),
                priority: analysis.priority,
                nextQuestionPreviouslyAsked: analysis.nextQuestion.slice(0, 250),
                hypotheses: analysis.hypotheses.slice(0, 3).map(({ label, reason }) => ({
                  label: label.slice(0, 100),
                  reason: reason.slice(0, 180),
                })),
              } : undefined,
            },
          }),
        });
        const responseText = await response.text();
        if (!responseText.trim()) {
          throw new Error(`Le serveur a retourné une réponse vide (HTTP ${response.status}). Vérifiez que le moteur IA est démarré.`);
        }
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(`Réponse serveur illisible (HTTP ${response.status}). Le moteur IA n'a pas fourni un JSON valide.`);
        }
        if (!response.ok) {
          if (response.status === 429 && Number.isFinite(Number(data?.retryAfterSeconds)) && Number(data.retryAfterSeconds) > 0) {
            setQuotaUntil(Date.now() + Number(data.retryAfterSeconds) * 1000);
          }
          throw new Error(data?.error || `Analyse clinique indisponible (HTTP ${response.status}).`);
        }
        setQuotaUntil(null);
        if (!data?.analysis || typeof data.analysis.situationSummary !== 'string') {
          throw new Error('Réponse du moteur clinique incomplète. Réessayez après quelques secondes.');
        }
        setAnalysis(data.analysis as ClinicalReasoningAnalysis);
        setUpdatedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        setStatus('ready');
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Erreur du moteur clinique.');
          setStatus('error');
        }
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
          inFlight.current = false;
        }
      }
    }, wait);

    return () => window.clearTimeout(timer);
  }, [input.enabled, hasUsefulContent, snapshot, safeContext, analysis, status]);

  return { analysis, status, error, updatedAt, quotaSecondsRemaining };
}
