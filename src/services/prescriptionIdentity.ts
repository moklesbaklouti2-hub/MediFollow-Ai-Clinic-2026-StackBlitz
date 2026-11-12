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
