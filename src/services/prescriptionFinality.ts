import type { Prescription } from '../types/medical';

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
