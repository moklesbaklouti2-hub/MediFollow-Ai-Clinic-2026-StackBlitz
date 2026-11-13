import type { Consultation } from '../types/medical';

// A restored backup may contain colliding identifiers. A mutation by id is
// permitted only when it identifies exactly one current consultation.
export function hasUniqueConsultationId(
  id: unknown, records: readonly Pick<Consultation, 'id'>[],
): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) return false;
  return records.filter(record => record.id === id).length === 1;
}

// QW-118 — preserve the clinical origin of a recorded visit. Changing the
// patient requires separate reviewed reconciliation, never a generic update.
export function preservesConsultationPatientLink(
  current: Pick<Consultation, 'patientId'> | null | undefined,
  changes: Partial<Pick<Consultation, 'patientId'>> | null | undefined,
): boolean {
  if (!current || typeof current.patientId !== 'string' || !current.patientId.trim() ||
      !changes || typeof changes !== 'object' || Array.isArray(changes)) return false;
  if (!Object.prototype.hasOwnProperty.call(changes, 'patientId')) return true;
  return typeof changes.patientId === 'string' && changes.patientId.trim().length > 0 &&
    changes.patientId === current.patientId;
}
