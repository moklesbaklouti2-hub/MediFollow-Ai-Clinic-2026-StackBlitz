// Presence of a *documented* item in a prescription. This is not a completed
// laboratory test, performed imaging exam or a dispensed treatment.
export type TimelineRecordedOrderKind = 'all' | 'treatment' | 'laboratory' | 'radiology' | 'other';

type PrescriptionDocument = {
  medications?: unknown;
  items?: unknown;
};
type KindEvent =
  | { type: 'consultation' }
  | { type: 'prescription'; prescription: PrescriptionDocument };

function hasNamedItems(value: unknown, category: string): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(row => row && typeof row === 'object' && !Array.isArray(row) &&
    (row as Record<string, unknown>).category === category &&
    typeof (row as Record<string, unknown>).name === 'string' &&
    ((row as Record<string, unknown>).name as string).trim().length > 0);
}

function hasLegacyMedications(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(row => row && typeof row === 'object' && !Array.isArray(row) &&
    typeof (row as Record<string, unknown>).name === 'string' &&
    ((row as Record<string, unknown>).name as string).trim().length > 0);
}

export function filterTimelineByRecordedOrderKind<T extends KindEvent>(
  events: readonly T[], kind: TimelineRecordedOrderKind,
): T[] {
  if (kind === 'all') return [...events];
  return events.filter(event => {
    if (event.type !== 'prescription') return false;
    const document = event.prescription;
    return kind === 'treatment'
      ? hasLegacyMedications(document?.medications) || hasNamedItems(document?.items, 'treatment')
      : hasNamedItems(document?.items, kind);
  });
}
