// UI-only view of recorded events. Filtering never changes clinical storage,
// order, patient links, or the documented content of an event.
export type MedicalTimelineFilter = 'all' | 'consultation' | 'prescription';

export function filterRecordedEvents<T extends { type: 'consultation' | 'prescription' }>(
  records: readonly T[],
  filter: MedicalTimelineFilter,
): T[] {
  if (filter === 'consultation' || filter === 'prescription') {
    return records.filter((record) => record.type === filter);
  }
  return [...records];
}
