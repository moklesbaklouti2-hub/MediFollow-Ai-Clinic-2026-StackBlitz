import type { Consultation } from '../types/medical';

// A restored backup may contain colliding identifiers. A mutation by id is
// permitted only when it identifies exactly one current consultation.
export function hasUniqueConsultationId(
  id: unknown, records: readonly Pick<Consultation, 'id'>[],
): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) return false;
  return records.filter(record => record.id === id).length === 1;
}
