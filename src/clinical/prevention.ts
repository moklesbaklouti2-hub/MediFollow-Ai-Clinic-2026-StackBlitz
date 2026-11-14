import type { Consultation, Patient } from '../types/medical';
import { recordedDateTimestamp } from './medicalTimeline';

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
  consultations: readonly Pick<Consultation, 'id' | 'patientId' | 'date'>[],
): PreventionReview {
  // QW-159: retain only credible declared integer ages; never calculate
  // a missing age, or present a decimal/implausible import as documented.
  const recordedAge = typeof patient.age === 'number' &&
    Number.isInteger(patient.age) && patient.age >= 0 && patient.age <= 130
    ? patient.age : null;
  let lastDatedConsultation: string | null = null;
  let lastTimestamp = -Infinity;
  let lastId = '';

  // QW-160: no other patient's appointment may influence documentary prevention.
  // Use the same strict clinical date parser as the longitudinal timeline.
  if (typeof patient.id !== 'string' || !patient.id.trim()) {
    return { recordedAge: null, lastDatedConsultation: null, discussionTopics: PREVENTION_TOPICS };
  }
  const idCounts = new Map<string, number>();
  for (const visit of consultations) {
    if (visit && typeof visit.id === 'string' && visit.id.trim()) {
      idCounts.set(visit.id, (idCounts.get(visit.id) ?? 0) + 1);
    }
  }
  for (const visit of consultations) {
    if (!visit || visit.patientId !== patient.id ||
        typeof visit.id !== 'string' || idCounts.get(visit.id) !== 1) continue;
    const timestamp = recordedDateTimestamp(visit.date);
    if (timestamp === null || timestamp < lastTimestamp ||
        (timestamp === lastTimestamp && visit.id >= lastId)) continue;
    lastTimestamp = timestamp;
    lastId = visit.id;
    lastDatedConsultation = visit.date;
  }

  return { recordedAge, lastDatedConsultation, discussionTopics: PREVENTION_TOPICS };
}
