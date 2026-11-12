import type { Prescription, StockMovement } from '../types/medical';

/** Imported backups can contain colliding record IDs. Refuse ambiguous writes. */
export function hasUniquePrescriptionId(
  id: unknown,
  records: readonly Pick<Prescription, 'id'>[],
): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) return false;
  return records.filter(record => record.id === id).length === 1;
}

/** Preserve inventory traceability even when a legacy prescription has no status. */
export function prescriptionHasRecordedStockMovement(
  prescriptionId: unknown,
  movements: readonly Pick<StockMovement, 'prescriptionId'>[],
): boolean {
  return typeof prescriptionId === 'string' && prescriptionId.trim().length > 0 &&
    movements.some(movement => movement.prescriptionId === prescriptionId);
}

/** Updates may change treatment fields but never silently move an existing
 * prescription to another patient. Such a correction requires separate review. */
export function preservesPrescriptionPatientId(
  current: Pick<Prescription, 'patientId'>,
  changes: Partial<Pick<Prescription, 'patientId'>>,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(changes, 'patientId')) return true;
  return typeof changes.patientId === 'string' && changes.patientId.trim().length > 0 &&
    current.patientId === changes.patientId;
}
