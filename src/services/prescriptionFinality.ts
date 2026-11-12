import type { Prescription, StockMovement } from '../types/medical';

// Fail closed for finalized documents, even when a caller bypasses the UI.
// The one supported exception is the documentary transition after an
// already-dispensed prescription has been physically recovered and cancelled.
export function allowsFinalizedPrescriptionUpdate(
  current: Pick<Prescription, 'status'>,
  changes: Partial<Prescription>,
): boolean {
  if (!current || !changes || typeof changes !== 'object' || Array.isArray(changes)) return false;
  if (current.status === 'cancelled') return false;
  if (current.status !== 'dispensed') return true;

  const keys = Object.keys(changes);
  return keys.length === 2 &&
    keys.includes('status') &&
    keys.includes('cancelledAt') &&
    changes.status === 'cancelled' &&
    typeof changes.cancelledAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(changes.cancelledAt) &&
    Number.isFinite(Date.parse(changes.cancelledAt));
}

// QW-098 — Documentary safeguard for the only permitted dispensed->cancelled
// update. The corresponding stock return has to be fully recorded per
// original movement. This does not attest to physical receipt or product safety.
type ReturnTrace = Pick<StockMovement,
  'id' | 'type' | 'quantity' | 'prescriptionId' | 'patientId' | 'itemId' | 'reversesMovementId'>;

export function hasFullyDocumentedPrescriptionReturn(
  prescriptionId: string,
  patientId: string,
  movements: readonly ReturnTrace[],
): boolean {
  if (typeof prescriptionId !== 'string' || !prescriptionId.trim() ||
      typeof patientId !== 'string' || !patientId.trim() ||
      !Array.isArray(movements)) return false;

  const originals = movements.filter(move =>
    move && move.type === 'dispense' && move.prescriptionId === prescriptionId);
  if (originals.length === 0) return false;

  const idCounts = new Map<string, number>();
  for (const movement of movements) {
    if (!movement || typeof movement.id !== 'string' || !movement.id.trim()) return false;
    idCounts.set(movement.id, (idCounts.get(movement.id) ?? 0) + 1);
  }

  const linkedReturns = movements.filter(move =>
    move.type === 'return' && move.prescriptionId === prescriptionId);
  if (linkedReturns.some(move =>
    !originals.some(original => original.id === move.reversesMovementId))) return false;

  for (const original of originals) {
    if (idCounts.get(original.id) !== 1 ||
        original.patientId !== patientId ||
        typeof original.itemId !== 'string' || !original.itemId.trim() ||
        typeof original.quantity !== 'number' || !Number.isFinite(original.quantity) ||
        original.quantity <= 0) return false;

    const returned = movements.filter(move =>
      move.type === 'return' && move.reversesMovementId === original.id);
    if (returned.some(move =>
      idCounts.get(move.id) !== 1 ||
      move.patientId !== patientId ||
      move.prescriptionId !== prescriptionId ||
      move.itemId !== original.itemId ||
      typeof move.quantity !== 'number' ||
      !Number.isFinite(move.quantity) || move.quantity <= 0)) return false;
    const total = returned.reduce((sum, move) => sum + move.quantity, 0);
    if (!Number.isFinite(total) ||
        Math.abs(total - original.quantity) >
          Number.EPSILON * Math.max(1, Math.abs(total), Math.abs(original.quantity)) * 4) {
      return false;
    }
  }
  return true;
}
// QW-099 — unknown imported statuses must never be silently interpreted
// as an editable draft when deleting clinical records. Legacy missing status
// remains compatible, but an explicit unfamiliar value fails closed.
export function isDeletablePrescriptionStatus(status: unknown): boolean {
  return status === undefined || status === 'draft' || status === 'validated';
}
