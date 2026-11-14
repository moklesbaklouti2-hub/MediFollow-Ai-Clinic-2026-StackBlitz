import type { Consultation, Patient } from '../types/medical';
import { orderRecordedNewest, recordedDateTimestamp } from './medicalTimeline';

// QW-185..187: display-only administrative last-visit labels, not a clinical
// assertion. The imported consultation must have a unique source ID and
// reference one uniquely confirmed patient. Never mutate imported records.
export function documentedLastVisitByPatient(
  patients: readonly Pick<Patient, 'id'>[],
  consultations: readonly Pick<Consultation, 'id' | 'patientId' | 'date'>[],
): Record<string, string> {
  const patientCounts = new Map<string, number>();
  for (const patient of patients) {
    if (!patient || typeof patient.id !== 'string' || !patient.id.trim()) continue;
    patientCounts.set(patient.id, (patientCounts.get(patient.id) ?? 0) + 1);
  }
  const visitCounts = new Map<string, number>();
  for (const visit of consultations) {
    if (!visit || typeof visit.id !== 'string' || !visit.id.trim()) continue;
    visitCounts.set(visit.id, (visitCounts.get(visit.id) ?? 0) + 1);
  }
  const reliable = consultations.filter(visit =>
    visit && typeof visit.id === 'string' && visitCounts.get(visit.id) === 1 &&
    typeof visit.patientId === 'string' && patientCounts.get(visit.patientId) === 1 &&
    recordedDateTimestamp(visit.date) !== null);
  // A null-prototype dictionary handles imported IDs such as '__proto__' safely.
  const result: Record<string, string> = Object.create(null);
  for (const visit of orderRecordedNewest(reliable)) {
    if (!Object.prototype.hasOwnProperty.call(result, visit.patientId)) {
      result[visit.patientId] = visit.date;
    }
  }
  return result;
}
