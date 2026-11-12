import { recordedDateTimestamp } from './medicalTimeline';

// Documentary-only check. Dates not parseable are never silently interpreted
// as a known calendar date; no changes to stored or imported records.
export function filterTimelineUndated<T extends { date: unknown }>(
  events: readonly T[],
): T[] {
  return events.filter(item => recordedDateTimestamp(item.date) === null);
}
