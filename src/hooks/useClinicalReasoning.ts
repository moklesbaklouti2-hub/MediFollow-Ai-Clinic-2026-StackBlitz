import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patient, Vitals, PhysicalExamination } from '../types/medical';

export type ClinicalReasoningAnalysis = {
  situationSummary: string;
  priority: 'routine' | 'attention' | 'urgent';
  priorityReason: string;
  nextQuestion: string;
  whyThisQuestion: string;
  pointsToVerify: string[];
  hypotheses: { label: string; reason: string; confidence: 'faible' | 'modérée' }[];
};

type ReasoningInput = {
  enabled: boolean;
  patient?: Patient;
  specialty: string;
  motif: string;
  symptoms: string;
  history: string;
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
  const lastSnapshot = useRef('');
  const lastRequestAt = useRef(0);
  const inFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);

  const previousPatientId = useRef(input.patient?.id ?? '');

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
      vitals: input.vitals,
      physicalExamination: input.physicalExamination,
      additionalExaminationNotes: input.examination,
      physicianHypotheses: input.diagnosis,
      managementAlreadyConsidered: input.plan,
    },
  }), [input.patient, input.specialty, input.motif, input.symptoms, input.history, input.vitals, input.physicalExamination, input.examination, input.diagnosis, input.plan]);

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

    const wait = Math.max(2200, 10000 - (Date.now() - lastRequestAt.current));
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
              previousAnalysis: analysis ? {
                situationSummary: analysis.situationSummary,
                nextQuestionPreviouslyAsked: analysis.nextQuestion,
                hypotheses: analysis.hypotheses,
              } : undefined,
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Analyse clinique indisponible.');
        if (!data.analysis || typeof data.analysis.situationSummary !== 'string') {
          throw new Error('Réponse du moteur clinique invalide.');
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

  return { analysis, status, error, updatedAt };
}
