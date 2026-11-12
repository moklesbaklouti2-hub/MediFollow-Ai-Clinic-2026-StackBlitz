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

/** Only an explicitly draft or validated order can trigger inventory dispensing.
 * Missing or malformed legacy statuses require physician review first. */
export function isDispensablePrescriptionStatus(status: unknown): boolean {
  return status === 'draft' || status === 'validated';
}


// QW-102 — a caller cannot mark a prescription as dispensed without a
// traceable inventory movement for that very document and patient.
// This only verifies records; it never asserts that items were physically given.
export function hasDocumentedPrescriptionDispense(
  prescriptionId: string,
  patientId: string,
  movements: readonly ReturnTrace[],
): boolean {
  if (typeof prescriptionId !== 'string' || !prescriptionId.trim() ||
      typeof patientId !== 'string' || !patientId.trim() ||
      !Array.isArray(movements)) return false;

  const dispenses = movements.filter(move =>
    move && move.type === 'dispense' && move.prescriptionId === prescriptionId);
  if (dispenses.length === 0) return false;

  const ids = new Set<string>();
  for (const movement of movements) {
    if (!movement || typeof movement.id !== 'string' || !movement.id.trim()) return false;
    if (ids.has(movement.id)) return false;
    ids.add(movement.id);
  }

  return dispenses.every(move =>
    move.patientId === patientId &&
    typeof move.itemId === 'string' && move.itemId.trim().length > 0 &&
    typeof move.quantity === 'number' &&
    Number.isFinite(move.quantity) && move.quantity > 0);
}

// QW-104 — do not rewrite a prescription's content after any inventory
// movement has been recorded, even if a failed status update left it as draft.
// Only a strictly documentary draft/validated -> dispensed transition remains
// possible; QW-102 separately requires valid evidence of actual dispensing.
export function allowsStockLinkedPrescriptionUpdate(
  current: Pick<Prescription, 'status'>,
  changes: Partial<Prescription>,
  hasRecordedMovement: boolean,
): boolean {
  if (!hasRecordedMovement) return true;
  if (!current) return false;
  if (current.status === 'dispensed') return true; // QW-097 controls finalised documents.
  if (!isDispensablePrescriptionStatus(current.status) ||
      !changes || typeof changes !== 'object' || Array.isArray(changes)) return false;
  const keys = Object.keys(changes);
  return keys.length === 2 &&
    keys.includes('status') &&
    keys.includes('dispensedAt') &&
    changes.status === 'dispensed' &&
    typeof changes.dispensedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(changes.dispensedAt) &&
    Number.isFinite(Date.parse(changes.dispensedAt));
}

// QW-105 — new clinical documents cannot be inserted with a fabricated
// terminal status or timestamps of dispensing/cancellation. Imported records
// are read separately and remain untouched.
export function isCreatablePrescriptionStatus(
  prescription: Pick<Prescription, 'status' | 'dispensedAt' | 'cancelledAt'> | null | undefined,
): boolean {
  return Boolean(prescription &&
    isDispensablePrescriptionStatus(prescription.status) &&
    prescription.dispensedAt === undefined &&
    prescription.cancelledAt === undefined);
}
