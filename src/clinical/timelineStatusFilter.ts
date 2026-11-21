import type { PrescriptionStatus } from '../types/medical';

export type TimelinePrescriptionStatusFilter = 'all' | 'unknown' | PrescriptionStatus;

type RecordedStatusEvent =
  | { type: 'consultation' }
  | { type: 'prescription'; prescription: { status?: unknown } };

const KNOWN: readonly PrescriptionStatus[] = ['draft', 'validated', 'dispensed', 'cancelled'];

// UI-only selection. "unknown" means no recognized recorded status; it does
// NOT mean that the prescription is active, issued, or not cancelled.
export function filterDocumentedPrescriptionStatus<T extends RecordedStatusEvent>(
  events: readonly T[], filter: TimelinePrescriptionStatusFilter,
): T[] {
  if (filter === 'all') return [...events];
  return events.filter(event => {
    if (event.type !== 'prescription') return false;
    const status = event.prescription?.status;
    return filter === 'unknown'
      ? !KNOWN.some(known => known === status)
      : status === filter;
  });
}
