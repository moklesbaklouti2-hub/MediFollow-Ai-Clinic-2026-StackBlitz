import { recordedDateTimestamp } from './medicalTimeline';

export type TimelineSortDirection = 'newest' | 'oldest';

// Chronological display only. Invalid/unknown dates always follow known dates;
// stable type/id ties keep synthetic and imported records deterministic.
export function sortTimelineByRecordedDate<T extends { id: string; date: unknown; type?: string }>(
  events: readonly T[], direction: TimelineSortDirection,
): T[] {
  return [...events].sort((left, right) => {
    const a = recordedDateTimestamp(left.date);
    const b = recordedDateTimestamp(right.date);
    const tie = () => String(left.type ?? '').localeCompare(String(right.type ?? '')) ||
      String(left.id ?? '').localeCompare(String(right.id ?? ''));
    if (a === null) return b === null ? tie() : 1;
    if (b === null) return -1;
    return (direction === 'oldest' ? a - b : b - a) || tie();
  });
}
