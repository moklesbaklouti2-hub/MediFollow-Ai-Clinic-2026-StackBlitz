import type { Consultation } from '../types/medical';

// A restored backup may contain colliding identifiers. A mutation by id is
// permitted only when it identifies exactly one current consultation.
export function hasUniqueConsultationId(
  id: unknown, records: readonly Pick<Consultation, 'id'>[],
): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) return false;
  return records.filter(record => record.id === id).length === 1;
}

// QW-121 — newly generated consultation identifiers must be absent from
// existing clinical history, including imported records with duplicate IDs.
// Refuse the collision without deleting, merging or renaming archived visits.
export function isUnusedConsultationId(
  id: unknown,
  records: readonly Pick<Consultation, 'id'>[],
): id is string {
  return typeof id === 'string' && id.trim().length > 0 &&
    Array.isArray(records) &&
    !records.some(record => record?.id === id);
}

// QW-122 — a new clinical visit must document both its main reason and
// specialty, as required by the consultation form. Legacy consultations with
// missing specialty remain readable and editable; only creation is guarded.
export function hasRequiredConsultationDetails(
  consultation: Pick<Consultation, 'motif' | 'specialty'> | null | undefined,
): boolean {
  return Boolean(consultation &&
    typeof consultation.motif === 'string' && consultation.motif.trim().length > 0 &&
    typeof consultation.specialty === 'string' && consultation.specialty.trim().length > 0);
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

// QW-119 — audit timestamps belong to the application, not to arbitrary
// content-update callers. The recorded visit date is a separate clinical field
// and may still be corrected through normal consultation editing.
export function preservesConsultationAuditTimestamps(
  changes: Partial<Pick<Consultation, 'createdAt' | 'updatedAt'>> | null | undefined,
): boolean {
  return Boolean(changes && typeof changes === 'object' && !Array.isArray(changes) &&
    !Object.prototype.hasOwnProperty.call(changes, 'createdAt') &&
    !Object.prototype.hasOwnProperty.call(changes, 'updatedAt'));
}
