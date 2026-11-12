import type { Prescription } from '../types/medical';

/** Imported backups can contain colliding record IDs. Refuse ambiguous writes. */
export function hasUniquePrescriptionId(
  id: unknown,
  records: readonly Pick<Prescription, 'id'>[],
): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) return false;
  return records.filter(record => record.id === id).length === 1;
}
