export type TimelineDisplayLimit = '10' | '25' | '50' | 'all';

// Read-only display limit. The full clinical history is preserved and remains
// accessible by choosing "Tous" in the interface.
export function limitTimelineEvents<T>(
  events: readonly T[], limit: TimelineDisplayLimit,
): T[] {
  if (limit === 'all') return [...events];
  const count = limit === '10' ? 10 : limit === '25' ? 25 : 50;
  return events.slice(0, count);
}
