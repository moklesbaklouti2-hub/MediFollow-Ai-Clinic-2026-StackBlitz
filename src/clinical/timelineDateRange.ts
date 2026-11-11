import { recordedDateTimestamp } from './medicalTimeline';
import { isValidFollowUpDate } from './followUp';

// Valid civil-date boundaries are interpreted in UTC. Missing or invalid
// boundaries impose no restriction; unknown historical dates are retained
// only when neither valid boundary is active.
function timestampBoundary(value: string, isEnd: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  if (!isValidFollowUpDate(value)) return null;
  return Date.parse(value + (isEnd ? 'T23:59:59.999Z' : 'T00:00:00Z'));
}

export function filterTimelineByDateRange<T extends { date: string }>(
  events: readonly T[], fromDate: string, toDate: string,
): T[] {
  const from = timestampBoundary(fromDate, false);
  const to = timestampBoundary(toDate, true);
  if (from === null && to === null) return [...events];
  if (from !== null && to !== null && from > to) return [];
  return events.filter(event => {
    const at = recordedDateTimestamp(event.date);
    return at !== null && (from === null || at >= from) && (to === null || at <= to);
  });
}
