import type { Consultation, Patient } from '../types/medical';

// HELIOS Prevention (first documentary pass):
// discussion prompts only. No eligibility assessment, interval, risk score,
// vaccination status, diagnosis, or recommendation is inferred.
const PREVENTION_TOPICS = Object.freeze([
  Object.freeze({ id: 'vaccins', label: 'Historique vaccinal' }),
  Object.freeze({ id: 'depistages', label: 'Dépistages et bilans antérieurs' }),
  Object.freeze({ id: 'habitudes', label: 'Habitudes de vie et expositions' }),
  Object.freeze({ id: 'objectifs', label: 'Objectifs de prévention à discuter' }),
] as const);

export type PreventionReview = {
  recordedAge: number | null;
  lastDatedConsultation: string | null;
  discussionTopics: typeof PREVENTION_TOPICS;
};

export function buildPreventionReview(
  patient: Pick<Patient, 'id' | 'age'>,
  consultations: readonly Pick<Consultation, 'patientId' | 'date'>[],
): PreventionReview {
  const recordedAge = typeof patient.age === 'number' &&
    Number.isFinite(patient.age) && patient.age >= 0
    ? patient.age : null;
  let lastDatedConsultation: string | null = null;
  let lastTimestamp = -Infinity;

  // Explicit patient-ID match, even if the caller already filtered records.
  for (const visit of consultations) {
    if (!visit || visit.patientId !== patient.id || typeof visit.date !== 'string') continue;
    const timestamp = Date.parse(visit.date);
    if (!Number.isFinite(timestamp) || timestamp <= lastTimestamp) continue;
    lastTimestamp = timestamp;
    lastDatedConsultation = visit.date;
  }

  return { recordedAge, lastDatedConsultation, discussionTopics: PREVENTION_TOPICS };
}
